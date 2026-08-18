import fs from "node:fs";
import path from "node:path";
import { AbiCoder, Contract, JsonRpcProvider, Wallet, isAddress, parseUnits } from "ethers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ASSET_ORDER = ["usdt", "ustb", "nvdax", "trade", "solar"];

function workspaceRoot() {
  return path.basename(process.cwd()) === "web" ? path.resolve(process.cwd(), "../..") : process.cwd();
}

function deploymentFile(root: string) {
  const network = process.env.CENDORIS_NETWORK ?? "local";
  const file = network === "local" ? "local.json" : `${network}.json`;
  return path.join(root, "contracts/deployments", file);
}

export async function GET() {
  try {
    const root = workspaceRoot();
    const deployment = JSON.parse(fs.readFileSync(deploymentFile(root), "utf8"));
    const provider = new JsonRpcProvider(deployment.rpcUrl);
    const network = await provider.getNetwork();
    return NextResponse.json({ online: true, chainId: Number(network.chainId), deployment });
  } catch {
    return NextResponse.json({ online: false, error: "Local chain or deployment is unavailable." }, { status: 503 });
  }
}

// Body: { owner, portfolio: Portfolio, capital: number }. The plan and risk snapshot are
// derived from the actual decided portfolio, not fixed constants, so the on-chain transaction
// matches what the UI showed the user.
export async function POST(request: NextRequest) {
  try {
    const { owner, portfolio, capital } = await request.json();
    if (!isAddress(owner)) return NextResponse.json({ error: "Invalid wallet owner." }, { status: 400 });
    if (!portfolio?.allocations?.length) return NextResponse.json({ error: "Missing portfolio allocations." }, { status: 400 });

    const root = workspaceRoot();
    const deployment = JSON.parse(fs.readFileSync(deploymentFile(root), "utf8"));
    const read = (name: string) => JSON.parse(fs.readFileSync(path.join(root, `contracts/artifacts/${name}.json`), "utf8"));
    const provider = new JsonRpcProvider(deployment.rpcUrl);
    const isLocal = (process.env.CENDORIS_NETWORK ?? "local") === "local";
    const admin = isLocal ? await provider.getSigner(0) : new Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
    const c = deployment.contracts;

    const factory = new Contract(c.vaultFactory, read("CendorisVaultFactory").abi, provider);
    const vault: string = await factory.vaultOf(owner);
    if (vault === "0x0000000000000000000000000000000000000000") return NextResponse.json({ error: "Create a wallet-owned vault first." }, { status: 409 });

    const recipients: string[] = isLocal
      ? await Promise.all([2, 3, 4, 5, 6].map(async (index) => await (await provider.getSigner(index)).getAddress()))
      : deployment.recipients;
    if (!recipients?.length) return NextResponse.json({ error: "Deployment is missing simulated adapter recipients." }, { status: 500 });
    const coder = AbiCoder.defaultAbiCoder();
    const actions = portfolio.allocations.map((allocation: { assetId: string; amount: number }) => {
      const index = ASSET_ORDER.indexOf(allocation.assetId);
      if (index === -1) throw new Error(`Unknown asset ${allocation.assetId}`);
      return {
        adapter: c.adapter,
        token: c.usdt,
        amount: parseUnits(String(Math.max(1, Math.round(allocation.amount))), 6).toString(),
        data: coder.encode(["address"], [recipients[index]]),
      };
    });

    const router = new Contract(c.executionRouter, read("CendorisExecutionRouter").abi, provider);
    const nonce = await router.nonces(vault);
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const planHash = await router.hashPlan(vault, nonce, deadline, actions);

    const risk = Math.min(65535, Math.round(portfolio.risk));
    const liquidityBps = Math.min(65535, Math.round(portfolio.liquidity * 100));
    const largestPositionBps = Math.min(65535, Math.round(Math.max(...portfolio.allocations.map((a: { weight: number }) => a.weight)) * 100));
    const snapshot = [risk, liquidityBps, largestPositionBps, deadline];

    const policy = new Contract(c.policyManager, read("CendorisPolicyManager").abi, provider);
    const reportHash = await policy.hashReport(vault, nonce, planHash, ...snapshot);

    const oracle = new Contract(c.riskOracle, read("CendorisRiskOracle").abi, admin);
    const attestation = await oracle.publish(reportHash);
    const attestationReceipt = await attestation.wait();

    return NextResponse.json({
      vault,
      router: c.executionRouter,
      deadline,
      actions,
      snapshot,
      planHash,
      reportHash,
      attestationTransactionHash: attestationReceipt.hash,
      valueMoved: String(Math.round(capital ?? portfolio.allocations.reduce((sum: number, a: { amount: number }) => sum + a.amount, 0))),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Plan preparation failed." }, { status: 500 });
  }
}
