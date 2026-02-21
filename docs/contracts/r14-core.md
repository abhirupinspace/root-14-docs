---
sidebar_position: 1
---

# r14-core

General-purpose Groth16 verifier registry on Soroban. Any circuit's verification key can be registered once; proofs are verified against stored keys.

**WASM size:** 7,157 bytes

## Types

```rust
#[contracttype]
#[derive(Clone, Debug)]
pub struct VerificationKey {
    pub alpha_g1: G1Affine,
    pub beta_g2: G2Affine,
    pub gamma_g2: G2Affine,
    pub delta_g2: G2Affine,
    /// ic[0] is the constant term, ic[1..] match public inputs
    pub ic: Vec<G1Affine>,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}
```

All curve types come from `soroban_sdk::crypto::bls12_381`.

## Storage

Verification keys are stored in **persistent** storage keyed by `DataKey::Circuit(BytesN<32>)`. The admin address is stored in **instance** storage under `DataKey::Admin`.

**TTL settings:**
- `PERSISTENT_TTL = 535,680` ledgers (~30 days)
- `PERSISTENT_THRESHOLD = 267,840` ledgers (~15 days)

Both instance and persistent entries are extended on every operation.

## Functions

### `init(admin: Address)`

Sets the admin address. Panics if already initialized.

```rust
pub fn init(env: Env, admin: Address) {
    if env.storage().instance().has(&DataKey::Admin) {
        panic!("already initialized");
    }
    env.storage().instance().set(&DataKey::Admin, &admin);
    // extends instance TTL
}
```

### `register(caller: Address, vk: VerificationKey) -> BytesN<32>`

Admin-only. Registers a verification key and returns a content-addressed `circuit_id`.

The `circuit_id` is computed as:

```
sha256(alpha_g1 ++ beta_g2 ++ gamma_g2 ++ delta_g2 ++ ic[0] ++ ic[1] ++ ... ++ ic[n])
```

Each curve point is serialized to its byte representation and concatenated. Panics if the circuit is already registered.

```rust
pub fn register(env: Env, caller: Address, vk: VerificationKey) -> BytesN<32> {
    let admin: Address = env.storage().instance()
        .get(&DataKey::Admin).expect("not initialized");
    admin.require_auth();
    if caller != admin { panic!("only admin can register"); }

    let circuit_id = Self::compute_circuit_id(&env, &vk);
    let key = DataKey::Circuit(circuit_id.clone());
    if env.storage().persistent().has(&key) {
        panic!("circuit already registered");
    }

    env.storage().persistent().set(&key, &vk);
    // extends TTLs
    circuit_id
}
```

### `verify(circuit_id: BytesN<32>, proof: Proof, public_inputs: Vec<Fr>) -> bool`

Verifies a Groth16 proof against the stored verification key for `circuit_id`. On success, emits a `VerifyEvent`:

```rust
#[contracttype]
#[derive(Clone, Debug)]
pub struct VerifyEvent {
    pub circuit_id: BytesN<32>,
}
```

Published under topic `("verify",)`.

```rust
pub fn verify(
    env: Env,
    circuit_id: BytesN<32>,
    proof: Proof,
    public_inputs: Vec<Fr>,
) -> bool {
    let vk: VerificationKey = env.storage().persistent()
        .get(&key).expect("circuit not registered");
    let result = verify_groth16(&env, &vk, &proof, &public_inputs);
    if result {
        env.events().publish(("verify",), VerifyEvent { circuit_id });
    }
    result
}
```

### `get_vk(circuit_id: BytesN<32>) -> VerificationKey`

Retrieves the stored verification key. Panics if not registered.

### `is_registered(circuit_id: BytesN<32>) -> bool`

Returns `true` if a verification key is stored for the given `circuit_id`.
