---
sidebar_position: 2
---

# Benchmarks

Current performance measurements for Root14 on Stellar Testnet.

## Circuit Metrics

| Metric | Value |
|---|---|
| Transfer circuit constraints | 7,638 R1CS |
| Public inputs | 4 |
| Proof size | 384 bytes |
| VK IC length | 5 (1 constant + 4 public inputs) |

## Contract Sizes

| Contract | WASM Size |
|---|---|
| r14-core | 7,157 bytes |
| r14-transfer | 4,746 bytes |
| Combined on-chain | ~12 KB |

## Transaction Costs

| Operation | Cost |
|---|---|
| Deposit fee | ~42K stroops (~$0.004) |

## Tree Parameters

| Parameter | Value |
|---|---|
| Merkle depth | 20 (supports 1,048,576 leaves) |
| Poseidon rate | 2 |
| Poseidon full rounds | 8 |
| Poseidon partial rounds | 31 |
| Poseidon alpha | 17 |
| Root history buffer | 100 entries |
| Storage TTL | 535,680 ledgers (~30 days) |

## Serialization Sizes

| Element | Bytes | Hex Characters |
|---|---|---|
| G1 point (uncompressed) | 96 | 192 |
| G2 point (uncompressed) | 192 | 384 |
| Fr scalar (field element) | 32 | 64 |

### Proof Serialization Breakdown

| Component | Format | Hex Length |
|---|---|---|
| `proof.a` | G1 | 192 chars |
| `proof.b` | G2 | 384 chars |
| `proof.c` | G1 | 192 chars |
| Each public input | Fr | 64 chars |
| VK `alpha_g1` | G1 | 192 chars |
| VK `beta_g2` | G2 | 384 chars |
| VK `gamma_g2` | G2 | 384 chars |
| VK `delta_g2` | G2 | 384 chars |
| Each VK `ic` entry | G1 | 192 chars |

## Test Coverage

| Metric | Value |
|---|---|
| Total tests | 39 |

Tests span all crates: `r14-types`, `r14-poseidon`, `r14-circuit`, `r14-sdk`, `r14-core`, `r14-transfer`, and `r14-indexer`.

## Notes

- Proof generation time depends on hardware. On a modern laptop, expect 1-5 seconds for the transfer circuit.
- The 7,638 constraint count is well within Groth16's practical limits. Verification on-chain is constant-time regardless of constraint count.
- The 384-byte proof size is a fixed property of Groth16 over BLS12-381: two G1 points (96 bytes each) + one G2 point (192 bytes).
