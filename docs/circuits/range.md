---
sidebar_position: 5
---

# RangeCircuit

Proves a committed value lies within a range: "I know `x` committed as `cm = Poseidon(x, nonce)` such that `min <= x <= max`."

- **3 public inputs:** `min`, `max`, `commitment`
- **Private witnesses:** `x` (Fr), `nonce` (Fr)
- **RANGE_BITS = 64** -- values must fit in 64 bits

## Struct

```rust
const RANGE_BITS: usize = 64;

#[derive(Clone)]
pub struct RangeCircuit {
    pub x: Option<Fr>,
    pub nonce: Option<Fr>,
    pub min: Option<Fr>,
    pub max: Option<Fr>,
}
```

## How It Works

The circuit enforces three things:

### 1. Commitment correctness

```
poseidon(x, nonce) == commitment
```

Ensures `x` is the value committed in the public `commitment`.

### 2. Lower bound: `(x - min)` fits in 64 bits

Decomposes `x - min` into 64 Boolean witnesses (bit 0 through bit 63), then reconstructs the sum `sum = bit_0 * 1 + bit_1 * 2 + ... + bit_63 * 2^63` and enforces `sum == (x - min)`. If `x < min`, the field subtraction wraps to a huge number that cannot be represented in 64 bits, so the constraint is unsatisfiable.

### 3. Upper bound: `(max - x)` fits in 64 bits

Same decomposition for `max - x`. If `x > max`, the subtraction wraps and the 64-bit decomposition fails.

### Bit decomposition helper

```rust
fn enforce_range_bits(
    cs: ConstraintSystemRef<Fr>,
    val: &FpVar<Fr>,
    native_val: Option<u64>,
) -> Result<(), SynthesisError> {
    let mut bits: Vec<Boolean<Fr>> = Vec::with_capacity(RANGE_BITS);
    for i in 0..RANGE_BITS {
        let bit = Boolean::new_witness(cs.clone(), || {
            let v = native_val.ok_or(SynthesisError::AssignmentMissing)?;
            Ok((v >> i) & 1 == 1)
        })?;
        bits.push(bit);
    }

    let mut sum = FpVar::zero();
    let mut coeff = Fr::from(1u64);
    for bit in &bits {
        let bit_fp = FpVar::from(bit.clone());
        sum += bit_fp * coeff;
        coeff.double_in_place();
    }

    sum.enforce_equal(val)?;
    Ok(())
}
```

## Public Inputs

```rust
pub struct PublicInputs {
    pub min: Fr,
    pub max: Fr,
    pub commitment: Fr,
}

impl PublicInputs {
    pub fn to_vec(&self) -> Vec<Fr> {
        vec![self.min, self.max, self.commitment]
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

### `prove(pk, x, nonce, min, max, rng) -> (Proof, PublicInputs)`

Takes `x`, `min`, `max` as `u64` and `nonce` as `Fr`. Computes `commitment = poseidon(Fr::from(x), nonce)` natively, then generates the proof.

```rust
pub fn prove<R: RngCore + CryptoRng>(
    pk: &ProvingKey<Bls12_381>,
    x: u64,
    nonce: Fr,
    min: u64,
    max: u64,
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

Returns the R1CS constraint count. Expected range: 200-1000.

```rust
pub fn constraint_count() -> usize
```
