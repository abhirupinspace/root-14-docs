---
sidebar_position: 1
---

# Installation

## Rust toolchain

Root14 requires Rust edition 2021 (stable or nightly).

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Add r14 SDK

Add r14 SDK to your `Cargo.toml`:

```toml
[dependencies]
r14-sdk = { path = "crates/r14-sdk" }
```

To include ZK proof generation (pulls in r14 circuit automatically):

```toml
[dependencies]
r14-sdk = { path = "crates/r14-sdk", features = ["prove"] }
```

r14 SDK re-exports r14 types and r14 poseidon - you don't need to depend on them directly.

## What you get from r14 SDK alone

- Key generation and wallet management
- Note creation and commitment computation
- Nullifier derivation
- Merkle root computation (offline and via indexer)
- Proof/VK serialization for Soroban
- On-chain contract invocation

## What requires the `prove` feature

- Groth16 trusted setup (`r14_sdk::prove::setup()`)
- Proof generation (`r14_sdk::prove::prove()`)
- Off-chain proof verification (`r14_sdk::prove::verify_offchain()`)

## Stellar CLI

The `soroban` module shells out to the `stellar` binary for contract invocation. Install it:

```bash
cargo install stellar-cli
```

Or follow the [official instructions](https://github.com/stellar/stellar-cli#installation).

## Runtime requirements

For on-chain operations you need:

- **Stellar CLI** on `$PATH`
- **r14 indexer** running instance - for `merkle::compute_new_root` and balance sync
- **Soroban testnet** - deployed r14 core and r14 transfer contracts
- **Funded Stellar account** - testnet account with secret key (`S...`)

These are only needed for on-chain operations. Offline operations (keygen, note creation, merkle computation, serialization) work without them.

## Running the indexer

```bash
cargo run -p r14-indexer
```

By default, the indexer listens on `http://localhost:3000`.

## CLI installation

```bash
cargo install r14-cli
```
