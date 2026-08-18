import fs from "node:fs";
import path from "node:path";
import { Contract, JsonRpcProvider, Wallet, isAddress, parseUnits } from "ethers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// A visitor-facing faucet for the MockERC20 test USDT only — we control that token, so minting
// it is free and safe. We cannot fund a visitor's native OKB (real testnet gas); they get that
// from OKX's own faucet at web3.okx.com/xlayer/faucet. Rate-limited per address so a loop can't
// drain the deployer wallet's own gas balance, which the execution route also depends on.
const CLAIM_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const CLAIM_AMOUNT = "100000";
const lastClaim = new Map<string, number>();

function workspaceRoot() {
  return path.basename(process.cwd()) === "web" ? path.resolve(process.cwd(), "../..") : process.cwd();
}

export async function POST(request: NextRequest) {
  try {
    const network = process.env.CENDORIS_NETWORK ?? "local";
    if (network === "local") return NextResponse.json({ error: "Use the local faucet on chain 31337." }, { status: 400 });

    const { account } = await request.json();
    if (!isAddress(account)) return NextResponse.json({ error: "Invalid wallet address." }, { status: 400 });

    const last = lastClaim.get(account.toLowerCase());
    if (last && Date.now() - last < CLAIM_COOLDOWN_MS) {
      const hoursLeft = Math.ceil((CLAIM_COOLDOWN_MS - (Date.now() - last)) / 3_600_000);
      return NextResponse.json({ error: `This address already claimed test USDT. Try again in about ${hoursLeft}h.` }, { status: 429 });
    }

    const root = workspaceRoot();
    const deployment = JSON.parse(fs.readFileSync(path.join(root, `contracts/deployments/${network}.json`), "utf8"));
    const artifact = JSON.parse(fs.readFileSync(path.join(root, "contracts/artifacts/MockERC20.json"), "utf8"));
    if (!process.env.DEPLOYER_PRIVATE_KEY) return NextResponse.json({ error: "Faucet is not configured on this deployment." }, { status: 503 });

    const provider = new JsonRpcProvider(deployment.rpcUrl);
    const admin = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    const token = new Contract(deployment.contracts.usdt, artifact.abi, admin);

    const target = parseUnits(CLAIM_AMOUNT, 6);
    const balance: bigint = await token.balanceOf(account);
    if (balance >= target) return NextResponse.json({ funded: true, account, note: "Wallet already holds enough test USDT." });

    const receipt = await (await token.mint(account, target - balance)).wait();
    lastClaim.set(account.toLowerCase(), Date.now());
    return NextResponse.json({ funded: true, account, transactionHash: receipt.hash });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Testnet funding failed." }, { status: 500 });
  }
}
