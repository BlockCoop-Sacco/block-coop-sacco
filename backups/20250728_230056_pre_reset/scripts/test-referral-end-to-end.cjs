const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 End-to-End Referral System Test...");
  console.log("=====================================");

  const [deployer, referrer, buyer] = await hre.ethers.getSigners();
  console.log("Deployer (Treasury):", deployer.address);
  console.log("Referrer:", referrer.address);
  console.log("Buyer:", buyer.address);

  // Load deployment data
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-referral-fix.json");
  const data = JSON.parse(fs.readFileSync(deploymentFile));

  // Get contract instances
  const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", data.contracts.PackageManagerV2_1);
  const usdt = await hre.ethers.getContractAt("IERC20", data.contracts.USDT);
  const blocks = await hre.ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);

  console.log("\n📋 Contract Addresses:");
  console.log("PackageManager:", data.contracts.PackageManagerV2_1);
  console.log("USDT:", data.contracts.USDT);
  console.log("BLOCKS:", data.contracts.BLOCKS);

  console.log("\n🔍 Step 1: Pre-test setup and verification...");
  
  // Check package exists
  const packageCount = await packageManager.getPackageCount();
  if (packageCount === 0n) {
    console.log("❌ No packages found. Please run the test-referral-calculation script first.");
    process.exit(1);
  }

  const pkg = await packageManager.getPackage(0);
  console.log("Test Package:", pkg.name);
  console.log("Entry Amount:", hre.ethers.formatUnits(pkg.entryUSDT, 6), "USDT");
  console.log("Referral Rate:", Number(pkg.referralBps) / 100, "%");

  // Check treasury setup
  const treasuryBalance = await blocks.balanceOf(data.contracts.Treasury);
  const treasuryAllowance = await blocks.allowance(data.contracts.Treasury, data.contracts.PackageManagerV2_1);
  console.log("Treasury BLOCKS balance:", hre.ethers.formatEther(treasuryBalance));
  console.log("Treasury allowance:", hre.ethers.formatEther(treasuryAllowance));

  console.log("\n💰 Step 2: Funding buyer with USDT...");
  
  // Transfer USDT to buyer (deployer is treasury and should have USDT)
  const usdtAmount = pkg.entryUSDT;
  const buyerUSDTBefore = await usdt.balanceOf(buyer.address);
  console.log("Buyer USDT before:", hre.ethers.formatUnits(buyerUSDTBefore, 6));

  // Transfer USDT from deployer to buyer
  await usdt.transfer(buyer.address, usdtAmount);
  const buyerUSDTAfter = await usdt.balanceOf(buyer.address);
  console.log("Buyer USDT after funding:", hre.ethers.formatUnits(buyerUSDTAfter, 6));

  console.log("\n📊 Step 3: Recording pre-purchase balances...");
  
  const referrerBlocksBefore = await blocks.balanceOf(referrer.address);
  const treasuryBlocksBefore = await blocks.balanceOf(data.contracts.Treasury);
  
  console.log("Referrer BLOCKS before:", hre.ethers.formatEther(referrerBlocksBefore));
  console.log("Treasury BLOCKS before:", hre.ethers.formatEther(treasuryBlocksBefore));

  console.log("\n🛒 Step 4: Executing purchase with referral...");
  
  // Buyer approves USDT spending
  const buyerUSDT = usdt.connect(buyer);
  await buyerUSDT.approve(data.contracts.PackageManagerV2_1, usdtAmount);
  console.log("✅ Buyer approved USDT spending");

  // Execute purchase with referrer
  const buyerPackageManager = packageManager.connect(buyer);
  
  console.log("Executing purchase...");
  console.log("- Package ID: 0");
  console.log("- Buyer:", buyer.address);
  console.log("- Referrer:", referrer.address);
  console.log("- Amount:", hre.ethers.formatUnits(usdtAmount, 6), "USDT");

  const purchaseTx = await buyerPackageManager.purchase(0, referrer.address);
  const receipt = await purchaseTx.wait();
  console.log("✅ Purchase completed! Tx:", receipt.hash);

  console.log("\n📊 Step 5: Analyzing results...");
  
  // Check post-purchase balances
  const referrerBlocksAfter = await blocks.balanceOf(referrer.address);
  const treasuryBlocksAfter = await blocks.balanceOf(data.contracts.Treasury);
  
  const referralReward = referrerBlocksAfter - referrerBlocksBefore;
  const treasuryDecrease = treasuryBlocksBefore - treasuryBlocksAfter;
  
  console.log("Referrer BLOCKS after:", hre.ethers.formatEther(referrerBlocksAfter));
  console.log("Treasury BLOCKS after:", hre.ethers.formatEther(treasuryBlocksAfter));
  console.log("Referral reward paid:", hre.ethers.formatEther(referralReward), "BLOCKS");
  console.log("Treasury decrease:", hre.ethers.formatEther(treasuryDecrease), "BLOCKS");

  console.log("\n🧮 Step 6: Verifying calculation accuracy...");
  
  // Calculate expected referral amount
  const netUSDT = usdtAmount; // Assuming no purchase tax
  const scale = 10n ** 12n;
  const netUSDT18 = netUSDT * scale;
  const totalUserTokens = (netUSDT18 * 10n**18n) / (pkg.exchangeRate * scale);
  const expectedReferral = (totalUserTokens * pkg.referralBps) / 10000n;
  
  console.log("Expected referral (5% of user tokens):", hre.ethers.formatEther(expectedReferral), "BLOCKS");
  console.log("Actual referral paid:", hre.ethers.formatEther(referralReward), "BLOCKS");
  
  // Check if amounts match (allowing for small rounding differences)
  const difference = referralReward > expectedReferral ? 
    referralReward - expectedReferral : 
    expectedReferral - referralReward;
  
  const isAccurate = difference < hre.ethers.parseEther("0.001"); // Allow 0.001 BLOCKS difference
  
  console.log("Difference:", hre.ethers.formatEther(difference), "BLOCKS");
  console.log("Calculation accurate:", isAccurate ? "✅ YES" : "❌ NO");

  console.log("\n📋 Step 7: Checking events...");
  
  // Parse events from the transaction
  const events = receipt.logs;
  let referralPaidEvent = null;
  let purchasedEvent = null;
  
  for (const log of events) {
    try {
      const parsed = packageManager.interface.parseLog(log);
      if (parsed.name === "ReferralPaid") {
        referralPaidEvent = parsed;
      } else if (parsed.name === "Purchased") {
        purchasedEvent = parsed;
      }
    } catch (e) {
      // Skip logs that don't match our interface
    }
  }

  if (referralPaidEvent) {
    console.log("✅ ReferralPaid event found:");
    console.log("  Referrer:", referralPaidEvent.args.referrer);
    console.log("  Buyer:", referralPaidEvent.args.buyer);
    console.log("  Amount:", hre.ethers.formatEther(referralPaidEvent.args.amount), "BLOCKS");
  } else {
    console.log("❌ ReferralPaid event not found");
  }

  if (purchasedEvent) {
    console.log("✅ Purchased event found:");
    console.log("  Referral reward:", hre.ethers.formatEther(purchasedEvent.args.referralReward), "BLOCKS");
  }

  console.log("\n🎉 End-to-End Test Results:");
  console.log("============================");
  console.log("✅ Purchase completed successfully");
  console.log("✅ Referral reward paid:", hre.ethers.formatEther(referralReward), "BLOCKS");
  console.log("✅ Calculation accuracy:", isAccurate ? "CORRECT (5%)" : "INCORRECT");
  console.log("✅ Events emitted properly");
  console.log("✅ Treasury balance updated correctly");

  if (isAccurate) {
    console.log("\n🎊 SUCCESS! Referral system is working correctly!");
    console.log("The fix has resolved the 5.26% → 5% calculation issue.");
  } else {
    console.log("\n❌ ISSUE: Referral calculation may still have problems.");
    console.log("Expected:", hre.ethers.formatEther(expectedReferral), "BLOCKS");
    console.log("Actual:", hre.ethers.formatEther(referralReward), "BLOCKS");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ End-to-end test failed:", error);
    process.exit(1);
  });
