const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔍 Debugging Portfolio Functions");
  console.log("===============================");

  const packageManagerAddress = process.env.VITE_PACKAGE_MANAGER_ADDRESS;
  console.log(`📦 PackageManager Address: ${packageManagerAddress}`);

  // Test account (use the deployer account for testing)
  const testAccount = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";
  console.log(`👤 Test Account: ${testAccount}`);

  try {
    // Get the contract factory and attach to deployed address
    const PackageManager = await ethers.getContractFactory("PackageManagerV2_1");
    const packageManager = PackageManager.attach(packageManagerAddress);

    console.log("\n🔍 Testing Contract Functions:");
    console.log("==============================");

    // Test 1: Check if getUserStats function exists and works
    console.log("\n1️⃣ Testing getUserStats function:");
    try {
      const userStats = await packageManager.getUserStats(testAccount);
      console.log("✅ getUserStats function exists and returned:");
      console.log(`   Total Invested: ${userStats.totalInvested.toString()}`);
      console.log(`   Total Tokens Received: ${userStats.totalTokensReceived.toString()}`);
      console.log(`   Total Vest Tokens: ${userStats.totalVestTokens.toString()}`);
      console.log(`   Total Pool Tokens: ${userStats.totalPoolTokens.toString()}`);
      console.log(`   Total LP Tokens: ${userStats.totalLPTokens.toString()}`);
      console.log(`   Purchase Count: ${userStats.purchaseCount.toString()}`);
    } catch (error) {
      console.log(`❌ getUserStats failed: ${error.message}`);
    }

    // Test 2: Check if getUserPurchases function exists and works
    console.log("\n2️⃣ Testing getUserPurchases function:");
    try {
      const userPurchases = await packageManager.getUserPurchases(testAccount);
      console.log(`✅ getUserPurchases function exists and returned ${userPurchases.length} purchases:`);
      
      if (userPurchases.length > 0) {
        console.log("   First purchase details:");
        const firstPurchase = userPurchases[0];
        console.log(`   Package ID: ${firstPurchase.packageId.toString()}`);
        console.log(`   USDT Amount: ${firstPurchase.usdtAmount.toString()}`);
        console.log(`   Total Tokens: ${firstPurchase.totalTokens.toString()}`);
        console.log(`   Timestamp: ${firstPurchase.timestamp.toString()}`);
      }
    } catch (error) {
      console.log(`❌ getUserPurchases failed: ${error.message}`);
    }

    // Test 3: Check if getUserRedemptions function exists and works
    console.log("\n3️⃣ Testing getUserRedemptions function:");
    try {
      const [amounts, timestamps] = await packageManager.getUserRedemptions(testAccount);
      console.log(`✅ getUserRedemptions function exists and returned ${amounts.length} redemptions:`);
      
      if (amounts.length > 0) {
        console.log("   First redemption details:");
        console.log(`   Amount: ${amounts[0].toString()}`);
        console.log(`   Timestamp: ${timestamps[0].toString()}`);
      }
    } catch (error) {
      console.log(`❌ getUserRedemptions failed: ${error.message}`);
    }

    // Test 4: Check decimal precision of returned values
    console.log("\n4️⃣ Testing Decimal Precision:");
    try {
      const userStats = await packageManager.getUserStats(testAccount);
      
      // Check if values look like 6-decimal or 18-decimal
      const totalInvested = Number(userStats.totalInvested);
      const totalTokens = Number(userStats.totalTokensReceived);
      
      console.log(`Raw Total Invested: ${totalInvested}`);
      console.log(`Raw Total Tokens: ${totalTokens}`);
      
      // Detect decimal format
      const investedDecimals = (totalInvested > 0 && totalInvested < 1e12) ? 6 : 18;
      const tokensDecimals = 18; // BLOCKS tokens are always 18 decimals
      
      console.log(`Detected USDT decimals: ${investedDecimals}`);
      console.log(`BLOCKS decimals: ${tokensDecimals}`);
      
      // Format with detected decimals
      if (totalInvested > 0) {
        const formattedInvested = ethers.formatUnits(userStats.totalInvested, investedDecimals);
        console.log(`Formatted Total Invested: ${formattedInvested} USDT`);
      }
      
      if (totalTokens > 0) {
        const formattedTokens = ethers.formatUnits(userStats.totalTokensReceived, tokensDecimals);
        console.log(`Formatted Total Tokens: ${formattedTokens} BLOCKS`);
      }
      
    } catch (error) {
      console.log(`❌ Decimal precision test failed: ${error.message}`);
    }

    // Test 5: Check if there are any actual user transactions
    console.log("\n5️⃣ Checking for Real User Data:");
    try {
      // Try a few different accounts to see if any have data
      const testAccounts = [
        "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4", // Deployer
        "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987", // Additional admin
      ];

      for (const account of testAccounts) {
        try {
          const stats = await packageManager.getUserStats(account);
          const purchaseCount = Number(stats.purchaseCount);
          
          if (purchaseCount > 0) {
            console.log(`✅ Found user data for ${account}:`);
            console.log(`   Purchase Count: ${purchaseCount}`);
            console.log(`   Total Invested: ${stats.totalInvested.toString()}`);
            
            // Get purchase details
            const purchases = await packageManager.getUserPurchases(account);
            console.log(`   Purchases: ${purchases.length}`);
            
            if (purchases.length > 0) {
              console.log("   Recent purchase:");
              const recent = purchases[purchases.length - 1];
              console.log(`     Package ID: ${recent.packageId.toString()}`);
              console.log(`     USDT Amount: ${recent.usdtAmount.toString()}`);
              console.log(`     Total Tokens: ${recent.totalTokens.toString()}`);
            }
          } else {
            console.log(`❌ No purchase data for ${account}`);
          }
        } catch (error) {
          console.log(`❌ Error checking ${account}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ User data check failed: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Contract connection error:", error.message);
  }

  console.log("\n✅ Portfolio function debugging complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
