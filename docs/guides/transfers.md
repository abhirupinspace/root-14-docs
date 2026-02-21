---
sidebar_position: 3
---

# Private Transfers

Transfer value privately using a ZK proof. The transfer consumes one note and creates two new notes (recipient + change).

## Six-Step Process

### Step 1: Load Wallet and Find an Unspent Note

Select the first unspent note with sufficient value that has been synced on-chain (has an `index`).

```rust
use r14_sdk::wallet::{load_wallet, hex_to_fr, NoteEntry};
use r14_sdk::Note;

let mut wallet = load_wallet()?;
let sk_fr = hex_to_fr(&wallet.secret_key)?;
let owner_fr = hex_to_fr(&wallet.owner_hash)?;
let recipient_fr = hex_to_fr("0xRECIPIENT_OWNER_HASH")?;

let value = 700u64;

// Find first unspent on-chain note with sufficient value
let note_idx = wallet.notes.iter()
    .position(|n| !n.spent && n.value >= value && n.index.is_some())
    .expect("no unspent on-chain note with sufficient value");

let entry = &wallet.notes[note_idx];
let consumed = Note::with_nonce(
    entry.value,
    entry.app_tag,
    hex_to_fr(&entry.owner)?,
    hex_to_fr(&entry.nonce)?,
);
let leaf_index = entry.index.unwrap();
let app_tag = entry.app_tag;
let consumed_value = entry.value;
```

### Step 2: Fetch Merkle Proof from Indexer

The indexer provides the sibling hashes and index bits needed to prove the note exists in the on-chain Merkle tree.

```rust
use r14_sdk::MerklePath;
use serde::Deserialize;

#[derive(Deserialize)]
struct ProofResponse {
    siblings: Vec<String>,
    indices: Vec<bool>,
}

let client = reqwest::Client::new();
let proof_url = format!("{}/v1/proof/{}", wallet.indexer_url, leaf_index);
let proof_resp: ProofResponse = client.get(&proof_url).send().await?.json().await?;

let siblings: Vec<ark_bls12_381::Fr> = proof_resp.siblings.iter()
    .map(|s| hex_to_fr(s))
    .collect::<anyhow::Result<_>>()?;
let merkle_path = MerklePath {
    siblings,
    indices: proof_resp.indices,
};
```

### Step 3: Build Output Notes

Create two new notes: one for the recipient and one for change back to yourself. Values must sum to the consumed note's value.

```rust
use r14_sdk::{Note, commitment};
use r14_sdk::wallet::crypto_rng;

let mut rng = crypto_rng();
let change = consumed_value - value;

let note_0 = Note::new(value, app_tag, recipient_fr, &mut rng);   // to recipient
let note_1 = Note::new(change, app_tag, owner_fr, &mut rng);      // change to self
```

The circuit enforces `consumed.value == note_0.value + note_1.value` and that all three notes share the same `app_tag`.

### Step 4: Generate the ZK Proof

Use a deterministic setup seed of `42` - this must match the seed used during `r14 init-contract` so the proving key matches the on-chain verification key.

```rust
use ark_std::rand::{rngs::StdRng, SeedableRng};

// Deterministic setup - seed=42 matches init-contract
let setup_rng = &mut StdRng::seed_from_u64(42);
let (pk, _vk) = r14_sdk::prove::setup(setup_rng);

let (proof, pi) = r14_sdk::prove::prove(
    &pk,
    sk_fr,
    consumed,
    merkle_path,
    [note_0.clone(), note_1.clone()],
    &mut rng,
);
```

The proof proves all of the following without revealing any private data:

- Prover knows the secret key that owns the consumed note
- The consumed note exists in the Merkle tree at the claimed root
- The nullifier is correctly derived from (sk, nonce)
- Output commitments are correctly constructed
- Values are conserved (input = output_0 + output_1)
- App tags match across consumed and created notes

### Step 5: Serialize and Submit

```rust
use r14_sdk::wallet::{fr_to_hex, strip_0x};
use r14_sdk::merkle::compute_new_root;
use r14_sdk::soroban::invoke_contract;

let (serialized_proof, serialized_pi) =
    r14_sdk::prove::serialize_proof_for_soroban(&proof, &pi.to_vec());

let cm_0 = commitment(&note_0);
let cm_1 = commitment(&note_1);

// Build proof JSON for Soroban
let proof_json = format!(
    r#"{{"a":"{}","b":"{}","c":"{}"}}"#,
    serialized_proof.a, serialized_proof.b, serialized_proof.c
);

// Public inputs - no 0x prefix for Soroban
let old_root_hex = strip_0x(&serialized_pi[0]);
let nullifier_hex = strip_0x(&serialized_pi[1]);
let cm_0_hex = strip_0x(&serialized_pi[2]);
let cm_1_hex = strip_0x(&serialized_pi[3]);

// Compute new root with both output commitments
let new_root_hex = compute_new_root(&wallet.indexer_url, &[cm_0, cm_1]).await?;

let result = invoke_contract(
    &wallet.transfer_contract_id,
    "testnet",
    &wallet.stellar_secret,
    "transfer",
    &[
        ("proof", &proof_json),
        ("old_root", &old_root_hex),
        ("nullifier", &nullifier_hex),
        ("cm_0", &cm_0_hex),
        ("cm_1", &cm_1_hex),
        ("new_root", &new_root_hex),
    ],
).await?;
```

### Step 6: Update Wallet

Mark the consumed note as spent and add the two new output notes.

```rust
use r14_sdk::wallet::{save_wallet, NoteEntry, fr_to_hex};

wallet.notes[note_idx].spent = true;

wallet.notes.push(NoteEntry {
    value: note_0.value,
    app_tag: note_0.app_tag,
    owner: fr_to_hex(&note_0.owner),
    nonce: fr_to_hex(&note_0.nonce),
    commitment: fr_to_hex(&cm_0),
    index: None,
    spent: false,
});

wallet.notes.push(NoteEntry {
    value: note_1.value,
    app_tag: note_1.app_tag,
    owner: fr_to_hex(&note_1.owner),
    nonce: fr_to_hex(&note_1.nonce),
    commitment: fr_to_hex(&cm_1),
    index: None,
    spent: false,
});

save_wallet(&wallet)?;
```

## Deterministic Setup (seed=42)

The Groth16 trusted setup must produce the same proving key and verification key everywhere. Root14 uses `StdRng::seed_from_u64(42)` as the setup RNG. This is consistent across:

- `r14 init-contract` (registers VK on-chain)
- `r14 transfer` (generates proof with matching PK)
- `R14Client::init_contracts()` and `R14Client::transfer()`

If you use the SDK directly, always use `seed_from_u64(42)` for setup. Using any other seed will produce a VK that doesn't match on-chain, and proofs will fail verification.

## Public Inputs

The transfer circuit has exactly 4 public inputs:

| Index | Name | Description |
|---|---|---|
| 0 | `old_root` | Merkle root at time of proof (proves note exists) |
| 1 | `nullifier` | `Poseidon(sk, nonce)` - prevents double-spend |
| 2 | `cm_0` | Output commitment for recipient note |
| 3 | `cm_1` | Output commitment for change note |
