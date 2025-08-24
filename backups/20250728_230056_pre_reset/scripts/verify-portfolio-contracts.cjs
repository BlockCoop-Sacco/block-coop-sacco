const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("🔍 Verifying Portfolio Contract Connectivity");
  console.log("==========================================");

  // Get the PackageManager contract
  const packageManagerAddress = process.env.VITE_PACKAGE_MANAGER_ADDRESS;
  console.log(`📦 PackageManager Address: ${packageManagerAddress}`);

  const PackageManager = await ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = PackageManager.attach(packageManagerAddress);

  try {
    // Check if we can call basic functions
    console.log("\n🔗 Testing Contract Connectivity:");
    
    // Get package count
    const packageCount = await packageManager.getPackageCount();
    console.log(`📊 Total Package Count: ${packageCount.toString()}`);

    // Try to get packages beyond index 7
    console.log("\n🔍 Checking for packages beyond index 7:");
    for (let i = 8; i < 15; i++) {
      try {
        const pkg = await packageManager.getPackage(i);
        if (pkg.exists) {
          console.log(`📦 Package ${i} found: ${pkg.name}`);
          console.log(`   Entry USDT: ${pkg.entryUSDT.toString()}`);
          console.log(`   Exchange Rate: ${pkg.exchangeRate.toString()}`);
          console.log(`   Active: ${pkg.active}`);
        }
      } catch (error) {
        if (error.message.includes("Package does not exist")) {
          console.log(`❌ Package ${i}: Does not exist`);
          break;
        } else {
          console.log(`❌ Package ${i}: Error - ${error.message}`);
        }
      }
    }

    // Check global target price
    console.log("\n🎯 Global Configuration:");
    try {
      const targetPrice = await packageManager.getGlobalTargetPrice();
      console.log(`Global Target Price: ${ethers.formatUnits(targetPrice, 18)} USDT/BLOCKS`);
    } catch (error) {
      console.log(`❌ Error getting target price: ${error.message}`);
    }

    // Check contract version/type
    console.log("\n📋 Contract Information:");
    try {
      // Try to call a V2-specific function to confirm we're on the right contract
      const owner = await packageManager.owner();
      console.log(`Contract Owner: ${owner}`);
      
      // Check if this is the correct V2 contract by testing for V2-specific functions
      const hasV2Functions = await packageManager.interface.hasFunction("getGlobalTargetPrice");
      console.log(`Has V2 Functions: ${hasV2Functions}`);
      
    } catch (error) {
      console.log(`❌ Error checking contract info: ${error.message}`);
    }

    // Get all packages with detailed info
    console.log("\n📦 All Packages Summary:");
    console.log("========================");
    for (let i = 0; i < packageCount; i++) {
      try {
        const pkg = await packageManager.getPackage(i);
        if (pkg.exists) {
          console.log(`Package ${i}: ${pkg.name}`);
          console.log(`  Entry USDT (raw): ${pkg.entryUSDT.toString()}`);
          console.log(`  Exchange Rate (raw): ${pkg.exchangeRate.toString()}`);
          console.log(`  Vest BPS: ${pkg.vestBps.toString()}`);
          console.log(`  Active: ${pkg.active}`);
          console.log(`  ---`);
        }
      } catch (error) {
        console.log(`❌ Error getting package ${i}: ${error.message}`);
      }
    }

  } catch (error) {
    console.error("❌ Contract connectivity error:", error.message);
    console.log("\n🚨 This suggests we may not be connected to the correct contract!");
  }

  console.log("\n✅ Contract verification complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
