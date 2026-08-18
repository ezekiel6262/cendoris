import type { Asset, AuditEvent, DemoResult, Mandate, PolicyResult, Portfolio } from "@cendoris/types";
import { compileMandate } from "@cendoris/mandate";
import { allocate } from "@cendoris/capital";
import { getAssets, applyShock } from "@cendoris/intelligence";
import { validate } from "@cendoris/policy";
import { scorePortfolio } from "@cendoris/risk";

const DEFAULT_TEXT = "Manage 100,000 USDT. Target 8% return, risk ceiling around 40, maintain at least 20% liquidity, no single asset over 35%.";

function auditFactory(startCount = 0) {
  let n = startCount;
  const audit: AuditEvent[] = [];
  const add = (actor: AuditEvent["actor"], type: string, summary: string, status: AuditEvent["status"], data?: unknown) =>
    audit.push({ id: `AUD-${String(++n).padStart(3, "0")}`, at: new Date().toISOString(), actor, type, summary, status, data });
  return { add, audit };
}

export type StrategyResult = { mandate: Mandate; assets: Asset[]; initial: Portfolio; initialPolicy: PolicyResult; audit: AuditEvent[] };

// The initial page load only needs a mandate and a portfolio — two sequential AI calls, not three.
// The shock/recovery scenario is computed separately, on demand, so a first-time visitor isn't
// waiting on a rebalance proposal they haven't asked for yet.
export async function proposeStrategy(text = DEFAULT_TEXT): Promise<StrategyResult> {
  const { add, audit } = auditFactory();
  const [mandate, assets] = await Promise.all([compileMandate(text), getAssets()]);
  add("AI", "MANDATE_COMPILED", mandate.rationale ?? "Intent compiled into a structured mandate", "PROPOSED", mandate);

  const initial = await allocate(mandate, assets, { mode: "initial" });
  const initialPolicy = validate(mandate, initial);
  add("POLICY", "POLICY_VALIDATED", "Initial allocation satisfies deterministic constraints", initialPolicy.valid ? "APPROVED" : "REJECTED", initialPolicy);
  add("EXECUTION", "ALLOCATION_PROPOSED", "Five X Layer allocations proposed, pending wallet signature", "PROPOSED", initial);

  return { mandate, assets, initial, initialPolicy, audit };
}

export type RecoveryResult = { shocked: Portfolio; shockPolicy: PolicyResult; rebalanced: Portfolio; rebalancePolicy: PolicyResult; audit: AuditEvent[] };

export async function proposeRecovery(mandate: Mandate, assets: Asset[], initial: Portfolio, auditStartCount = 3): Promise<RecoveryResult> {
  const { add, audit } = auditFactory(auditStartCount);
  const shockedAssets = applyShock(assets);
  const shocked = scorePortfolio(initial.allocations.map((a) => ({ ...a, risk: shockedAssets.find((s) => s.id === a.assetId)!.risk })));
  add("WORKER", "MARKET_SHOCK", `NVDAx fell 18%; portfolio risk moved from ${initial.risk} to ${shocked.risk}`, "EXECUTED");

  const shockPolicy = validate(mandate, shocked);
  add("POLICY", "BREACH_DETECTED", shockPolicy.violations[0] ?? "Risk threshold breached", "REJECTED", shockPolicy);

  const rebalanced = await allocate(mandate, shockedAssets, { mode: "defensive", priorPortfolio: initial, breach: shockPolicy.violations.join("; ") });
  const rebalancePolicy = validate(mandate, rebalanced);
  add("AI", "REBALANCE_PROPOSED", rebalanced.reasoning ?? "Defensive reallocation proposed", "PROPOSED", rebalanced);
  add("POLICY", "REBALANCE_VALIDATED", rebalancePolicy.valid ? "Rebalance restores mandate compliance" : "Proposed rebalance still violates the mandate", rebalancePolicy.valid ? "APPROVED" : "REJECTED", rebalancePolicy);
  add("EXECUTION", "REBALANCE_PROPOSED_FOR_EXECUTION", "Policy-approved rebalance, pending wallet signature", "PROPOSED", rebalanced);

  return { shocked, shockPolicy, rebalanced, rebalancePolicy, audit };
}

// Convenience wrapper for callers that want the whole flow in one shot (tests, apps/api, apps/worker).
export async function runDemo(text = DEFAULT_TEXT): Promise<DemoResult> {
  const strategy = await proposeStrategy(text);
  const recovery = await proposeRecovery(strategy.mandate, strategy.assets, strategy.initial, 3);
  return { ...strategy, ...recovery, audit: [...strategy.audit, ...recovery.audit] };
}
