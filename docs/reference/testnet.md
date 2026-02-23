---
sidebar_position: 3
---

# Testnet Deployment

Current and historical Root14 deployments on Stellar Testnet.

## Current Deployment

| Component | Value |
|---|---|
| r14-core | `CBTFDKV5UOH4CW25DKULXVSLHA6KQHP6AW3QHSGF4QI2HXSHH6NZKN7G` |
| r14-transfer | `CCBUWWLVJL55IM6DVD3JNU5SSQGJTNB6XN2ZBQ73TGATLJ6HEB7RI5V6` |
| circuit_id | `f28f257e3557c197e2ff29c38cd817a12bfef09e54f3c7904e1caf21985b5736` |
| Network | Stellar Testnet |
| RPC | `https://soroban-testnet.stellar.org:443` |

### Quick Setup

```bash
r14 keygen
r14 config set stellar_secret YOUR_TESTNET_SECRET
r14 config set core_contract_id CBTFDKV5UOH4CW25DKULXVSLHA6KQHP6AW3QHSGF4QI2HXSHH6NZKN7G
r14 config set transfer_contract_id CCBUWWLVJL55IM6DVD3JNU5SSQGJTNB6XN2ZBQ73TGATLJ6HEB7RI5V6
```

If using an already-initialized deployment, skip `r14 init-contract` and proceed directly to deposits and transfers.

## Previous Deployments

### Phase 0 - Core Verifier

Initial deployment of r14 core with Groth16 verification.

| Component | Contract ID |
|---|---|
| r14-core | (initial testnet deployment) |

### Phase 1 - Transfer Circuit

Added the transfer circuit and r14 transfer contract.

| Component | Contract ID |
|---|---|
| r14-core | (phase 1 deployment) |
| r14-transfer | (phase 1 deployment) |

### Phase 2 - Indexer Integration

Added event-based indexer and Merkle proof serving.

| Component | Contract ID |
|---|---|
| r14-core | (phase 2 deployment) |
| r14-transfer | (phase 2 deployment) |

### Phase 3 - SDK + CLI

Full SDK, CLI, and high-level client. Current production contracts.

| Component | Contract ID |
|---|---|
| r14-core | `CBTFDKV5UOH4CW25DKULXVSLHA6KQHP6AW3QHSGF4QI2HXSHH6NZKN7G` |
| r14-transfer | `CCBUWWLVJL55IM6DVD3JNU5SSQGJTNB6XN2ZBQ73TGATLJ6HEB7RI5V6` |

## Network Details

- **Network passphrase**: `Test SDF Network ; September 2015`
- **Friendbot**: Available for testnet XLM at `https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY`
- **Horizon**: `https://horizon-testnet.stellar.org`
- **Soroban RPC**: `https://soroban-testnet.stellar.org:443`

## Getting Testnet XLM

You need testnet XLM to pay for Soroban transaction fees. Fund your account via Friendbot:

```bash
curl "https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY"
```

Or use the Stellar Laboratory at [lab.stellar.org](https://lab.stellar.org).

## Storage TTL

Soroban contract storage has a TTL (time to live). Root14's contracts use persistent storage with a TTL of 535,680 ledgers (~30 days). If data expires, it needs to be restored via `stellar contract restore`.
