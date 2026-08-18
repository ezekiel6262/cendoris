require("dotenv").config();

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

module.exports = {
  solidity: "0.8.26",
  networks: {
    hardhat: { chainId: 31337 },
    xlayerTestnet: {
      url: process.env.XLAYER_TESTNET_RPC_URL ?? "https://testrpc.xlayer.tech",
      chainId: 1952,
      accounts: deployerKey ? [deployerKey] : [],
    },
  },
};
