---
sidebar_position: 4
---

# Groth16 on Soroban

Root14 uses the Groth16 zero-knowledge proof system with the BLS12-381 elliptic curve, verified natively on Soroban via host functions introduced in Stellar Protocol 25 (X-Ray).

## Why Groth16

Groth16 is the most compact SNARK in production use:

- **Constant-size proof**: Every proof is exactly 3 curve elements (G1 + G2 + G1), regardless of circuit complexity. No logarithmic blowup.
- **Fast verification**: A single multi-pairing check. Verification time is dominated by the pairing computation, not the number of constraints.
- **Mature tooling**: The arkworks ecosystem provides battle-tested implementations of Groth16, BLS12-381, and R1CS constraint systems.

The tradeoff is a **trusted setup** -- a circuit-specific ceremony that produces the proving and verification keys. For development, Root14 uses a deterministic setup with `seed = 42`. Production deployments require a proper multi-party computation ceremony.

## BLS12-381 Host Functions

Soroban Protocol 25 added 16 host functions for BLS12-381 arithmetic:

| Category | Functions |
|----------|-----------|
| Fr arithmetic | `fr_add`, `fr_sub`, `fr_mul`, `fr_pow2`, `fr_inv`, `fr_from_u256` |
| G1 operations | `g1_add`, `g1_mul`, `g1_msm` |
| G2 operations | `g2_add`, `g2_mul`, `g2_msm` |
| Pairing | `pairing_check` |
| Serialization | `g1_from/to_bytes`, `g2_from/to_bytes`, `fr_from/to_bytes` |
| Hashing | `hash_to_g1` |

These are **native host functions**, not WASM implementations. The pairing and multi-scalar multiplication (MSM) run in optimized Rust on the validator node, making on-chain ZK verification practical within Soroban's instruction budget.

## Verification Algorithm

The on-chain verifier in `r14-core` implements the standard Groth16 verification equation:

where `L = IC[0] + MSM(IC[1..], public_inputs)`.

```rust
pub fn verify_groth16(
    env: &Env,
    vk: &VerificationKey,
    proof: &Proof,
    public_inputs: &Vec<Fr>,
) -> bool {
    let bls = env.crypto().bls12_381();

    // Step 1: Compute L = IC[0] + MSM(IC[1..], public_inputs)
    let ic_0: G1Affine = vk.ic.get(0).expect("VK must have at least ic[0]");
    let l = if public_inputs.is_empty() {
        ic_0
    } else {
        let ic_rest: Vec<G1Affine> = vk.ic.slice(1..);
        let msm_result = bls.g1_msm(ic_rest, public_inputs.clone());
        bls.g1_add(&ic_0, &msm_result)
    };

    // Step 2: Negate G1 points
    let neg_one = bls.fr_sub(&zero, &one);
    let neg_l = bls.g1_mul(&l, &neg_one);
    let neg_c = bls.g1_mul(&proof.c, &neg_one);
    let neg_alpha = bls.g1_mul(&vk.alpha_g1, &neg_one);

    // Step 3: 4-pairing check
    bls.pairing_check(
        [proof.a, neg_l, neg_c, neg_alpha],
        [proof.b, vk.gamma_g2, vk.delta_g2, vk.beta_g2],
    )
}
```

The verification key and proof types:

```rust
pub struct VerificationKey {
    pub alpha_g1: G1Affine,
    pub beta_g2: G2Affine,
    pub gamma_g2: G2Affine,
    pub delta_g2: G2Affine,
    pub ic: Vec<G1Affine>,  // ic[0] = constant, ic[1..] = per-input
}

pub struct Proof {
    pub a: G1Affine,
    pub b: G2Affine,
    pub c: G1Affine,
}
```

## On-chain Costs

| Metric | Value |
|--------|-------|
| Verification instructions | ~40M (of 100M budget) |
| Deposit fee | ~42K stroops (~$0.004 USD) |
| Transfer fee | ~60K stroops (~$0.006 USD) |
| Budget headroom | ~60% remaining after verify |

The 100M instruction budget is Soroban's per-transaction limit. Groth16 verification consumes roughly 40% of it, leaving ample room for the surrounding contract logic (nullifier checks, root storage, event emission).

## Proof and Key Sizes

| Component | Curve Elements | Raw Bytes |
|-----------|---------------|-----------|
| Proof `a` | 1x G1 | 96 bytes |
| Proof `b` | 1x G2 | 192 bytes |
| Proof `c` | 1x G1 | 96 bytes |
| **Total proof** | **3 elements** | **384 bytes** |

The verification key's IC vector has 5 G1 points for the transfer circuit: 1 constant term + 4 public inputs (old_root, nullifier, cm_0, cm_1).

## WASM Contract Sizes

Because pairings and field arithmetic are host functions, the Soroban contracts are thin glue code:

| Contract | WASM Size | Role |
|----------|-----------|------|
| `r14-core` | ~7.1 KB | General-purpose Groth16 verifier registry |
| `r14-transfer` | ~4.7 KB | Private transfer logic, delegates verify to r14-core |

These sizes are well under Soroban's WASM size limits. The contracts contain no cryptographic implementations -- they call host functions for all BLS12-381 operations.

## Trusted Setup

Groth16 requires a per-circuit trusted setup that produces the proving key (PK) and verification key (VK). The setup is performed by running the circuit with empty witnesses:

```rust
pub fn setup<R: RngCore + CryptoRng>(
    rng: &mut R,
) -> (ProvingKey<Bls12_381>, VerifyingKey<Bls12_381>) {
    let circuit = TransferCircuit::empty();
    Groth16::<Bls12_381>::circuit_specific_setup(circuit, rng)
        .expect("setup failed")
}
```

For development and testing, Root14 uses a deterministic RNG seeded with `42`:

```rust
use ark_std::rand::{rngs::StdRng, SeedableRng};
let mut rng = StdRng::seed_from_u64(42);
let (pk, vk) = setup(&mut rng);
```

This is **not secure for production**. A production deployment must use a multi-party computation (MPC) ceremony where multiple independent participants contribute randomness. As long as at least one participant is honest and destroys their toxic waste, the setup is sound.

## Transfer Circuit Stats

| Metric | Value |
|--------|-------|
| Constraints | 7,638 |
| Public inputs | 4 (old_root, nullifier, cm_0, cm_1) |
| Private witnesses | sk, consumed note (4 fields), Merkle path (20 siblings + 20 bits), 2 output notes (4 fields each) |
| IC length | 5 (1 constant + 4 public inputs) |
| Proving time | ~2-4 seconds (desktop CPU) |
| Verification time | ~40M Soroban instructions |

The circuit enforces 7 constraint groups: ownership, commitment preimage, Merkle inclusion, nullifier derivation, two output commitments, value conservation, and app tag matching.
