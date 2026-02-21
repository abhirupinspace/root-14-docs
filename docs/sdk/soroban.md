---
sidebar_position: 6
---

# Soroban

The `soroban` module wraps the `stellar` CLI to invoke Soroban smart contracts from Rust. It provides two functions: one to derive a public key from a secret, and one to invoke arbitrary contract functions.

**Prerequisite:** The `stellar` CLI must be installed and available on `$PATH`. Install it via:

```bash
cargo install --locked stellar-cli
```

## Functions

### `get_public_key`

```rust
pub fn get_public_key(secret: &str) -> R14Result<String>
```

Derives the Stellar public key (`G...`) from a secret key (`S...`). Internally runs:

```bash
stellar keys address --secret-key <secret>
```

Returns the public key as a `String`. Errors with `R14Error::Soroban` if the CLI is not found or the secret is invalid.

```rust
let pubkey = r14_sdk::soroban::get_public_key("SCZANGBA...")?;
println!("public key: {}", pubkey);  // G...
```

### `invoke_contract`

```rust
pub fn invoke_contract(
    contract_id: &str,
    network: &str,
    source_secret: &str,
    function: &str,
    args: &[(&str, &str)],
) -> R14Result<String>
```

Invokes a Soroban contract function. Arguments are passed as `--arg-name value` pairs. Internally builds and executes:

```bash
stellar contract invoke \
  --id <contract_id> \
  --network <network> \
  --source-account <source_secret> \
  -- \
  <function> \
  --<arg_name_1> <arg_value_1> \
  --<arg_name_2> <arg_value_2>
```

Returns the CLI's stdout as a `String` (typically the transaction result or return value).

```rust
let result = r14_sdk::soroban::invoke_contract(
    "CABCDEFG...",               // contract ID
    "testnet",                    // network
    "SCZANGBA...",               // source secret
    "deposit",                    // function name
    &[
        ("commitment", "\"3c4d5e...\""),
        ("value", "1000000"),
        ("app_tag", "0"),
    ],
)?;
println!("tx result: {}", result);
```

## Error Cases

| Scenario | Error |
|---|---|
| `stellar` CLI not found on `$PATH` | `R14Error::Soroban("stellar CLI not found")` |
| Invalid secret key format | `R14Error::Soroban(...)` with CLI stderr |
| Contract invocation fails (e.g. insufficient funds, wrong args) | `R14Error::Soroban(...)` with CLI stderr |
| Network unreachable | `R14Error::Soroban(...)` with CLI stderr |
| Non-zero exit code from CLI | `R14Error::Soroban(...)` containing the full stderr output |

## Usage Notes

- The `network` parameter accepts either an alias (`testnet`, `standalone`) or a full network passphrase.
- All arguments are passed as strings. Soroban types like `Address`, `i128`, and `Bytes` must be formatted according to the `stellar contract invoke` CLI conventions.
- The module does **not** handle transaction simulation or fee estimation - those are handled by the CLI automatically.
- For high-throughput use cases, consider calling the Soroban RPC directly instead of shelling out to the CLI.
