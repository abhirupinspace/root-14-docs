---
sidebar_position: 2
---

# r14 keygen

Generate a new Root14 keypair and create the wallet file.

## Usage

```bash
r14 keygen
```

## What It Does

1. Checks if `~/.r14/wallet.json` already exists. If so, exits with an error to prevent accidental overwrite.
2. Generates a random `SecretKey` (BLS12-381 field element).
3. Derives `owner_hash = Poseidon(secret_key)`.
4. Creates the wallet file with default config values.
5. Prints the `owner_hash` to share with others.

## Output

With `--json`:

```json
{
  "wallet_path": "/home/user/.r14/wallet.json",
  "owner_hash": "0x1a2b3c4d5e6f..."
}
```

## Directory Creation

Creates `~/.r14/` if it doesn't exist. The wallet file is always stored at `~/.r14/wallet.json`.

## Default Config Values

The newly created wallet has placeholder values that need to be configured before on-chain operations:

| Key | Default Value |
|---|---|
| `stellar_secret` | `PLACEHOLDER` |
| `indexer_url` | `http://localhost:3000` |
| `rpc_url` | `https://soroban-testnet.stellar.org:443` |
| `core_contract_id` | `PLACEHOLDER` |
| `transfer_contract_id` | `PLACEHOLDER` |

Use `r14 config set <key> <value>` to configure these before depositing or transferring.

## Re-generating

To regenerate a wallet, delete the existing file first:

```bash
rm ~/.r14/wallet.json
r14 keygen
```

This creates a completely new keypair. Any notes from the previous wallet will be lost.
