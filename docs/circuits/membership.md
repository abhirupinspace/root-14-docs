---
sidebar_position: 4
---

# MembershipCircuit

Proves Merkle tree membership: "I know a leaf + path such that leaf is in the tree with the given root."

- **2 public inputs:** `root`, `leaf_commitment`
- **Private witnesses:** `leaf_preimage` (Fr), `siblings` (Vec&lt;Fr&gt;), `indices` (Vec&lt;bool&gt;)
- **2 constraints:** commitment correctness + Merkle path verification

The tree has depth `MERKLE_DEPTH = 20`.

## Struct

```rust
#[derive(Clone)]
pub struct MembershipCircuit {
    pub leaf_preimage: Option<Fr>,
    pub siblings: Option<Vec<Fr>>,
    pub indices: Option<Vec<bool>>,
}
```

## Constraint Generation

```rust
impl ConstraintSynthesizer<Fr> for MembershipCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        // Public inputs: root, leaf_commitment
        let root_pub = FpVar::new_input(cs.clone(), || {
            // ... compute root natively from leaf + path
        })?;
        let leaf_cm_pub = FpVar::new_input(cs.clone(), || {
            let leaf = self.leaf_preimage.ok_or(SynthesisError::AssignmentMissing)?;
            Ok(r14_poseidon::poseidon_hash(&[leaf]))
        })?;

        // Witness
        let leaf_var = FpVar::new_witness(cs.clone(), || { /* ... */ })?;
        // 20 sibling + index_bit pairs
        let mut path_vars: Vec<(FpVar<Fr>, Boolean<Fr>)> = Vec::with_capacity(MERKLE_DEPTH);
        for i in 0..MERKLE_DEPTH { /* ... */ }

        // Constraint 1: poseidon(leaf_preimage) == leaf_commitment
        let computed_cm = poseidon_hash_var(cs.clone(), &[leaf_var])?;
        computed_cm.enforce_equal(&leaf_cm_pub)?;

        // Constraint 2: merkle path from leaf_commitment to root
        verify_merkle_path(cs, &computed_cm, &path_vars, &root_pub)?;

        Ok(())
    }
}
```

**Constraint 1** ensures the prover actually knows the preimage that hashes to `leaf_commitment`. **Constraint 2** walks the 20-level path using `verify_merkle_path`, which at each level selects left/right ordering via `is_right.select()` and hashes with `hash2_var`, then enforces the final value equals the public `root`.

## Public Inputs

```rust
pub struct PublicInputs {
    pub root: Fr,
    pub leaf_commitment: Fr,
}

impl PublicInputs {
    pub fn to_vec(&self) -> Vec<Fr> {
        vec![self.root, self.leaf_commitment]
    }
}
```

## API

### `setup(rng) -> (ProvingKey, VerifyingKey)`

Groth16 trusted setup with an empty circuit.

```rust
pub fn setup<R: RngCore + CryptoRng>(
    rng: &mut R,
) -> (ProvingKey<Bls12_381>, VerifyingKey<Bls12_381>)
```

### `prove(pk, leaf_preimage, siblings, indices, rng) -> (Proof, PublicInputs)`

Computes `leaf_commitment = poseidon(leaf_preimage)` and walks the path natively to compute the root, then generates the proof.

```rust
pub fn prove<R: RngCore + CryptoRng>(
    pk: &ProvingKey<Bls12_381>,
    leaf_preimage: Fr,
    siblings: Vec<Fr>,
    indices: Vec<bool>,
    rng: &mut R,
) -> (ark_groth16::Proof<Bls12_381>, PublicInputs)
```

### `verify_offchain(vk, proof, pi) -> bool`

Off-chain verification using `PreparedVerifyingKey`.

```rust
pub fn verify_offchain(
    vk: &VerifyingKey<Bls12_381>,
    proof: &ark_groth16::Proof<Bls12_381>,
    pi: &PublicInputs,
) -> bool
```

### `constraint_count() -> usize`

Returns the R1CS constraint count. Expected range: 2000-10000.

```rust
pub fn constraint_count() -> usize
```
