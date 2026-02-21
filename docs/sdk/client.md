---
sidebar_position: 2
---

# R14Client

`R14Client` is the high-level entry point for interacting with the Root14 protocol. It handles deposits, balance queries, note syncing, and transfers - coordinating between the on-chain Soroban contracts and the off-chain indexer.

## Struct Definition

```rust
pub struct R14Client {
    indexer_url: String,
    contracts: R14Contracts,
    stellar_secret: String,
    network: String,
    http: reqwest::Client,
}

pub struct R14Contracts {
    pub core: String,
    pub transfer: String,
}
```

- `indexer_url` - Base URL of the Root14 indexer (e.g. `http://localhost:3001`).
- `contracts.core` - Contract ID of the `r14-core` Soroban contract.
- `contracts.transfer` - Contract ID of the `r14-transfer` Soroban contract.
- `stellar_secret` - Stellar secret key (`S...`) used to sign transactions.
- `network` - Stellar network passphrase or alias (`testnet`, `standalone`, etc.).

## Constructors

### `R14Client::new`

```rust
pub fn new(
    indexer_url: &str,
    contracts: R14Contracts,
    stellar_secret: &str,
    network: &str,
) -> R14Result<Self>
```

Creates a client from explicit parameters. Validates the secret key format and initializes the HTTP client.

```rust
let client = R14Client::new(
    "http://localhost:3001",
    R14Contracts {
        core: "CABC...".into(),
        transfer: "CDEF...".into(),
    },
    "SAAAA...SECRET",
    "testnet",
)?;
```

### `R14Client::from_wallet`

```rust
pub fn from_wallet(wallet: &WalletData) -> R14Result<Self>
```

Constructs a client from a loaded `WalletData`. Reads `indexer_url`, `contracts`, `stellar_secret`, and `network` directly from the wallet's stored configuration.

```rust
let wallet = r14_sdk::wallet::load_wallet()?;
let client = R14Client::from_wallet(&wallet)?;
```

## Methods (Always Available)

### `deposit`

```rust
pub async fn deposit(
    &self,
    value: u64,
    app_tag: u32,
    owner: Fr,
) -> R14Result<DepositResult>
```

Creates a new note, computes its commitment, and submits a `deposit` call to the `r14-core` contract. The indexer picks up the emitted event and indexes the new leaf.

```rust
let owner = r14_sdk::owner_hash(&sk);
let result = client.deposit(1_000_000, 0, owner).await?;
println!("deposited commitment: {}", result.commitment);
```

### `sync_notes`

```rust
pub async fn sync_notes(
    &self,
    notes: &mut [NoteEntry],
) -> R14Result<()>
```

For each note without a known leaf index, queries the indexer's `/commitment/:hex` endpoint to fetch the on-chain leaf index and Merkle path. Mutates the notes in place.

### `balance`

```rust
pub async fn balance(
    &self,
    notes: &mut [NoteEntry],
) -> R14Result<BalanceResult>
```

Calls `sync_notes` internally, then sums the values of all notes confirmed on-chain. Returns the total balance and per-note status.

```rust
let bal = client.balance(&mut wallet.notes).await?;
println!("total: {} stroops", bal.total);
for ns in &bal.notes {
    println!("  {} - {:?}", ns.commitment, ns.status);
}
```

### `transfer_with_proof`

```rust
pub async fn transfer_with_proof(
    &self,
    proof: &SerializedProof,
    recipient_note: &NoteEntry,
    change_note: &NoteEntry,
    consumed_note_index: usize,
) -> R14Result<TransferResult>
```

Submits an already-built Groth16 proof to the `r14-transfer` contract. Use this when proof generation happens externally (e.g. in a browser via WASM or on a separate proving server).

Arguments:
- `proof` - Serialized Groth16 proof (see [`serialize`](./serialize.md)).
- `recipient_note` - The output note for the recipient.
- `change_note` - The output note returning change to the sender.
- `consumed_note_index` - Index into the caller's note list identifying which note was spent.

## Methods (prove Feature)

These methods are only available when `r14-sdk` is compiled with the `prove` feature.

### `transfer`

```rust
pub async fn transfer(
    &self,
    notes: &mut [NoteEntry],
    sk: &SecretKey,
    owner: Fr,
    recipient: Fr,
    value: u64,
) -> R14Result<TransferResult>
```

End-to-end private transfer. Internally:
1. Selects the best note with sufficient balance (or returns `InsufficientBalance`).
2. Syncs the selected note to get its Merkle path.
3. Builds the `TransferCircuit` with the input note, two output notes, and the Merkle path.
4. Runs Groth16 `setup` + `prove`.
5. Serializes the proof and submits via `transfer_with_proof`.

```rust
let result = client.transfer(
    &mut wallet.notes,
    &sk,
    owner,
    recipient_owner_hash,
    500_000,
).await?;
println!("nullifier: {}", result.nullifier);
// save result.recipient_note and result.change_note to wallet
```

### `init_contracts`

```rust
pub async fn init_contracts(&self) -> R14Result<InitResult>
```

One-time setup. Generates the Groth16 proving/verification keys, serializes the VK, and calls `register_vk` on the `r14-core` contract followed by `init` on the `r14-transfer` contract.

```rust
let init = client.init_contracts().await?;
println!("circuit_id: {}", init.circuit_id);
```

## Result Types

```rust
pub struct DepositResult {
    pub commitment: String,
    pub value: u64,
    pub app_tag: u32,
    pub tx_result: String,
    pub note_entry: NoteEntry,
}

pub struct TransferResult {
    pub nullifier: String,
    pub out_commitment_0: String,
    pub out_commitment_1: String,
    pub tx_result: String,
    pub recipient_note: NoteEntry,
    pub change_note: NoteEntry,
    pub consumed_note_index: usize,
}

pub struct BalanceResult {
    pub total: u64,
    pub notes: Vec<NoteStatus>,
}

pub struct InitResult {
    pub circuit_id: String,
    pub tx_result: String,
}
```

- `DepositResult.note_entry` - Ready to append to your wallet's note list.
- `TransferResult.consumed_note_index` - Mark this note as spent in your wallet.
- `TransferResult.recipient_note` / `change_note` - Save these; they are the new live UTXOs.
- `BalanceResult.notes` - Each entry contains the note's commitment and its status (`OnChain`, `Pending`, or `Spent`).
- `InitResult.circuit_id` - The identifier registered on-chain for the verification key.
