# Cendoris

**The intelligence layer for programmable capital.**

Tokenization is producing more investable assets — tokenized equities, real-world assets, on-chain credit — faster than anyone can track them by hand. Cendoris lets a user or institution state a plain-language capital objective ("earn 8% on this position, keep 20% liquid, protect it from an AI-sector drawdown") and turns it into a continuously managed, non-custodial position on X Layer.

Gemini proposes. A deterministic policy contract decides. The user's own wallet executes. Cendoris never holds a signing key.

## How it works

```text
Plain-language objective
        |
Gemini compiles it into a numeric mandate            (packages/mandate)
        |
Gemini constructs (or defensively rebalances)
a portfolio against the live asset universe            (packages/capital)
        |
Deterministic policy checks risk, liquidity,
concentration and equity limits — no model involved     (packages/policy)
        |
The user's wallet signs the on-chain execution           (CendorisExecutionRouter)
        |
A worker monitors the position and can propose
a recovery when the market moves against it           (packages/automation)
```

The same mandate/policy rails also drive two more engines: **credit underwriting** (`packages/credit` — Gemini scores real-world private-credit opportunities before a mandate can fund them) and **market discovery** (`packages/markets` — Gemini identifies the hedge this specific portfolio is missing and frames it as a proposal for an [Exchange OS](https://www.okx.com/en-us/learn/exchange-os) venue).

## What's actually verified, not just claimed

- The on-chain risk snapshot in every execution matches the live computed portfolio — proven by running the real `/api/demo → /api/execution → executePlan` pipeline end to end against deployed contracts, not asserted.
- Every AI call is schema-constrained and falls back to a logged, deterministic heuristic if Gemini is unavailable — the app never silently fakes an AI decision.
- The market-shock breach and recovery are computed from real portfolio math, not a hardcoded number standing in for "the AI decided this."
- See [docs/architecture.md](docs/architecture.md) for the full trust boundary and what this deliberately does *not* solve yet.

## Business model & X Layer growth

Management and performance fees on managed mandates, an origination fee on funded private credit — none of which require Cendoris to ever hold funds. Every mandate lifecycle is also an X Layer transaction, which is direct Launch Grant volume, not just usage. Full breakdown: [docs/business-model.md](docs/business-model.md).

## Roadmap

- **Now:** X Layer Testnet, three live Gemini decision points proven end to end, non-custodial execution verified on-chain.
- **30–60 days:** X Layer Mainnet, a live market-data feed replacing the current five-asset simulated universe, an independent contract audit before handling real user funds at scale.
- **90+ days:** real originator partnerships for the Credit Engine, pursuing the Exchange OS staking path for a Market Engine proposal Cendoris believes in, an institutional mandate tier.

## Team

_Add team info here before submission — names, roles, and relevant background. Judges weigh this; nothing here should be invented._

## Local development

Requirements: Node.js 20+ and pnpm 10+. Foundry is optional; the included `solc` compiler and Hardhat local chain work without it.

Copy `.env.example` to `.env` and set `GEMINI_API_KEY` (get one at [ai.google.dev](https://ai.google.dev)). Without it, the mandate/allocation/underwriting/market calls fall back to a deterministic heuristic and log that they did — the app still runs, but it isn't showing real AI output.

```bash
pnpm install --ignore-scripts

# Terminal 1: local EVM chain, chain ID 31337
pnpm chain

# Terminal 2: compile and deploy the protocol
pnpm chain:deploy

# Verify ownership, policy, replay, oracle, and adapter invariants
pnpm contracts:test

# Terminal 3: application
pnpm dev
```

Open `http://localhost:3000`. Local deployment addresses are written to `contracts/deployments/local.json`. Local accounts and mock tokens are test infrastructure only and must never receive real funds.

## Live on X Layer Testnet

Deployed and verified end to end — a real mandate, a real Gemini-constructed portfolio, a real policy check, and a real signed execution transaction, publicly checkable on-chain:

- Vault Factory: [`0xf6e9EeED7e82AB49b29270349Fbb26CF72eC1aDa`](https://www.oklink.com/xlayer-test/address/0xf6e9EeED7e82AB49b29270349Fbb26CF72eC1aDa)
- Execution Router: [`0xea2A0c1D66fA7f3556F32e5e7D52B82cDC502b0B`](https://www.oklink.com/xlayer-test/address/0xea2A0c1D66fA7f3556F32e5e7D52B82cDC502b0B)
- Policy Manager: [`0x4E7e7D707DbF9a5B108b6FD62F001FccF56C1477`](https://www.oklink.com/xlayer-test/address/0x4E7e7D707DbF9a5B108b6FD62F001FccF56C1477)
- Risk Oracle: [`0xcb9D1bDf5b0E6aA8b115C3C3946097E214652393`](https://www.oklink.com/xlayer-test/address/0xcb9D1bDf5b0E6aA8b115C3C3946097E214652393)
- Test USDT (MockERC20): [`0xc6D7A678828D3C88178A604EedcEAeF291C00d3D`](https://www.oklink.com/xlayer-test/address/0xc6D7A678828D3C88178A604EedcEAeF291C00d3D)
- Example verified execution: [`0xd557623d13774abe7d111c85839bc89367db9c554939b914218ad54217debf0d`](https://www.oklink.com/xlayer-test/tx/0xd557623d13774abe7d111c85839bc89367db9c554939b914218ad54217debf0d) — 5 real ERC-20 transfers matching a live Gemini-decided allocation (35/30/20/10/5%), `Accepted on L2`.

Full addresses: `contracts/deployments/xlayer-testnet.json`.

## X Layer testnet deployment

Set `DEPLOYER_PRIVATE_KEY` in `.env` (a funded X Layer testnet wallet), then:

```bash
pnpm chain:deploy:xlayer-testnet
```

This deploys the same contract set to X Layer testnet (chain 1952) and writes `contracts/deployments/xlayer-testnet.json`. Set `CENDORIS_NETWORK=xlayer-testnet` in `.env` to point the app's execution route at that deployment instead of the local chain.

## Contract boundary

- `CendorisVaultFactory`: creates one wallet-owned vault per address and permanently binds the router.
- `CendorisVault`: holds assets, gives withdrawals only to its owner, and calls allowlisted adapters only through the router.
- `CendorisStrategyRegistry`: stores versioned, owner-approved capital constraints.
- `CendorisRiskOracle`: records reports from explicitly authorized risk reporters.
- `CendorisPolicyManager`: combines strategy constraints with plan-bound, expiring risk attestations.
- `CendorisExecutionRouter`: accepts execution only from the vault owner, consumes a per-vault nonce, and routes approved actions.
- `CendorisAssetRegistry`: allowlists assets and adapters under two-step administration.

Server-side transaction signing is intentionally disabled. The web client supports OKX Wallet and standard EIP-1193 providers. On local chain 31337, the development-only faucet funds the connected address; that wallet then signs vault creation, token approval, deposit, strategy activation, and execution. The backend risk reporter can publish a plan-bound attestation but cannot execute the vault transaction.
