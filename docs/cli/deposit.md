---
sidebar_position: 3
---

# r14 deposit

Create a private note and optionally submit it on-chain.

## Usage

```bash
r14 deposit <value> [--app-tag <n>] [--local-only]
```

## Arguments

| Argument | Required | Description |
|---|---|---|
| `<value>` | Yes | Note value (u64) |

## Flags

| Flag | Default | Description |
|---|---|---|
| `--app-tag <n>` | `1` | Application identifier for the note. Must match across transfers. |
| `--local-only` | off | Create the note in the wallet but skip on-chain submission. |

## What It Does

1. Loads the wallet from `~/.r14/wallet.json`.
2. Creates a `Note` with the given `value`, `app_tag`, wallet's `owner_hash`, and a random nonce.
3. Computes `commitment = Poseidon(value, app_tag, owner, nonce)`.
4. Saves the `NoteEntry` to the wallet's `notes` array.
5. (Unless `--local-only`) Fetches existing leaves from the indexer, computes the new Merkle root, and invokes `deposit(cm, new_root)` on the r14 transfer contract.

## Output

With `--json`:

```json
{
  "value": 1000,
  "app_tag": 1,
  "commitment": "0x1a2b3c...",
  "on_chain": true,
  "result": "<soroban tx result>"
}
```

## Config Validation

When submitting on-chain (without `--local-only`), requires `stellar_secret`, `core_contract_id`, and `transfer_contract_id` to be configured (not `PLACEHOLDER`).

## Local-Only Notes

Notes created with `--local-only` exist only in the wallet file. They have `index: null` and cannot be used as transfer inputs until they are deposited on-chain. You can deposit them later by running `r14 deposit <value>` without `--local-only` (this creates a new note - the local-only note remains unspent but orphaned).
