---
sidebar_position: 0
title: r14-examples
description: Two Rust demos — offline Groth16 payments and real Stellar testnet zkTLS flow
---

# r14-examples

Runnable Rust demos for Root14's ZK privacy features on Stellar.

## Repo structure

| Path | What it does | Network |
|---|---|---|
| `private-payments/` | Two-party shielded payment: keygen → deposit → Groth16 transfer → balance | Offline |
| `zktls/` | TLS oracle → Poseidon commitment → testnet deposit → private ZK transfer | Stellar testnet |

## Prerequisites

- **Rust** 1.75+ with `cargo`
- ~2 GB RAM (Groth16 trusted setup is memory-intensive)
- **For zktls only:** a configured wallet at `~/.r14/wallet.json` — run `r14_keygen` then `r14_config_set` for `stellar_secret`, `core_contract_id`, and `transfer_contract_id`

## Quick start

```bash
git clone https://github.com/abhirupinspace/r14-example.git
cd r14-example
```

### Private payments

Full two-party payment flow with Groth16 proof generation (offline — no testnet required):

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

End-to-end flow: TLS oracle → Poseidon commitment → Stellar testnet deposit → private ZK transfer with Groth16 proof.

**Prerequisites:** a configured wallet at `~/.r14/wallet.json` (run `r14_keygen` + `r14_config_set` first).

```bash
cargo run -p zktls
```

**Sample output:**

```
=== 0. Load Wallet ===
owner_hash: 0x0077a584480a34...
rpc:        https://soroban-testnet.stellar.org
indexer:    http://localhost:3000

=== 1. TLS Oracle: Fetch Private Data ===
source:     api.examplebank.com/balance
field:      account_balance_usd
session:    tls13_aead_aes256gcm_sha384_0x7f3a
value:      [REDACTED — known only to prover]

=== 2. Poseidon Commitment ===
commitment: 0x2f8a1b3c4d5e6f7a8b9c0d1e2f3a4b5c...
blinding:   [SECRET]
(commit = Poseidon(value, blinding) — hiding + binding)

=== 3. Deposit 15000 on Stellar Testnet ===
commitment: 0x41813dee706b4b...
tx:         success
deposited 15000 as shielded note

=== 4. Balance Check ===
total: 15000
  note 15000 | on_chain=true | tag=1

=== 5. Private Transfer (Groth16 ZK Proof) ===
bob owner:  0x00a1c3f920b8e7...
amount:     5000
generating Groth16 proof...
nullifier:  0x42d39245306fdd...
recipient:  0x3e8a7b6c5d4e...
change:     0x48f69c81b79b...
tx:         success

=== 6. Final Balance ===
total: 10000
  note 10000 | on_chain=true | tag=1
```

**What it demonstrates:**

1. Loads wallet config and connects to Stellar testnet
2. A TLS oracle fetches private data (bank balance)
3. The prover commits to the value with `Poseidon(value, blinding)` — hiding and binding
4. The committed value is deposited as a real shielded note on Stellar testnet
5. A Groth16 ZK proof privately transfers part of the balance to a second user
6. Balance updates reflect the transfer — **value never revealed on-chain**

## Running tests

Both examples include unit tests:

```bash
cargo test --workspace
```

## Next steps

- [**Build a ZK Dapp**](./build-zk-dapp) — step-by-step tutorial using every r14-sdk primitive from scratch
- [**SDK Reference**](../sdk/overview) — full r14-sdk API docs
- [**Core Concepts**](../concepts/notes-utxo) — how Notes, Merkle trees, and Groth16 fit together
