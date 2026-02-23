---
sidebar_position: 2
---

# Quickstart

Get from zero to a private transfer in 5 minutes.

## CLI quickstart

```bash
# Install
cargo install r14-cli

# Generate wallet
r14 keygen

# Configure testnet
r14 config set rpc_url https://soroban-testnet.stellar.org
r14 config set indexer_url http://localhost:8080
r14 config set stellar_secret S_YOUR_STELLAR_SECRET
r14 config set core_contract_id CALUKVFDMGPD7434O5BG42XHRYRGXSOH7GHW6DXD2IFF33J5FWAYM3GQ
r14 config set transfer_contract_id CBRKSW66WY5APVMAG6JY4XL27ZSTOKODFDBZNX6BLIMPRAI7GZXF7ZBI

# Initialize contracts (register VK + init transfer)
r14 init-contract

# Deposit 1000 units
r14 deposit 1000

# Check balance
r14 balance

# Transfer 700 to a recipient
r14 transfer 700 <recipient_owner_hash>

# Check balance again
r14 balance
```

## SDK quickstart

```rust
use r14_sdk::client::{R14Client, R14Contracts};
use r14_sdk::wallet::{self, hex_to_fr};
use r14_sdk::{SecretKey, owner_hash};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load wallet
    let mut w = wallet::load_wallet()?;
    let sk = hex_to_fr(&w.secret_key)?;
    let owner = hex_to_fr(&w.owner_hash)?;

    // Create client
    let client = R14Client::new(
        &w.indexer_url,
        R14Contracts {
            core: w.core_contract_id.clone(),
            transfer: w.transfer_contract_id.clone(),
        },
        &w.stellar_secret,
        "testnet",
    )?;

    // Deposit
    let deposit = client.deposit(1000, 1, &owner).await?;
    println!("deposited: {}", deposit.commitment);
    w.notes.push(deposit.note_entry);
    wallet::save_wallet(&w)?;

    // Check balance
    let balance = client.balance(&mut w.notes).await?;
    println!("balance: {}", balance.total);

    Ok(())
}
```

## What just happened?

1. **Keygen** - Generated a random BLS12-381 secret key, derived `owner_hash = Poseidon(sk)`, saved to `~/.r14/wallet.json`
2. **Deposit** - Created a Note (value=1000, app_tag=1, owner=your_hash, nonce=random), computed its Poseidon commitment, submitted on-chain
3. **Balance** - Synced with the indexer to confirm the deposit, summed unspent notes
4. **Transfer** - Found an unspent note, generated a Groth16 proof (7,638 constraints), submitted the proof + nullifier + new commitments on-chain

## Next steps

- [Architecture](/getting-started/architecture) - understand the 3-layer stack
- [Core Concepts](/concepts/notes-utxo) - learn how notes, keys, and Merkle trees work
- [SDK Reference](/sdk/overview) - full API documentation
