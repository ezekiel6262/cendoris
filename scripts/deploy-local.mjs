import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ContractFactory, JsonRpcProvider, encodeBytes32String, parseUnits } from "ethers";

const rpcUrl = process.env.CENDORIS_RPC_URL ?? "http://127.0.0.1:8545";
const provider = new JsonRpcProvider(rpcUrl);
const admin = await provider.getSigner(0);
const walletOwner = await provider.getSigner(1);
const adminAddress = await admin.getAddress();
const ownerAddress = await walletOwner.getAddress();
const artifacts = path.resolve("contracts/artifacts");
const readArtifact = (name) => JSON.parse(fs.readFileSync(path.join(artifacts, `${name}.json`), "utf8"));
const deploy = async (name, args = [], signer = admin) => { const artifact = readArtifact(name); const contract = await new ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(...args); await contract.waitForDeployment(); return contract; };

const registry = await deploy("CendorisAssetRegistry", [adminAddress]);
const riskOracle = await deploy("CendorisRiskOracle", [adminAddress]);
const strategyRegistry = await deploy("CendorisStrategyRegistry");
const policyManager = await deploy("CendorisPolicyManager", [await strategyRegistry.getAddress(), await riskOracle.getAddress()]);
const vaultFactory = await deploy("CendorisVaultFactory", [adminAddress, await registry.getAddress()]);
const executionRouter = await deploy("CendorisExecutionRouter", [await vaultFactory.getAddress(), await policyManager.getAddress()]);
await (await vaultFactory.initializeRouter(await executionRouter.getAddress())).wait();

const usdt = await deploy("MockERC20", ["Local Tether USD", "USDT"]);
const adapter = await deploy("MockAdapter");
await (await registry.configureAsset(await usdt.getAddress(), [encodeBytes32String("USDT"), 6, 10_000, true])).wait();
await (await registry.configureAdapter(await adapter.getAddress(), true)).wait();
await (await vaultFactory.connect(walletOwner).createVault()).wait();
const vault = await vaultFactory.vaultOf(ownerAddress);
await (await usdt.mint(ownerAddress, parseUnits("100000", 6))).wait();
await (await usdt.connect(walletOwner).approve(vault, parseUnits("100000", 6))).wait();
const vaultContract = new (await import("ethers")).Contract(vault, readArtifact("CendorisVault").abi, walletOwner);
await (await vaultContract.deposit(await usdt.getAddress(), parseUnits("100000", 6))).wait();
await (await strategyRegistry.connect(walletOwner).setStrategy(vault, [0, 55, 2000, 3000, 100, false, true])).wait();

const deployment = {
  chainId: 31337, rpcUrl, admin: adminAddress, owner: ownerAddress,
  contracts: {
    registry: await registry.getAddress(), riskOracle: await riskOracle.getAddress(), strategyRegistry: await strategyRegistry.getAddress(),
    policyManager: await policyManager.getAddress(), vaultFactory: await vaultFactory.getAddress(), executionRouter: await executionRouter.getAddress(),
    vault, usdt: await usdt.getAddress(), adapter: await adapter.getAddress()
  }
};
const deploymentDirectory = path.resolve("contracts/deployments");
fs.mkdirSync(deploymentDirectory, { recursive: true });
fs.writeFileSync(path.join(deploymentDirectory, "local.json"), JSON.stringify(deployment, null, 2));
console.log(JSON.stringify(deployment, null, 2));
