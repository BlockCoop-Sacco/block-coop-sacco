const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🚀 Deploying Gasless Transaction Contracts...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy MinimalForwarder first
  console.log("\n📦 Deploying MinimalForwarder...");
  const MinimalForwarder = await ethers.getContractFactory("MinimalForwarder");
  const forwarder = await MinimalForwarder.deploy();
  await forwarder.deployed();
  console.log("✅ MinimalForwarder deployed to:", forwarder.address);

  // Deploy GaslessPackageManager
  console.log("\n📦 Deploying GaslessPackageManager...");
  
  // These addresses should be updated with your actual deployed contract addresses
  const USDT_ADDRESS = process.env.USDT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955"; // BSC Mainnet USDT
  const SHARE_TOKEN_ADDRESS = process.env.SHARE_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  const LP_TOKEN_ADDRESS = process.env.LP_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
  const VESTING_VAULT_ADDRESS = process.env.VESTING_VAULT_ADDRESS || "0x0000000000000000000000000000000000000000";
  const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS || "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap Router
  const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || "0xcA143Ce0Fe6b8c6B6F5b6f4d8C8C8C8C8C8C8C8C"; // PancakeSwap Factory
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "0x0000000000000000000000000000000000000000";
  const TAX_MANAGER_ADDRESS = process.env.TAX_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000";
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const INITIAL_GLOBAL_TARGET_PRICE = process.env.INITIAL_GLOBAL_TARGET_PRICE || ethers.parseEther("0.1");

  const GaslessPackageManager = await ethers.getContractFactory("GaslessPackageManager");
  const gaslessPackageManager = await GaslessPackageManager.deploy(
    USDT_ADDRESS,
    SHARE_TOKEN_ADDRESS,
    LP_TOKEN_ADDRESS,
    VESTING_VAULT_ADDRESS,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    TAX_MANAGER_ADDRESS,
    ADMIN_ADDRESS,
    INITIAL_GLOBAL_TARGET_PRICE
  );
  await gaslessPackageManager.deployed();
  console.log("✅ GaslessPackageManager deployed to:", gaslessPackageManager.address);

  // Verify contracts on BSCScan
  if (process.env.BSCSCAN_API_KEY) {
    console.log("\n🔍 Verifying contracts on BSCScan...");
    
    try {
      await hre.run("verify:verify", {
        address: forwarder.address,
        constructorArguments: [],
      });
      console.log("✅ MinimalForwarder verified on BSCScan");
    } catch (error) {
      console.log("⚠️  MinimalForwarder verification failed:", error.message);
    }

    try {
      await hre.run("verify:verify", {
        address: gaslessPackageManager.address,
        constructorArguments: [
          USDT_ADDRESS,
          SHARE_TOKEN_ADDRESS,
          LP_TOKEN_ADDRESS,
          VESTING_VAULT_ADDRESS,
          ROUTER_ADDRESS,
          FACTORY_ADDRESS,
          TREASURY_ADDRESS,
          TAX_MANAGER_ADDRESS,
          ADMIN_ADDRESS,
          INITIAL_GLOBAL_TARGET_PRICE
        ],
      });
      console.log("✅ GaslessPackageManager verified on BSCScan");
    } catch (error) {
      console.log("⚠️  GaslessPackageManager verification failed:", error.message);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      MinimalForwarder: forwarder.address,
      GaslessPackageManager: gaslessPackageManager.address,
    },
    timestamp: new Date().toISOString(),
    constructorArgs: {
      USDT_ADDRESS,
      SHARE_TOKEN_ADDRESS,
      LP_TOKEN_ADDRESS,
      VESTING_VAULT_ADDRESS,
      ROUTER_ADDRESS,
      FACTORY_ADDRESS,
      TREASURY_ADDRESS,
      TAX_MANAGER_ADDRESS,
      ADMIN_ADDRESS,
      INITIAL_GLOBAL_TARGET_PRICE: INITIAL_GLOBAL_TARGET_PRICE.toString(),
    }
  };

  console.log("\n📋 Deployment Summary:");
  console.log("Network:", deploymentInfo.network);
  console.log("MinimalForwarder:", forwarder.address);
  console.log("GaslessPackageManager:", gaslessPackageManager.address);
  console.log("\n💾 Save these addresses in your .env file:");
  console.log(`FORWARDER_ADDRESS=${forwarder.address}`);
  console.log(`GASLESS_PACKAGE_MANAGER_ADDRESS=${gaslessPackageManager.address}`);

  // Save deployment info to file
  const fs = require("fs");
  const deploymentPath = `deployments/gasless-deployment-${hre.network.name}.json`;
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  return {
    forwarder: forwarder.address,
    gaslessPackageManager: gaslessPackageManager.address,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
