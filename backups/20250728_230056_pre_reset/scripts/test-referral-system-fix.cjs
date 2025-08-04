const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing Referral System Fix...");
  console.log("📋 Features: Direct minting for referrals + Proper reward calculation");
  
  const [deployer, user1, user2, referrer] = await hre.ethers.getSigners();
  console.log("Test accounts:");
  console.log("- Deployer:", deployer.address);
  console.log("- User1:", user1.address);
  console.log("- User2:", user2.address);
  console.log("- Referrer:", referrer.address);

  // Deploy the 18-decimal USDT system first
  console.log("\n📦 Step 1: Deploying test system with 18-decimal USDT...");
  
  // Deploy USDT test token
  const USDTTestToken = await hre.ethers.getContractFactory("USDTTestToken");
  const usdtToken = await USDTTestToken.deploy(
    "USDT Test Token (18 decimals)",
    "USDT",
    deployer.address
  );
  await usdtToken.waitForDeployment();
  const usdtAddress = await usdtToken.getAddress();
  console.log("✅ USDTTestToken deployed to:", usdtAddress);

  // Deploy supporting contracts
  const SwapTaxManager = await hre.ethers.getContractFactory("SwapTaxManager");
  const swapTaxManager = await SwapTaxManager.deploy(deployer.address);
  await swapTaxManager.waitForDeployment();
  const taxAddress = await swapTaxManager.getAddress();

  const BLOCKS = await hre.ethers.getContractFactory("BLOCKS");
  const shareToken = await BLOCKS.deploy(
    "BlockCoop Sacco Share Token",
    "BLOCKS",
    deployer.address,
    taxAddress
  );
  await shareToken.waitForDeployment();
  const shareAddress = await shareToken.getAddress();

  const BLOCKS_LP = await hre.ethers.getContractFactory("BLOCKS_LP");
  const lpToken = await BLOCKS_LP.deploy(
    "BlockCoop Sacco LP Token",
    "BLOCKS-LP",
    deployer.address
  );
  await lpToken.waitForDeployment();
  const lpAddress = await lpToken.getAddress();

  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(shareAddress, deployer.address);
  await vestingVault.waitForDeployment();
  const vaultAddress = await vestingVault.getAddress();

  // Deploy PackageManager with referral fix
  const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    usdtAddress,
    shareAddress,
    lpAddress,
    vaultAddress,
    "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // Router (dummy for test)
    "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", // Factory (dummy for test)
    deployer.address, // Treasury
    taxAddress,
    deployer.address, // Admin
    hre.ethers.parseUnits("2.0", 18) // Global target price
  );
  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Grant roles
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  await shareToken.grantRole(MINTER_ROLE, packageManagerAddress);
  
  const BURNER_ROLE = await lpToken.BURNER_ROLE();
  await lpToken.grantRole(BURNER_ROLE, packageManagerAddress);
  
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);

  console.log("✅ All roles granted");

  // Create test package with referral
  console.log("\n📝 Step 2: Creating test package with referral rewards...");
  const testPackage = {
    name: "Referral Test Package",
    entryUSDT: hre.ethers.parseUnits("100", 18),    // 100 USDT (18 decimals)
    exchangeRate: hre.ethers.parseUnits("2.0", 18), // 2.0 USDT per BLOCKS (18 decimals)
    vestBps: 7000,                                   // 70% vesting
    cliff: 0,                                        // No cliff
    duration: 86400 * 30,                           // 30 days
    referralBps: 500                                 // 5% referral
  };

  await packageManager.addPackage(
    testPackage.name,
    testPackage.entryUSDT,
    testPackage.exchangeRate,
    testPackage.vestBps,
    testPackage.cliff,
    testPackage.duration,
    testPackage.referralBps
  );
  console.log("✅ Test package created with 5% referral rate");

  // Mint USDT to test users
  console.log("\n💰 Step 3: Minting USDT to test users...");
  const testAmount = hre.ethers.parseUnits("1000", 18); // 1000 USDT each
  await usdtToken.mint(user1.address, testAmount);
  await usdtToken.mint(user2.address, testAmount);
  console.log("✅ Minted 1000 USDT to each test user");

  // Test referral system
  console.log("\n🔍 Step 4: Testing referral system...");
  
  // Check initial balances
  const initialReferrerBalance = await shareToken.balanceOf(referrer.address);
  console.log("Initial referrer BLOCKS balance:", hre.ethers.formatEther(initialReferrerBalance));

  // User1 purchases with referrer
  console.log("\n👤 User1 purchasing with referrer...");
  const user1UsdtContract = usdtToken.connect(user1);
  const user1PackageManager = packageManager.connect(user1);
  
  // Approve USDT
  await user1UsdtContract.approve(packageManagerAddress, testPackage.entryUSDT);
  
  // Purchase with referrer
  const purchaseTx = await user1PackageManager.purchasePackage(0, referrer.address);
  const receipt = await purchaseTx.wait();
  
  // Check for ReferralPaid event
  const referralPaidEvent = receipt.logs.find(log => {
    try {
      const parsed = packageManager.interface.parseLog(log);
      return parsed.name === 'ReferralPaid';
    } catch {
      return false;
    }
  });

  if (referralPaidEvent) {
    const parsedEvent = packageManager.interface.parseLog(referralPaidEvent);
    console.log("✅ ReferralPaid event found:");
    console.log("  Referrer:", parsedEvent.args.referrer);
    console.log("  Buyer:", parsedEvent.args.buyer);
    console.log("  Reward:", hre.ethers.formatEther(parsedEvent.args.reward), "BLOCKS");
  } else {
    console.log("❌ ReferralPaid event not found");
  }

  // Check final balances
  const finalReferrerBalance = await shareToken.balanceOf(referrer.address);
  const referralReward = finalReferrerBalance - initialReferrerBalance;
  console.log("Final referrer BLOCKS balance:", hre.ethers.formatEther(finalReferrerBalance));
  console.log("Referral reward received:", hre.ethers.formatEther(referralReward), "BLOCKS");

  // Calculate expected referral reward
  const expectedUserTokens = (testPackage.entryUSDT * hre.ethers.parseUnits("1", 18)) / testPackage.exchangeRate;
  const expectedReferralReward = (expectedUserTokens * BigInt(testPackage.referralBps)) / 10000n;
  console.log("Expected referral reward:", hre.ethers.formatEther(expectedReferralReward), "BLOCKS");

  // Verify calculation
  const rewardMatch = referralReward === expectedReferralReward;
  console.log("Referral calculation correct:", rewardMatch ? "✅" : "❌");

  // Test referrer stats
  console.log("\n📊 Step 5: Checking referrer stats...");
  const referrerStats = await packageManager.getUserStats(referrer.address);
  console.log("Referrer total referral rewards:", hre.ethers.formatEther(referrerStats.totalReferralRewards), "BLOCKS");

  // Test without referrer
  console.log("\n👤 User2 purchasing without referrer...");
  const user2UsdtContract = usdtToken.connect(user2);
  const user2PackageManager = packageManager.connect(user2);
  
  await user2UsdtContract.approve(packageManagerAddress, testPackage.entryUSDT);
  
  const initialReferrerBalance2 = await shareToken.balanceOf(referrer.address);
  await user2PackageManager.purchasePackage(0, hre.ethers.ZeroAddress); // No referrer
  const finalReferrerBalance2 = await shareToken.balanceOf(referrer.address);
  
  const noReferralReward = finalReferrerBalance2 - initialReferrerBalance2;
  console.log("Referrer balance change (should be 0):", hre.ethers.formatEther(noReferralReward), "BLOCKS");
  console.log("No referral when no referrer:", noReferralReward === 0n ? "✅" : "❌");

  // Summary
  console.log("\n🎉 Referral System Test Summary:");
  console.log("- Direct minting for referrals:", referralReward > 0n ? "✅" : "❌");
  console.log("- Correct reward calculation:", rewardMatch ? "✅" : "❌");
  console.log("- No reward without referrer:", noReferralReward === 0n ? "✅" : "❌");
  console.log("- Event emission:", referralPaidEvent ? "✅" : "❌");
  console.log("- Stats tracking:", referrerStats.totalReferralRewards === referralReward ? "✅" : "❌");

  const allTestsPassed = referralReward > 0n && rewardMatch && noReferralReward === 0n && referralPaidEvent && referrerStats.totalReferralRewards === referralReward;
  console.log("\n🏆 Overall Result:", allTestsPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED");

  if (allTestsPassed) {
    console.log("\n🔧 Referral system fix verified successfully!");
    console.log("- Referrals now mint directly to referrer (no treasury dependency)");
    console.log("- Reward calculation is accurate");
    console.log("- Events and stats are properly tracked");
    console.log("- System handles both referral and non-referral purchases correctly");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
