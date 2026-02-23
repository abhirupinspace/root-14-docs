---
sidebar_position: 7
title: MCP Server
description: Expose Root14 operations to AI assistants via the Model Context Protocol
---

# MCP Server

The `r14-mcp` server exposes Root14's private transaction operations — keygen, deposit, transfer, balance — to any AI assistant that supports the [Model Context Protocol](https://modelcontextprotocol.io/). This lets you interact with Root14 through natural language in tools like Claude Code.

## Prerequisites

- **Rust** 1.75+ with `cargo`
- A configured Root14 wallet (or use `r14_keygen` through MCP)

## Install

```bash
cargo install r14-mcp
```

For ZK proof generation (needed for `r14_transfer` and `r14_init_contract`):

```bash
cargo install r14-mcp --features prove
```

## Configure Your MCP Client

### Claude Code

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "r14": {
      "command": "r14-mcp",
      "args": []
    }
  }
}
```

### Other MCP Clients

`r14-mcp` uses **stdio transport** — it reads JSON-RPC from stdin and writes to stdout. Any MCP client that supports stdio servers can use it. Point your client at the `r14-mcp` binary with no arguments.

## Tool Reference

| Tool | Args | Description |
|------|------|-------------|
| `r14_keygen` | — | Generate a new wallet keypair. Creates `~/.r14/wallet.json` with secret key, owner hash, and default config. |
| `r14_deposit` | `value` (u64), `app_tag` (u32, default 1) | Create a shielded note and submit a deposit on-chain. Requires configured `stellar_secret` and contract IDs. |
| `r14_transfer` | `value` (u64), `recipient` (hex) | Private transfer with Groth16 proof generation. Selects an unspent note, proves, and submits on-chain. Requires `prove` feature. |
| `r14_balance` | — | Sync notes with the indexer and return current shielded balance with per-note statuses. |
| `r14_status` | — | Check wallet loaded, contracts configured, indexer reachable, and note sync status. |
| `r14_config_show` | — | Display current wallet configuration. Secrets are masked. |
| `r14_config_set` | `key`, `value` | Update a config value. Valid keys: `rpc_url`, `indexer_url`, `core_contract_id`, `transfer_contract_id`, `stellar_secret`. |
| `r14_init_contract` | — | Register the Groth16 verification key on the core contract and initialize the transfer contract. Run once before transfers. Requires `prove` feature. |

## Resource Reference

Resources provide read-only context that the AI assistant can inspect:

| URI | Name | Description |
|-----|------|-------------|
| `r14://wallet` | Wallet Info | Current wallet state — owner hash, balance, note counts. Secrets are masked. |
| `r14://merkle/root` | Merkle Root | Current on-chain merkle root fetched from the indexer. |
| `r14://contracts` | Contract Info | Deployed contract IDs, configuration status, RPC and indexer URLs. |

## Usage Examples

### Generate a Wallet

Ask your AI assistant:

> "Generate a Root14 wallet"

The assistant calls `r14_keygen` and returns the wallet path and owner hash.

### Configure and Deposit

> "Set my stellar secret to SXXX... and contract IDs to CABC... and CDEF..., then deposit 1000 tokens"

The assistant calls `r14_config_set` three times, then `r14_deposit` with `value: 1000`.

### Private Transfer

> "Transfer 500 to owner hash 0x1a2b..."

The assistant calls `r14_transfer` with the value and recipient, generates a ZK proof, and submits the transaction.

### Check Status

> "What's my Root14 balance?"

The assistant calls `r14_balance`, syncs with the indexer, and reports the total shielded balance with note details.

## Troubleshooting

### Enable Debug Logging

`r14-mcp` logs to **stderr** (stdout is reserved for JSON-RPC). Set the `RUST_LOG` env var:

```json
{
  "mcpServers": {
    "r14": {
      "command": "r14-mcp",
      "args": [],
      "env": {
        "RUST_LOG": "r14_mcp=debug"
      }
    }
  }
}
```

### "requires the 'prove' feature"

`r14_transfer` and `r14_init_contract` need ZK proof generation. Reinstall with:

```bash
cargo install r14-mcp --features prove
```

### Indexer Unreachable

Run `r14_status` to check connectivity. Update the indexer URL with:

```
r14_config_set key=indexer_url value=http://your-indexer:3000
```

### Wallet Not Found

Run `r14_keygen` to create a new wallet, then configure it with `r14_config_set`.
