---
sidebar_position: 5
---

# r14 balance

Sync unspent notes with the indexer and display your balance.

## Usage

```bash
r14 balance
```

## What It Does

1. Loads the wallet from `~/.r14/wallet.json`.
2. For each unspent note without an on-chain index, queries `GET /v1/leaf/{commitment}` on the indexer to check if it has been indexed.
3. Updates the wallet with any newly discovered on-chain indices.
4. Saves the wallet.
5. Displays total balance and per-note details.

## Output

Notes with an `index` are shown as **on-chain** (green). Notes without an index are shown as **local-only** (yellow) - they haven't been confirmed on-chain or the indexer hasn't synced them yet.

With `--json`:

```json
{
  "balance": 2500,
  "notes": [
    {
      "value": 1000,
      "app_tag": 1,
      "commitment": "0x1a2b...",
      "index": 3,
      "status": "on-chain"
    },
    {
      "value": 1500,
      "app_tag": 1,
      "commitment": "0x3c4d...",
      "index": null,
      "status": "local-only"
    }
  ]
}
```

## Indexer Unreachable

If the indexer is unreachable, the command still shows the balance from local state. Notes that need syncing will remain as `local-only` until the indexer is available and the command is run again.
