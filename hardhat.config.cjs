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
    bsctestnet: {
      url: process.env.BSC_TESTNET_RPC || "",
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 60000,        // 60 seconds timeout
      gasPrice: 10000000000, // 10 gwei
      gas: 8000000,          // 8M gas limit
      blockGasLimit: 30000000, // 30M block gas limit
      allowUnlimitedContractSize: true,
      httpHeaders: {
        "User-Agent": "hardhat"
      }
    },
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
    // Etherscan V2 unified API key for all chains including BSC Testnet (chainId: 97)
    apiKey: process.env.ETHERSCAN_API_KEY
  },
  sourcify: {
    enabled: true
  },
};
