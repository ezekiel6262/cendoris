import fs from "node:fs";
import path from "node:path";
import { AbiCoder, Contract, JsonRpcProvider, parseUnits } from "ethers";

const deployment = JSON.parse(fs.readFileSync(path.resolve("contracts/deployments/local.json"), "utf8"));
const artifact = (name) => JSON.parse(fs.readFileSync(path.resolve(`contracts/artifacts/${name}.json`), "utf8"));
const provider = new JsonRpcProvider(deployment.rpcUrl);
const admin = await provider.getSigner(0), owner = await provider.getSigner(1), attacker = await provider.getSigner(2), recipient = await provider.getSigner(3);
const ownerAddress = await owner.getAddress(), attackerAddress = await attacker.getAddress(), recipientAddress = await recipient.getAddress();
const c = deployment.contracts;
const vault = new Contract(c.vault, artifact("CendorisVault").abi, owner);
const factory = new Contract(c.vaultFactory, artifact("CendorisVaultFactory").abi, owner);
const router = new Contract(c.executionRouter, artifact("CendorisExecutionRouter").abi, owner);
const policy = new Contract(c.policyManager, artifact("CendorisPolicyManager").abi, owner);
const oracle = new Contract(c.riskOracle, artifact("CendorisRiskOracle").abi, admin);
const registry = new Contract(c.registry, artifact("CendorisAssetRegistry").abi, admin);
const token = new Contract(c.usdt, artifact("MockERC20").abi, owner);
const expectRevert = async (label, fn) => { let reverted = false; try { await fn(); } catch { reverted = true; } if (!reverted) throw new Error(`${label}: expected revert`); };

if ((await vault.owner()).toLowerCase() !== ownerAddress.toLowerCase()) throw new Error("vault owner mismatch");
await expectRevert("unauthorized withdrawal", () => vault.connect(attacker).withdraw.staticCall(c.usdt, attackerAddress, 1n));
await expectRevert("duplicate vault", () => factory.createVault.staticCall());

const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
const amount = parseUnits("1000", 6);
const action = [c.adapter, c.usdt, amount, AbiCoder.defaultAbiCoder().encode(["address"], [recipientAddress])];
const actions = [action];
const nonce = await router.nonces(c.vault);
const planHash = await router.hashPlan(c.vault, nonce, deadline, actions);
const expiresAt = deadline;
const reportHash = await policy.hashReport(c.vault, nonce, planHash, 35, 4500, 1000, expiresAt);

await expectRevert("unattested report", () => router.executePlan.staticCall(c.vault, deadline, actions, [35, 4500, 1000, expiresAt]));
await (await oracle.publish(reportHash)).wait();
await (await router.executePlan(c.vault, deadline, actions, [35, 4500, 1000, expiresAt])).wait();
if (await token.balanceOf(recipientAddress) !== amount) throw new Error("adapter did not move expected value");
await expectRevert("replayed plan", () => router.executePlan.staticCall(c.vault, deadline, actions, [35, 4500, 1000, expiresAt]));

const nextNonce = await router.nonces(c.vault);
const nextPlanHash = await router.hashPlan(c.vault, nextNonce, deadline, actions);
const breachHash = await policy.hashReport(c.vault, nextNonce, nextPlanHash, 80, 4500, 1000, expiresAt);
await (await oracle.publish(breachHash)).wait();
await expectRevert("risk breach", () => router.executePlan.staticCall(c.vault, deadline, actions, [80, 4500, 1000, expiresAt]));

await (await registry.configureAdapter(c.adapter, false)).wait();
const validHash = await policy.hashReport(c.vault, nextNonce, nextPlanHash, 35, 4500, 1000, expiresAt);
await (await oracle.publish(validHash)).wait();
await expectRevert("disabled adapter", () => router.executePlan.staticCall(c.vault, deadline, actions, [35, 4500, 1000, expiresAt]));
await (await registry.configureAdapter(c.adapter, true)).wait();

console.log(JSON.stringify({ vaultOwner: ownerAddress, unauthorizedWithdrawal: "REJECTED", duplicateVault: "REJECTED", unattestedReport: "REJECTED", replayedPlan: "REJECTED", riskBreach: "REJECTED", disabledAdapter: "REJECTED", authorizedTransfer: "EXECUTED", nonce: Number(await router.nonces(c.vault)) }, null, 2));
