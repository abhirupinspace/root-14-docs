import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/architecture',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/notes-utxo',
        'concepts/keys-and-nullifiers',
        'concepts/merkle-tree',
        'concepts/groth16-on-soroban',
        'concepts/protocol-flow',
        'concepts/platform',
      ],
    },
    {
      type: 'category',
      label: 'zkTLS',
      items: [
        'zktls/overview',
        'zktls/integration',
      ],
    },
    {
      type: 'category',
      label: 'SDK Reference',
      items: [
        'sdk/overview',
        'sdk/client',
        'sdk/wallet',
        'sdk/merkle',
        'sdk/serialize',
        'sdk/soroban',
        'sdk/prove',
        'sdk/errors',
      ],
    },
    {
      type: 'category',
      label: 'Circuit Library',
      items: [
        'circuits/transfer',
        'circuits/preimage',
        'circuits/ownership',
        'circuits/membership',
        'circuits/range',
      ],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'contracts/r14-core',
        'contracts/r14-transfer',
      ],
    },
    {
      type: 'category',
      label: 'Integration Guides',
      items: [
        'guides/demo-dapp',
        'guides/build-zk-dapp',
        'guides/keygen',
        'guides/deposits',
        'guides/transfers',
        'guides/balance',
        'guides/offline-merkle',
        'guides/custom-circuits',
        'guides/mcp-server',
      ],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      items: [
        'cli/overview',
        'cli/keygen',
        'cli/deposit',
        'cli/transfer',
        'cli/balance',
        'cli/config',
        'cli/init-contract',
      ],
    },
    {
      type: 'category',
      label: 'Indexer API',
      items: [
        'indexer/api',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'reference/hex-conventions',
        'reference/benchmarks',
        'reference/testnet',
        'reference/glossary',
      ],
    },
  ],
};

export default sidebars;
