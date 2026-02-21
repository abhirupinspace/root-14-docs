---
sidebar_position: 1
---

# Key Generation

Generate a Root14 wallet with a secret key and owner hash.

## Using the CLI

```bash
r14 keygen
```

The wallet is stored at `~/.r14/wallet.json`. If a wallet already exists, the command refuses to overwrite it - delete the file first to regenerate.

## Using the SDK

```rust
use r14_sdk::{SecretKey, owner_hash};
use r14_sdk::wallet::{crypto_rng, fr_to_hex, save_wallet, WalletData};

fn main() -> anyhow::Result<()> {
    // 1. Generate a random secret key
    let mut rng = crypto_rng();
    let sk = SecretKey::random(&mut rng);

    // 2. Derive the owner hash (public identifier)
    let owner = owner_hash(&sk);

    // 3. Build the wallet structure
    let wallet = WalletData {
        secret_key: fr_to_hex(&sk.0),
        owner_hash: fr_to_hex(&owner.0),
        stellar_secret: "PLACEHOLDER".into(),
        notes: vec![],
        indexer_url: "http://localhost:3000".into(),
        rpc_url: "https://soroban-testnet.stellar.org:443".into(),
        core_contract_id: "PLACEHOLDER".into(),
        transfer_contract_id: "PLACEHOLDER".into(),
    };

    // 4. Save to disk
    save_wallet(&wallet)?;

    println!("owner_hash: {}", wallet.owner_hash);
    Ok(())
}
```

## Wallet JSON Structure

```json
{
  "secret_key": "0x05a1b2c3d4e5f6...64 hex chars after 0x",
  "owner_hash": "0x1a2b3c4d5e6f70...64 hex chars after 0x",
  "stellar_secret": "PLACEHOLDER",
  "notes": [],
  "indexer_url": "http://localhost:3000",
  "rpc_url": "https://soroban-testnet.stellar.org:443",
  "core_contract_id": "PLACEHOLDER",
  "transfer_contract_id": "PLACEHOLDER"
}
```

`secret_key` and `owner_hash` are `0x`-prefixed big-endian hex, 66 characters total (2 for `0x` + 64 hex digits = 32 bytes).

## Security

- **Share**: `owner_hash` - this is your public address. Others need it to send you private transfers.
- **Never share**: `secret_key` - anyone with this can spend all your notes.
- **Never share**: `stellar_secret` - this is your Stellar signing key used for on-chain transactions.

The `owner_hash` is derived as `Poseidon(secret_key)` - a one-way hash. It cannot be reversed to recover the secret key.
