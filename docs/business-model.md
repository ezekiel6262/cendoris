# Business model

Cendoris is a non-custodial capital operating system. It never holds funds, so its revenue comes from the decisions it makes on a user's behalf, not from custody of their assets.

## Revenue

1. **Management fee** — a small annual rate (target: 50–100 bps) on capital under an active mandate, collected in-kind through the same automation worker that already executes rebalances and reinvestment, so it requires no new contract surface.
2. **Performance fee** — a share of returns above the mandate's own target-return threshold, high-water-mark style, so Cendoris only earns more when the user's outcome improves.
3. **Credit origination fee** — a spread or flat fee (target: 50–150 bps of principal) on private-credit deals the Credit Engine underwrites and a mandate actually funds, paid by the originator side at funding.
4. **Venue economics (later-stage)** — where the Market Engine's proposal is strong enough that Cendoris itself stakes OKB to deploy it under XIP-Exchange OS, Cendoris can hold a share of that venue's ongoing trading fees. This is explicitly a later step, not part of the hackathon build — see [architecture.md](architecture.md) for what's real today.

None of these require a new trust assumption: the vault/policy/router separation described in [architecture.md](architecture.md) means Cendoris earns fees on outcomes it proposes and a deterministic contract approves, never on funds it can move unilaterally.

## Why this grows X Layer, not just Cendoris

Every mandate lifecycle — deposit, strategy activation, rebalance, defensive recovery, reinvestment — is a wallet-signed X Layer transaction. That volume is exactly what X Layer's Launch Grant rewards (50,000 USDT per 10M USDT of trading volume through the OKX DEX interface), so Cendoris's ordinary operation is direct ecosystem contribution, not just usage.

The flywheel:

- More tokenized assets on X Layer (xStocks, RWAs, credit pools) → more the Intelligence Engine can price and allocate into.
- More assets it can allocate into → more mandates Cendoris can accept and keep compliant.
- More active mandates → more automated rebalance/recovery/reinvestment transactions on X Layer.
- More transaction volume and more identified market gaps (Market Engine) → a stronger case for new Exchange OS venues, which in turn gives Cendoris more to allocate into.

## Target customer

**Now:** crypto-native holders of tokenized RWAs/equities on X Layer who want one mandate continuously managed, instead of manually tracking positions across disconnected apps.

**Next:** DAO treasuries and institutions that need policy-bound, auditable capital management — the same non-custodial guarantees, at a size where the audit trail (every AI proposal, every policy verdict, every execution event, timestamped) is itself the product.

## What this is not, yet

Portfolio allocation, credit underwriting, and automated rebalancing of client capital are regulated activities in most jurisdictions. This document describes the economic model the architecture supports, not a claim that Cendoris is licensed to operate it. That's a real, separate workstream from the product — see the honest gap called out in [architecture.md](architecture.md).
