---
sidebar_position: 8
---

# Errors

All fallible functions in r14 SDK return `R14Result<T>`, a type alias for `Result<T, R14Error>`.

## R14Error Enum

```rust
pub enum R14Error {
    InsufficientBalance { needed: u64, best: u64 },
    NoteNotOnChain,
    Indexer(String),
    Soroban(String),
    Config(String),
    Other(anyhow::Error),
}

pub type R14Result<T> = Result<T, R14Error>;
```

## Variants

### `InsufficientBalance`

```rust
InsufficientBalance { needed: u64, best: u64 }
```

**When it occurs:** During `R14Client::transfer` when no single note has enough value to cover the requested transfer amount. `needed` is the amount requested, `best` is the largest available note value.

**How to handle:** Inform the user their balance is insufficient. The protocol currently selects a single note per transfer, so even if the total wallet balance is enough, no individual note may be large enough. Consider consolidating notes by transferring to yourself first.

```rust
match err {
    R14Error::InsufficientBalance { needed, best } => {
        eprintln!("need {} but largest note is {}", needed, best);
    }
    _ => {}
}
```

### `NoteNotOnChain`

```rust
NoteNotOnChain
```

**When it occurs:** During `sync_notes` or `balance` when a note's commitment is not found in the indexer. This can happen if the deposit transaction has not been confirmed yet, or if the indexer is behind.

**How to handle:** Retry after a short delay. If the note was just deposited, wait for the indexer to catch up (typically a few seconds).

### `Indexer`

```rust
Indexer(String)
```

**When it occurs:** Any HTTP error when communicating with the Root14 indexer - connection refused, timeout, non-200 status code, or malformed response body. The string contains the error details.

**How to handle:** Check that the indexer is running and the `indexer_url` in your wallet/client config is correct. Retry on transient network failures.

```rust
R14Error::Indexer(msg) => eprintln!("indexer error: {}", msg),
```

### `Soroban`

```rust
Soroban(String)
```

**When it occurs:** Any failure when invoking the `stellar` CLI - binary not found, contract invocation failure, invalid arguments, network errors, or non-zero exit codes. The string contains stderr output from the CLI.

**How to handle:** Verify the `stellar` CLI is installed and on `$PATH`. Check that contract IDs, network, and secret key are correct. Inspect the error message for Soroban-specific failures (e.g. contract panics, budget exceeded).

```rust
R14Error::Soroban(msg) => {
    if msg.contains("not found") {
        eprintln!("install stellar CLI: cargo install --locked stellar-cli");
    } else {
        eprintln!("soroban error: {}", msg);
    }
}
```

### `Config`

```rust
Config(String)
```

**When it occurs:** Invalid configuration - wallet file missing or malformed, invalid hex strings, missing contract IDs, or bad secret key format.

**How to handle:** Check `~/.r14/wallet.json` exists and is valid JSON. Re-run wallet initialization if the file is corrupted. Verify hex strings are exactly 64 characters with no `0x` prefix.

### `Other`

```rust
Other(anyhow::Error)
```

**When it occurs:** Catch-all for unexpected errors from dependencies (IO errors, serialization failures, arkworks errors, etc.).

**How to handle:** Log the full error chain. These typically indicate bugs or environmental issues rather than user errors.

```rust
R14Error::Other(e) => eprintln!("unexpected: {:#}", e),
```

## Pattern: Exhaustive Matching

```rust
use r14_sdk::errors::R14Error;

match result {
    Ok(val) => handle_success(val),
    Err(R14Error::InsufficientBalance { needed, best }) => {
        eprintln!("need {} stroops, best note has {}", needed, best);
    }
    Err(R14Error::NoteNotOnChain) => {
        eprintln!("note not found - is the indexer synced?");
    }
    Err(R14Error::Indexer(msg)) => {
        eprintln!("indexer: {}", msg);
    }
    Err(R14Error::Soroban(msg)) => {
        eprintln!("soroban: {}", msg);
    }
    Err(R14Error::Config(msg)) => {
        eprintln!("config: {}", msg);
    }
    Err(R14Error::Other(e)) => {
        eprintln!("error: {:#}", e);
    }
}
```
