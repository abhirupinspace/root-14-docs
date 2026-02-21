---
sidebar_position: 4
---

# Glossary

## Note

UTXO-style private balance record. Contains `value` (u64), `app_tag` (u32), `owner` (Fr), and `nonce` (Fr). Notes are never stored on-chain - only their commitments are. Created with `Note::new(value, app_tag, owner, rng)`.

## Commitment

Poseidon hash of a note: `Poseidon(value, app_tag, owner, nonce)`. Stored on-chain as a leaf in the Merkle tree. Reveals nothing about the note's contents. Computed with `r14_sdk::commitment(&note)`.

## Nullifier

`Poseidon(secret_key, nonce)`. Revealed on-chain when a note is spent to prevent double-spending. Since the nullifier depends on the secret key, only the note owner can produce it. The nonce makes each nullifier unique per note.

## Merkle Root

The root hash of the Poseidon Merkle tree containing all commitments. Used in ZK proofs to demonstrate that a commitment exists in the tree without revealing which one. The tree has depth 20, supporting up to 1,048,576 leaves.

## SecretKey

Random BLS12-381 scalar field element (`Fr`). The fundamental secret from which `owner_hash` and nullifiers are derived. Created with `SecretKey::random(&mut rng)`. Stored in the wallet as `0x`-prefixed hex.

## OwnerHash

`Poseidon(secret_key)`. Serves as the public recipient address. Share this with others so they can create notes owned by you. Cannot be reversed to recover the secret key.

## App Tag

Application identifier (u32) embedded in every note. The transfer circuit enforces that consumed and created notes share the same app tag. This allows different applications to use Root14's privacy infrastructure while keeping their notes logically separated.

## Circuit

R1CS (Rank-1 Constraint System) that defines the rules a ZK proof must satisfy. Root14's transfer circuit enforces ownership, Merkle inclusion, nullifier correctness, output commitment correctness, value conservation, and app tag matching. Contains 7,638 constraints.

## Groth16

Zero-knowledge proof system used by Root14. Produces constant-size proofs (384 bytes) regardless of circuit complexity. Requires a trusted setup (Root14 uses deterministic seed=42). Verification is fast and suitable for on-chain execution.

## BLS12-381

Pairing-friendly elliptic curve used for Groth16 proofs. Provides ~128 bits of security. The scalar field `Fr` is where all field arithmetic happens. G1 and G2 are the two curve groups used in the pairing.

## Poseidon

SNARK-friendly hash function. More efficient inside ZK circuits than SHA-256 or Keccak because it operates natively on field elements. Root14 uses Poseidon with rate=2, full_rounds=8, partial_rounds=31, alpha=17.

## Fr

The scalar field of BLS12-381. All private values (secret keys, nonces, note fields) and hash outputs are elements of this field. Serialized as 32 bytes (64 hex characters).

## VK

Verification Key for Groth16. Generated during trusted setup and registered on `r14-core`. Contains G1/G2 curve points that the on-chain verifier uses to check proofs. The VK's IC (input commitment) array has length = 1 + number_of_public_inputs.

## circuit_id

Content-addressed identifier for a verification key: `SHA256(serialized_vk)`. Computed by `r14-core` during VK registration. Used by `r14-transfer` to look up the correct VK when verifying proofs. Current value: `f28f257e3557c197e2ff29c38cd817a12bfef09e54f3c7904e1caf21985b5736`.

## Sparse Merkle Tree

A Merkle tree where most leaves are empty (zero-valued). Root14's tree has depth 20 but typically only a small fraction of the 2^20 possible leaves are populated. Unpopulated subtrees use precomputed zero hashes for efficiency.

## R14Client

High-level SDK client that wraps wallet management, indexer communication, Soroban contract invocation, and (with the `prove` feature) ZK proof generation. Constructed from a `WalletData` instance or explicit parameters.

## WalletData

Local JSON wallet stored at `~/.r14/wallet.json`. Contains the secret key, owner hash, Stellar signing key, configuration URLs, contract IDs, and an array of note entries. Managed by the `r14_sdk::wallet` module.
