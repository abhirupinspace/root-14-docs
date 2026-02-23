---
sidebar_position: 6
---

# r14 config / r14 status

Manage wallet configuration and check system health.

## r14 config set

```bash
r14 config set <key> <value>
```

Sets a configuration value in the wallet file.

### Allowed Keys

| Key | Description |
|---|---|
| `rpc_url` | Soroban RPC endpoint URL |
| `indexer_url` | Root14 indexer URL |
| `core_contract_id` | Deployed r14 core contract ID |
| `transfer_contract_id` | Deployed r14 transfer contract ID |
| `stellar_secret` | Stellar signing key (`S...`) |

### Examples

```bash
r14 config set stellar_secret SXXXX...
r14 config set core_contract_id CALUKVFDMGPD7434O5BG42XHRYRGXSOH7GHW6DXD2IFF33J5FWAYM3GQ
r14 config set transfer_contract_id CBRKSW66WY5APVMAG6JY4XL27ZSTOKODFDBZNX6BLIMPRAI7GZXF7ZBI
r14 config set indexer_url http://localhost:3000
r14 config set rpc_url https://soroban-testnet.stellar.org:443
```

## r14 config show

```bash
r14 config show
```

Displays current configuration. Sensitive values (`secret_key`, `stellar_secret`) are masked - only the first 4 and last 4 characters are shown.

Values still set to `PLACEHOLDER` are shown as-is (not masked).

With `--json`:

```json
{
  "secret_key": "0x05***ef01",
  "owner_hash": "0x1a2b3c4d5e6f...",
  "stellar_secret": "SXXE***XXXX",
  "rpc_url": "https://soroban-testnet.stellar.org:443",
  "indexer_url": "http://localhost:3000",
  "core_contract_id": "CBTFD...",
  "transfer_contract_id": "CCBUW...",
  "notes_count": 3
}
```

## r14 status

```bash
r14 status
```

Health check for wallet, contracts, and indexer.

### What It Checks

1. **Wallet loaded?** Does `~/.r14/wallet.json` exist and parse correctly?
2. **Contracts configured?** Are `stellar_secret`, `core_contract_id`, and `transfer_contract_id` all set (not `PLACEHOLDER`)?
3. **Indexer reachable?** Can we reach `{indexer_url}/v1/root` within 3 seconds?
4. **Notes synced?** How many unspent notes exist and how many have on-chain indices?

With `--json`:

```json
{
  "wallet_loaded": true,
  "contracts_configured": true,
  "indexer_reachable": true,
  "notes_total": 5,
  "notes_synced": 3
}
```
