---
sidebar_position: 0
title: Demo Dapp
description: Run the Root14 private payments demo in under 3 minutes
---

# Demo Dapp

Get a feel for Root14's private payment flow — keygen, deposit, transfer, and balance — without writing any integration code.

## Prerequisites

- **Rust** 1.75+ with `cargo`
- **Stellar CLI** (`stellar`) — [install guide](https://developers.stellar.org/docs/tools/cli)
- A funded **Stellar testnet** account (optional — the demo runs offline by default)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/abhirupinspace/root-14-core.git
cd root-14-core/r14-dev

# 2. Run the demo (offline mode)
cargo run -p private-payments
```

That's it. You'll see colored output walking through every step of the protocol.

## Live Mode (Testnet)

To run against the real Stellar testnet, set these environment variables:

```bash
export R14_STELLAR_SECRET="S..."           # funded testnet secret key
export R14_CORE_CONTRACT="C..."            # deployed r14-core contract ID
export R14_TRANSFER_CONTRACT="C..."        # deployed r14-transfer contract ID
export R14_INDEXER_URL="http://localhost:3000"  # your indexer endpoint

cargo run -p private-payments
```

## Walkthrough

### Step 1: Keygen

```
━━━ Step 1: Generate keypair ━━━
  owner_hash: 0x0077a584480a34385ee7920e...
```

Generates a BLS12-381 secret key and computes the Poseidon `owner_hash`. This is your identity in the Root14 system — it never leaves your machine.

### Step 2: Configure Client

```
━━━ Step 2: Configure client ━━━
  indexer: http://localhost:3000
  network: testnet
  mode: offline demo (set R14_* env vars for live)
```

Sets up the `R14Client` with indexer URL, contract addresses, and Stellar credentials. In offline mode, on-chain steps are skipped.

### Step 3: Create Shielded Notes (Deposit)

```
━━━ Step 3: Create shielded notes ━━━
  note_a: value=1000 commitment=0x41813dee706b4b87...
  note_b: value=500  commitment=0x48f69c81b79b1262...
```

Creates UTXO-style notes with Poseidon hash commitments. Only the commitment goes on-chain — the value is hidden.

### Step 4: Compute Merkle Root

```
━━━ Step 4: Compute merkle root ━━━
  root: 50ecaad8fcc7c822cb...
```

Computes the Merkle tree root from note commitments. The on-chain contract stores this root to verify membership proofs.

### Step 5: Check Balance

```
━━━ Step 5: Check balance ━━━
  total: 1500
  [0] value=1000 local
  [1] value=500  local
```

Aggregates unspent note values. Only the key holder can compute this — the indexer never sees decrypted values.

### Step 6: ZK Transfer

```
━━━ Step 6: Generate ZK transfer proof ━━━
  proof generated! ✓
  transfer: 300 → recipient
  change: 700 → self
  nullifier: 0x42d39245306fdd84...
```

Generates a Groth16 proof that:

1. The sender owns the consumed note (knows the secret key)
2. The consumed note exists in the Merkle tree
3. Output notes preserve the value balance (input = output₀ + output₁)

The proof reveals **nothing** about amounts, sender, or recipient.

## Web Demo

An interactive web version is available at [`/demo`](https://root14.dev/demo) on the Root14 website. It simulates the same flow with a step-by-step UI.

## Build Your Own

Ready to integrate Root14 into your dapp?

1. **SDK docs** — [r14-sdk reference](../sdk/overview) covers the full client API
2. **Integration guides** — step-by-step for [keygen](./keygen), [deposits](./deposits), [transfers](./transfers)
3. **CLI reference** — [r14 CLI](../cli/overview) for command-line usage
4. **Smart contracts** — [r14-core](../contracts/r14-core) and [r14-transfer](../contracts/r14-transfer) contract specs
