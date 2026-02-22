---
sidebar_position: 2
---

# zkTLS Integration Guide

## Quick Start

Add `r14-zktls` to your `Cargo.toml`:

```toml
[dependencies]
r14-zktls = { path = "crates/r14-zktls" }
```

## Mock Oracle (Available Now)

The mock oracle simulates a TLS fetch — it produces real Poseidon commitments and real Groth16 proofs, only the TLS attestation itself is simulated.

```rust
use r14_zktls::{mock_fetch, setup, prove_range, verify};
use ark_std::rand::{rngs::StdRng, SeedableRng};

fn main() {
    let mut rng = StdRng::seed_from_u64(42);

    // 1. Fetch — simulate TLS oracle returning value=750
    let attestation = mock_fetch(
        "https://api.bank.com/balance",
        750,
        &mut rng,
    ).unwrap();

    // 2. Setup — one-time per circuit
    let (pk, vk) = setup(&mut rng);

    // 3. Prove — "attested value is between 100 and 1000"
    let proof = prove_range(&pk, &attestation, 100, 1000, &mut rng);

    // 4. Verify
    assert!(verify(&vk, &proof));
}
```

## Types

### TlsAttestation

```rust
pub struct TlsAttestation {
    pub source_url: String,       // URL the data came from
    pub timestamp: u64,           // Unix timestamp of fetch
    pub extracted_value: u64,     // Numeric value from response
    pub nonce: Fr,                // Blinding factor
    pub data_commitment: Fr,      // Poseidon(value, nonce)
    pub tls_signature: Vec<u8>,   // TLS proof bytes
}
```

### ZkTlsProof

```rust
pub struct ZkTlsProof {
    pub attestation: TlsAttestation,
    pub proof: ark_groth16::Proof<Bls12_381>,
    pub min: u64,
    pub max: u64,
}
```

## API Reference

| Function | Signature | Description |
|---|---|---|
| `mock_fetch` | `(url, value, rng) → TlsAttestation` | Simulate TLS fetch with real commitment |
| `setup` | `(rng) → (ProvingKey, VerifyingKey)` | Groth16 setup (delegates to range circuit) |
| `prove_range` | `(pk, attestation, min, max, rng) → ZkTlsProof` | Prove attested value in [min, max] |
| `verify` | `(vk, proof) → bool` | Verify zkTLS range proof |
| `constraint_count` | `() → usize` | R1CS constraint count |

## On-Chain Verification

The zkTLS proof verifies through the same `r14-core.verify()` as every other circuit:

```rust
use r14_sdk::serialize::{serialize_vk_for_soroban, serialize_proof_for_soroban};

// Serialize for Soroban
let svk = serialize_vk_for_soroban(&vk);
let (sproof, inputs) = serialize_proof_for_soroban(
    &zk_proof.proof,
    &[Fr::from(min), Fr::from(max), attestation.data_commitment],
);

// On-chain: register VK, then verify
// r14_core::register(svk) → circuit_id
// r14_core::verify(circuit_id, sproof, inputs) → true
```

## Real TLS Oracle (Coming Soon)

The production path replaces `mock_fetch` with a real TLSNotary session:

```rust
// Future API (not yet implemented)
use r14_zktls::tls_fetch;

let attestation = tls_fetch(
    "https://api.bank.com/balance",
    "$.accounts[0].balance",  // JSONPath to extract
    &notary_config,
).await?;

// Same prove/verify flow from here
let proof = prove_range(&pk, &attestation, 10000, u64::MAX, &mut rng);
```

The notary server at `notary.pse.dev` (run by PSE/EF) acts as the MPC counterparty. Self-hosted notaries are also supported.
