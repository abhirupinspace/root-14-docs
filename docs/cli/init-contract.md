---
sidebar_position: 7
---

# r14 init-contract

Register the verification key on `r14-core` and initialize the `r14-transfer` contract. This is a one-time setup step required before any deposits or transfers.

## Usage

```bash
r14 init-contract
```

## Prerequisites

All three config values must be set before running:

```bash
r14 config set stellar_secret SXXXX...
r14 config set core_contract_id CBTFD...
r14 config set transfer_contract_id CCBUW...
```

## What It Does

### Step 1: Register Verification Key on r14-core

1. Runs Groth16 trusted setup with deterministic `seed=42` to generate the verification key.
2. Serializes the VK components (alpha_g1, beta_g2, gamma_g2, delta_g2, ic) to hex.
3. Derives the caller's Stellar public key from the configured `stellar_secret`.
4. Calls `register(caller, vk)` on the `r14-core` contract.
5. The contract computes `circuit_id = SHA256(vk)` and stores the VK. Returns the `circuit_id`.

### Step 2: Initialize r14-transfer

1. Computes the empty Merkle root (`hash2(0,0)` iterated 20 times).
2. Calls `init(core_contract, circuit_id, empty_root)` on the `r14-transfer` contract.
3. The transfer contract stores the reference to `r14-core`, the `circuit_id` for proof verification, and initializes the Merkle root to the empty root.

## Output

With `--json`:

```json
{
  "circuit_id": "f28f257e3557c197e2ff29c38cd817a12bfef09e54f3c7904e1caf21985b5736",
  "result": "<soroban tx result>"
}
```

## Deterministic Setup

The seed `42` is hardcoded and must be used consistently everywhere. It ensures the proving key used by `r14 transfer` produces proofs that verify against the VK registered here. Changing the seed will result in a VK mismatch and all proofs will fail on-chain verification.

## Idempotency

Calling `init-contract` a second time with the same VK will fail because `r14-core` rejects duplicate VK registrations. To re-initialize, deploy fresh contracts.
