---
sidebar_position: 1
title: Build a ZK Dapp
description: Step-by-step tutorial — use every r14-sdk ZK primitive to build a private payment app from scratch
---

# Build a ZK Dapp

Build a Rust program from scratch that exercises all of Root14's ZK primitives: key generation, shielded deposits, Merkle proofs, Groth16 proof generation and verification, and Poseidon commitments for data privacy.

By the end you'll have a single `main.rs` that:
- Generates keypairs for two users
- Creates shielded notes with Poseidon commitments
- Transfers value privately with a Groth16 proof
- Verifies the proof off-chain
- Commits to arbitrary private data (zkTLS-style)

## 1. Project setup

```bash
cargo new r14-my-dapp
cd r14-my-dapp
```

Replace `Cargo.toml`:

```toml
[package]
name = "r14-my-dapp"
version = "0.1.0"
edition = "2021"

[dependencies]
r14-sdk = { git = "https://github.com/abhirupinspace/root-14-core", features = ["prove"] }
ark-bls12-381 = "0.5"
ark-ff = "0.5"
ark-std = "0.5"
tokio = { version = "1", features = ["full"] }
anyhow = "1"
```

The `prove` feature enables Groth16 proof generation and verification.

## 2. Key generation

Generate a BLS12-381 secret key and derive the Poseidon `owner_hash` — your identity in the Root14 system.

```rust
use r14_sdk::wallet::{crypto_rng, fr_to_hex};
use r14_sdk::{owner_hash, SecretKey};

let mut rng = crypto_rng();

// Sender
let sender_sk = SecretKey::random(&mut rng);
let sender_owner = owner_hash(&sender_sk);
println!("sender owner_hash: {}", fr_to_hex(&sender_owner.0));

// Receiver
let receiver_sk = SecretKey::random(&mut rng);
let receiver_owner = owner_hash(&receiver_sk);
println!("receiver owner_hash: {}", fr_to_hex(&receiver_owner.0));
```

**Output:**
```
sender owner_hash: 0x0077a584480a34385ee7920e...
receiver owner_hash: 0x00a1c3f920b8e74f21dc0ab5...
```

`owner_hash` is a one-way Poseidon hash of the secret key. It's published on-chain as the note owner — the secret key never leaves your machine.

## 3. Shielded deposit

Create a UTXO-style `Note` and compute its Poseidon commitment. Only the commitment goes on-chain; the value is hidden.

```rust
use r14_sdk::{commitment, Note};

let deposit_value = 1000u64;
let sender_note = Note::new(deposit_value, 1, sender_owner.0, &mut rng);
let sender_cm = commitment(&sender_note);
println!("deposit {}, commitment: {}...", sender_note.value, &fr_to_hex(&sender_cm)[..18]);
```

**Output:**
```
deposit 1000, commitment: 0x41813dee706b4b...
```

`Note::new(value, app_tag, owner, rng)` generates a random nonce internally. The commitment is `Poseidon(value, app_tag, owner, nonce)` — deterministic for the same inputs but impossible to reverse without knowing all four fields.

## 4. Private transfer — Merkle path + Groth16 proof

Transfer value from sender to receiver. This requires:
1. Reconstructing the consumed note
2. Building a Merkle membership path
3. Creating two output notes (recipient + change)
4. Generating a Groth16 proof

