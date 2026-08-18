import type { Asset } from "@cendoris/types";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { value: Asset[]; at: number } | null = null;

async function fetchJson(url: string, timeoutMs = 9000): Promise<any> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": "Mozilla/5.0 (compatible; CendorisIntelligenceEngine/1.0)" } });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
}

async function fetchNvda(): Promise<{ price: number; risk: number }> {
  const fallback = { price: 182.4, risk: 72 };
  try {
    const data = await fetchJson("https://query1.finance.yahoo.com/v8/finance/chart/NVDA?interval=1d&range=1mo");
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    if (typeof price !== "number") throw new Error("No regularMarketPrice in Yahoo response");

    const closes: number[] = (result?.indicators?.quote?.[0]?.close ?? []).filter((n: unknown) => typeof n === "number");
    let risk = fallback.risk;
    if (closes.length > 5) {
      const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
      const annualizedVolPct = Math.sqrt(variance * 252) * 100;
      risk = Math.max(10, Math.min(99, Math.round(annualizedVolPct)));
    }
    return { price: +price.toFixed(2), risk };
  } catch (error) {
    console.error("[cendoris] Live NVDA quote (Yahoo Finance) failed, using last-known fallback.", error);
    return fallback;
  }
}

async function fetchTreasuryYield(): Promise<number> {
  const fallback = 4.1;
  try {
    const data = await fetchJson("https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates?filter=security_desc:eq:Treasury%20Notes&sort=-record_date&page%5Bsize%5D=1");
    const rate = Number(data?.data?.[0]?.avg_interest_rate_amt);
    if (!rate || Number.isNaN(rate)) throw new Error("No avg_interest_rate_amt in Treasury response");
    return rate;
  } catch (error) {
    console.error("[cendoris] Live Treasury yield (fiscaldata.treasury.gov) failed, using last-known fallback.", error);
    return fallback;
  }
}

async function fetchSofr(): Promise<number> {
  const fallback = 4.3;
  try {
    const data = await fetchJson("https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json");
    const rate = data?.refRates?.[0]?.percentRate;
    if (typeof rate !== "number") throw new Error("No percentRate in NY Fed SOFR response");
    return rate;
  } catch (error) {
    console.error("[cendoris] Live SOFR (NY Fed) failed, using last-known fallback.", error);
    return fallback;
  }
}

// Real, live, publicly verifiable inputs: NVDAx prices off NVDA's actual quote and trailing
// realized volatility; USTB yields off the Treasury's own published average rate; TRDFC/SOLCR
// are Cendoris-originated private credit priced at real SOFR plus an underwritten spread — the
// same convention real private credit uses, disclosed as such rather than implying a public
// secondary market that doesn't exist for these instruments.
export async function getAssets(): Promise<Asset[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  const [nvda, treasuryYield, sofr] = await Promise.all([fetchNvda(), fetchTreasuryYield(), fetchSofr()]);
  const assets: Asset[] = [
    { id: "usdt", symbol: "USDT", name: "Dollar Liquidity", assetClass: "LIQUIDITY", apy: 3.2, risk: 8, liquidity: 100, price: 1 },
    { id: "ustb", symbol: "USTB", name: "Tokenized Treasury Fund", assetClass: "TREASURY_RWA", apy: +treasuryYield.toFixed(2), risk: 14, liquidity: 88, price: 100 },
    { id: "nvdax", symbol: "NVDAx", name: "NVIDIA Tokenized Equity", assetClass: "TOKENIZED_EQUITY", apy: 0, risk: nvda.risk, liquidity: 82, price: nvda.price },
    { id: "trade", symbol: "TRDFC", name: "Global Trade Credit 90D", assetClass: "PRIVATE_CREDIT", apy: +(sofr + 4).toFixed(2), risk: 46, liquidity: 38, price: 99.4 },
    { id: "solar", symbol: "SOLCR", name: "Solar Senior Credit", assetClass: "PRIVATE_CREDIT", apy: +(sofr + 2.5).toFixed(2), risk: 34, liquidity: 42, price: 101.1 },
  ];
  cache = { value: assets, at: Date.now() };
  return assets;
}

export const applyShock = (input: Asset[]) => input.map((a) => (a.id === "nvdax" ? { ...a, price: +(a.price * 0.82).toFixed(2), risk: 99 } : a.id === "trade" ? { ...a, risk: 62 } : a));
