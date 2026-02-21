---
sidebar_position: 4
---

# Checking Balance

Check your total unspent balance and sync note states with the indexer.

## CLI

```bash
r14 balance
```

With `--json`:

```bash
r14 balance --json
```

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
      "index": 7,
      "status": "local-only"
    }
  ]
}
```

## SDK: Local Balance Check

```rust
use r14_sdk::wallet::load_wallet;

let wallet = load_wallet()?;
let unspent: Vec<_> = wallet.notes.iter().filter(|n| !n.spent).collect();
let total: u64 = unspent.iter().map(|n| n.value).sum();

println!("balance: {}", total);
for note in &unspent {
    let status = match note.index {
        Some(idx) => format!("on-chain (idx={})", idx),
        None => "local-only".to_string(),
    };
    println!("  value={} app_tag={} {}", note.value, note.app_tag, status);
}
```

## SDK: Indexer Sync

Notes that have been deposited on-chain but not yet synced will show `index: None` (local-only). Sync them by querying the indexer's `GET /v1/leaf/{commitment}` endpoint.

```rust
use r14_sdk::wallet::{load_wallet, save_wallet};
use serde::Deserialize;

#[derive(Deserialize)]
struct LeafResponse {
    index: u64,
    block_height: u64,
}

let mut wallet = load_wallet()?;
let client = reqwest::Client::new();

for note in wallet.notes.iter_mut().filter(|n| !n.spent && n.index.is_none()) {
    let cm_hex = note.commitment.strip_prefix("0x").unwrap_or(&note.commitment);
    let url = format!("{}/v1/leaf/{}", wallet.indexer_url, cm_hex);

    if let Ok(resp) = client.get(&url).send().await {
        if resp.status().is_success() {
            if let Ok(leaf) = resp.json::<LeafResponse>().await {
                note.index = Some(leaf.index);
            }
        }
    }
}

save_wallet(&wallet)?;
```

## SDK: Using R14Client

```rust
use r14_sdk::{R14Client, R14Contracts};
use r14_sdk::wallet::{load_wallet, save_wallet};

let mut wallet = load_wallet()?;
let client = R14Client::from_wallet(&wallet)?;

let result = client.balance(&mut wallet.notes).await?;

println!("total: {}", result.total);
for note in &result.notes {
    let status = if note.on_chain { "on-chain" } else { "local-only" };
    println!("  value={} app_tag={} {}", note.value, note.app_tag, status);
}

save_wallet(&wallet)?;
```

## Note States

| State | `spent` | `index` | Meaning |
|---|---|---|---|
| local-only | `false` | `None` | Created locally, not yet confirmed on-chain |
| on-chain | `false` | `Some(n)` | Confirmed on-chain, available for spending |
| spent | `true` | `Some(n)` | Consumed in a transfer, nullifier revealed |

Only notes in the **on-chain** state can be used as inputs to a transfer. Notes that are local-only need to either be deposited on-chain first, or synced with the indexer if they were deposited but haven't had their index populated yet.
