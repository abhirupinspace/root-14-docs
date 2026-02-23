---
sidebar_position: 1
---

# Notes and the UTXO Model

Root14 represents private balances as **Notes** -- discrete value-bearing objects similar to Bitcoin UTXOs. Unlike account-based models where a single balance is incremented and decremented, each private action creates and destroys individual notes. Nothing about a note is stored on-chain except its cryptographic commitment.

## Note Structure

A note contains four fields:

```rust
pub struct Note {
    pub value: u64,     // amount
    pub app_tag: u32,   // application identifier (must match in transfers)
    pub owner: Fr,      // owner_hash - derived from secret key
    pub nonce: Fr,      // random, makes each note unique
}
```

| Field | Type | Purpose |
|-------|------|---------|
| `value` | `u64` | The amount held by this note. Transfers enforce `consumed.value == created[0].value + created[1].value` inside the ZK circuit. |
| `app_tag` | `u32` | Application identifier. The circuit enforces that `app_tag` is identical across the consumed note and both output notes. This isolates different application pools -- a note tagged `1` cannot be spent into a note tagged `2`. |
| `owner` | `Fr` | The owner hash, computed as `Poseidon(secret_key)`. This is the "address" of the note holder. Only someone who knows the pre-image (the secret key) can spend the note. |
| `nonce` | `Fr` | A random BLS12-381 scalar. Makes every note unique even when `value`, `app_tag`, and `owner` are identical. Also used in nullifier derivation. |

## Commitment

The on-chain representation of a note is its **commitment**:

In code (r14 poseidon):

```rust
pub fn commitment(note: &Note) -> Fr {
    poseidon_hash(&[
        Fr::from(note.value),
        Fr::from(note.app_tag as u64),
        note.owner,
        note.nonce,
    ])
}
```

The commitment is a single BLS12-381 field element (32 bytes). It is binding (you cannot find two different notes with the same commitment) and hiding (the commitment reveals nothing about the note's contents). Only this commitment is stored on-chain, in the Merkle tree.

## Creating Notes

Root14 provides two constructors:

### `Note::new()` -- standard creation

```rust
let note = Note::new(1000, 1, owner_hash, &mut rng);
```

Generates a random nonce internally using the provided RNG. This is the normal path for creating notes during deposits and transfers.

### `Note::with_nonce()` -- deterministic creation

```rust
let note = Note::with_nonce(1000, 1, owner_hash, specific_nonce);
```

Accepts an explicit nonce. Used when reconstructing a note from stored wallet data, or in tests where deterministic behavior is needed.

## App Tags

The `app_tag` field partitions the note space into isolated pools. The transfer circuit enforces:

```rust
// Constraint 7 in TransferCircuit
consumed_app_tag.enforce_equal(&created_app_tags[0])?;
consumed_app_tag.enforce_equal(&created_app_tags[1])?;
```

This means a note with `app_tag = 1` can only produce output notes with `app_tag = 1`. Different applications (e.g., a stablecoin pool vs. a governance token pool) use different tags and cannot cross-contaminate.

Common conventions:

| Tag | Use |
|-----|-----|
| `0` | Reserved / untagged |
| `1` | Default private transfer pool |
| `2+` | Application-specific pools |

## Note Lifecycle

A note moves through four stages:

**Created**: The user calls `Note::new()` locally. The note exists only in their wallet. The commitment is computed but not submitted to any contract.

**Deposited**: The user calls `deposit(cm, new_root)` on the r14 transfer contract. The commitment is now anchored on-chain and the indexer picks it up via `DepositEvent`.

**On-chain**: The commitment sits in the Merkle tree. The indexer maintains the full tree and can produce Merkle proofs for any leaf. The note is spendable by whoever knows the secret key that hashes to `owner`.

**Spent**: To spend, the owner reveals a **nullifier** (derived from their secret key and the note's nonce) inside a ZK proof. The contract records this nullifier. If the same nullifier is ever submitted again, the transaction is rejected. The note's value is consumed and two new output notes are created.

## Value Conservation

The ZK circuit enforces strict conservation:

```rust
// Constraint 6 in TransferCircuit
let sum = &created_values[0] + &created_values[1];
consumed_value.enforce_equal(&sum)?;
```

No value is created or destroyed during a transfer. The consumed note's value must exactly equal the sum of the two output notes. To send 700 out of a 1000-value note, you create one output of 700 (to the recipient) and one output of 300 (change back to yourself).
