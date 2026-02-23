---
sidebar_position: 6
---

# Platform Vision

## Root14 as a Platform

Root14 is not a single privacy app — it's a **ZK privacy platform for Stellar**. Developers sign up, access modular ZK circuits, and build privacy-enabled dApps without touching cryptography.

## Architecture Layers

```
┌─────────────────────────────────────────────┐
│              Developer Dashboard            │  ← accounts, API keys, usage
├─────────────────────────────────────────────┤
│           ZK Modules (pick & use)           │
│  Transfer │ Range │ Membership │ Ownership  │
│  Preimage │ zkTLS                           │
├─────────────────────────────────────────────┤
│              Developer SDK                  │  ← r14-sdk, CLI, indexer
├─────────────────────────────────────────────┤
│         Verification Infrastructure         │  ← r14-core on Soroban
├─────────────────────────────────────────────┤
│              Stellar / Soroban              │
└─────────────────────────────────────────────┘
```

## What's Available Today

| Component | Status | Crate |
|---|---|---|
| Verification registry | Deployed on testnet | r14 core |
| Private transfers | Working E2E | r14 transfer, r14 circuit |
| Range proofs | Working | r14 circuits |
| Membership proofs | Working | r14 circuits |
| Ownership proofs | Working | r14 circuits |
| Preimage proofs | Working | r14 circuits |
| zkTLS | Working (simulated TLS source, real testnet proofs) | r14 zktls |
| SDK | Wallet, serialization, merkle | r14 sdk |
| Indexer | Event scanning + REST API | r14 indexer |
| CLI | Full command set | r14 cli |

**10 Rust crates. 100+ tests. 6 circuit types. On-chain verifier. CLI. SDK. Indexer. Docs.**

## Business Model

| Tier | What You Get | Price |
|---|---|---|
| **Free** | All ZK modules, SDK, CLI, self-hosted indexer | $0 |
| **Pro** | zkTLS API calls, hosted indexer, priority support | Usage-based |
| **Enterprise** | Custom circuits, dedicated notary, SLA | Contact |

The free tier covers everything needed to build privacy dApps with on-chain data. Revenue comes from zkTLS API calls (each TLS attestation requires a notary node) and managed infrastructure.

## Developer Experience

```rust
// 1. Import the module you need
use r14_circuits::range;

// 2. Setup (one-time)
let (pk, vk) = range::setup(&mut rng);

// 3. Prove
let (proof, pi) = range::prove(&pk, value, nonce, min, max, &mut rng);

// 4. Verify (off-chain or on-chain via r14-core)
assert!(range::verify_offchain(&vk, &proof, &pi));
```

Every module follows this pattern: `setup → prove → verify`. No circuit authoring. No elliptic curve math. No trusted setup ceremony.
