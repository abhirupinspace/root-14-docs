---
sidebar_position: 2
---

# PreimageCircuit

Proves knowledge of a Poseidon preimage: "I know `x` such that `Poseidon(x) == hash`."

- **1 public input:** `hash`
- **1 private witness:** `preimage`
- **Single constraint:** `poseidon(preimage) == hash`

## Struct

```rust
#[derive(Clone)]
pub struct PreimageCircuit {
    pub preimage: Option<Fr>,
}
```

## Constraint Generation

```rust
impl ConstraintSynthesizer<Fr> for PreimageCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        // Public input: hash
        let hash_pub = FpVar::new_input(cs.clone(), || {
            let x = self.preimage.ok_or(SynthesisError::AssignmentMissing)?;
            Ok(r14_poseidon::poseidon_hash(&[x]))
        })?;

        // Witness: preimage
        let preimage_var = FpVar::new_witness(cs.clone(), || {
            self.preimage.ok_or(SynthesisError::AssignmentMissing)
        })?;

        // Constraint: poseidon(preimage) == hash
        let computed = poseidon_hash_var(cs, &[preimage_var])?;
        computed.enforce_equal(&hash_pub)?;

        Ok(())
    }
}
```

The public input `hash` is computed from the witness during allocation. The circuit then independently recomputes it in-circuit using `poseidon_hash_var` and enforces equality.

## Public Inputs

```rust
pub struct PublicInputs {
    pub hash: Fr,
}

impl PublicInputs {
    pub fn to_vec(&self) -> Vec<Fr> {
        vec![self.hash]
    }
}
```

## API

### `setup(rng) -> (ProvingKey, VerifyingKey)`

Groth16 trusted setup with an empty circuit (witness = `None`).

```rust
pub fn setup<R: RngCore + CryptoRng>(
    rng: &mut R,
) -> (ProvingKey<Bls12_381>, VerifyingKey<Bls12_381>)
```

### `prove(pk, preimage, rng) -> (Proof, PublicInputs)`

Hashes the preimage natively to produce the public `hash`, then generates the Groth16 proof.

```rust
pub fn prove<R: RngCore + CryptoRng>(
    pk: &ProvingKey<Bls12_381>,
    preimage: Fr,
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

Returns the R1CS constraint count. Expected range: 100-1000.

```rust
pub fn constraint_count() -> usize
```
