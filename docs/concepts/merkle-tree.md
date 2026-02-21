---
sidebar_position: 3
---

# Merkle Tree

Root14 uses a sparse Merkle tree to commit to the set of all deposited notes. The tree provides succinct membership proofs -- a prover can demonstrate that a specific note commitment exists in the tree without revealing which leaf it occupies.

## Tree Parameters

| Parameter | Value |
|-----------|-------|
| Depth | 20 |
| Max leaves | 2^20 = 1,048,576 (~1M) |
| Hash function | Poseidon hash2 |
| Empty leaf value | `Fr::ZERO` |
| Storage | On-chain: root only. Full tree: indexer. |

The depth is defined as a constant:

```rust
pub const MERKLE_DEPTH: usize = 20;
```

## Sparse Construction

The tree is "sparse" in that empty subtrees are precomputed. At each level, the hash of an empty subtree is the hash of two empty children:

```rust
impl SparseMerkleTree {
    pub fn new() -> Self {
        let mut zeros = vec![Fr::ZERO; MERKLE_DEPTH + 1];
        for i in 1..=MERKLE_DEPTH {
            zeros[i] = hash2(zeros[i - 1], zeros[i - 1]);
        }
        Self {
            leaves: Vec::new(),
            zeros,
        }
    }
}
```

This means the tree always has a deterministic root even when empty. The empty root is `hash2(hash2(...hash2(0, 0)..., ...), ...)` applied 20 times. Two independently constructed empty trees always produce the same root.

## On-chain vs Off-chain

The Soroban contract stores **only the root** (32 bytes). This is sufficient for verification -- the ZK circuit checks a Merkle path against the root, and the contract confirms the root is known.

The full tree is maintained by the **indexer**, an off-chain service that:

1. Listens for `DepositEvent` and `TransferEvent` from the contract
2. Inserts new commitments as leaves
3. Recomputes the tree after each insertion
4. Serves Merkle proofs via REST API

### Indexer API

Fetch a proof for a leaf at a given index:

```bash
curl http://localhost:3001/v1/proof/0
```

```json
{
  "siblings": [
    "0x1a2b3c...",
    "0x4d5e6f...",
    "..."
  ],
  "indices": [false, true, false, ...]
}
```

The response contains 20 sibling hashes and 20 index bits. The `indices` array indicates whether the leaf is on the left (`false`) or right (`true`) side at each level.

Other endpoints:

```bash
# Current root
curl http://localhost:3001/v1/root

# Look up a commitment's leaf index
curl http://localhost:3001/v1/leaf/0xabc123...

# List all leaves
curl http://localhost:3001/v1/leaves
```

## Merkle Path

A Merkle path is the proof that a leaf exists in the tree. It consists of the sibling hash at each level plus a direction bit:

```rust
pub struct MerklePath {
    pub siblings: Vec<Fr>,   // 20 sibling hashes
    pub indices: Vec<bool>,  // 20 direction bits (true = leaf is right child)
}

pub struct MerkleRoot(pub Fr);
```

### Path Verification

To verify a path, start from the leaf and hash upward:

```rust
pub fn verify_proof(leaf: Fr, path: &MerklePath, root: &MerkleRoot) -> bool {
    let mut current = leaf;
    for i in 0..path.siblings.len() {
        if path.indices[i] {
            current = hash2(path.siblings[i], current);
        } else {
            current = hash2(current, path.siblings[i]);
        }
    }
    current == root.0
}
```

At each level, if the index bit is `false`, the leaf is the left child and the sibling is on the right: `hash2(current, sibling)`. If the index bit is `true`, the leaf is the right child: `hash2(sibling, current)`.

### ZK Circuit Verification

The same logic runs inside the Groth16 circuit as a gadget. The `verify_merkle_path` gadget enforces that the consumed note's commitment is a valid leaf of the tree with the claimed root:

```rust
// Constraint 3 in TransferCircuit: Merkle inclusion
verify_merkle_path(cs.clone(), &consumed_cm, &path_vars, &old_root_pub)?;
```

The Merkle path siblings and index bits are private witnesses -- the verifier (contract) only sees the root, not the path or the leaf position.

## Root History

The contract does not store a single root. It maintains a **circular buffer of 100 roots**:

```rust
const ROOT_HISTORY_SIZE: u32 = 100;
```

When a new commitment is deposited or a transfer produces new output commitments, the updated root is pushed into the buffer:

```rust
fn commit_root(env: &Env, root: BytesN<32>) {
    let idx: u32 = env.storage().persistent()
        .get(&DataKey::RootIndex).unwrap_or(0);

    // Remove old root at this buffer slot if it exists
    let slot_key = DataKey::RootAt(idx);
    if let Some(old_root) = env.storage().persistent()
        .get::<_, BytesN<32>>(&slot_key) {
        env.storage().persistent().remove(&DataKey::Root(old_root));
    }

    // Store new root
    env.storage().persistent().set(&DataKey::Root(root.clone()), &true);
    env.storage().persistent().set(&slot_key, &root);

    // Advance index
    let next_idx = (idx + 1) % ROOT_HISTORY_SIZE;
    env.storage().persistent().set(&DataKey::RootIndex, &next_idx);
}
```

### Why a Root History?

Latency tolerance. A user might fetch a Merkle proof, generate a ZK proof (which takes a few seconds), and by the time they submit the transaction, new deposits may have changed the current root. The circular buffer allows the contract to accept proofs against any of the last 100 roots.

During transfer verification, the contract checks that the submitted `old_root` exists in the history:

```rust
if !env.storage().persistent().has(&DataKey::Root(old_root.clone())) {
    panic!("unknown merkle root");
}
```

If more than 100 state changes occur between proof generation and submission, the root expires from the buffer and the proof must be regenerated.

## Tree Insertion

Leaves are inserted sequentially (index 0, 1, 2, ...). There is no deletion -- spent notes remain in the tree forever. Their nullifiers prevent reuse, but the commitments stay as leaves. This append-only property simplifies the tree implementation and makes it easy to reconstruct from event history.

```rust
pub fn insert(&mut self, leaf: Fr) -> usize {
    let idx = self.leaves.len();
    self.leaves.push(leaf);
    idx
}
```

The returned index is stored in the wallet alongside the note data, so the user can later request a proof for that specific leaf position.
