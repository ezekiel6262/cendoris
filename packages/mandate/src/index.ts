import type { Mandate } from "@cendoris/types";
import { generateStructured } from "@cendoris/ai";

const SYSTEM = "You are Cendoris's mandate compiler. Convert a plain-language capital instruction into strict numeric investment constraints for a non-custodial portfolio policy. If the user does not specify a constraint, choose a sensible moderate default. All percentage fields must be between 0 and 100. Explain your constraint choices in one sentence in `rationale`.";

const SCHEMA = {
  type: "object",
  properties: {
    capital: { type: "number" },
    targetReturn: { type: "number" },
    maxRisk: { type: "number" },
    minLiquidity: { type: "number" },
    maxAssetExposure: { type: "number" },
    maxEquityExposure: { type: "number" },
    maxCreditExposure: { type: "number" },
    rationale: { type: "string" },
  },
  required: ["capital", "targetReturn", "maxRisk", "minLiquidity", "maxAssetExposure", "maxEquityExposure", "maxCreditExposure", "rationale"],
};

type CompiledConstraints = Pick<Mandate, "capital" | "targetReturn" | "maxRisk" | "minLiquidity" | "maxAssetExposure" | "maxEquityExposure" | "maxCreditExposure" | "rationale">;

function heuristicFallback(text: string): CompiledConstraints {
  const numberNear = (pattern: RegExp, fallback: number) => Number((text.match(pattern)?.[1] ?? String(fallback)).replaceAll(",", ""));
  return {
    capital: numberNear(/([\d,]+)\s*(?:USDT|USD)/i, 100000),
    targetReturn: numberNear(/target\s*(?:a|an)?\s*(\d+(?:\.\d+)?)%/i, 8),
    maxRisk: /conservative|preservation/i.test(text) ? 35 : /growth|aggressive|higher risk/i.test(text) ? 75 : 45,
    minLiquidity: numberNear(/(?:keep|maintain)\s*(?:at least\s*)?(\d+)%\s*liquid/i, 20),
    maxAssetExposure: numberNear(/(?:single asset|asset)\s*(?:to|at|under)?\s*(\d+)%/i, 30),
    maxEquityExposure: 40,
    maxCreditExposure: 30,
    rationale: "Heuristic parse (Gemini unavailable): defaults applied where the instruction did not specify a constraint.",
  };
}

export async function compileMandate(text: string, owner = "0x7A3c...19F2"): Promise<Mandate> {
  const base = {
    id: "mandate-001",
    owner,
    permissions: { trade: true, lend: true, hedge: true, rebalance: true },
    automation: { monitor: true, rebalance: true, reinvest: true },
  };
  try {
    const constraints = await generateStructured<CompiledConstraints>({ model: "fast", system: SYSTEM, prompt: text, schema: SCHEMA });
    return { ...base, ...constraints };
  } catch (error) {
    console.error("[cendoris] Gemini mandate compilation failed, using heuristic fallback.", error);
    return { ...base, ...heuristicFallback(text) };
  }
}
