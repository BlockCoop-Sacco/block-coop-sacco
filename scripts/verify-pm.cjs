const { run, ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Verification script for PackageManagerV2_1
 * Must match the exact constructor arguments used in deploy-pm.cjs
 */

async function main() {
  console.log("🔍 Starting PackageManagerV2_1 contract verification...");

  const deployFile = path.resolve(__dirname, "../deployments/deployments.json");

  // Check if deployments file exists
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Deployments file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  const pmAddress = data.contracts.PackageManagerV2_1;

  if (!pmAddress) {
    throw new Error("PackageManagerV2_1 address not found in deployments.json. Please deploy first.");
  }

  console.log("📋 Contract to verify:", pmAddress);
  console.log("🌐 Network:", process.env.HARDHAT_NETWORK || "bsctestnet");

  // Get constructor arguments - MUST match deploy-pm.cjs exactly
  const USDT_ADDRESS = process.env.VITE_USDT_ADDRESS;
  const ROUTER_ADDRESS = process.env.PANCAKE_ROUTER;
  const FACTORY_ADDRESS = "0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc"; // PancakeSwap V2 Factory on BSC Testnet
  const { ShareToken, LPToken, VestingVault, SwapTaxManager } = data.contracts;

  // Treasury and Admin are both the deployer address
  const TREASURY_ADDRESS = data.deployer;
  const ADMIN_ADDRESS = data.deployer;

  console.log("\n📝 Constructor arguments:");
  console.log("USDT:", USDT_ADDRESS);
  console.log("ShareToken:", ShareToken);
  console.log("LPToken:", LPToken);
  console.log("VestingVault:", VestingVault);
  console.log("Router:", ROUTER_ADDRESS);
  console.log("Factory:", FACTORY_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("SwapTaxManager:", SwapTaxManager);
  console.log("Admin:", ADMIN_ADDRESS);

  // Validate all addresses
  const addresses = {
    USDT_ADDRESS,
    ShareToken,
    LPToken,
    VestingVault,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    SwapTaxManager,
    ADMIN_ADDRESS
  };

  for (const [name, address] of Object.entries(addresses)) {
    if (!address || !ethers.isAddress(address)) {
      throw new Error(`Invalid ${name} address: ${address}`);
    }
  }

  console.log("\n🔍 Starting verification...");

  try {
    await run("verify:verify", {
      address: pmAddress,
      constructorArguments: [
        USDT_ADDRESS,      // usdt_
        ShareToken,        // share_
        LPToken,           // lp_
        VestingVault,      // vault_
        ROUTER_ADDRESS,    // router_
        FACTORY_ADDRESS,   // factory_
        TREASURY_ADDRESS,  // treasury_
        SwapTaxManager,    // tax_
        ADMIN_ADDRESS      // admin
      ]
    });

    console.log("✅ Contract verification completed successfully!");
    console.log(`🔗 View on BSCScan: https://testnet.bscscan.com/address/${pmAddress}`);

  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified!");
      console.log(`🔗 View on BSCScan: https://testnet.bscscan.com/address/${pmAddress}`);
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});