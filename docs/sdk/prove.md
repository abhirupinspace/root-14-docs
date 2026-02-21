---
sidebar_position: 7
---

# Prove

The `prove` module is gated behind the `prove` Cargo feature. It re-exports ZK circuit construction, Groth16 proving, and serialization utilities from `r14-circuit` and the `serialize` module.

## Enabling

```toml
[dependencies]
r14-sdk = { version = "0.1", features = ["prove"] }
```

This pulls in arkworks, BLS12-381 curve operations, and the Groth16 prover. Compile times increase significantly - only enable in binaries that need to generate proofs.

## Re-exports

All items are available under `r14_sdk::prove::`.

| Item | Source Crate | Description |
|---|---|---|
| `setup` | `r14-circuit` | Generate proving key + verification key for the transfer circuit. |
| `prove` | `r14-circuit` | Generate a Groth16 proof given a `TransferCircuit` and proving key. |
| `verify_offchain` | `r14-circuit` | Verify a proof locally without submitting on-chain. |
| `constraint_count` | `r14-circuit` | Returns the number of R1CS constraints in the circuit. |
| `TransferCircuit` | `r14-circuit` | The arkworks circuit struct for a 1-in-2-out private transfer. |
| `PublicInputs` | `r14-circuit` | The public inputs struct: root, nullifier, two output commitments. |
| `serialize_proof_for_soroban` | `serialize` | Convert `Proof<Bls12_381>` to hex strings for Soroban. |
| `serialize_vk_for_soroban` | `serialize` | Convert `VerifyingKey<Bls12_381>` to hex strings for Soroban. |
| `SerializedProof` | `serialize` | Hex-encoded proof struct (a, b, c). |
| `SerializedVK` | `serialize` | Hex-encoded verification key struct. |

## Functions

### `setup`

```rust
pub fn setup() -> (ProvingKey<Bls12_381>, VerifyingKey<Bls12_381>)
```

Runs Groth16 key generation for the `TransferCircuit`. This is expensive (several seconds) and should be done once, then reused.

### `prove`

```rust
pub fn prove(
    pk: &ProvingKey<Bls12_381>,
    circuit: TransferCircuit,
) -> R14Result<Proof<Bls12_381>>
```

Generates a Groth16 proof for the given circuit instance and proving key.

### `verify_offchain`

```rust
pub fn verify_offchain(
    vk: &VerifyingKey<Bls12_381>,
    public_inputs: &PublicInputs,
    proof: &Proof<Bls12_381>,
) -> R14Result<bool>
```

Verifies a proof locally. Returns `true` if valid. Useful for testing before submitting on-chain.

### `constraint_count`

```rust
pub fn constraint_count() -> usize
```

Returns the number of R1CS constraints in the transfer circuit. Useful for benchmarking and CI checks.

## Example: Setup and Prove

```rust
use r14_sdk::prove::{setup, prove, verify_offchain, TransferCircuit, PublicInputs};
use r14_sdk::prove::{serialize_proof_for_soroban, serialize_vk_for_soroban};
use r14_sdk::{SecretKey, Note, commitment, nullifier, owner_hash, wallet};

let mut rng = wallet::crypto_rng();

// One-time setup
let (pk, vk) = setup();

// Build the circuit
let sk = SecretKey::random(&mut rng);
let owner = owner_hash(&sk);

let input_note = Note::new(1_000_000, 0, owner, Fr::rand(&mut rng));
let recipient_owner = owner_hash(&recipient_sk);

let circuit = TransferCircuit::new(
    &sk,
    &input_note,
    &merkle_path,
    recipient_owner,
    500_000,   // recipient value
    500_000,   // change value
    0,         // app_tag
    &mut rng,
);

// Prove
let proof = prove(&pk, circuit)?;

// Verify locally
let public_inputs = PublicInputs {
    root: merkle_root,
    nullifier: nullifier(&sk, &input_note.nonce),
    out_commitment_0: commitment(&recipient_note),
    out_commitment_1: commitment(&change_note),
};
assert!(verify_offchain(&vk, &public_inputs, &proof)?);

// Serialize for on-chain submission
let ser_proof = serialize_proof_for_soroban(&proof);
let ser_vk = serialize_vk_for_soroban(&vk);
```
