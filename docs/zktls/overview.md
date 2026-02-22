---
sidebar_position: 1
---

# zkTLS Overview

## What is zkTLS?

zkTLS (Zero-Knowledge TLS) lets users prove claims about data from HTTPS websites — without revealing the raw data and without the website's cooperation.

A user opens a normal TLS session with a web2 server (bank, government portal, employer HR system). A verifier node participates via MPC so no single party holds the full session key. After the session, the user generates a ZK proof about a specific claim ("my balance exceeds $10K") and submits it on-chain.

The server sees a normal HTTPS request. The on-chain verifier sees a valid Groth16 proof. Nobody sees the underlying data.

## How Root14 Uses zkTLS

Root14's `r14-zktls` crate bridges web2 data into Soroban-verifiable proofs:

```
1. Fetch    — TLS oracle fetches data from a URL, produces TlsAttestation
2. Commit   — Poseidon(value, nonce) binds the attested value
3. Prove    — Groth16 range proof over the committed value
4. Verify   — r14-core.verify() on Soroban — same interface as every other module
```

The key insight: the zkTLS circuit **is** the range circuit. The attestation provides the witness (value + nonce), and the range circuit proves the claim. No new circuit needed.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Web2 Server│────→│  TLS Oracle  │────→│ TlsAttestation│
│  (HTTPS)    │     │  (mock/real) │     │  value+nonce  │
└─────────────┘     └──────────────┘     └──────┬───────┘
                                                │
                                    ┌───────────▼──────────┐
                                    │  Poseidon Commitment │
                                    │  cm = H(value, nonce)│
                                    └───────────┬──────────┘
                                                │
                                    ┌───────────▼──────────┐
                                    │  Range Circuit       │
                                    │  prove min ≤ val ≤ max│
                                    └───────────┬──────────┘
                                                │
                                    ┌───────────▼──────────┐
                                    │  r14-core.verify()   │
                                    │  on Soroban          │
                                    └──────────────────────┘
```

## TLSNotary Integration

Root14 uses [TLSNotary](https://tlsnotary.org/) as the underlying attestation protocol:

- **MPC-TLS**: Splits the TLS session key between user and notary via 2PC — neither party can forge data
- **Selective disclosure**: User chooses which fields to reveal/prove
- **No server changes**: The web2 server sees a normal HTTPS client

**Current status:** The `r14-zktls` crate ships with a mock oracle that produces real Poseidon commitments and real Groth16 proofs. The TLS attestation layer is simulated. Real TLSNotary integration is the next milestone.

## What You Can Prove

| Claim | Data Source | On-Chain Reveals |
|---|---|---|
| Balance > $10K | Bank website | Nothing about actual balance |
| Age ≥ 21 | Government ID portal | Nothing about birthdate |
| Employed at Company X | HR portal | Nothing about salary |
| Credit score > 700 | Credit bureau | Nothing about score |
| Not on sanctions list | OFAC database | Nothing about identity |
| Accredited investor | Brokerage account | Nothing about net worth |