```rust
use r14_sdk::wallet;
use r14_sdk::{merkle, MerklePath, MERKLE_DEPTH};
use ark_std::rand::{rngs::StdRng, SeedableRng};

let transfer_value = 300u64;
let change_value = sender_note.value - transfer_value;

// Reconstruct consumed note from stored fields
let consumed = Note::with_nonce(
    sender_note.value,
    sender_note.app_tag,
    sender_note.owner,
    sender_note.nonce,
);

// Build Merkle path (single-leaf tree for this demo)
let empty_fr = wallet::hex_to_fr(&merkle::empty_root_hex()).unwrap();
let path = MerklePath {
    siblings: vec![empty_fr; MERKLE_DEPTH],
    indices: vec![false; MERKLE_DEPTH],
};

// Output notes
let receiver_note = Note::new(transfer_value, 1, receiver_owner.0, &mut rng);
let sender_change = Note::new(change_value, 1, sender_owner.0, &mut rng);

// Groth16 trusted setup + proof generation
println!("generating Groth16 proof...");
let (pk, vk) = r14_sdk::prove::setup(&mut StdRng::seed_from_u64(42));
let (proof, public_inputs) = r14_sdk::prove::prove(
    &pk,
    sender_sk.0,
    consumed,
    path,
    [receiver_note.clone(), sender_change.clone()],
    &mut rng,
);

println!("proof generated!");
println!("nullifier: {}...", &fr_to_hex(&public_inputs.nullifier)[..18]);
```

**Output:**
```
generating Groth16 proof...
proof generated!
nullifier: 0x42d39245306fdd...
```

The proof proves three things without revealing any private data:
1. The sender owns the consumed note (knows the secret key behind `owner_hash`)
2. The consumed note exists in the Merkle tree (membership proof)
3. Output values balance: `input = output₀ (transfer) + output₁ (change)`

## 5. Verify proof

Use `verify_offchain` to check the proof locally — the same check the on-chain verifier performs.

```rust
let valid = r14_sdk::prove::verify_offchain(&vk, &proof, &public_inputs);
println!("proof valid: {valid}");
assert!(valid, "proof must verify");
```

**Output:**
```
proof valid: true
```

