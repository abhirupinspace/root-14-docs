---
sidebar_position: 3
---

# OwnershipCircuit

Proves knowledge of a secret key without revealing it: "I know `sk` such that `Poseidon(sk) == owner_hash`."

- **1 public input:** `owner_hash`
- **1 private witness:** `secret_key`
- **Single constraint:** `poseidon(sk) == owner_hash`

Structurally identical to `PreimageCircuit` but semantically distinct -- this circuit is used for key ownership proofs in the Root14 identity layer.

## Struct

```rust
#[derive(Clone)]
pub struct OwnershipCircuit {
    pub secret_key: Option<Fr>,
}
```

## Constraint Generation

```rust
impl ConstraintSynthesizer<Fr> for OwnershipCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        let owner_hash_pub = FpVar::new_input(cs.clone(), || {
            let sk = self.secret_key.ok_or(SynthesisError::AssignmentMissing)?;
            Ok(r14_poseidon::poseidon_hash(&[sk]))
        })?;

        let sk_var = FpVar::new_witness(cs.clone(), || {
            self.secret_key.ok_or(SynthesisError::AssignmentMissing)
        })?;

        let computed = poseidon_hash_var(cs, &[sk_var])?;
        computed.enforce_equal(&owner_hash_pub)?;

        Ok(())
    }
}
```

## Public Inputs

```rust
pub struct PublicInputs {
    pub owner_hash: Fr,
}

impl PublicInputs {
    pub fn to_vec(&self) -> Vec<Fr> {
        vec![self.owner_hash]
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

### `prove(pk, secret_key, rng) -> (Proof, PublicInputs)`

Hashes the secret key natively to produce `owner_hash`, then generates the Groth16 proof.

```rust
pub fn prove<R: RngCore + CryptoRng>(
    pk: &ProvingKey<Bls12_381>,
    secret_key: Fr,
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
