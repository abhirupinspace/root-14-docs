---
sidebar_position: 1
---

# Hex Conventions

Root14 uses two hex formats depending on context: `0x`-prefixed for human-readable wallet data, and raw (no prefix) for Soroban contract arguments.

## Format Table

| Context | Prefix | Length | Example |
|---|---|---|---|
| `wallet::fr_to_hex` | `0x` | 66 chars | `0x00ab12...ef` |
| `wallet::hex_to_fr` (input) | optional `0x` | any | `0xab`, `ab` |
| `wallet::fr_to_raw_hex` | none | 64 chars | `00ab12...ef` |
| `merkle` module (output) | none | 64 chars | `00ab12...ef` |
| `serialize::serialize_fr` | none | 64 chars | `00ab12...ef` |
| `serialize::serialize_g1` | none | 192 chars | `aabb...` |
| `serialize::serialize_g2` | none | 384 chars | `aabb...` |
| Soroban contract args | none | varies | strip `0x` before passing |
| Indexer API responses | `0x` | 66 chars | `0x1a2b...` |

## Why Two Formats

- **`0x`-prefixed** (`fr_to_hex`): Used in the wallet JSON file and user-facing output. Familiar to developers from Ethereum/EVM conventions. 66 characters total: 2 for `0x` + 64 hex digits representing 32 bytes.

- **No prefix** (`fr_to_raw_hex`, `serialize_fr`): Used for Soroban contract arguments. Soroban's `BytesN<32>::from_hex` expects raw hex without a prefix. The `serialize` module also outputs raw hex since its output is consumed directly by contract calls.

## Converting Between Formats

```rust
use r14_sdk::wallet::{fr_to_hex, fr_to_raw_hex, hex_to_fr, strip_0x};

let fr = hex_to_fr("0x1a2b3c")?;      // accepts 0x prefix
let fr = hex_to_fr("1a2b3c")?;         // also works without

let with_prefix = fr_to_hex(&fr);       // "0x001a2b3c...00" (66 chars)
let without_prefix = fr_to_raw_hex(&fr); // "001a2b3c...00" (64 chars)

// Strip prefix from existing string
let raw = strip_0x("0xdeadbeef");        // "deadbeef"
let raw = strip_0x("deadbeef");          // "deadbeef" (no-op)
```

## Gotchas

**Always strip `0x` before passing to Soroban.** The `invoke_contract` function passes values directly to the Stellar CLI. Soroban contract functions expect raw hex bytes. Passing `0x`-prefixed values will cause decoding errors on-chain.

```rust
// Correct
let cm_hex = fr_to_raw_hex(&cm);
invoke_contract(&contract, "testnet", &secret, "deposit", &[("cm", &cm_hex)]).await?;

// Also correct
let cm_hex = strip_0x(&fr_to_hex(&cm));

// Wrong - will fail on-chain
let cm_hex = fr_to_hex(&cm); // has 0x prefix
```

**`hex_to_fr` zero-pads short inputs.** If you pass a short hex string like `"01"`, it is left-padded with zeros to 32 bytes. This means `hex_to_fr("01")` produces `Fr::from(1u64)`.

**Serialized public inputs use `serialize_fr`.** The output from `serialize_proof_for_soroban` returns public inputs as raw hex (no prefix, 64 chars). These come from `serialize_fr`, which reverses the arkworks LE byte order to BE for Soroban compatibility.

**Indexer returns `0x`-prefixed hex.** The indexer's API responses (root, siblings, leaves) all use `0x`-prefixed format. Strip before passing to Soroban:

```rust
let siblings: Vec<Fr> = response.siblings.iter()
    .map(|s| hex_to_fr(s))  // hex_to_fr handles 0x prefix automatically
    .collect::<Result<_>>()?;
```

## Byte Sizes Reference

| Type | Bytes | Hex chars (raw) | Hex chars (0x) |
|---|---|---|---|
| Fr (scalar) | 32 | 64 | 66 |
| G1 (uncompressed) | 96 | 192 | 194 |
| G2 (uncompressed) | 192 | 384 | 386 |
