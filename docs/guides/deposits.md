---
sidebar_position: 2
---

# Deposits

Deposit funds into the Root14 privacy pool. A deposit creates a private note and registers its commitment on-chain.

## Three-Step Process

### Step 1: Create a Note

A note is Root14's UTXO - a private balance record containing `value`, `app_tag`, `owner`, and a random `nonce`.

```rust
use r14_sdk::{Note, commitment, owner_hash, SecretKey};
use r14_sdk::wallet::{crypto_rng, hex_to_fr, fr_to_hex};

let mut rng = crypto_rng();

// Load owner from wallet
let owner_fr = hex_to_fr(&wallet.owner_hash)?;

// Create the note
let note = Note::new(1_000, 1, owner_fr, &mut rng);

// Compute the commitment: Poseidon(value, app_tag, owner, nonce)
let cm = commitment(&note);
println!("commitment: {}", fr_to_hex(&cm));
```

### Step 2: Save to Wallet

Push the note entry into the local wallet file for future spending.

```rust
use r14_sdk::wallet::{NoteEntry, load_wallet, save_wallet, fr_to_hex};

let mut wallet = load_wallet()?;

wallet.notes.push(NoteEntry {
    value: note.value,
    app_tag: note.app_tag,
    owner: fr_to_hex(&note.owner),
    nonce: fr_to_hex(&note.nonce),
    commitment: fr_to_hex(&cm),
    index: None,   // populated after indexer sync
    spent: false,
});

save_wallet(&wallet)?;
```

### Step 3: Submit On-Chain

Compute the new Merkle root (including the new commitment) and invoke the `deposit` function on the r14 transfer contract.

```rust
use r14_sdk::merkle::compute_new_root;
use r14_sdk::soroban::invoke_contract;
use r14_sdk::wallet::fr_to_raw_hex;

// Strip the 0x prefix for Soroban
let cm_hex = fr_to_raw_hex(&cm);

// Fetch existing leaves from indexer, append cm, compute root
let new_root = compute_new_root(&wallet.indexer_url, &[cm]).await?;

// Submit to r14-transfer contract
let result = invoke_contract(
    &wallet.transfer_contract_id,
    "testnet",
    &wallet.stellar_secret,
    "deposit",
    &[("cm", &cm_hex), ("new_root", &new_root)],
).await?;

println!("deposit tx: {}", result);
```

## What Happens On-Chain

When `deposit` is called on r14 transfer:

1. The commitment `cm` is added to the contract's commitment set
2. The Merkle root is updated to `new_root`
3. A deposit event is emitted with the commitment
4. The indexer polls Soroban RPC events, picks up the new commitment, and inserts it into its local Merkle tree + SQLite database

After the indexer syncs, `r14 balance` will show the note's on-chain index.

## Using the High-Level Client

```rust
use r14_sdk::{R14Client, R14Contracts};
use r14_sdk::wallet::{load_wallet, hex_to_fr, save_wallet};

let wallet = load_wallet()?;
let client = R14Client::from_wallet(&wallet)?;
let owner = hex_to_fr(&wallet.owner_hash)?;

let result = client.deposit(1_000, 1, &owner).await?;

// Save the returned note entry to wallet
let mut wallet = load_wallet()?;
wallet.notes.push(result.note_entry);
save_wallet(&wallet)?;

println!("commitment: {}", result.commitment);
println!("tx: {}", result.tx_result);
```

## CLI

```bash
r14 deposit 1000
r14 deposit 1000 --app-tag 2
r14 deposit 1000 --local-only   # skip on-chain, only create note locally
```
