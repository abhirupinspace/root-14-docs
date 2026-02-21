---
sidebar_position: 5
---

# Serialize

The `serialize` module converts Groth16 proof elements and verification keys from arkworks in-memory representations into hex-encoded byte strings that Soroban contracts can consume.

## Byte Order Reference

| Element | Byte Order | Raw Size | Hex Length |
|---|---|---|---|
| G1 (BLS12-381) | Little-endian | 96 bytes | 192 hex chars |
| G2 (BLS12-381) | Little-endian | 192 bytes | 384 hex chars |
| Fr (scalar) | Big-endian | 32 bytes | 64 hex chars |

**Important:** Arkworks internally stores `Fr` scalars in little-endian limb order. `serialize_fr` reverses the bytes to produce big-endian output, matching the byte order expected by Soroban's `U256` type.

## Structs

### SerializedProof

```rust
pub struct SerializedProof {
    pub a: String,   // G1 - 192 hex chars
    pub b: String,   // G2 - 384 hex chars
    pub c: String,   // G1 - 192 hex chars
}
```

Maps directly to the three elements of a Groth16 proof (A, B, C).

### SerializedVK

```rust
pub struct SerializedVK {
    pub alpha_g1: String,          // G1 - 192 hex chars
    pub beta_g2: String,           // G2 - 384 hex chars
    pub gamma_g2: String,          // G2 - 384 hex chars
    pub delta_g2: String,          // G2 - 384 hex chars
    pub gamma_abc_g1: Vec<String>, // Vec<G1> - each 192 hex chars
}
```

The verification key fields correspond to the standard Groth16 VK structure. `gamma_abc_g1` contains one entry per public input plus one.

## Functions

### `serialize_g1`

```rust
pub fn serialize_g1(point: &G1Affine) -> String
```

Serializes a BLS12-381 G1 affine point to a 192-character hex string using arkworks' uncompressed little-endian serialization.

### `serialize_g2`

```rust
pub fn serialize_g2(point: &G2Affine) -> String
```

Serializes a BLS12-381 G2 affine point to a 384-character hex string using arkworks' uncompressed little-endian serialization.

### `serialize_fr`

```rust
pub fn serialize_fr(scalar: &Fr) -> String
```

Serializes an `Fr` scalar to a 64-character hex string. Internally serializes with arkworks (little-endian), then reverses the byte array to produce big-endian output matching Soroban's `U256` expectations.

```rust
let hex = serialize_fr(&public_input);
assert_eq!(hex.len(), 64);
```

### `serialize_proof_for_soroban`

```rust
pub fn serialize_proof_for_soroban(proof: &Proof<Bls12_381>) -> SerializedProof
```

Converts a complete Groth16 proof into its hex-encoded form ready for on-chain submission.

```rust
let serialized = serialize_proof_for_soroban(&proof);
// serialized.a - 192 hex chars (G1)
// serialized.b - 384 hex chars (G2)
// serialized.c - 192 hex chars (G1)
```

### `serialize_vk_for_soroban`

```rust
pub fn serialize_vk_for_soroban(vk: &VerifyingKey<Bls12_381>) -> SerializedVK
```

Converts a Groth16 verification key into its hex-encoded form for registration on the `r14-core` contract.

```rust
let serialized_vk = serialize_vk_for_soroban(&proving_key.vk);
// Pass to R14Client::init_contracts or submit manually
```

## End-to-End Example

```rust
use r14_sdk::serialize::{serialize_proof_for_soroban, serialize_vk_for_soroban};

// After proving
let (pk, proof) = /* ... generate proof ... */;

let ser_proof = serialize_proof_for_soroban(&proof);
let ser_vk = serialize_vk_for_soroban(&pk.vk);

// Submit proof on-chain
client.transfer_with_proof(&ser_proof, &recipient_note, &change_note, idx).await?;
```
