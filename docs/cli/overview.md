---
sidebar_position: 1
---

# CLI Overview

The `r14` CLI provides a command-line interface for private transfers on Stellar.

## Installation

```bash
cargo install r14-cli
```

Requires the [Stellar CLI](https://github.com/stellar/stellar-cli) on `$PATH` for on-chain commands.

## Global Flags

| Flag | Description |
|---|---|
| `--json` | Machine-readable JSON output (suppresses spinners and colored text) |

## Commands

| Command | Description |
|---|---|
| `r14 keygen` | Generate keypair + wallet |
| `r14 deposit <value>` | Create note + submit on-chain |
| `r14 transfer <value> <recipient>` | Private transfer with ZK proof |
| `r14 balance` | Sync + show balance |
| `r14 init-contract` | Register VK + init contracts |
| `r14 compute-root <cms...>` | Offline Merkle root |
| `r14 status` | Wallet/indexer health check |
| `r14 config set <key> <value>` | Set a config value |
| `r14 config show` | Show current config |

## Config Validation

Commands that interact with the blockchain (`deposit`, `transfer`, `init-contract`) validate that the following config values are not `PLACEHOLDER` before executing:

- `stellar_secret`
- `core_contract_id`
- `transfer_contract_id`

If any are still set to `PLACEHOLDER`, the command exits with an error:

Commands that don't hit the chain (`keygen`, `balance`, `compute-root`, `status`, `config`) skip this validation. The `deposit --local-only` and `transfer --dry-run` flags also bypass it.

## Typical Workflow

```bash
# 1. Create wallet
r14 keygen

# 2. Configure Stellar secret and contract IDs
r14 config set stellar_secret SXXXX...
r14 config set core_contract_id CBTFD...
r14 config set transfer_contract_id CCBUW...

# 3. Initialize contracts (one-time)
r14 init-contract

# 4. Deposit funds
r14 deposit 10000

# 5. Check balance (syncs with indexer)
r14 balance

# 6. Transfer to another user
r14 transfer 5000 0xRECIPIENT_OWNER_HASH

# 7. Check status
r14 status
```
