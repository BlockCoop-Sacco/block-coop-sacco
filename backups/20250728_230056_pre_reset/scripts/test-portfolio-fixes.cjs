const { ethers } = require("hardhat");
require('dotenv').config();

// Simulate the frontend formatting functions
function formatTokenAmount(amount, decimals = 18, displayDecimals = 4) {
  if (amount === null || amount === undefined) {
    return '0.0000';
  }

  try {
    return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(displayDecimals);
  } catch (error) {
    console.warn('Error formatting token amount:', error, 'amount:', amount);
    return '0.0000';
  }
}

// Auto-detect USDT decimal precision
function detectUSDTDecimals(value) {
  const numValue = Number(value);
  return (numValue > 0 && numValue < 1e12) ? 6 : 18;
}

async function main() {
  console.log("🧪 Testing Portfolio Fixes");
  console.log("==========================");

  const packageManagerAddress = process.env.VITE_PACKAGE_MANAGER_ADDRESS;
  const testAccount = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";

  try {
    const PackageManager = await ethers.getContractFactory("PackageManagerV2_1");
    const packageManager = PackageManager.attach(packageManagerAddress);

    console.log("\n📊 Testing Portfolio Stats Formatting:");
    console.log("======================================");

    // Get user stats from contract
    const userStats = await packageManager.getUserStats(testAccount);
    
    console.log("Raw contract data:");
    console.log(`  Total Invested: ${userStats.totalInvested.toString()}`);
    console.log(`  Total Tokens: ${userStats.totalTokensReceived.toString()}`);
    console.log(`  Total Vest Tokens: ${userStats.totalVestTokens.toString()}`);
    console.log(`  Total LP Tokens: ${userStats.totalLPTokens.toString()}`);

    // Test old formatting (hardcoded 18 decimals) vs new formatting (auto-detect)
    console.log("\n🔧 Formatting Comparison:");
    console.log("=========================");

    // Old way (wrong)
    const oldTotalInvested = formatTokenAmount(userStats.totalInvested, 18, 2);
    const oldTotalTokens = formatTokenAmount(userStats.totalTokensReceived, 18, 4);

    // New way (correct)
    const usdtDecimals = detectUSDTDecimals(userStats.totalInvested);
    const newTotalInvested = formatTokenAmount(userStats.totalInvested, usdtDecimals, 2);
    const newTotalTokens = formatTokenAmount(userStats.totalTokensReceived, 18, 4);

    console.log("Total Invested:");
    console.log(`  ❌ Old (18 decimals): ${oldTotalInvested} USDT`);
    console.log(`  ✅ New (${usdtDecimals} decimals): ${newTotalInvested} USDT`);

    console.log("\nTotal Tokens (should be same):");
    console.log(`  Old: ${oldTotalTokens} BLOCKS`);
    console.log(`  New: ${newTotalTokens} BLOCKS`);

    // Test individual purchases
    console.log("\n📦 Testing Individual Purchases:");
    console.log("================================");

    const userPurchases = await packageManager.getUserPurchases(testAccount);
    console.log(`Found ${userPurchases.length} purchases:`);

    for (let i = 0; i < Math.min(userPurchases.length, 3); i++) {
      const purchase = userPurchases[i];
      console.log(`\nPurchase ${i + 1}:`);
      console.log(`  Package ID: ${purchase.packageId.toString()}`);
      console.log(`  Raw USDT Amount: ${purchase.usdtAmount.toString()}`);
      console.log(`  Raw Total Tokens: ${purchase.totalTokens.toString()}`);
      
      // Format with correct decimals
      const purchaseUSDTDecimals = detectUSDTDecimals(purchase.usdtAmount);
      const formattedUSDT = formatTokenAmount(purchase.usdtAmount, purchaseUSDTDecimals, 2);
      const formattedTokens = formatTokenAmount(purchase.totalTokens, 18, 4);
      
      console.log(`  Formatted USDT (${purchaseUSDTDecimals} decimals): ${formattedUSDT} USDT`);
      console.log(`  Formatted Tokens: ${formattedTokens} BLOCKS`);
    }

    // Test aggregation
    console.log("\n🧮 Testing Aggregation:");
    console.log("=======================");

    let totalInvestedSum = 0n;
    let totalTokensSum = 0n;

    for (const purchase of userPurchases) {
      totalInvestedSum += purchase.usdtAmount;
      totalTokensSum += purchase.totalTokens;
    }

    console.log("Manual aggregation from purchases:");
    console.log(`  Total USDT Sum: ${totalInvestedSum.toString()}`);
    console.log(`  Total Tokens Sum: ${totalTokensSum.toString()}`);

    console.log("Contract getUserStats:");
    console.log(`  Total Invested: ${userStats.totalInvested.toString()}`);
    console.log(`  Total Tokens: ${userStats.totalTokensReceived.toString()}`);

    console.log("Match check:");
    console.log(`  USDT matches: ${totalInvestedSum === userStats.totalInvested ? '✅' : '❌'}`);
    console.log(`  Tokens matches: ${totalTokensSum === userStats.totalTokensReceived ? '✅' : '❌'}`);

    // Test the "Gold" package mystery
    console.log("\n🔍 Investigating 'Gold' Package:");
    console.log("=================================");

    // Check if any purchase is from package ID 2 (which might be called "Gold" in frontend)
    const package2Purchases = userPurchases.filter(p => Number(p.packageId) === 2);
    if (package2Purchases.length > 0) {
      console.log(`✅ Found ${package2Purchases.length} purchases from Package #2:`);
      for (const purchase of package2Purchases) {
        const usdtDecimals = detectUSDTDecimals(purchase.usdtAmount);
        const formattedUSDT = formatTokenAmount(purchase.usdtAmount, usdtDecimals, 2);
        console.log(`  USDT Amount: ${formattedUSDT} USDT`);
        console.log(`  Timestamp: ${new Date(Number(purchase.timestamp) * 1000).toISOString()}`);
      }
    } else {
      console.log("❌ No purchases found from Package #2");
    }

    // Get package #2 details
    try {
      const package2 = await packageManager.getPackage(2);
      console.log(`Package #2 details: ${package2.name}`);
      console.log(`  Entry USDT: ${package2.entryUSDT.toString()}`);
      console.log(`  Active: ${package2.active}`);
    } catch (error) {
      console.log(`❌ Error getting Package #2: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n✅ Portfolio fixes testing complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
