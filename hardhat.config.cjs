require("dotenv").config();
// Fallback: also load .env.production if present without overriding already-set vars
try { require("dotenv").config({ path: ".env.production", override: false }); } catch (e) {}
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("@openzeppelin/hardhat-upgrades");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: process.env.SOLC_RUNS ? parseInt(process.env.SOLC_RUNS) : 200 },
      viaIR: true
    },
  },
  networks: {
    bscmainnet: {
      url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed1.binance.org/",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,        // 60 seconds timeout
      // Let provider estimate gas/gasPrice for reliability on mainnet
      // gasPrice: 1000000000,
      // gas: 4000000,
      blockGasLimit: 30000000, // 30M block gas limit
      allowUnlimitedContractSize: true,
      httpHeaders: {
        "User-Agent": "hardhat"
      }
    },
  },
  etherscan: {
    // Etherscan API key (BSC Scan)
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  sourcify: {
    enabled: true
  },
};
