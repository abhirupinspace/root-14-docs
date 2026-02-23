---
sidebar_position: 4
---

# r14 transfer

Execute a private transfer with a ZK proof.

## Usage

```bash
r14 transfer <value> <recipient> [--dry-run]
```

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<value>` | Yes | Amount to send |
| `<recipient>` | Yes | Recipient's `owner_hash` in hex (with or without `0x` prefix) |

## Flags

| Flag | Description |
|---|---|
| `--dry-run` | Generate the proof and print it, but don't submit to Soroban |

## What It Does

1. Loads the wallet and parses the secret key, owner hash, and recipient address.
2. Selects the first unspent on-chain note with `value >= <value>`.
3. Fetches the Merkle proof from the indexer (`GET /v1/proof/{index}`).
4. Builds two output notes: recipient note (with `<value>`) and change note (with remaining balance).
5. Runs Groth16 setup with deterministic `seed=42` and generates the ZK proof.
6. Serializes the proof and public inputs for Soroban.
7. Computes the new Merkle root (appending both output commitments).
8. Submits `transfer(proof, old_root, nullifier, cm_0, cm_1, new_root)` to the r14 transfer contract.
9. Marks the consumed note as spent and adds two new output notes to the wallet.

## Output

With `--dry-run`:

```json
{
  "proof": {
    "a": "aabb...",
    "b": "ccdd...",
    "c": "eeff..."
  },
  "public_inputs": [
    "old_root_hex",
    "nullifier_hex",
    "cm_0_hex",
    "cm_1_hex"
  ],
  "nullifier": "0x5e6f7a...",
  "out_commitment_0": "0x1a2b...",
  "out_commitment_1": "0x3c4d..."
}
```

## Note Selection

The CLI auto-selects the first unspent note matching these criteria:

- `spent == false`
- `value >= requested amount`
- `index.is_some()` (confirmed on-chain)

If no matching note exists, the command fails with:

Run `r14 balance` to sync notes with the indexer first, ensuring `index` fields are populated.

## Config Validation

Requires `stellar_secret`, `core_contract_id`, and `transfer_contract_id` to be configured unless `--dry-run` is used.
