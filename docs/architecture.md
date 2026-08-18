# Cendoris architecture

Cendoris separates intelligence, attestation, policy, authorization, and custody.

```text
Market and asset data
        |
Intelligence proposes a typed plan
        |
Risk reporters attest plan-bound metrics
        |
PolicyManager verifies strategy + report + expiry
        |
Wallet owner signs ExecutionRouter transaction
        |
Wallet-owned Vault invokes allowlisted adapters
        |
Protocol events become the audit trail
```

AI has no signing key, vault role, policy-administration role, or unilateral route to an adapter. A valid execution requires all of the following:

1. The target is a vault created by the canonical factory.
2. The caller is the current vault owner.
3. The plan deadline has not passed.
4. The plan nonce is current.
5. The vault has an active, owner-approved strategy.
6. Risk metrics satisfy that strategy.
7. The risk report is published by an authorized reporter and bound to the exact plan hash and nonce.
8. Every token and adapter is allowlisted.

## Trust boundaries

- Vault owners can always withdraw their assets directly.
- Registry administrators can disable assets or adapters but cannot withdraw vault funds.
- Risk reporters can attest data but cannot execute plans.
- The router can call a vault only when its owner submits a policy-valid transaction.
- Adapter risk remains explicit; only reviewed adapters should be allowlisted.
- Contracts are non-upgradeable in this foundation. A new protocol version requires new deployments and voluntary wallet migration.

## Wallet transaction sequence

1. The wallet switches to the configured network.
2. The wallet creates its canonical vault through `CendorisVaultFactory`.
3. The wallet approves and deposits an allowlisted asset.
4. The wallet signs a versioned Capital Strategy.
5. The risk service publishes an attestation bound to the exact vault, nonce, plan hash, metrics, and expiry.
6. The wallet signs `ExecutionRouter.executePlan`.
7. The router validates policy and the vault invokes only allowlisted adapters.

The local faucet exists only in development on chain 31337 and is disabled when `NODE_ENV=production`.

## Monorepo

- `apps/web`: wallet and capital-management interface.
- `apps/api`: protocol services and structured intelligence boundary.
- `apps/worker`: durable monitoring and risk-report publication.
- `packages/*`: intelligence, risk, capital, credit, policy, automation, persistence, and shared types.
- `contracts`: wallet custody, strategy, risk attestation, deterministic policy, registry, and execution contracts.

## Where the AI actually is

Four call sites use Gemini (`packages/ai`), each schema-constrained so the model can only return values the caller already expects:

- `packages/mandate`: parses a plain-language instruction into numeric mandate constraints.
- `packages/capital`: constructs (or defensively rebalances) portfolio weights from the mandate and live asset data, with a per-asset rationale.
- `packages/credit`: underwrites a real-world credit opportunity — borrower/originator quality, default probability, expected loss, recommended yield.
- `packages/markets`: reads the live portfolio's correlation/concentration risk and proposes the missing market that would hedge it — framed as a submission to Exchange OS's real permissionless venue-creation flow (OKB staked under XIP-Exchange OS), not a live deployment. Exchange OS has no public SDK for programmatic market creation today, so this is deliberately scoped as an AI-generated proposal rather than a fabricated integration.

Everything downstream of those calls — `packages/policy`'s validation, the contracts, the execution route's plan construction — is deterministic and has no model in the loop. If a Gemini call fails (no key, network error, malformed response), each call site falls back to a fixed heuristic and logs it; the UI and audit trail say so rather than silently faking an AI decision.

## What this doesn't solve

The vault/policy/router split answers the custody question — Cendoris never has unilateral access to funds. It does not answer the regulatory question: allocating capital, underwriting credit, and rebalancing portfolios on someone else's behalf are regulated activities (investment adviser registration, securities treatment of tokenized equities and credit, lending licenses) in most jurisdictions. Nothing in this repository addresses that, and it's a separate, slower workstream from the product itself — see [business-model.md](business-model.md).
