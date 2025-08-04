const { run } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔍 Verifying BlockCoop V2 Complete Modular Contracts");
  console.log("=" .repeat(60));

  // Load deployment data
  const deployFile = path.resolve(__dirname, "../deployments/deployments-v2-complete-modular.json");
  
  if (!fs.existsSync(deployFile)) {
    console.error("❌ Deployment file not found:", deployFile);
    console.log("Please run the deployment script first.");
    process.exit(1);
  }

  const deployData = JSON.parse(fs.readFileSync(deployFile));
  console.log("📋 Loaded deployment data from:", deployFile);
  console.log("🌐 Network:", deployData.network);
  console.log("⏰ Deployed at:", deployData.timestamp);

  const contracts = deployData.contracts;
  const admins = deployData.admins;
  const external = deployData.externalContracts;
  const config = deployData.configuration;

  const verificationResults = {
    timestamp: new Date().toISOString(),
    network: deployData.network,
    totalContracts: 8,
    verified: 0,
    failed: 0,
    results: {}
  };

  // Step 1: Verify USDTTestToken
  console.log("\n🔍 Step 1: Verifying USDTTestToken...");
  try {
    await run("verify:verify", {
      address: contracts.USDTTestToken,
      constructorArguments: [
        "USDT Test Token (18 decimals)",
        "USDT",
        admins.primary
      ],
    });
    console.log("✅ USDTTestToken verified successfully");
    verificationResults.verified++;
    verificationResults.results.USDTTestToken = "SUCCESS";
  } catch (error) {
    console.log("⚠️  USDTTestToken verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results.USDTTestToken = `FAILED: ${error.message}`;
  }

  // Step 2: Verify SwapTaxManager
  console.log("\n🔍 Step 2: Verifying SwapTaxManager...");
  try {
    await run("verify:verify", {
      address: contracts.SwapTaxManager,
      constructorArguments: [
        admins.primary
      ],
    });
    console.log("✅ SwapTaxManager verified successfully");
    verificationResults.verified++;
    verificationResults.results.SwapTaxManager = "SUCCESS";
  } catch (error) {
    console.log("⚠️  SwapTaxManager verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results.SwapTaxManager = `FAILED: ${error.message}`;
  }

  // Step 3: Verify BLOCKS token
  console.log("\n🔍 Step 3: Verifying BLOCKS token...");
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
    verificationResults.verified++;
    verificationResults.results.BLOCKS = "SUCCESS";
  } catch (error) {
    console.log("⚠️  BLOCKS verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results.BLOCKS = `FAILED: ${error.message}`;
  }

  // Step 4: Verify BLOCKS-LP token
  console.log("\n🔍 Step 4: Verifying BLOCKS-LP token...");
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
    verificationResults.verified++;
    verificationResults.results["BLOCKS-LP"] = "SUCCESS";
  } catch (error) {
    console.log("⚠️  BLOCKS-LP verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results["BLOCKS-LP"] = `FAILED: ${error.message}`;
  }

  // Step 5: Verify VestingVault
  console.log("\n🔍 Step 5: Verifying VestingVault...");
  try {
    await run("verify:verify", {
      address: contracts.VestingVault,
      constructorArguments: [
        contracts.BLOCKS,
        admins.primary
      ],
    });
    console.log("✅ VestingVault verified successfully");
    verificationResults.verified++;
    verificationResults.results.VestingVault = "SUCCESS";
  } catch (error) {
    console.log("⚠️  VestingVault verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results.VestingVault = `FAILED: ${error.message}`;
  }

  // Step 6: Verify PackageManagerV2_1
  console.log("\n🔍 Step 6: Verifying PackageManagerV2_1...");
  try {
    await run("verify:verify", {
      address: contracts.PackageManagerV2_1,
      constructorArguments: [
        contracts.USDTTestToken,    // usdt_
        contracts.BLOCKS,           // share_
        contracts["BLOCKS-LP"],     // lp_
        contracts.VestingVault,     // vault_
        external.PancakeRouter,     // router_
        external.PancakeFactory,    // factory_
        admins.primary,             // treasury_
        contracts.SwapTaxManager,   // tax_
        admins.primary,             // admin
        ethers.parseUnits(config.globalTargetPrice, 18) // initialGlobalTargetPrice_
      ],
    });
    console.log("✅ PackageManagerV2_1 verified successfully");
    verificationResults.verified++;
    verificationResults.results.PackageManagerV2_1 = "SUCCESS";
  } catch (error) {
    console.log("⚠️  PackageManagerV2_1 verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results.PackageManagerV2_1 = `FAILED: ${error.message}`;
  }

  // Step 7: Verify DividendDistributor
  console.log("\n🔍 Step 7: Verifying DividendDistributor...");
  try {
    await run("verify:verify", {
      address: contracts.DividendDistributor,
      constructorArguments: [
        contracts.BLOCKS,           // _blocksToken
        contracts.USDTTestToken,    // _dividendToken
        admins.primary              // admin
      ],
    });
    console.log("✅ DividendDistributor verified successfully");
    verificationResults.verified++;
    verificationResults.results.DividendDistributor = "SUCCESS";
  } catch (error) {
    console.log("⚠️  DividendDistributor verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results.DividendDistributor = `FAILED: ${error.message}`;
  }

  // Step 8: Verify SecondaryMarket
  console.log("\n🔍 Step 8: Verifying SecondaryMarket...");
  try {
    await run("verify:verify", {
      address: contracts.SecondaryMarket,
      constructorArguments: [
        contracts.USDTTestToken,    // _usdtToken
        contracts.BLOCKS,           // _blocksToken
        external.PancakeRouter,     // _router
        external.PancakeFactory,    // _factory
        admins.primary,             // _feeRecipient
        admins.primary,             // admin
        ethers.parseUnits(config.globalTargetPrice, 18) // _targetPrice
      ],
    });
    console.log("✅ SecondaryMarket verified successfully");
    verificationResults.verified++;
    verificationResults.results.SecondaryMarket = "SUCCESS";
  } catch (error) {
    console.log("⚠️  SecondaryMarket verification failed:", error.message);
    verificationResults.failed++;
    verificationResults.results.SecondaryMarket = `FAILED: ${error.message}`;
  }

  // Save verification results
  const verificationFile = path.resolve(__dirname, "../deployments/verification-v2-complete-modular.json");
  fs.writeFileSync(verificationFile, JSON.stringify(verificationResults, null, 2));

  console.log("\n📊 Verification Summary:");
  console.log(`✅ Successfully verified: ${verificationResults.verified}/8 contracts`);
  console.log(`❌ Failed verification: ${verificationResults.failed}/8 contracts`);
  console.log("📄 Verification results saved to:", verificationFile);

  if (verificationResults.verified === 8) {
    console.log("\n🎉 All contracts verified successfully!");
  } else {
    console.log("\n⚠️  Some contracts failed verification. Check the results above.");
  }

  console.log("\n🔗 View contracts on BSCScan:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`${name}: https://testnet.bscscan.com/address/${address}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
