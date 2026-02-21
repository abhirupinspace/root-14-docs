---
sidebar_position: 2
---

# Keys and Nullifiers

Root14's privacy model relies on three cryptographic objects derived from a single secret: the **secret key**, the **owner hash**, and the **nullifier**. Together they enable note ownership, recipient addressing, and double-spend prevention -- all without revealing which note was spent.

## Secret Key

The secret key is a random scalar in the BLS12-381 prime field (`Fr`). It is the root of all authority in Root14 -- knowing the secret key is equivalent to owning every note addressed to its corresponding owner hash.

```rust
#[derive(Clone, Debug)]
pub struct SecretKey(pub Fr);

impl SecretKey {
    pub fn random<R: Rng>(rng: &mut R) -> Self {
        Self(Fr::rand(rng))
    }
}
```

Generate a key:

```rust
use ark_std::rand::rngs::StdRng;
use ark_std::rand::SeedableRng;
use r14_types::SecretKey;

let mut rng = StdRng::from_entropy();
let sk = SecretKey::random(&mut rng);
```

The secret key never leaves the local machine. It is stored in the wallet file at `~/.r14/wallet.json` as a hex-encoded field element. There is no on-chain representation of the secret key.

## Owner Hash

The owner hash is a one-way derivation from the secret key:

In code (`r14-poseidon`):

```rust
pub fn owner_hash(sk: &SecretKey) -> OwnerHash {
    OwnerHash(poseidon_hash(&[sk.0]))
}
```

The owner hash is **safe to share**. It functions as a recipient address -- when someone wants to send you a private note, they set the note's `owner` field to your owner hash. Because Poseidon is a one-way function, knowing the owner hash reveals nothing about the underlying secret key.

The ZK circuit verifies ownership by checking that the prover knows a secret key whose Poseidon hash equals the consumed note's `owner` field:

```rust
// Constraint 1 in TransferCircuit: Ownership
let computed_owner = poseidon_hash_var(cs.clone(), &[sk_var.clone()])?;
computed_owner.enforce_equal(&consumed_owner)?;
```

This proves "I know the secret key for this note" without revealing the secret key itself.

## Nullifier

The nullifier is the mechanism that prevents double-spending:

In code (`r14-poseidon`):

```rust
pub fn nullifier(sk: &SecretKey, nonce: &Fr) -> Nullifier {
    Nullifier::from_fr(hash2(sk.0, *nonce))
}
```

### Properties

**Deterministic**: Given the same secret key and nonce, the nullifier is always identical. There is no randomness involved. This means if you try to spend the same note twice, you will produce the same nullifier both times.

**Unlinkable**: The nullifier reveals nothing about which note was spent. An observer sees a 32-byte field element being marked as "used" but cannot connect it to any specific commitment in the Merkle tree. This is because computing the nullifier requires knowledge of `sk`, which only the note owner possesses.

**Unique per note**: Since each note has a unique random `nonce`, and the nullifier is derived from `(sk, nonce)`, every note produces a distinct nullifier even if owned by the same person with the same value.

### On-chain Nullifier Tracking

The `r14-transfer` contract maintains a set of spent nullifiers:

```rust
// In r14-transfer contract
#[contracttype]
#[derive(Clone)]
enum DataKey {
    // ...
    Nullifier(BytesN<32>),
    // ...
}
```

When a transfer is submitted, the contract checks the nullifier against its storage:

```rust
// Check nullifier not already spent
let nf_key = DataKey::Nullifier(nullifier.clone());
if env.storage().persistent().has(&nf_key) {
    panic!("nullifier already spent");
}

// ... proof verification ...

// Mark nullifier as spent
env.storage().persistent().set(&nf_key, &true);
```

If a nullifier has already been recorded, the transaction panics. This is the only double-spend check needed -- no note balances or ownership records are maintained on-chain.

### Circuit Enforcement

The ZK circuit proves the nullifier is correctly derived from the secret key and the consumed note's nonce:

```rust
// Constraint 4 in TransferCircuit: Nullifier
let computed_nf = poseidon_hash_var(cs.clone(), &[sk_var.clone(), consumed_nonce.clone()])?;
computed_nf.enforce_equal(&nullifier_pub)?;
```

This guarantees that the revealed nullifier actually corresponds to the note being spent, without exposing which note that is.

## Security Summary

| Object | Visibility | Derives From | Purpose |
|--------|-----------|--------------|---------|
| `SecretKey` | Private (never shared) | Random | Root authority for all owned notes |
| `OwnerHash` | Public (shareable) | `Poseidon(sk)` | Recipient address, note ownership tag |
| `Nullifier` | Revealed once on spend | `Poseidon(sk, nonce)` | Double-spend prevention |

The separation between owner hash (public, reusable) and nullifier (revealed once per spend) is what makes Root14 private. An observer can see that _some_ note was spent (a nullifier appeared) and that _some_ new notes were created (new commitments appeared), but cannot link the two or determine the amounts involved.
