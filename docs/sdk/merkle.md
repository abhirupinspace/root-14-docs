---
sidebar_position: 4
---

# Merkle

The `merkle` module provides offline Merkle root computation for Root14's depth-20 Poseidon-based binary tree. All functions operate on hex-encoded field elements and return hex strings - no `Fr` handling needed at the call site.

## Properties

- **Order matters** - Leaf position determines the root. Swapping two leaves produces a different root.
- **Deterministic** - Same leaves in the same order always produce the same root.
- **Poseidon hash2** - Every internal node is `hash2(left, right)` using the two-input Poseidon hash.
- **Hex format** - All inputs and outputs are 64-character lowercase hex strings with no `0x` prefix.

## Functions

### `empty_root`

```rust
pub fn empty_root() -> Fr
```

Returns the Merkle root of a completely empty tree (all 2^20 leaves are zero). This is the initial state of the on-chain tree before any deposits.

```rust
let root = r14_sdk::merkle::empty_root();
```

### `empty_root_hex`

```rust
pub fn empty_root_hex() -> String
```

Same as `empty_root()` but returns the result as a 64-character hex string. Useful for comparing against indexer or contract responses without converting types.

```rust
let hex = r14_sdk::merkle::empty_root_hex();
assert_eq!(hex.len(), 64);
```

### `compute_root_from_leaves`

```rust
pub fn compute_root_from_leaves(leaf_hexes: &[String]) -> R14Result<String>
```

Computes the Merkle root from a complete list of leaf commitments. Empty positions (beyond the provided leaves) are filled with zero. Returns a 64-char hex string.

Use this when you have the full set of leaves and want to independently verify the on-chain root.

```rust
let leaves = vec![
    commitment_hex_0.clone(),
    commitment_hex_1.clone(),
];
let root = r14_sdk::merkle::compute_root_from_leaves(&leaves)?;
println!("root: {}", root);  // 64-char hex
```

**Performance note:** This builds the full tree in memory. For trees with many leaves, prefer verifying a single path with `compute_new_root` instead.

### `compute_new_root`

```rust
pub fn compute_new_root(
    leaf_hex: &str,
    path_hexes: &[String],
    path_indices: &[bool],
) -> R14Result<String>
```

Given a single leaf and its Merkle path (sibling hashes + left/right index bits), computes the root by hashing upward from the leaf. Returns a 64-char hex string.

- `leaf_hex` - The commitment hex of the leaf.
- `path_hexes` - Sibling hashes from leaf level to root level (length = `MERKLE_DEPTH`).
- `path_indices` - Direction bits: `false` = leaf is on the left, `true` = leaf is on the right.

```rust
// After syncing a note, the indexer returns path + indices
let root = r14_sdk::merkle::compute_new_root(
    &note.commitment,
    &path_siblings,
    &path_indices,
)?;

// Verify against the on-chain root
assert_eq!(root, on_chain_root_hex);
```

## Verification Pattern

A common pattern is to verify that a note is included in the current tree:

```rust
use r14_sdk::merkle;

// 1. Get the on-chain root from the indexer or contract
let on_chain_root = indexer.get_root().await?;

// 2. Compute root from the note's Merkle path
let computed = merkle::compute_new_root(
    &note.commitment,
    &note_path.siblings,
    &note_path.indices,
)?;

// 3. Compare
if computed != on_chain_root {
    return Err(R14Error::NoteNotOnChain);
}
```