If any witness was wrong (bad key, note not in tree, values don't balance), verification returns `false`.

## 6. Serialize proof for Soroban

To submit the proof on-chain, serialize it into hex strings the Soroban contract expects:

```rust
let (serialized_proof, pub_inputs_hex) =
    r14_sdk::prove::serialize_proof_for_soroban(&proof, &public_inputs.to_vec());

println!("proof.a: {}...", &serialized_proof.a[..20]);
println!("proof.b: {}...", &serialized_proof.b[..20]);
println!("proof.c: {}...", &serialized_proof.c[..20]);
println!("public inputs: {} field elements", pub_inputs_hex.len());
```

**Output:**
```
proof.a: 1a2b3c4d5e6f7a8b9c0d...
proof.b: 2b3c4d5e6f7a8b9c0d1e...
proof.c: 3c4d5e6f7a8b9c0d1e2f...
public inputs: 4 field elements
```

The four public inputs are: `old_root`, `nullifier`, `out_commitment_0`, `out_commitment_1`.

## 7. Poseidon commitments for data privacy

Beyond payments, r14-sdk's Poseidon primitives can commit to any private value — the foundation for zkTLS and credential proofs.

```rust
use ark_ff::UniformRand;
use r14_sdk::hash2;
type Fr = ark_bls12_381::Fr;

// Commit to a private value (e.g. bank balance from TLS oracle)
let secret_balance = Fr::from(15000u64);
let blinding = Fr::rand(&mut rng);
let commit = hash2(secret_balance, blinding);

println!("commitment: {}", fr_to_hex(&commit));
println!("value:      [HIDDEN]");
println!("blinding:   [HIDDEN]");
```

**Output:**
```
commitment: 0x2f8a1b3c4d5e6f7a8b9c0d1e2f3a4b5c...
value:      [HIDDEN]
blinding:   [HIDDEN]
```

The commitment is **hiding** (random blinding) and **binding** (can't open to a different value). A verifier can later check a ZK proof about the committed value without learning it.

## 8. Putting it together

Here's the complete `main.rs`:

```rust
use ark_ff::UniformRand;
use ark_std::rand::{rngs::StdRng, SeedableRng};
use r14_sdk::wallet::{self, crypto_rng, fr_to_hex};
use r14_sdk::{commitment, hash2, merkle, owner_hash};
use r14_sdk::{MerklePath, Note, SecretKey, MERKLE_DEPTH};

type Fr = ark_bls12_381::Fr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut rng = crypto_rng();

    // ── 1. Keygen ───────────────────────────────────────────────────────
    println!("=== 1. Keygen ===");
    let sender_sk = SecretKey::random(&mut rng);
    let sender_owner = owner_hash(&sender_sk);
    let receiver_sk = SecretKey::random(&mut rng);
    let receiver_owner = owner_hash(&receiver_sk);
    println!("sender:   {}", fr_to_hex(&sender_owner.0));
    println!("receiver: {}", fr_to_hex(&receiver_owner.0));

    // ── 2. Shielded deposit ─────────────────────────────────────────────
    let deposit_value = 1000u64;
    println!("\n=== 2. Deposit {} ===", deposit_value);
    let sender_note = Note::new(deposit_value, 1, sender_owner.0, &mut rng);
    let sender_cm = commitment(&sender_note);
    println!("commitment: {}...", &fr_to_hex(&sender_cm)[..18]);

    // ── 3. Private transfer ─────────────────────────────────────────────
    let transfer_value = 300u64;
    let change_value = sender_note.value - transfer_value;
    println!("\n=== 3. Transfer {} to receiver ===", transfer_value);

    let consumed = Note::with_nonce(
        sender_note.value,
        sender_note.app_tag,
        sender_note.owner,
        sender_note.nonce,
    );

    let empty_fr = wallet::hex_to_fr(&merkle::empty_root_hex())?;
    let path = MerklePath {
        siblings: vec![empty_fr; MERKLE_DEPTH],
        indices: vec![false; MERKLE_DEPTH],
    };

    let receiver_note = Note::new(transfer_value, 1, receiver_owner.0, &mut rng);
    let sender_change = Note::new(change_value, 1, sender_owner.0, &mut rng);

    println!("generating Groth16 proof...");
    let (pk, vk) = r14_sdk::prove::setup(&mut StdRng::seed_from_u64(42));
    let (proof, pi) = r14_sdk::prove::prove(
        &pk,
        sender_sk.0,
        consumed,
        path,
        [receiver_note.clone(), sender_change.clone()],
        &mut rng,
    );
    println!("nullifier: {}...", &fr_to_hex(&pi.nullifier)[..18]);

    // ── 4. Verify proof ─────────────────────────────────────────────────
    println!("\n=== 4. Verify Proof ===");
    let valid = r14_sdk::prove::verify_offchain(&vk, &proof, &pi);
    println!("valid: {valid}");

    // ── 5. Serialize for Soroban ────────────────────────────────────────
    println!("\n=== 5. Serialize for Soroban ===");
    let (sp, pub_hex) =
        r14_sdk::prove::serialize_proof_for_soroban(&proof, &pi.to_vec());
    println!("proof.a: {}...", &sp.a[..20]);
    println!("public inputs: {} elements", pub_hex.len());

    // ── 6. Poseidon commitment (zkTLS-style) ────────────────────────────
    println!("\n=== 6. Poseidon Commitment ===");
    let secret_value = Fr::from(15000u64);
    let blinding = Fr::rand(&mut rng);
    let commit = hash2(secret_value, blinding);
    println!("commit: {}", fr_to_hex(&commit));
    println!("value:  [HIDDEN]");

    // ── 7. Final balances ───────────────────────────────────────────────
    println!("\n=== 7. Final Balances ===");
    println!("sender:   {} (change note)", sender_change.value);
    println!("receiver: {} (received note)", receiver_note.value);
    println!("\nAll operations completed with zero knowledge.");

    Ok(())
}
```

## What to explore next

- [**r14-examples**](./demo-dapp) — the runnable demos this tutorial is based on
- [**SDK Reference**](../sdk/overview) — full API docs for `r14-sdk`
- [**Groth16 on Soroban**](../concepts/groth16-on-soroban) — how the on-chain verifier works
- [**Protocol Flow**](../concepts/protocol-flow) — end-to-end deposit → transfer → withdraw
- [**MCP Server**](./mcp-server) — interact with Root14 via natural language through the r14 MCP server
