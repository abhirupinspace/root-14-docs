---
sidebar_position: 5
---

# Protocol Flow

This page describes the complete lifecycle of private value in Root14, from depositing into the shielded pool to transferring between participants.

## Deposit Flow

Depositing moves value into the shielded pool by creating a note and anchoring its commitment on-chain.

### Step 1: Create the note

```rust
use r14_types::{Note, SecretKey};
use r14_poseidon::owner_hash;

let sk = SecretKey::random(&mut rng);
let owner = owner_hash(&sk);

let note = Note::new(1000, 1, owner.0, &mut rng);
// value=1000, app_tag=1, owner=Poseidon(sk), nonce=random
```

The note exists only in local memory at this point.

### Step 2: Compute the commitment

```rust
use r14_poseidon::commitment;

let cm = commitment(&note);
// cm = Poseidon(value, app_tag, owner, nonce)
```

The commitment is a single BLS12-381 field element (32 bytes). It hides all note fields.

### Step 3: Compute the new Merkle root

The depositor must provide the updated Merkle root that includes this new commitment. This requires fetching the current tree state from the indexer and computing the root with the new leaf appended:

```bash
# Fetch current tree state
curl http://localhost:3001/v1/root
# Returns: { "root": "0x..." }

curl http://localhost:3001/v1/leaves
# Returns: { "leaves": ["0x...", ...] }
```

The SDK handles this by reconstructing the tree locally, inserting the new commitment, and computing the root.

### Step 4: Submit the deposit transaction

```rust
// Soroban transaction calling r14-transfer.deposit()
r14_transfer::deposit(env, cm_bytes, new_root_bytes);
```

The contract:
1. Rejects zero commitments
2. Stores the new root in the circular buffer (100 entries)
3. Emits a `DepositEvent` containing the commitment

```rust
pub fn deposit(env: Env, cm: BytesN<32>, new_root: BytesN<32>) {
    if cm == BytesN::from_array(&env, &[0u8; 32]) {
        panic!("zero commitment");
    }
    Self::commit_root(&env, new_root);
    env.events().publish(("deposit",), DepositEvent { cm });
}
```

### Step 5: Indexer picks up the event

The indexer watches for `DepositEvent`, extracts the commitment, inserts it as the next leaf in its local Merkle tree, and recomputes the root. The leaf index is stored in the database alongside the commitment and block height.

After this step, the note is fully on-chain and spendable.

## Transfer Flow

Transferring spends an existing note and creates two new notes (recipient + change) using a Groth16 zero-knowledge proof.

### Step 1: Load wallet and find an unspent note

```rust
use r14_sdk::wallet::load_wallet;

let wallet = load_wallet()?;
let unspent: Vec<&NoteEntry> = wallet.notes.iter()
    .filter(|n| !n.spent && n.value >= amount)
    .collect();
```

The wallet file at `~/.r14/wallet.json` stores all known notes with their spent status.

### Step 2: Fetch Merkle proof from the indexer

```bash
curl http://localhost:3001/v1/proof/3
```

```json
{
  "siblings": ["0x1a2b...", "0x3c4d...", "..."],
  "indices": [true, false, true, ...]
}
```

The proof contains 20 sibling hashes and 20 index bits -- everything needed to reconstruct the path from the leaf to the root.

### Step 3: Build two output notes

Every transfer produces exactly two output notes:

```rust
use r14_poseidon::owner_hash;

// Output 0: payment to recipient
let recipient_owner = owner_hash(&recipient_sk);
let note_0 = Note::new(700, 1, recipient_owner.0, &mut rng);

// Output 1: change back to sender
let my_owner = owner_hash(&my_sk);
let note_1 = Note::new(300, 1, my_owner.0, &mut rng);

// Consumed value (1000) must equal note_0.value + note_1.value (700 + 300)
```

Both output notes must have the same `app_tag` as the consumed note.

### Step 4: Generate the Groth16 proof

```rust
use r14_circuit::{prove, setup};
use ark_std::rand::{rngs::StdRng, SeedableRng};

let mut rng = StdRng::seed_from_u64(42); // dev only
let (pk, vk) = setup(&mut rng);

let (proof, public_inputs) = prove(
    &pk,
    sk.0,            // secret key (private witness)
    consumed_note,   // note being spent (private witness)
    merkle_path,     // path from indexer (private witness)
    [note_0, note_1], // output notes (private witness)
    &mut rng,
);
```

The circuit (7,638 constraints) enforces:

| # | Constraint | What it proves |
|---|-----------|----------------|
| 1 | Ownership | `Poseidon(sk) == consumed_note.owner` |
| 2 | Commitment preimage | Consumed note hashes to its commitment |
| 3 | Merkle inclusion | Commitment is a leaf under `old_root` |
| 4 | Nullifier | `Poseidon(sk, nonce) == nullifier` |
| 5 | Output commitment 0 | First output note hashes to `cm_0` |
| 6 | Output commitment 1 | Second output note hashes to `cm_1` |
| 7 | Value conservation | `consumed.value == created[0].value + created[1].value` |
| 8 | App tag match | All three notes share the same `app_tag` |

The 4 public inputs are: `old_root`, `nullifier`, `cm_0`, `cm_1`.

### Step 5: Serialize the proof for Soroban

```rust
use r14_sdk::serialize::serialize_proof_for_soroban;

let (serialized_proof, serialized_inputs) =
    serialize_proof_for_soroban(&proof, &public_inputs.to_vec());
```

G1 points are serialized to 96 bytes, G2 points to 192 bytes, Fr elements to 32 bytes. Total proof size: 384 bytes.

### Step 6: Compute the new Merkle root

The two output commitments (`cm_0`, `cm_1`) need to be added to the tree. The sender computes the root that results from appending both commitments, and includes this `new_root` in the transaction.

### Step 7: Submit the transfer transaction

```rust
r14_transfer::transfer(
    env,
    proof,        // Groth16 proof (A, B, C)
    old_root,     // Merkle root the proof was generated against
    nullifier,    // Deterministic from (sk, nonce)
    cm_0,         // Output commitment 0
    cm_1,         // Output commitment 1
    new_root,     // Updated Merkle root with new commitments
);
```

### Step 8: Contract validation

The r14 transfer contract performs these checks in order:

The r14 core `verify()` call runs the Groth16 pairing check using Soroban BLS12-381 host functions (~40M instructions).

### Step 9: Event emission

On success, the contract emits:

```rust
TransferEvent {
    nullifier: BytesN<32>,  // spent nullifier
    cm_0: BytesN<32>,       // first output commitment
    cm_1: BytesN<32>,       // second output commitment
}
```

The indexer picks up this event and inserts `cm_0` and `cm_1` as the next two leaves in the Merkle tree.

### Step 10: Update the wallet

The sender's wallet is updated locally:

1. Mark the consumed note as `spent = true`
2. Add the change note (output 1) as a new unspent note with its commitment and leaf index
3. The recipient adds output 0 to their wallet (communicated out-of-band or via an encrypted memo)

```json
{
  "notes": [
    { "value": 1000, "spent": true,  "index": 3, "..." : "..." },
    { "value": 300,  "spent": false, "index": 5, "..." : "..." }
  ]
}
```

## What an Observer Sees

An on-chain observer can see:

- A nullifier was marked as spent (but not which note it corresponds to)
- Two new commitments were added to the tree (but not their values, owners, or app tags)
- The Merkle root changed
- A Groth16 proof was verified successfully

An observer **cannot** determine:

- The amount transferred
- The sender or recipient
- Which previously-deposited note was consumed
- The relationship between the nullifier and any specific commitment
