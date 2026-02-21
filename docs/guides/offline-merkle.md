---
sidebar_position: 5
---

# Offline Merkle Computation

Compute Merkle roots locally without an indexer. Useful for testing, verification, and analytics.

## Functions

### `empty_root_hex()`

Returns the root of an empty Merkle tree (all leaves zero). This is the initial root stored on-chain during `init-contract`.

```rust
use r14_sdk::merkle::empty_root_hex;

let root = empty_root_hex();
assert_eq!(root.len(), 64); // 32 bytes, no 0x prefix
```

The empty root is computed by iterating `hash2(0, 0)` for `MERKLE_DEPTH` (20) levels.

### `compute_root_from_leaves()`

Compute the Merkle root for a given set of leaf commitments. Produces the same result as the indexer's `SparseMerkleTree::root()` for the same leaf set.

```rust
use r14_sdk::merkle::compute_root_from_leaves;
use r14_sdk::wallet::hex_to_fr;

let cm1 = hex_to_fr("0x1a2b3c...")?;
let cm2 = hex_to_fr("0x4d5e6f...")?;

let root = compute_root_from_leaves(&[cm1, cm2]);
println!("root: {}", root); // 64-char hex, no 0x prefix
```

## Properties

- **Order matters**: `compute_root_from_leaves(&[a, b])` differs from `compute_root_from_leaves(&[b, a])`. Leaves are ordered by insertion index.
- **Deterministic**: Same inputs always produce the same root.
- **Hash function**: Poseidon `hash2` at every level.
- **Tree depth**: 20 levels, supporting up to 1,048,576 (2^20) leaves.
- **Empty subtrees**: Unpopulated subtrees use precomputed zero hashes (`hash2(zero_i, zero_i)` per level).

## CLI

```bash
# Empty tree root
r14 compute-root

# Root with specific commitments (no 0x prefix)
r14 compute-root 1a2b3c4d5e6f... 7a8b9c0d1e2f...
```

With JSON output:

```bash
r14 compute-root --json 1a2b3c4d5e6f...
```

```json
{
  "root": "a1b2c3d4e5f6..."
}
```

## Use Cases

**Testing**: Verify that your local Merkle tree matches the indexer's without making network calls.

```rust
use r14_sdk::merkle::{empty_root_hex, compute_root_from_leaves};
use r14_sdk::{Note, commitment, owner_hash, SecretKey};
use r14_sdk::wallet::crypto_rng;

let mut rng = crypto_rng();
let sk = SecretKey::random(&mut rng);
let owner = owner_hash(&sk);

let note = Note::new(1000, 1, owner.0, &mut rng);
let cm = commitment(&note);

let root_before = empty_root_hex();
let root_after = compute_root_from_leaves(&[cm]);
assert_ne!(root_before, root_after);
```

**Verification**: Confirm that a deposit correctly changed the root.

```rust
// Before deposit: root_before = compute_root_from_leaves(&existing_leaves)
// After deposit:  root_after  = compute_root_from_leaves(&[existing_leaves..., new_cm])
```

**Analytics**: Compute roots for arbitrary subsets of commitments offline for auditing or reconciliation purposes.
