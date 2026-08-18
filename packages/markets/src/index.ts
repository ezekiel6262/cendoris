import type { Asset, Portfolio } from "@cendoris/types";
import { generateStructured } from "@cendoris/ai";

export type MarketProposal = {
  name: string;
  marketType: "Spot" | "Perpetual" | "Outcome";
  underlying: string;
  purpose: string;
  oracle: string;
  initialMarginPct: number;
  maintenanceMarginPct: number;
  demandScore: number;
  estimatedAddressableDemand: number;
  rationale: string;
};

const SYSTEM = "You are Cendoris's Market Engine. Given a live portfolio and the available asset universe, identify the single most valuable missing market: usually a hedge for a concentrated or correlated risk the current asset universe cannot express, or a market that would let the portfolio express a view it currently cannot. Propose a spot, perpetual, or outcome market. It would be launched as a venue on X Layer's Exchange OS — a protocol-level system where a deployer stakes OKB under XIP-Exchange OS to create a permissionless venue with shared matching, margin and settlement. Size initialMarginPct/maintenanceMarginPct like a real risk desk would for the underlying's volatility. demandScore is 0-100. estimatedAddressableDemand is a rough USD figure for how much of this portfolio's capital could route through the market. Be specific and quantitative, not generic.";

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    marketType: { type: "string", enum: ["Spot", "Perpetual", "Outcome"] },
    underlying: { type: "string" },
    purpose: { type: "string" },
    oracle: { type: "string" },
    initialMarginPct: { type: "number" },
    maintenanceMarginPct: { type: "number" },
    demandScore: { type: "number" },
    estimatedAddressableDemand: { type: "number" },
    rationale: { type: "string" },
  },
  required: ["name", "marketType", "underlying", "purpose", "oracle", "initialMarginPct", "maintenanceMarginPct", "demandScore", "estimatedAddressableDemand", "rationale"],
};

function heuristicProposal(portfolio: Portfolio, assets: Asset[]): MarketProposal {
  const riskiest = [...portfolio.allocations].sort((a, b) => b.risk * b.weight - a.risk * a.weight)[0];
  const asset = assets.find((a) => a.id === riskiest?.assetId);
  const name = asset ? `${asset.symbol} Hedge Index` : "Portfolio Hedge Index";
  return {
    name,
    marketType: "Perpetual",
    underlying: asset?.name ?? "Concentrated portfolio exposure",
    purpose: "Hedge the portfolio's largest risk-weighted position",
    oracle: "Heuristic placeholder oracle (Gemini unavailable)",
    initialMarginPct: 14,
    maintenanceMarginPct: 9,
    demandScore: 60,
    estimatedAddressableDemand: Math.round((riskiest?.amount ?? 0) * 1.5),
    rationale: "Heuristic estimate; live market discovery unavailable.",
  };
}

export async function proposeMarket(portfolio: Portfolio, assets: Asset[]): Promise<MarketProposal> {
  try {
    const prompt = JSON.stringify({
      allocations: portfolio.allocations.map((a) => ({ symbol: a.symbol, weight: a.weight, risk: a.risk })),
      portfolioRisk: portfolio.risk,
      assets: assets.map((a) => ({ symbol: a.symbol, name: a.name, assetClass: a.assetClass, risk: a.risk, apy: a.apy })),
    });
    return await generateStructured<MarketProposal>({ model: "fast", system: SYSTEM, prompt, schema: SCHEMA });
  } catch (error) {
    console.error("[cendoris] Gemini market proposal failed, using heuristic fallback.", error);
    return heuristicProposal(portfolio, assets);
  }
}
