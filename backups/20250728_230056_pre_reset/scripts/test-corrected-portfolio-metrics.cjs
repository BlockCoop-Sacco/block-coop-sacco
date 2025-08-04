const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Corrected Portfolio Metrics Fix...");

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", "deployments-corrected-portfolio-metrics.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run deploy-corrected-portfolio-metrics.cjs first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contracts = deploymentInfo.contracts;

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const testUser = signers[1] || signers[0]; // Use deployer as test user if only one signer
  console.log("Test user:", testUser.address);
  console.log("Test user balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(testUser.address)));

  // Get contract instances
  const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", contracts.PackageManagerV2_1);
  const usdt = await hre.ethers.getContractAt("IERC20", contracts.USDT);
  const shareToken = await hre.ethers.getContractAt("BLOCKS", contracts.BLOCKS);
  const lpToken = await hre.ethers.getContractAt("BLOCKS_LP", contracts.BLOCKS_LP);

  console.log("\n📦 Setting up test package...");
  
  // Add a test package (100 USDT entry, 2.0 USDT per BLOCKS exchange rate)
  const packageName = "Test Package - Portfolio Fix";
  const entryUSDT = hre.ethers.parseUnits("100", 6); // 100 USDT
  const exchangeRate = hre.ethers.parseUnits("2.0", 6); // 2.0 USDT per BLOCKS
  const vestBps = 7000; // 70% vesting
  const cliff = 0; // No cliff for testing
  const duration = 365 * 24 * 3600; // 1 year vesting
  const referralBps = 250; // 2.5% referral

  try {
    await packageManager.addPackage(
      packageName,
      entryUSDT,
      exchangeRate,
      vestBps,
      cliff,
      duration,
      referralBps
    );
    console.log("✅ Test package added successfully");
  } catch (error) {
    console.log("ℹ️ Package might already exist, continuing...");
  }

  // Get package ID (should be 0 for first package)
  const packageIds = await packageManager.getPackageIds();
  console.log("Available package IDs:", packageIds.map(id => id.toString()));

  if (packageIds.length === 0) {
    console.error("❌ No packages found");
    process.exit(1);
  }

  const testPackageId = packageIds[packageIds.length - 1]; // Get the latest package
  console.log("Test package ID:", testPackageId.toString());

  // Get package details
  const packageDetails = await packageManager.getPackage(testPackageId);
  console.log("Package details:");
  console.log("- Name:", packageDetails.name);
  console.log("- Entry USDT:", hre.ethers.formatUnits(packageDetails.entryUSDT, 6));
  console.log("- Exchange Rate:", hre.ethers.formatUnits(packageDetails.exchangeRate, 6), "USDT per BLOCKS");
  console.log("- Vest BPS:", packageDetails.vestBps.toString());

  console.log("\n💰 Funding test user with USDT...");
  
  // Transfer USDT to test user (assuming deployer has USDT)
  const usdtAmount = hre.ethers.parseUnits("1000", 6); // 1000 USDT for testing
  try {
    await usdt.transfer(testUser.address, usdtAmount);
    console.log("✅ Transferred 1000 USDT to test user");
  } catch (error) {
    console.log("ℹ️ USDT transfer failed, test user might already have USDT");
  }

  // Check test user USDT balance
  const userUSDTBalance = await usdt.balanceOf(testUser.address);
  console.log("Test user USDT balance:", hre.ethers.formatUnits(userUSDTBalance, 6));

  if (userUSDTBalance < entryUSDT) {
    console.error("❌ Test user doesn't have enough USDT for purchase");
    process.exit(1);
  }

  console.log("\n🛒 Testing package purchase...");

  // Connect as test user
  const packageManagerAsUser = packageManager.connect(testUser);
  const usdtAsUser = usdt.connect(testUser);

  // Approve USDT spending
  await usdtAsUser.approve(contracts.PackageManagerV2_1, entryUSDT);
  console.log("✅ USDT approved for spending");

  // Get user stats before purchase
  const statsBefore = await packageManager.getUserStats(testUser.address);
  console.log("\nUser stats BEFORE purchase:");
  console.log("- Total Invested:", hre.ethers.formatUnits(statsBefore.totalInvested, 6), "USDT");
  console.log("- Total Tokens Received:", hre.ethers.formatUnits(statsBefore.totalTokensReceived, 18), "BLOCKS");
  console.log("- Total Vest Tokens:", hre.ethers.formatUnits(statsBefore.totalVestTokens, 18), "BLOCKS");
  console.log("- Total Pool Tokens:", hre.ethers.formatUnits(statsBefore.totalPoolTokens, 18), "BLOCKS");
  console.log("- Total LP Tokens:", hre.ethers.formatUnits(statsBefore.totalLPTokens, 18), "BLOCKS-LP");

  // Make purchase
  const purchaseTx = await packageManagerAsUser.purchase(testPackageId, hre.ethers.ZeroAddress);
  const receipt = await purchaseTx.wait();
  console.log("✅ Package purchased successfully");
  console.log("Gas used:", receipt.gasUsed.toString());

  // Get user stats after purchase
  const statsAfter = await packageManager.getUserStats(testUser.address);
  console.log("\nUser stats AFTER purchase:");
  console.log("- Total Invested:", hre.ethers.formatUnits(statsAfter.totalInvested, 6), "USDT");
  console.log("- Total Tokens Received:", hre.ethers.formatUnits(statsAfter.totalTokensReceived, 18), "BLOCKS");
  console.log("- Total Vest Tokens:", hre.ethers.formatUnits(statsAfter.totalVestTokens, 18), "BLOCKS");
  console.log("- Total Pool Tokens:", hre.ethers.formatUnits(statsAfter.totalPoolTokens, 18), "BLOCKS");
  console.log("- Total LP Tokens:", hre.ethers.formatUnits(statsAfter.totalLPTokens, 18), "BLOCKS-LP");

  // Calculate expected values for validation
  const investedUSDT = Number(hre.ethers.formatUnits(statsAfter.totalInvested, 6));
  const tokensReceived = Number(hre.ethers.formatUnits(statsAfter.totalTokensReceived, 18));
  const vestTokens = Number(hre.ethers.formatUnits(statsAfter.totalVestTokens, 18));
  const poolTokens = Number(hre.ethers.formatUnits(statsAfter.totalPoolTokens, 18));
  const lpTokens = Number(hre.ethers.formatUnits(statsAfter.totalLPTokens, 18));

  console.log("\n🔍 Validation Results:");
  
  // Expected calculations:
  // 100 USDT at 2.0 USDT per BLOCKS = 50 BLOCKS total user tokens
  // 70% vesting = 35 BLOCKS vesting
  // 30% pool = 15 BLOCKS pool
  // Treasury gets 5% extra (2.5 BLOCKS) but this should NOT be in user stats
  
  const expectedTokens = 50; // 100 USDT / 2.0 USDT per BLOCKS
  const expectedVestTokens = 35; // 70% of 50
  const expectedPoolTokens = 15; // 30% of 50

  console.log("Expected vs Actual:");
  console.log(`- Invested: ${investedUSDT} USDT (expected: 100)`);
  console.log(`- Tokens Received: ${tokensReceived} BLOCKS (expected: ~${expectedTokens})`);
  console.log(`- Vest Tokens: ${vestTokens} BLOCKS (expected: ~${expectedVestTokens})`);
  console.log(`- Pool Tokens: ${poolTokens} BLOCKS (expected: ~${expectedPoolTokens})`);
  console.log(`- LP Tokens: ${lpTokens} BLOCKS-LP (expected: ~${expectedTokens})`);

  // Validation checks
  const tolerance = 0.1; // 10% tolerance for rounding
  const isInvestedCorrect = Math.abs(investedUSDT - 100) < tolerance;
  const isTokensReasonable = tokensReceived > 40 && tokensReceived < 60; // Should be around 50, not trillions
  const isVestCorrect = Math.abs(vestTokens - expectedVestTokens) < tolerance;
  const isPoolCorrect = Math.abs(poolTokens - expectedPoolTokens) < tolerance;
  const isLPCorrect = Math.abs(lpTokens - expectedTokens) < tolerance;

  console.log("\n✅ Validation Status:");
  console.log(`- Invested amount: ${isInvestedCorrect ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Tokens received reasonable: ${isTokensReasonable ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Vest tokens correct: ${isVestCorrect ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- Pool tokens correct: ${isPoolCorrect ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`- LP tokens correct: ${isLPCorrect ? '✅ PASS' : '❌ FAIL'}`);

  const allTestsPassed = isInvestedCorrect && isTokensReasonable && isVestCorrect && isPoolCorrect && isLPCorrect;

  if (allTestsPassed) {
    console.log("\n🎉 ALL TESTS PASSED! Portfolio metrics fix is working correctly.");
    console.log("The treasury allocation is properly excluded from user stats.");
  } else {
    console.log("\n❌ SOME TESTS FAILED! Please review the calculations.");
  }

  // Check actual token balances
  const userShareBalance = await shareToken.balanceOf(testUser.address);
  const userLPBalance = await lpToken.balanceOf(testUser.address);
  
  console.log("\nActual token balances:");
  console.log("- BLOCKS balance:", hre.ethers.formatUnits(userShareBalance, 18));
  console.log("- BLOCKS-LP balance:", hre.ethers.formatUnits(userLPBalance, 18));

  return {
    success: allTestsPassed,
    results: {
      invested: investedUSDT,
      tokensReceived,
      vestTokens,
      poolTokens,
      lpTokens
    }
  };
}

main()
  .then((result) => {
    if (result.success) {
      console.log("\n✅ Test completed successfully!");
      process.exit(0);
    } else {
      console.log("\n❌ Test failed!");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
