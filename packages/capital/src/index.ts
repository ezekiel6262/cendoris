import type { Allocation, Asset, Mandate, Portfolio } from "@cendoris/types";
import { scorePortfolio } from "@cendoris/risk";
import { generateStructured } from "@cendoris/ai";

const SYSTEM = "You are Cendoris's capital allocation engine. Given a mandate's constraints and the available assets, propose portfolio weights (0-100, summing to 100 across all assets) that best satisfy the target return while respecting the risk ceiling, liquidity floor and per-asset exposure limit. If a prior breach is described, construct a defensive reallocation that resolves it: reduce the correlated risk driver first, then rebuild liquidity and low-risk carry. Give a one-sentence rationale per asset and an overall reasoning summary.";

const SCHEMA = {
  type: "object",
  properties: {
    allocations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          assetId: { type: "string" },
          weight: { type: "number" },
          rationale: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["assetId", "weight", "rationale", "confidence"],
      },
    },
    reasoning: { type: "string" },
  },
  required: ["allocations", "reasoning"],
};

type AllocationPlan = { allocations: { assetId: string; weight: number; rationale: string; confidence: number }[]; reasoning: string };

export type AllocationContext = { mode?: "initial" | "defensive"; priorPortfolio?: Portfolio; breach?: string };

const FALLBACK_WEIGHTS: Record<"initial" | "defensive", Record<string, number>> = {
  initial: { usdt: 20, ustb: 25, nvdax: 30, trade: 15, solar: 10 },
  defensive: { usdt: 30, ustb: 30, nvdax: 10, trade: 12, solar: 18 },
};

function heuristicAllocate(mandate: Mandate, assets: Asset[], mode: "initial" | "defensive"): Portfolio {
  const weights = FALLBACK_WEIGHTS[mode];
  const allocations: Allocation[] = assets.map((a) => {
    const weight = weights[a.id] ?? 0;
    return { assetId: a.id, symbol: a.symbol, weight, amount: (mandate.capital * weight) / 100, risk: a.risk, expectedReturn: a.apy };
  });
  return { ...scorePortfolio(allocations), reasoning: "Heuristic weights (Gemini unavailable)." };
}

export async function allocate(mandate: Mandate, assets: Asset[], context: AllocationContext = {}): Promise<Portfolio> {
  const mode = context.mode ?? "initial";
  try {
    const prompt = JSON.stringify({
      mandate: { capital: mandate.capital, targetReturn: mandate.targetReturn, maxRisk: mandate.maxRisk, minLiquidity: mandate.minLiquidity, maxAssetExposure: mandate.maxAssetExposure, maxEquityExposure: mandate.maxEquityExposure },
      assets: assets.map((a) => ({ id: a.id, symbol: a.symbol, assetClass: a.assetClass, apy: a.apy, risk: a.risk, liquidity: a.liquidity })),
      mode,
      priorPortfolio: context.priorPortfolio?.allocations.map((a) => ({ assetId: a.assetId, weight: a.weight })),
      breach: context.breach,
    });
    const plan = await generateStructured<AllocationPlan>({ model: "reasoning", system: SYSTEM, prompt, schema: SCHEMA });
    const total = plan.allocations.reduce((sum, a) => sum + a.weight, 0);
    if (total <= 0) throw new Error("Gemini returned a zero-weight allocation.");
    const allocations: Allocation[] = plan.allocations.map((a) => {
      const asset = assets.find((x) => x.id === a.assetId);
      if (!asset) throw new Error(`Gemini allocated to unknown asset ${a.assetId}`);
      const weight = +((a.weight / total) * 100).toFixed(2);
      return { assetId: asset.id, symbol: asset.symbol, weight, amount: (mandate.capital * weight) / 100, risk: asset.risk, expectedReturn: asset.apy, rationale: a.rationale, confidence: a.confidence };
    });
    return { ...scorePortfolio(allocations), reasoning: plan.reasoning };
  } catch (error) {
    console.error("[cendoris] Gemini allocation failed, using heuristic fallback.", error);
    return heuristicAllocate(mandate, assets, mode);
  }
}
