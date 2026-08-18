# Judge demo flow

1. Connect an OKX Wallet (or MetaMask) account.
2. Describe a strategy in plain language. Gemini compiles it into numeric constraints (`packages/mandate`) — change the wording and the constraints genuinely change, they are not a lookup table.
3. Approve the strategy: your wallet creates a Cendoris vault, deposits USDT, and signs the on-chain Capital Strategy.
4. Review the proposed portfolio. The weights and per-asset rationale come from Gemini (`packages/capital`), reasoning over the live mandate and asset data — not a fixed table.
5. Sign the execution transaction. The plan and risk snapshot sent on-chain are built from this exact portfolio (`apps/web/app/api/execution/route.ts`), so the UI and the chain state always agree.
6. Trigger the NVDAx −18% market shock and watch portfolio risk recompute for real from the shocked asset data.
7. If the mandate's risk ceiling is breached, review the recovery plan: Gemini proposes a defensive reallocation from the live shock context, policy independently validates it, and you sign the recovery transaction on-chain.
8. Open **Credit** and run a live underwriting pass on a real-world credit opportunity (`packages/credit`) — Gemini scores borrower/originator quality, default probability and a recommended yield band from the opportunity's actual financials.
9. Open **Markets** — Gemini scans this specific portfolio's live risk and proposes the market it would ask Exchange OS to deploy to hedge it (`packages/markets`), citing the real XIP-Exchange OS staking/permissionless mechanism rather than claiming a live integration that doesn't exist.
10. Review the complete decision lineage: AI proposal, policy verdict and execution event, all reflecting the real numbers from steps 2–9.

The demo is deliberately non-custodial: intelligence has no execution authority. If `GEMINI_API_KEY` is unset or a call fails, every AI step falls back to a deterministic heuristic (logged clearly) so the demo never hard-fails mid-flow — but the live-key path is the one that should be shown to judges.

