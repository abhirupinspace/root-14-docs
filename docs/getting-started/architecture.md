---
sidebar_position: 3
---

# Architecture

## Module responsibilities

| Module | What it does |
|--------|-------------|
| *crate root* | Re-exports core types (`SecretKey`, `Note`, `commitment`, `nullifier`, `owner_hash`, `hash2`) |
| `wallet` | JSON wallet persistence at `~/.r14/wallet.json`, hex-to-Fr conversion, RNG |
| `merkle` | Sparse Merkle tree root computation - offline from leaf list or live via indexer |
| `soroban` | Thin async wrapper around the `stellar` CLI for contract invocation |
| `serialize` | Converts arkworks Groth16 types (G1, G2, Fr, VK, Proof) into hex strings for Soroban |
| `prove` | ZK proof generation - feature-gated, enable with `features = ["prove"]` |

## On-chain contracts

**r14-core** - Verification key registry. Stores Groth16 VKs and verifies proofs. Content-addressed `circuit_id` via `sha256(VK bytes)`. Shared across applications.

**r14-transfer** - Deposit and transfer logic. Maintains the Merkle root (circular buffer of 100 roots), nullifier spent set, and emits events. Calls r14-core for proof verification via cross-contract invocation.

## Off-chain components

**r14-indexer** - Event watcher that polls Soroban RPC for deposit/transfer events, maintains a full Poseidon Merkle tree in memory, persists to SQLite, and serves a REST API for Merkle proofs and leaf lookups.

**r14-cli** - Command-line interface wrapping the SDK. Handles keygen, deposit, transfer, balance, contract initialization, and configuration.
