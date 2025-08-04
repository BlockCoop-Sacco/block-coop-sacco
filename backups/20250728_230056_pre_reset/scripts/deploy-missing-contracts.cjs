const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Missing DividendDistributor and SecondaryMarket Contracts...");
  console.log("📋 Features: Complete V2 modular architecture with all 8 contracts");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Load existing deployment data
  let existingDeployment;
  try {
    const deploymentData = fs.readFileSync("deployments/deployments-v2-18-decimal.json", "utf8");
    existingDeployment = JSON.parse(deploymentData);
    console.log("✅ Loaded existing V2 deployment data");
  } catch (error) {
    console.log("❌ No existing V2 deployment found. Please run deploy-18-decimal-usdt-system.cjs first");
    process.exit(1);
  }

  const contracts = existingDeployment.contracts;
  console.log("\nUsing existing contracts:");
  console.log("- USDTTestToken:", contracts.USDTTestToken);
  console.log("- BLOCKS:", contracts.BLOCKS);
  console.log("- BLOCKS-LP:", contracts.BLOCKS_LP);
  console.log("- VestingVault:", contracts.VestingVault);
  console.log("- SwapTaxManager:", contracts.SwapTaxManager);
  console.log("- PackageManagerV2_1:", contracts.PackageManagerV2_1);

  // Deploy DividendDistributor
  console.log("\n📦 Step 1: Deploying DividendDistributor...");
  const DividendDistributor = await hre.ethers.getContractFactory("DividendDistributor");
  const dividendDistributor = await DividendDistributor.deploy(
    contracts.BLOCKS,           // _blocksToken
    contracts.USDTTestToken,    // _dividendToken (USDT for dividends)
    deployer.address            // admin
  );

  await dividendDistributor.waitForDeployment();
  const dividendDistributorAddress = await dividendDistributor.getAddress();
  console.log("✅ DividendDistributor deployed to:", dividendDistributorAddress);

  // Deploy SecondaryMarket
  console.log("\n📦 Step 2: Deploying SecondaryMarket...");
  const SecondaryMarket = await hre.ethers.getContractFactory("SecondaryMarket");
  const secondaryMarket = await SecondaryMarket.deploy(
    contracts.USDTTestToken,    // _usdtToken
    contracts.BLOCKS,           // _blocksToken
    contracts.PancakeRouter,    // _router
    "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", // _factory (PancakeSwap factory)
    contracts.Treasury,         // _feeRecipient
    deployer.address,           // admin
    hre.ethers.parseUnits("2.0", 18) // _targetPrice (2.0 USDT per BLOCKS)
  );

  await secondaryMarket.waitForDeployment();
  const secondaryMarketAddress = await secondaryMarket.getAddress();
  console.log("✅ SecondaryMarket deployed to:", secondaryMarketAddress);

  // Test DividendDistributor functionality
  console.log("\n🧪 Step 3: Testing DividendDistributor functionality...");
  
  // Get BLOCKS token contract
  const blocksToken = await hre.ethers.getContractAt("BLOCKS", contracts.BLOCKS);
  const usdtToken = await hre.ethers.getContractAt("USDTTestToken", contracts.USDTTestToken);
  
  // Check if there are any BLOCKS tokens in circulation
  const totalSupply = await blocksToken.totalSupply();
  console.log("BLOCKS total supply:", hre.ethers.formatEther(totalSupply));
  
  if (totalSupply > 0) {
    // Test dividend distribution (small amount)
    const testDividendAmount = hre.ethers.parseUnits("10", 18); // 10 USDT
    
    // Mint USDT for dividend test
    await usdtToken.mint(deployer.address, testDividendAmount);
    
    // Approve and distribute dividends
    await usdtToken.approve(dividendDistributorAddress, testDividendAmount);
    await dividendDistributor.distributeDividends(testDividendAmount);
    
    console.log("✅ Test dividend distribution successful");
    
    // Check dividend stats
    const [totalDistributed, totalClaimed, totalPending] = await dividendDistributor.getDividendStats();
    console.log("Dividend stats:");
    console.log("  Total distributed:", hre.ethers.formatUnits(totalDistributed, 18), "USDT");
    console.log("  Total claimed:", hre.ethers.formatUnits(totalClaimed, 18), "USDT");
    console.log("  Total pending:", hre.ethers.formatUnits(totalPending, 18), "USDT");
  } else {
    console.log("⚠️ No BLOCKS tokens in circulation, skipping dividend test");
  }

  // Test SecondaryMarket functionality
  console.log("\n🧪 Step 4: Testing SecondaryMarket functionality...");
  
  // Check target price
  const targetPrice = await secondaryMarket.targetPrice();
  console.log("SecondaryMarket target price:", hre.ethers.formatUnits(targetPrice, 18), "USDT per BLOCKS");
  
  // Test quote functionality (if there are tokens)
  if (totalSupply > 0) {
    const testQuoteAmount = hre.ethers.parseUnits("1", 18); // 1 BLOCKS
    try {
      const quote = await secondaryMarket.getSwapQuote(testQuoteAmount);
      console.log("Quote for 1 BLOCKS:", hre.ethers.formatUnits(quote, 18), "USDT (after fees)");
    } catch (error) {
      console.log("⚠️ Quote test failed (expected if no liquidity):", error.message);
    }
  }

  // Update deployment info
  const updatedDeployment = {
    ...existingDeployment,
    timestamp: new Date().toISOString(),
    version: "v2-complete-modular",
    features: [
      ...existingDeployment.features,
      "DividendDistributor for USDT dividend distribution to BLOCKS holders",
      "SecondaryMarket for bidirectional USDT↔BLOCKS swapping",
      "Complete 8-contract modular architecture"
    ],
    contracts: {
      ...existingDeployment.contracts,
      DividendDistributor: dividendDistributorAddress,
      SecondaryMarket: secondaryMarketAddress
    },
    contractCount: {
      total: 8,
      deployed: 8,
      verified: 6, // Will need manual verification for new contracts
      missing: 0
    },
    gasUsed: {
      ...existingDeployment.gasUsed,
      DividendDistributor: (await dividendDistributor.deploymentTransaction().wait()).gasUsed.toString(),
      SecondaryMarket: (await secondaryMarket.deploymentTransaction().wait()).gasUsed.toString()
    }
  };

  // Save updated deployment info
  const deploymentFile = `deployments/deployments-v2-complete.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
  console.log(`\n💾 Updated deployment info saved to: ${deploymentFile}`);

  console.log("\n🎉 Missing contracts deployment completed!");
  console.log("📋 Complete V2 Modular Architecture Summary:");
  console.log("1. USDTTestToken (18 decimals):", contracts.USDTTestToken);
  console.log("2. BLOCKS:", contracts.BLOCKS);
  console.log("3. BLOCKS-LP:", contracts.BLOCKS_LP);
  console.log("4. VestingVault:", contracts.VestingVault);
  console.log("5. SwapTaxManager:", contracts.SwapTaxManager);
  console.log("6. PackageManagerV2_1:", contracts.PackageManagerV2_1);
  console.log("7. DividendDistributor:", dividendDistributorAddress);
  console.log("8. SecondaryMarket:", secondaryMarketAddress);
  
  console.log("\n✅ All 8 contracts deployed successfully!");
  console.log("📊 Contract Features:");
  console.log("- 18-decimal USDT test token for V2 architecture");
  console.log("- Package management with 70/30 USDT split logic");
  console.log("- BLOCKS token calculations using usdtPool÷targetPrice formula");
  console.log("- 1:1 BLOCKS-LP token distribution");
  console.log("- Vesting mechanisms with cliff and duration");
  console.log("- Fixed referral system with direct minting");
  console.log("- Dividend distribution to BLOCKS holders");
  console.log("- Bidirectional USDT↔BLOCKS secondary market");
  console.log("- Comprehensive access control and security features");
  
  console.log("\n🔄 Next steps:");
  console.log("1. Update frontend configuration with new contract addresses");
  console.log("2. Verify new contracts on BSC testnet");
  console.log("3. Test complete package purchase flow");
  console.log("4. Test dividend distribution and claiming");
  console.log("5. Test secondary market swapping");
  console.log("6. Run comprehensive test suite");
  console.log("7. Test target price mechanism changes");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
