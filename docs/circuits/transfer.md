---
sidebar_position: 1
---

# TransferCircuit

The core privacy circuit for Root14. Implements a 1-in-2-out UTXO transfer: consumes one note and creates two (recipient + change).

- **7,638 R1CS constraints** (BLS12-381 / Groth16)
- **4 public inputs:** `old_root`, `nullifier`, `out_commitment_0`, `out_commitment_1`
- **Private witnesses:** secret key, consumed note fields, Merkle path (20 levels), two created notes

## Struct

```rust
#[derive(Clone)]
pub struct TransferCircuit {
    pub secret_key: Option<Fr>,
    pub consumed_note: Option<Note>,
    pub merkle_path: Option<MerklePath>,
    pub created_notes: Option<[Note; 2]>,
}
```

Each `Note` contains four fields:

```rust
pub struct Note {
    pub value: u64,
    pub app_tag: u32,
    pub owner: Fr,
    pub nonce: Fr,
}
```

The Merkle path has depth `MERKLE_DEPTH = 20`:

```rust
pub struct MerklePath {
    pub siblings: Vec<Fr>,
    pub indices: Vec<bool>,
}
```

## Constraints

The circuit enforces 7 groups of constraints inside `generate_constraints`:

### 1. Ownership

```
poseidon(sk) == consumed_note.owner
```

Proves the sender knows the secret key that derives the consumed note's owner hash. Uses `poseidon_hash_var(cs, &[sk_var])` and `enforce_equal` against the consumed owner witness.

### 2. Consumed note commitment

```
poseidon(value, app_tag, owner, nonce) == consumed_commitment
```

Recomputes the commitment from the note's four fields. This value is then fed into the Merkle path verification.

### 3. Merkle inclusion

```
verify_merkle_path(consumed_cm, path, old_root)
```

Walks the 20-level Merkle path from the consumed commitment up to the root. At each level, `is_right` selects the ordering: if `true`, hash `(sibling, current)`; otherwise hash `(current, sibling)`. The final value is enforced equal to the public input `old_root`.

### 4. Nullifier

```
poseidon(sk, nonce) == nullifier
```

Binds the secret key to the consumed note's nonce, producing a deterministic nullifier. Enforced equal to the public input `nullifier`.

### 5. Output commitment 0

```
poseidon(value_0, app_tag_0, owner_0, nonce_0) == out_commitment_0
```

Recomputes the first output note's commitment and enforces equality with the public input `out_commitment_0`.

### 6. Output commitment 1

```
poseidon(value_1, app_tag_1, owner_1, nonce_1) == out_commitment_1
```

Same as above for the second output note, enforced against `out_commitment_1`.

### 7. Value conservation and app tag match

```
consumed.value == created[0].value + created[1].value
consumed.app_tag == created[0].app_tag
consumed.app_tag == created[1].app_tag
```

Ensures no value is created or destroyed, and that all three notes share the same `app_tag`. The code uses three `enforce_equal` calls: one for value conservation and two for app tag matching.

## Public Inputs

```rust
pub struct PublicInputs {
    pub old_root: Fr,
    pub nullifier: Fr,
    pub out_commitment_0: Fr,
    pub out_commitment_1: Fr,
}

impl PublicInputs {
    pub fn to_vec(&self) -> Vec<Fr> {
        vec![self.old_root, self.nullifier, self.out_commitment_0, self.out_commitment_1]
    }
}
```

The Groth16 verification key will have `ic.len() == 5` (1 constant term + 4 public inputs).

## API

### `setup(rng) -> (ProvingKey, VerifyingKey)`

Runs Groth16 trusted setup using `TransferCircuit::empty()` (all witnesses `None`).

```rust
pub fn setup<R: RngCore + CryptoRng>(
    rng: &mut R,
) -> (ProvingKey<Bls12_381>, VerifyingKey<Bls12_381>) {
    let circuit = TransferCircuit::empty();
    Groth16::<Bls12_381>::circuit_specific_setup(circuit, rng).expect("setup failed")
}
```

### `prove(pk, sk, consumed, path, created, rng) -> (Proof, PublicInputs)`

Computes public inputs natively (root from path, nullifier, output commitments), then generates the Groth16 proof.

```rust
pub fn prove<R: RngCore + CryptoRng>(
    pk: &ProvingKey<Bls12_381>,
    secret_key: Fr,
    consumed_note: Note,
    merkle_path: MerklePath,
    created_notes: [Note; 2],
    rng: &mut R,
) -> (ark_groth16::Proof<Bls12_381>, PublicInputs)
```

### `verify_offchain(vk, proof, pi) -> bool`

Verifies a proof off-chain using `PreparedVerifyingKey`.

```rust
pub fn verify_offchain(
    vk: &VerifyingKey<Bls12_381>,
    proof: &ark_groth16::Proof<Bls12_381>,
    public_inputs: &PublicInputs,
) -> bool
```

### `constraint_count() -> usize`

Returns the R1CS constraint count by running `generate_constraints` in setup mode.

```rust
pub fn constraint_count() -> usize
```
