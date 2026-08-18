import { generateStructured } from "@cendoris/ai";

export type CreditOpportunity = {
  id: string;
  name: string;
  description: string;
  principal: number;
  region: string;
  sector: string;
  termDays: number;
  originator: string;
  financials: string;
};

export type CreditAnalysis = {
  opportunityId: string;
  borrowerQuality: number;
  originatorQuality: number;
  defaultProbability: number;
  expectedLoss: number;
  liquidityRisk: "Low" | "Medium" | "High";
  cendorisScore: number;
  recommendedYieldMin: number;
  recommendedYieldMax: number;
  maxAllocationPct: number;
  rationale: string;
};

export const opportunities: CreditOpportunity[] = [
  {
    id: "solar-senior-2029",
    name: "Solar Senior 2029",
    description: "Senior secured credit facility financing operating solar assets in Spain with contracted offtake revenue.",
    principal: 2_400_000,
    region: "Spain",
    sector: "Renewable infrastructure",
    termDays: 1460,
    originator: "Iberia Solar Credit Partners",
    financials: "Debt service coverage ratio 1.6x. Senior secured position. 8-year operating history. Contracted offtake at a fixed tariff.",
  },
  {
    id: "global-trade-90d",
    name: "Global Trade 90D",
    description: "Diversified pool of short-duration trade-finance invoices across verified export counterparties.",
    principal: 1_800_000,
    region: "Diversified",
    sector: "Trade finance",
    termDays: 90,
    originator: "Meridian Trade Finance",
    financials: "Average invoice size $42,000 across 340 underlying obligors. Historical default rate 0.4% over 6 years. Insured for 80% of principal.",
  },
  {
    id: "sme-equipment-pool",
    name: "SME Equipment Pool",
    description: "Equipment-backed lending pool to small manufacturers, secured by first-lien UCC filings on financed machinery.",
    principal: 1_100_000,
    region: "United States",
    sector: "Equipment finance",
    termDays: 730,
    originator: "Ridgeline Capital Partners",
    financials: "Loan-to-value 65%. Weighted average borrower credit score 690. First operating fund for this originator. Machinery appraised annually.",
  },
];

const SYSTEM = "You are Cendoris's credit underwriting engine for real-world-asset private credit. Score the opportunity the way a conservative institutional credit analyst would: be skeptical of thin operating history, unsecured positions and originators without a track record. borrowerQuality, originatorQuality and cendorisScore are 0-100. defaultProbability and expectedLoss are percentages. Justify the score in `rationale`, naming the specific strongest and weakest facts from the financials provided.";

const SCHEMA = {
  type: "object",
  properties: {
    borrowerQuality: { type: "number" },
    originatorQuality: { type: "number" },
    defaultProbability: { type: "number" },
    expectedLoss: { type: "number" },
    liquidityRisk: { type: "string", enum: ["Low", "Medium", "High"] },
    cendorisScore: { type: "number" },
    recommendedYieldMin: { type: "number" },
    recommendedYieldMax: { type: "number" },
    maxAllocationPct: { type: "number" },
    rationale: { type: "string" },
  },
  required: ["borrowerQuality", "originatorQuality", "defaultProbability", "expectedLoss", "liquidityRisk", "cendorisScore", "recommendedYieldMin", "recommendedYieldMax", "maxAllocationPct", "rationale"],
};

function heuristicAnalysis(opportunity: CreditOpportunity): Omit<CreditAnalysis, "opportunityId"> {
  return {
    borrowerQuality: 70,
    originatorQuality: 75,
    defaultProbability: 3.5,
    expectedLoss: 1.2,
    liquidityRisk: "Medium",
    cendorisScore: 72,
    recommendedYieldMin: 8,
    recommendedYieldMax: 10,
    maxAllocationPct: 8,
    rationale: `Heuristic placeholder for ${opportunity.name}; live underwriting unavailable.`,
  };
}

export async function underwrite(opportunity: CreditOpportunity): Promise<CreditAnalysis> {
  try {
    const result = await generateStructured<Omit<CreditAnalysis, "opportunityId">>({ model: "reasoning", system: SYSTEM, prompt: JSON.stringify(opportunity), schema: SCHEMA });
    return { opportunityId: opportunity.id, ...result };
  } catch (error) {
    console.error("[cendoris] Gemini underwriting failed, using heuristic fallback.", error);
    return { opportunityId: opportunity.id, ...heuristicAnalysis(opportunity) };
  }
}
