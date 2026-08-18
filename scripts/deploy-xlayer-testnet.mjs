import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ContractFactory, JsonRpcProvider, Wallet, encodeBytes32String } from "ethers";

// Simulated adapter destinations (5, one per demo asset). They never hold keys we use;
// they only need to be valid addresses the MockAdapter can "settle" funds to for the demo.
const recipients = Array.from({ length: 5 }, () => Wallet.createRandom().address);

const rpcUrl = process.env.XLAYER_TESTNET_RPC_URL ?? "https://testrpc.xlayer.tech";
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) throw new Error("Set DEPLOYER_PRIVATE_KEY in .env before deploying to X Layer testnet. This wallet pays gas and becomes the registry/oracle admin.");

const provider = new JsonRpcProvider(rpcUrl);
const admin = new Wallet(privateKey, provider);
const adminAddress = await admin.getAddress();

const artifacts = path.resolve("contracts/artifacts");
const readArtifact = (name) => JSON.parse(fs.readFileSync(path.join(artifacts, `${name}.json`), "utf8"));
const deploy = async (name, args = []) => {
  const artifact = readArtifact(name);
  const contract = await new ContractFactory(artifact.abi, artifact.bytecode, admin).deploy(...args);
  await contract.waitForDeployment();
  console.log(`${name} -> ${await contract.getAddress()}`);
  return contract;
};

console.log(`Deploying to X Layer testnet (chain 1952) as ${adminAddress}...`);

const registry = await deploy("CendorisAssetRegistry", [adminAddress]);
const riskOracle = await deploy("CendorisRiskOracle", [adminAddress]);
const strategyRegistry = await deploy("CendorisStrategyRegistry");
const policyManager = await deploy("CendorisPolicyManager", [await strategyRegistry.getAddress(), await riskOracle.getAddress()]);
const vaultFactory = await deploy("CendorisVaultFactory", [adminAddress, await registry.getAddress()]);
const executionRouter = await deploy("CendorisExecutionRouter", [await vaultFactory.getAddress(), await policyManager.getAddress()]);
await (await vaultFactory.initializeRouter(await executionRouter.getAddress())).wait();

const usdt = await deploy("MockERC20", ["Testnet Tether USD", "USDT"]);
const adapter = await deploy("MockAdapter");
await (await registry.configureAsset(await usdt.getAddress(), [encodeBytes32String("USDT"), 6, 10_000, true])).wait();
await (await registry.configureAdapter(await adapter.getAddress(), true)).wait();

const network = await provider.getNetwork();
const deployment = {
  chainId: Number(network.chainId),
  rpcUrl,
  admin: adminAddress,
  recipients,
  contracts: {
    registry: await registry.getAddress(),
    riskOracle: await riskOracle.getAddress(),
    strategyRegistry: await strategyRegistry.getAddress(),
    policyManager: await policyManager.getAddress(),
    vaultFactory: await vaultFactory.getAddress(),
    executionRouter: await executionRouter.getAddress(),
    usdt: await usdt.getAddress(),
    adapter: await adapter.getAddress(),
  },
};

const deploymentDirectory = path.resolve("contracts/deployments");
fs.mkdirSync(deploymentDirectory, { recursive: true });
fs.writeFileSync(path.join(deploymentDirectory, "xlayer-testnet.json"), JSON.stringify(deployment, null, 2));
console.log(JSON.stringify(deployment, null, 2));
console.log("\nDeployed. Mint test USDT to a wallet with usdt.mint(address, amount) from the admin key, then set CENDORIS_NETWORK=xlayer-testnet and connect that wallet in the app to create a vault and deposit.");
