---
sidebar_position: 2
---

# r14-transfer

Private transfer contract for Root14. Manages commitments, nullifiers, and Merkle root history. Delegates Groth16 proof verification to [r14-core](./r14-core.md) via cross-contract invocation.

**WASM size:** 4,746 bytes

## Types

```rust
#[contracttype]
#[derive(Clone, Debug)]
pub struct Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct DepositEvent {
    pub cm: BytesN<32>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TransferEvent {
    pub nullifier: BytesN<32>,
    pub cm_0: BytesN<32>,
    pub cm_1: BytesN<32>,
}
```

## Storage

Internal storage keys:

```rust
enum DataKey {
    CoreContract,     // Address of r14-core
    CircuitId,        // BytesN<32> of the registered transfer circuit
    Nullifier(BytesN<32>),  // spent nullifiers
    Root(BytesN<32>),       // known roots (existence check)
    RootIndex,              // current circular buffer index
    RootAt(u32),            // root stored at buffer slot
}
```

**Constants:**
- `PERSISTENT_TTL = 535,680` (~30 days)
- `PERSISTENT_THRESHOLD = 267,840` (~15 days)
- `ROOT_HISTORY_SIZE = 100`

## Root History

Roots are stored in a circular buffer of 100 entries. Each new root is written to the current slot, the old root at that slot is removed, and the index advances modulo 100.

```rust
fn commit_root(env: &Env, root: BytesN<32>) {
    let idx: u32 = env.storage().persistent()
        .get(&DataKey::RootIndex).unwrap_or(0);

    // Remove old root at this buffer slot
    let slot_key = DataKey::RootAt(idx);
    if let Some(old_root) = env.storage().persistent()
        .get::<_, BytesN<32>>(&slot_key) {
        env.storage().persistent().remove(&DataKey::Root(old_root));
    }

    // Store new root
    env.storage().persistent().set(&DataKey::Root(root.clone()), &true);
    env.storage().persistent().set(&slot_key, &root);

    // Advance index
    let next_idx = (idx + 1) % ROOT_HISTORY_SIZE;
    env.storage().persistent().set(&DataKey::RootIndex, &next_idx);
    // extends TTLs on all keys
}
```

This means at most 100 roots are valid at any time. Old roots are evicted when the buffer wraps.

## Functions

### `init(core_contract: Address, circuit_id: BytesN<32>, empty_root: BytesN<32>)`

Sets the core contract address, transfer circuit ID, and stores the initial empty tree root. Panics if already initialized.

```rust
pub fn init(
    env: Env,
    core_contract: Address,
    circuit_id: BytesN<32>,
    empty_root: BytesN<32>,
)
```

### `deposit(cm: BytesN<32>, new_root: BytesN<32>)`

Adds a commitment to the system. Rejects zero commitments (`[0u8; 32]`). Stores the new Merkle root and emits a `DepositEvent` under topic `("deposit",)`.

```rust
pub fn deposit(env: Env, cm: BytesN<32>, new_root: BytesN<32>) {
    if cm == BytesN::from_array(&env, &[0u8; 32]) {
        panic!("zero commitment");
    }
    Self::commit_root(&env, new_root);
    env.events().publish(("deposit",), DepositEvent { cm });
}
```

### `transfer(proof, old_root, nullifier, cm_0, cm_1, new_root) -> bool`

Executes a private transfer. Steps:

1. **Validate old_root** -- checks `DataKey::Root(old_root)` exists in persistent storage. Panics with `"unknown merkle root"` if not found.
2. **Check nullifier** -- ensures `DataKey::Nullifier(nullifier)` does not already exist. Panics with `"nullifier already spent"` if it does.
3. **Build public inputs** -- converts `old_root`, `nullifier`, `cm_0`, `cm_1` from `BytesN<32>` to `Fr` via `Fr::from_bytes`.
4. **Cross-contract verification** -- calls r14-core's `verify` function:

```rust
let args: Vec<soroban_sdk::Val> = (circuit_id, proof, public_inputs).into_val(&env);
let verified: bool = env.invoke_contract(
    &core_addr,
    &Symbol::new(&env, "verify"),
    args,
);
```

5. **Mark nullifier spent** -- stores `true` at `DataKey::Nullifier(nullifier)`.
6. **Store new root** -- calls `commit_root` with `new_root`.
7. **Emit event** -- publishes `TransferEvent { nullifier, cm_0, cm_1 }` under topic `("transfer",)`.

Returns `true` on success. Panics with `"proof verification failed"` if the core contract returns `false`.

```rust
pub fn transfer(
    env: Env,
    proof: Proof,
    old_root: BytesN<32>,
    nullifier: BytesN<32>,
    cm_0: BytesN<32>,
    cm_1: BytesN<32>,
    new_root: BytesN<32>,
) -> bool
```
