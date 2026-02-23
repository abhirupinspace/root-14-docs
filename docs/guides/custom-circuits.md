---
sidebar_position: 6
---

# Custom Circuits

Root14 is designed to support pluggable ZK circuits beyond the built-in transfer circuit. This guide covers the planned `R14AppConstraints` trait and how to work with custom circuits today.

## R14AppConstraints Trait (Planned - Tier 3)

The `R14AppConstraints` trait will provide a standard interface for registering custom circuits with Root14's on-chain verification infrastructure.

```rust
use ark_bls12_381::Fr;
use ark_relations::r1cs::ConstraintSynthesizer;

pub trait R14AppConstraints: ConstraintSynthesizer<Fr> + Clone {
    /// Public inputs exposed by this circuit.
    fn public_inputs(&self) -> Vec<Fr>;

    /// Unique identifier for this circuit type.
    fn circuit_id() -> &'static str;

    /// An empty instance used for Groth16 setup (no witness values).
    fn empty() -> Self;
}
```

## Example Circuit Implementation

Here is an example of how a custom circuit would implement the trait:

```rust
use ark_bls12_381::Fr;
use ark_r1cs_std::{alloc::AllocVar, eq::EqGadget, fields::fp::FpVar};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

/// A simple circuit that proves knowledge of a preimage:
/// public_output = Poseidon(secret_preimage)
#[derive(Clone)]
pub struct PreimageCircuit {
    pub secret: Option<Fr>,
    pub hash: Option<Fr>,
}

impl ConstraintSynthesizer<Fr> for PreimageCircuit {
    fn generate_constraints(
        self,
        cs: ConstraintSystemRef<Fr>,
    ) -> Result<(), SynthesisError> {
        // Public input: the hash
        let hash_pub = FpVar::new_input(cs.clone(), || {
            self.hash.ok_or(SynthesisError::AssignmentMissing)
        })?;

        // Private witness: the preimage
        let secret_var = FpVar::new_witness(cs.clone(), || {
            self.secret.ok_or(SynthesisError::AssignmentMissing)
        })?;

        // Constraint: hash == poseidon(secret)
        // (using r14's poseidon gadget)
        let computed = poseidon_hash_var(cs.clone(), &[secret_var])?;
        computed.enforce_equal(&hash_pub)?;

        Ok(())
    }
}

impl R14AppConstraints for PreimageCircuit {
    fn public_inputs(&self) -> Vec<Fr> {
        vec![self.hash.unwrap_or_default()]
    }

    fn circuit_id() -> &'static str {
        "preimage-v1"
    }

    fn empty() -> Self {
        Self {
            secret: None,
            hash: None,
        }
    }
}
```

## Planned Usage Flow

Once the trait is stabilized, the flow will be:

```rust
use ark_std::rand::{rngs::StdRng, SeedableRng};

// 1. Setup: generate proving/verification keys
let mut rng = StdRng::seed_from_u64(42);
let (pk, vk) = setup::<MyCircuit>(&mut rng);

// 2. Register: submit VK to r14-core, get circuit_id
let circuit_id = register_circuit(&core_contract, &vk).await?;

// 3. Prove and submit
let proof = prove_and_submit(&pk, my_circuit_instance, &transfer_contract).await?;
```

## What You Can Do Today

The trait is planned for Tier 3 of the Root14 roadmap. In the meantime, you can build custom circuits by manually implementing `ConstraintSynthesizer<Fr>` and using the existing prove/serialize pipeline.

### Step 1: Implement Your Circuit

```rust
use ark_bls12_381::Fr;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};

#[derive(Clone)]
pub struct MyCircuit {
    // your witnesses here
}

impl ConstraintSynthesizer<Fr> for MyCircuit {
    fn generate_constraints(
        self,
        cs: ConstraintSystemRef<Fr>,
    ) -> Result<(), SynthesisError> {
        // your constraints here
        Ok(())
    }
}
```

### Step 2: Setup and Prove with Groth16

```rust
use ark_bls12_381::Bls12_381;
use ark_groth16::Groth16;
use ark_snark::SNARK;
use ark_std::rand::{rngs::StdRng, SeedableRng};

let mut rng = StdRng::seed_from_u64(42);

// Setup
let empty = MyCircuit { /* None witnesses */ };
let (pk, vk) = Groth16::<Bls12_381>::circuit_specific_setup(empty, &mut rng)?;

// Prove
let circuit = MyCircuit { /* populated witnesses */ };
let proof = Groth16::<Bls12_381>::prove(&pk, circuit, &mut rng)?;
```

### Step 3: Serialize for Soroban

```rust
use r14_sdk::serialize::{serialize_proof_for_soroban, serialize_vk_for_soroban};

let svk = serialize_vk_for_soroban(&vk);
let (sp, spi) = serialize_proof_for_soroban(&proof, &public_inputs);

// svk fields: alpha_g1, beta_g2, gamma_g2, delta_g2, ic (all hex)
// sp fields: a, b, c (hex)
// spi: Vec<String> of hex-encoded public inputs
```

### Step 4: Register VK and Submit Proof

Use the r14 SDK Soroban module to register the VK on r14 core and submit proofs. The VK registration returns a `circuit_id` (content-addressed SHA256 hash of the VK), which you pass to the transfer contract for verification.

```rust
use r14_sdk::soroban::invoke_contract;

// Register VK
let circuit_id = invoke_contract(
    &core_contract_id, "testnet", &secret,
    "register",
    &[("caller", &caller_address), ("vk", &vk_json)],
).await?;

// Submit proof for verification
let result = invoke_contract(
    &core_contract_id, "testnet", &secret,
    "verify",
    &[("circuit_id", &circuit_id), ("proof", &proof_json), ("inputs", &inputs_json)],
).await?;
```
