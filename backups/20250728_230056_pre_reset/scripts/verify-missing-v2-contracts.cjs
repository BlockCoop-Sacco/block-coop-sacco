const { run } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔍 Verifying Missing BlockCoop V2 Contracts (DividendDistributor & SecondaryMarket)");
  console.log("=" .repeat(80));

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
    contractsToVerify: 2,
    verified: 0,
    failed: 0,
    results: {}
  };

  // Step 1: Verify DividendDistributor
  console.log("\n🔍 Step 1: Verifying DividendDistributor...");
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

  // Step 2: Verify SecondaryMarket
  console.log("\n🔍 Step 2: Verifying SecondaryMarket...");
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
  const verificationFile = path.resolve(__dirname, "../deployments/verification-missing-v2-contracts.json");
  fs.writeFileSync(verificationFile, JSON.stringify(verificationResults, null, 2));

  console.log("\n📊 Verification Summary:");
  console.log(`✅ Successfully verified: ${verificationResults.verified}/2 contracts`);
  console.log(`❌ Failed verification: ${verificationResults.failed}/2 contracts`);
  console.log("📄 Verification results saved to:", verificationFile);

  if (verificationResults.verified === 2) {
    console.log("\n🎉 All missing contracts verified successfully!");
  } else {
    console.log("\n⚠️  Some contracts failed verification. Check the results above.");
  }

  console.log("\n🔗 View new contracts on BSCScan:");
  console.log(`DividendDistributor: https://testnet.bscscan.com/address/${contracts.DividendDistributor}`);
  console.log(`SecondaryMarket: https://testnet.bscscan.com/address/${contracts.SecondaryMarket}`);

  console.log("\n📋 Complete Contract Summary (8/8 contracts):");
  console.log("1. USDTTestToken (18 decimals):", contracts.USDTTestToken);
  console.log("2. BLOCKS:", contracts.BLOCKS);
  console.log("3. BLOCKS-LP:", contracts["BLOCKS-LP"]);
  console.log("4. VestingVault:", contracts.VestingVault);
  console.log("5. SwapTaxManager:", contracts.SwapTaxManager);
  console.log("6. PackageManagerV2_1:", contracts.PackageManagerV2_1);
  console.log("7. DividendDistributor:", contracts.DividendDistributor);
  console.log("8. SecondaryMarket:", contracts.SecondaryMarket);

  console.log("\n🔗 View all contracts on BSCScan:");
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
