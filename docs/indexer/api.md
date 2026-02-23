---
sidebar_position: 1
---

# Indexer API

The Root14 indexer tracks on-chain commitments, maintains a Poseidon Merkle tree, and exposes a REST API for the SDK and CLI.

## Running

```bash
cargo run -p r14-indexer
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `R14_CONTRACT_ID` | `PLACEHOLDER_CONTRACT_ID` | The r14 transfer contract to watch |
| `R14_RPC_URL` | `https://soroban-testnet.stellar.org:443` | Soroban RPC endpoint |
| `R14_DB_PATH` | `r14-indexer.db` | SQLite database file path |
| `R14_LISTEN_ADDR` | `0.0.0.0:3000` | HTTP listen address |

Example:

```bash
R14_CONTRACT_ID=CCBUWWLVJL55IM6DVD3JNU5SSQGJTNB6XN2ZBQ73TGATLJ6HEB7RI5V6 \
R14_RPC_URL=https://soroban-testnet.stellar.org:443 \
cargo run -p r14-indexer
```

## REST Endpoints

### GET /v1/health

Health check.

**Response:**

```json
{ "status": "ok" }
```

### GET /v1/root

Current Merkle root of all indexed commitments.

**Response:**

```json
{ "root": "0x1a2b3c4d5e6f..." }
```

The root is `0x`-prefixed big-endian hex (66 characters).

### GET /v1/proof/\{index\}

Merkle inclusion proof for the leaf at the given index.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `index` | integer | Zero-based leaf index |

**Response (200):**

```json
{
  "siblings": ["0xaabb...", "0xccdd...", "..."],
  "indices": [false, true, false, "..."]
}
```

- `siblings`: Array of 20 sibling hashes (`0x`-prefixed hex), one per tree level.
- `indices`: Array of 20 booleans. `true` means the leaf is on the right side at that level.

**Error (404):**

```json
{ "error": "index out of bounds" }
```

### GET /v1/leaf/\{commitment\}

Look up a commitment's leaf index and block height.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `commitment` | string | Commitment hex (with or without `0x` prefix) |

**Response (200):**

```json
{
  "index": 3,
  "block_height": 12345
}
```

**Error (400):**

```json
{ "error": "invalid hex" }
```

**Error (404):**

```json
{ "error": "commitment not found" }
```

### GET /v1/leaves

All indexed commitments in insertion order.

**Response:**

```json
{
  "leaves": ["0x1a2b...", "0x3c4d...", "0x5e6f..."]
}
```

## Architecture

- **Poller**: Polls Soroban RPC events every 5 seconds for deposit and transfer events. Extracts commitment field elements and inserts them into the Merkle tree and SQLite.
- **SQLite**: Persists leaves (index, commitment, block_height) and the sync cursor (ledger sequence, pagination cursor). The tree is rebuilt from persisted leaves on startup.
- **Merkle Tree**: In-memory Poseidon sparse Merkle tree with depth 20. Produces proofs (sibling paths + index bits) for any leaf.
- **CORS**: Permissive CORS headers are set on all endpoints, allowing browser-based dapps to query the indexer directly.
