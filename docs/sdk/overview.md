---
sidebar_position: 1
---

# SDK Overview

`r14-sdk` is the primary Rust crate for building dapps on Root14. It re-exports core types, provides wallet persistence, Merkle tree utilities, Soroban contract interaction, proof serialization, and optional ZK proof generation.

## Modules

| Module | What it does |
|---|---|
| crate root | Re-exports core types and Poseidon functions |
| `wallet` | Wallet JSON persistence, hex-to-Fr conversion |
| `merkle` | Offline and indexer-backed Merkle root computation |
| `soroban` | Stellar CLI wrapper for on-chain contract calls |
| `serialize` | Groth16 proof/VK to hex for Soroban contracts |
| `prove` | ZK proof generation (feature-gated behind `prove`) |

## Feature Flags

```toml
[dependencies]
r14-sdk = "0.1"                    # core modules only
r14-sdk = { version = "0.1", features = ["prove"] }  # + ZK proving
```

The `prove` feature pulls in `r14-circuit` (arkworks Groth16) and the serialization helpers needed to submit proofs on-chain. Without it, the crate compiles faster and avoids heavy cryptographic dependencies - useful for indexers, wallets, or any service that only reads/submits pre-built proofs.

## Re-exported Types

These are available at the crate root (`r14_sdk::SecretKey`, etc.) so downstream code never needs to depend on `r14-types` or `r14-poseidon` directly.

| Item | Source | Description |
|---|---|---|
| `SecretKey` | `r14-types` | Wrapper around `Fr`. Create with `SecretKey::random(&mut rng)`. |
| `Note` | `r14-types` | UTXO: `value` + `app_tag` + `owner` + `nonce`. |
| `Nullifier` | `r14-types` | Spend tag derived from secret key and nonce. Prevents double-spend. |
| `MerklePath` | `r14-types` | Sibling hashes + index bits for a Merkle inclusion proof. |
| `MerkleRoot` | `r14-types` | Wrapper around `Fr` representing the tree root. |
| `MERKLE_DEPTH` | `r14-types` | Tree depth, currently `20`. |
| `commitment()` | `r14-poseidon` | `Poseidon(value, app_tag, owner, nonce)` - leaf hash. |
| `nullifier()` | `r14-poseidon` | `Poseidon(sk, nonce)` - spend nullifier. |
| `owner_hash()` | `r14-poseidon` | `Poseidon(sk)` - public owner identifier. |
| `hash2()` | `r14-poseidon` | Two-input Poseidon hash used for Merkle nodes. |

## Minimal Example

```rust
use r14_sdk::{SecretKey, Note, commitment, owner_hash, wallet};

fn main() {
    let mut rng = wallet::crypto_rng();
    let sk = SecretKey::random(&mut rng);
    let owner = owner_hash(&sk);

    let note = Note::new(1_000_000, 0, owner, Fr::rand(&mut rng));
    let cm = commitment(&note);

    println!("commitment: {}", wallet::fr_to_hex(&cm));
}
```
