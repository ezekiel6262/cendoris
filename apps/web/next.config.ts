import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// This app's own directory has no .env — the monorepo keeps one canonical
// .env at the repo root (matches .env.example and what the Hardhat/deploy
// scripts read), so load it explicitly instead of Next's default cwd-only lookup.
loadEnvConfig(path.resolve(__dirname, "../.."));

const config: NextConfig = {
  // Monorepo root, so file tracing resolves workspace packages correctly on Vercel.
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  // The execution and testnet-faucet routes read contracts/deployments and contracts/artifacts
  // via a runtime-computed fs path, which static analysis can't see — force them into the bundle.
  outputFileTracingIncludes: {
    "app/api/**/*": ["../../contracts/deployments/*.json", "../../contracts/artifacts/*.json"],
  },
  transpilePackages: [
    "@cendoris/automation",
    "@cendoris/types",
    "@cendoris/mandate",
    "@cendoris/intelligence",
    "@cendoris/risk",
    "@cendoris/capital",
    "@cendoris/policy",
    "@cendoris/credit",
    "@cendoris/markets",
    "@cendoris/ai",
  ],
};

export default config;
