---
sidebar_position: 1
slug: /
---

# What is Root14?

**Root14** is a ZK privacy platform for Stellar. Developers use modular circuits, a zkTLS bridge, and an on-chain verifier to add zero-knowledge features to any Soroban app — without touching cryptography.

10 Rust crates. 100+ tests. 6 circuit types. On-chain verifier. zkTLS. SDK. Indexer. CLI. Docs.

Root14 gives you:

- **Privacy modules** — Transfer, Range, Membership, Ownership, Preimage, zkTLS
- **Shared verifier** — `r14-core` on Soroban: register any circuit, any app calls `verify()`
- **zkTLS bridge** — Prove claims about web2 data (bank balances, IDs) on-chain
- **Developer SDK** — Wallet, serialization, Merkle proofs, transaction submission
- **Infrastructure** — Event indexer, CLI, documentation

## Who is this for?

- **Dapp builders** integrating private transfers into Rust backends or services
- **Tooling developers** building indexers, dashboards, or analytics for Root14
- **Protocol contributors** extending the Root14 standard

## How private transfers work

1. A sender creates a **Note** (value + owner + random nonce)
2. The note's **commitment** (Poseidon hash) is posted on-chain - the note data stays private
3. To spend, the sender generates a ZK proof that they know the note's secret key and the note exists in the Merkle tree
4. The proof reveals a **nullifier** (prevents double-spend) but nothing about the note itself
5. Two new output notes are created: one for the recipient, one for change

The on-chain contract only sees: commitments, nullifiers, Merkle roots, and proofs. All amounts and ownership remain private.

## Crate layout

| Crate | Role |
|-------|------|
| `r14-sdk` | Client library - wallet, merkle, soroban, serialization |
| `r14-circuit` | ZK proof generation and verification (Groth16) |
| `r14-circuits` | Pre-built circuit library (range, membership, ownership, preimage) |
| `r14-types` | Core types (Note, SecretKey, MerklePath) - re-exported by SDK |
| `r14-poseidon` | Poseidon hash functions - re-exported by SDK |
| `r14-core` | Soroban contract: VK registry and proof verification |
| `r14-transfer` | Soroban contract: deposit and transfer logic |
| `r14-indexer` | Off-chain service: Merkle tree and event indexing |
| `r14-zktls` | zkTLS module - TLS attestation + ZK range proofs over web2 data |
| `r14-cli` | CLI tool wrapping the SDK |

## Quick links

- [Quickstart](/getting-started/quickstart) - 5-minute keygen → deposit → transfer → balance
- [SDK Reference](/sdk/overview) - Full API surface
- [CLI Reference](/cli/overview) - All commands
- [Architecture](/getting-started/architecture) - Stack diagram and data flows
- [zkTLS](/zktls/overview) - Prove claims about web2 data on-chain
- [Platform Vision](/concepts/platform) - Dashboard, modules, business model
- [Core Concepts](/concepts/notes-utxo) - Notes, keys, Merkle tree, Groth16
