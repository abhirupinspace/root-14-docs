---
sidebar_position: 0
title: r14-examples
description: Two focused Rust demos showcasing Root14's ZK privacy primitives
---

# r14-examples

A companion repo with runnable Rust demos for Root14's core ZK features — private payments with Groth16 proofs and Poseidon commitments for data privacy (zkTLS-style).

## Repo structure

| Path | What it does |
|---|---|
| `private-payments/` | Two-party shielded payment: keygen → deposit → ZK transfer → balance check |
| `zktls/` | Poseidon commitment over private web2 data, simulated range proof flow |

## Prerequisites

- **Rust** 1.75+ with `cargo`
- ~2 GB RAM (Groth16 trusted setup is memory-intensive)

## Quick start

```bash
git clone https://github.com/nickklos10/r14-examples.git
cd r14-examples
```

### Private payments

Full two-party payment flow with Groth16 proof generation, offline:

```bash
cargo run -p private-payments
```

**Sample output:**

```
=== 1. User A: Keygen ===
user_a owner_hash: 0x0077a584480a34...

=== 2. User B: Keygen ===
user_b owner_hash: 0x00a1c3f920b8e7...

=== 3. User A: Deposit 1000 ===
deposited 1000, commitment=0x41813dee706b4b...

=== 4. User A: Transfer 300 to User B ===
generating Groth16 proof...
proof:     a=0x1a2b3c4d5e6f7a8b...
nullifier: 0x42d39245306fdd...

=== 5. Final Balances ===
user_a:
  original note (1000): spent
  change note (700):    commitment=0x48f69c81b79b...
  balance: 700
user_b:
  received note (300):  commitment=0x3e8a7b6c5d4e...
  balance: 300
```

**What happens under the hood:**

1. Generates BLS12-381 secret keys and Poseidon owner hashes for two users
2. Creates a UTXO-style shielded note (value hidden behind a Poseidon commitment)
3. Builds a Merkle membership path and generates a Groth16 proof that the sender owns the note, it exists in the tree, and output values balance
4. The proof reveals **nothing** about amounts, sender, or recipient

### zkTLS

Demonstrates Poseidon commitments over private web2 data — the building block for proving facts about off-chain credentials without revealing them:

```bash
cargo run -p zktls
```

**Sample output:**

```
=== 1. TLS Oracle: Fetch Private Data ===
source:     api.examplebank.com/balance
field:      account_balance_usd
session:    tls13_aead_aes256gcm_sha384_0x7f3a
value:      [REDACTED — known only to prover]

=== 2. Poseidon Commitment ===
commitment: 0x2f8a1b3c4d5e6f7a8b9c0d1e2f3a4b5c...
blinding:   [SECRET]
(commit = Poseidon(value, blinding) — hiding + binding)

=== 3. Range Proof: balance > 10000 ===
claim:      "balance > 10000"
status:     PASS

=== 4. Verification Summary ===
┌─────────────────┬────────────────────────────────────────┐
│ Claim           │ balance > 10000                        │
│ Value revealed  │ NOTHING                                │
│ Proof valid     │ true                                   │
└─────────────────┴────────────────────────────────────────┘
```

**What it demonstrates:**

1. A mock TLS oracle fetches private data (bank balance)
2. The prover commits to the value with `Poseidon(value, blinding)` — hiding and binding
3. A range claim is checked locally (full range proof circuit is a future addition)
4. The verifier sees the commitment and proof result but **never learns the value**

## Running tests

Both examples include unit tests:

```bash
cargo test --workspace
```

## Next steps

- [**Build a ZK Dapp**](./build-zk-dapp) — step-by-step tutorial using every r14-sdk primitive from scratch
- [**SDK Reference**](../sdk/overview) — full r14-sdk API docs
- [**Core Concepts**](../concepts/notes-utxo) — how Notes, Merkle trees, and Groth16 fit together
