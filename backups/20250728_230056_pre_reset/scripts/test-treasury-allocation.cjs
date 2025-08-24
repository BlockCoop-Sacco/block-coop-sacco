const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing Treasury Allocation Functionality...");
  
  // Load deployment data
  const data = JSON.parse(fs.readFileSync("deployments/deployments-fresh-v2.json", "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Testing with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Contract addresses
  const BLOCKS_ADDRESS = data.contracts.BLOCKS;
  const PACKAGE_MANAGER_ADDRESS = data.contracts.PackageManagerV2_1_Sustainable;
  const TREASURY_ADDRESS = data.contracts.Treasury;
  const USDT_ADDRESS = data.externalContracts.USDT;

  console.log("\n📍 Contract addresses:");
  console.log("BLOCKS Token:", BLOCKS_ADDRESS);
  console.log("PackageManager:", PACKAGE_MANAGER_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("USDT:", USDT_ADDRESS);

  // Get contract instances
  const blocks = await ethers.getContractAt("BLOCKS", BLOCKS_ADDRESS);
  const packageManager = await ethers.getContractAt("PackageManagerV2_1", PACKAGE_MANAGER_ADDRESS);
  const usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);

  console.log("\n📊 Step 1: Pre-purchase state check...");
  
  // Check initial treasury BLOCKS balance
  const initialTreasuryBalance = await blocks.balanceOf(TREASURY_ADDRESS);
  console.log("Initial treasury BLOCKS balance:", ethers.formatEther(initialTreasuryBalance));
  
  // Check user USDT balance
  const userUsdtBalance = await usdt.balanceOf(deployer.address);
  console.log("User USDT balance:", ethers.formatUnits(userUsdtBalance, 6));
  
  // Check if user has enough USDT for test purchase
  const testAmount = ethers.parseUnits("100", 6); // 100 USDT
  if (userUsdtBalance < testAmount) {
    console.log("⚠️  User doesn't have enough USDT for test purchase");
    console.log("Required: 100 USDT, Available:", ethers.formatUnits(userUsdtBalance, 6));
    return;
  }

  console.log("\n📦 Step 2: Get package details...");
  
  // Get first package (Starter Package with 2.5% referral rate)
  const packageId = 0;
  const pkg = await packageManager.getPackage(packageId);
  console.log("Package details:");
  console.log("- Name:", pkg.name);
  console.log("- Entry USDT:", ethers.formatUnits(pkg.entryUSDT, 6));
  console.log("- Exchange Rate BPS:", pkg.exchangeRateBps.toString());
  console.log("- Vest BPS:", pkg.vestBps.toString());
  console.log("- Referral BPS:", pkg.referralBps.toString());

  console.log("\n🧮 Step 3: Calculate expected allocations...");
  
  // Calculate expected token amounts
  const entryUSDT = pkg.entryUSDT;
  const exchangeRateBps = pkg.exchangeRateBps;
  
  // Scale USDT to 18 decimals for calculations
  const entryUSDT18 = entryUSDT * BigInt(10 ** 12);
  const totalTokens = (entryUSDT18 * exchangeRateBps) / BigInt(10000);
  
  // Expected allocations (65% vest, 30% liquidity, 5% treasury)
  const expectedVestTokens = (totalTokens * BigInt(6500)) / BigInt(10000);
  const expectedPoolTokens = (totalTokens * BigInt(3000)) / BigInt(10000);
  const expectedTreasuryTokens = (totalTokens * BigInt(500)) / BigInt(10000);
  const expectedUserClaimableTokens = expectedVestTokens + expectedPoolTokens;
  
  console.log("Expected allocations:");
  console.log("- Total BLOCKS:", ethers.formatEther(totalTokens));
  console.log("- Vest BLOCKS (65%):", ethers.formatEther(expectedVestTokens));
  console.log("- Pool BLOCKS (30%):", ethers.formatEther(expectedPoolTokens));
  console.log("- Treasury BLOCKS (5%):", ethers.formatEther(expectedTreasuryTokens));
  console.log("- User Claimable (95%):", ethers.formatEther(expectedUserClaimableTokens));

  console.log("\n💰 Step 4: Approve USDT spending...");
  
  // Check current allowance
  const currentAllowance = await usdt.allowance(deployer.address, PACKAGE_MANAGER_ADDRESS);
  console.log("Current USDT allowance:", ethers.formatUnits(currentAllowance, 6));
  
  if (currentAllowance < entryUSDT) {
    console.log("Approving USDT spending...");
    const approveTx = await usdt.approve(PACKAGE_MANAGER_ADDRESS, entryUSDT);
    await approveTx.wait();
    console.log("✅ USDT approval completed");
  }

  console.log("\n🛒 Step 5: Execute test purchase...");
  
  // Execute purchase without referrer first
  console.log("Purchasing package without referrer...");
  const purchaseTx = await packageManager.purchase(packageId, ethers.ZeroAddress);
  const receipt = await purchaseTx.wait();
  
  console.log("✅ Purchase transaction completed");
  console.log("Transaction hash:", receipt.hash);
  console.log("Gas used:", receipt.gasUsed.toString());

  console.log("\n📋 Step 6: Analyze transaction events...");
  
  // Parse events from the transaction
  let treasuryAllocatedEvent = null;
  let purchasedEvent = null;
  
  for (const log of receipt.logs) {
    try {
      const parsedLog = packageManager.interface.parseLog(log);
      if (parsedLog.name === "TreasuryBlocksAllocated") {
        treasuryAllocatedEvent = parsedLog;
        console.log("🎯 TreasuryBlocksAllocated event found:");
        console.log("- Buyer:", parsedLog.args.buyer);
        console.log("- Package ID:", parsedLog.args.packageId.toString());
        console.log("- Amount:", ethers.formatEther(parsedLog.args.amount));
      } else if (parsedLog.name === "Purchased") {
        purchasedEvent = parsedLog;
        console.log("🛒 Purchased event found:");
        console.log("- Buyer:", parsedLog.args.buyer);
        console.log("- Package ID:", parsedLog.args.packageId.toString());
        console.log("- USDT Amount:", ethers.formatUnits(parsedLog.args.usdtAmount, 6));
        console.log("- Total Tokens:", ethers.formatEther(parsedLog.args.totalTokens));
        console.log("- Vest Tokens:", ethers.formatEther(parsedLog.args.vestTokens));
        console.log("- Pool Tokens:", ethers.formatEther(parsedLog.args.poolTokens));
        console.log("- LP Tokens:", ethers.formatEther(parsedLog.args.lpTokens));
      }
    } catch (e) {
      // Skip logs that can't be parsed by this contract
    }
  }

  console.log("\n📊 Step 7: Post-purchase state verification...");
  
  // Check final treasury BLOCKS balance
  const finalTreasuryBalance = await blocks.balanceOf(TREASURY_ADDRESS);
  const treasuryIncrease = finalTreasuryBalance - initialTreasuryBalance;
  
  console.log("Final treasury BLOCKS balance:", ethers.formatEther(finalTreasuryBalance));
  console.log("Treasury balance increase:", ethers.formatEther(treasuryIncrease));

  console.log("\n✅ Step 8: Validation results...");
  
  // Validate treasury allocation
  const treasuryAllocationCorrect = treasuryIncrease === expectedTreasuryTokens;
  console.log("Treasury allocation correct:", treasuryAllocationCorrect);
  
  if (!treasuryAllocationCorrect) {
    console.log("❌ Expected:", ethers.formatEther(expectedTreasuryTokens));
    console.log("❌ Actual:", ethers.formatEther(treasuryIncrease));
  }
  
  // Validate event emission
  const eventEmitted = treasuryAllocatedEvent !== null;
  console.log("TreasuryBlocksAllocated event emitted:", eventEmitted);
  
  if (eventEmitted && treasuryAllocatedEvent.args.amount === expectedTreasuryTokens) {
    console.log("✅ Event amount matches expected treasury allocation");
  } else if (eventEmitted) {
    console.log("❌ Event amount doesn't match expected allocation");
    console.log("Event amount:", ethers.formatEther(treasuryAllocatedEvent.args.amount));
    console.log("Expected amount:", ethers.formatEther(expectedTreasuryTokens));
  }

  // Validate LP token calculation (should be 95% of total tokens)
  if (purchasedEvent) {
    const lpTokensCorrect = purchasedEvent.args.lpTokens === expectedUserClaimableTokens;
    console.log("LP tokens calculation correct (95%):", lpTokensCorrect);
    
    if (!lpTokensCorrect) {
      console.log("❌ Expected LP tokens:", ethers.formatEther(expectedUserClaimableTokens));
      console.log("❌ Actual LP tokens:", ethers.formatEther(purchasedEvent.args.lpTokens));
    }
  }

  console.log("\n🎉 Treasury Allocation Test Summary:");
  console.log("✅ 5% Treasury allocation:", treasuryAllocationCorrect ? "PASS" : "FAIL");
  console.log("✅ TreasuryBlocksAllocated event:", eventEmitted ? "PASS" : "FAIL");
  console.log("✅ 95% LP token calculation:", purchasedEvent && purchasedEvent.args.lpTokens === expectedUserClaimableTokens ? "PASS" : "FAIL");
  
  if (treasuryAllocationCorrect && eventEmitted) {
    console.log("\n🎯 All treasury allocation tests PASSED!");
    console.log("The sustainable referral system is working correctly.");
  } else {
    console.log("\n❌ Some tests FAILED. Please review the implementation.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
