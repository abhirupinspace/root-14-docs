---
sidebar_position: 3
---

# Wallet

The `wallet` module handles local wallet persistence, note tracking, and field element serialization. Wallet state is stored as JSON at `~/.r14/wallet.json`.

## Structs

### WalletData

```rust
pub struct WalletData {
    pub secret_key: String,         // hex-encoded Fr
    pub owner: String,              // hex-encoded owner_hash(sk)
    pub stellar_secret: String,     // Stellar signing key (S...)
    pub network: String,            // "testnet" | "standalone" | passphrase
    pub indexer_url: String,        // e.g. "http://localhost:3001"
    pub contracts: R14Contracts,    // core + transfer contract IDs
    pub notes: Vec<NoteEntry>,      // all known notes (live + spent)
}
```

### NoteEntry

```rust
pub struct NoteEntry {
    pub value: u64,
    pub app_tag: u32,
    pub owner: String,              // hex Fr
    pub nonce: String,              // hex Fr
    pub commitment: String,         // hex Fr - Poseidon(value, app_tag, owner, nonce)
    pub leaf_index: Option<u64>,    // set after sync with indexer
    pub spent: bool,                // true after successful transfer
}
```

`leaf_index` starts as `None`. After calling `R14Client::sync_notes`, it is populated with the on-chain Merkle tree position. A note with `spent: true` has had its nullifier published and cannot be used again.

## Functions

### `wallet_path`

```rust
pub fn wallet_path() -> PathBuf
```

Returns `~/.r14/wallet.json`. Creates the `~/.r14/` directory if it does not exist.

### `load_wallet`

```rust
pub fn load_wallet() -> R14Result<WalletData>
```

Reads and deserializes `~/.r14/wallet.json`. Returns `R14Error::Config` if the file is missing or malformed.

```rust
let wallet = r14_sdk::wallet::load_wallet()?;
println!("owner: {}", wallet.owner);
println!("notes: {}", wallet.notes.len());
```

### `save_wallet`

```rust
pub fn save_wallet(wallet: &WalletData) -> R14Result<()>
```

Serializes and writes the wallet to `~/.r14/wallet.json` with pretty-printed JSON. Creates parent directories if needed.

```rust
wallet.notes.push(deposit_result.note_entry);
r14_sdk::wallet::save_wallet(&wallet)?;
```

### `fr_to_hex`

```rust
pub fn fr_to_hex(f: &Fr) -> String
```

Converts an arkworks `Fr` field element to a 64-character lowercase hex string (big-endian byte order, no `0x` prefix).

```rust
let hex = r14_sdk::wallet::fr_to_hex(&commitment);
assert_eq!(hex.len(), 64);
```

### `hex_to_fr`

```rust
pub fn hex_to_fr(hex: &str) -> R14Result<Fr>
```

Parses a 64-character hex string back into an `Fr`. Returns `R14Error::Config` on invalid input.

```rust
let fr = r14_sdk::wallet::hex_to_fr(&note_entry.nonce)?;
```

### `crypto_rng`

```rust
pub fn crypto_rng() -> impl CryptoRng + RngCore
```

Returns an OS-seeded cryptographically secure RNG. Use this for generating secret keys and nonces.

```rust
let mut rng = r14_sdk::wallet::crypto_rng();
let sk = SecretKey::random(&mut rng);
```

## Wallet JSON Example

```json
{
  "secret_key": "0a1b2c3d4e5f...64 hex chars...",
  "owner": "1f2e3d4c5b6a...64 hex chars...",
  "stellar_secret": "SCZANGBA...",
  "network": "testnet",
  "indexer_url": "http://localhost:3001",
  "contracts": {
    "core": "CABCDEFG...",
    "transfer": "CDEFGHIJ..."
  },
  "notes": [
    {
      "value": 1000000,
      "app_tag": 0,
      "owner": "1f2e3d4c5b6a...64 hex chars...",
      "nonce": "7a8b9c0d1e2f...64 hex chars...",
      "commitment": "3c4d5e6f7a8b...64 hex chars...",
      "leaf_index": 0,
      "spent": false
    },
    {
      "value": 500000,
      "app_tag": 0,
      "owner": "1f2e3d4c5b6a...64 hex chars...",
      "nonce": "9f8e7d6c5b4a...64 hex chars...",
      "commitment": "2b3c4d5e6f7a...64 hex chars...",
      "leaf_index": null,
      "spent": false
    }
  ]
}
```

The first note has been synced (`leaf_index: 0`). The second is pending sync (`leaf_index: null`).
