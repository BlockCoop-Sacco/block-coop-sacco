const { run } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔍 Verifying Fresh BlockCoop V2 Contracts on BSCScan...");
  console.log("=" .repeat(60));

  // Load deployment data
  const deployFile = path.resolve(__dirname, "../deployments/deployments-fresh-v2.json");
  if (!fs.existsSync(deployFile)) {
    console.error("❌ Deployment file not found:", deployFile);
    process.exit(1);
  }

  const deployData = JSON.parse(fs.readFileSync(deployFile));
  console.log("📋 Loaded deployment data from:", deployFile);
  console.log("🌐 Network:", deployData.network);
  console.log("⏰ Deployed at:", deployData.timestamp);

  const contracts = deployData.contracts;
  const admins = deployData.admins;
  const external = deployData.externalContracts;

  console.log("\n🔍 Step 1: Verifying BLOCKS token...");
  try {
    await run("verify:verify", {
      address: contracts.BLOCKS,
      constructorArguments: [
        "BlockCoop Sacco Token",
        "BLOCKS",
        admins.primary
      ],
    });
    console.log("✅ BLOCKS verified successfully");
  } catch (error) {
    console.log("⚠️  BLOCKS verification failed:", error.message);
  }

  console.log("\n🔍 Step 2: Verifying BLOCKS-LP token...");
  try {
    await run("verify:verify", {
      address: contracts["BLOCKS-LP"],
      constructorArguments: [
        "BlockCoop Sacco LP Token",
        "BLOCKS-LP",
        admins.primary
      ],
    });
    console.log("✅ BLOCKS-LP verified successfully");
  } catch (error) {
    console.log("⚠️  BLOCKS-LP verification failed:", error.message);
  }

  console.log("\n🔍 Step 3: Verifying VestingVault...");
  try {
    await run("verify:verify", {
      address: contracts.VestingVault,
      constructorArguments: [
        contracts.BLOCKS,
        admins.primary
      ],
    });
    console.log("✅ VestingVault verified successfully");
  } catch (error) {
    console.log("⚠️  VestingVault verification failed:", error.message);
  }

  console.log("\n🔍 Step 4: Verifying SwapTaxManager...");
  try {
    await run("verify:verify", {
      address: contracts.SwapTaxManager,
      constructorArguments: [
        admins.primary
      ],
    });
    console.log("✅ SwapTaxManager verified successfully");
  } catch (error) {
    console.log("⚠️  SwapTaxManager verification failed:", error.message);
  }

  console.log("\n🔍 Step 5: Verifying PackageManagerV2_1...");
  try {
    await run("verify:verify", {
      address: contracts.PackageManagerV2_1,
      constructorArguments: [
        external.USDT,                    // usdt_
        contracts.BLOCKS,                 // share_ (now BLOCKS)
        contracts["BLOCKS-LP"],           // lp_ (now BLOCKS-LP)
        contracts.VestingVault,           // vault_
        external.PancakeRouter,           // router_
        external.PancakeFactory,          // factory_
        contracts.Treasury,               // treasury_
        contracts.SwapTaxManager,         // tax_
        admins.primary                    // admin
      ],
    });
    console.log("✅ PackageManagerV2_1 verified successfully");
  } catch (error) {
    console.log("⚠️  PackageManagerV2_1 verification failed:", error.message);
  }

  console.log("\n🎉 Contract verification process completed!");
  console.log("\n📋 Contract Addresses (for BSCScan):");
  console.log("BLOCKS:", contracts.BLOCKS);
  console.log("BLOCKS-LP:", contracts["BLOCKS-LP"]);
  console.log("VestingVault:", contracts.VestingVault);
  console.log("SwapTaxManager:", contracts.SwapTaxManager);
  console.log("PackageManagerV2_1:", contracts.PackageManagerV2_1);

  console.log("\n🔗 BSCScan Testnet Links:");
  console.log(`BLOCKS: https://testnet.bscscan.com/address/${contracts.BLOCKS}`);
  console.log(`BLOCKS-LP: https://testnet.bscscan.com/address/${contracts["BLOCKS-LP"]}`);
  console.log(`VestingVault: https://testnet.bscscan.com/address/${contracts.VestingVault}`);
  console.log(`SwapTaxManager: https://testnet.bscscan.com/address/${contracts.SwapTaxManager}`);
  console.log(`PackageManagerV2_1: https://testnet.bscscan.com/address/${contracts.PackageManagerV2_1}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
