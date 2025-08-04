const { ethers } = require("ethers");

async function main() {
  console.log("🔍 Quick Contract Test - Checking Package Data...");
  
  // Load environment variables
  require('dotenv').config();
  
  const RPC_URL = process.env.BSC_TESTNET_RPC;
  const PACKAGE_MANAGER_ADDRESS = process.env.VITE_PACKAGE_MANAGER_ADDRESS;
  
  console.log("RPC URL:", RPC_URL);
  console.log("PackageManager Address:", PACKAGE_MANAGER_ADDRESS);
  
  // Create provider
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Load PackageManager ABI
  const fs = require('fs');
  const path = require('path');
  
  const abiPath = path.resolve(__dirname, "../src/abi/PackageManager.json");
  const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  
  // Create contract instance
  const packageManager = new ethers.Contract(PACKAGE_MANAGER_ADDRESS, abiData.abi, provider);
  
  console.log("\n🔍 Testing package loading...");
  
  try {
    // Get package IDs
    const packageIds = await packageManager.getPackageIds();
    console.log(`Found ${packageIds.length} packages:`, packageIds.map(id => Number(id)));
    
    if (packageIds.length > 0) {
      const packageId = packageIds[0];
      console.log(`\n📦 Testing package ${packageId}:`);
      
      // Get raw package data
      const pkg = await packageManager.getPackage(packageId);
      console.log("Raw package data:", pkg);
      
      // Test individual field access
      console.log("\nIndividual field access:");
      console.log("- name:", pkg.name);
      console.log("- entryUSDT:", pkg.entryUSDT?.toString());
      console.log("- exchangeRate:", pkg.exchangeRate?.toString());
      console.log("- vestBps:", pkg.vestBps?.toString());
      console.log("- cliff:", pkg.cliff?.toString());
      console.log("- duration:", pkg.duration?.toString());
      console.log("- referralBps:", pkg.referralBps?.toString());
      console.log("- active:", pkg.active);
      console.log("- exists:", pkg.exists);
      
      // Test array access (in case it's returned as array)
      if (Array.isArray(pkg)) {
        console.log("\nArray access (if returned as array):");
        console.log("- [0] name:", pkg[0]);
        console.log("- [1] entryUSDT:", pkg[1]?.toString());
        console.log("- [2] exchangeRate:", pkg[2]?.toString());
        console.log("- [3] vestBps:", pkg[3]?.toString());
        console.log("- [4] cliff:", pkg[4]?.toString());
        console.log("- [5] duration:", pkg[5]?.toString());
        console.log("- [6] referralBps:", pkg[6]?.toString());
        console.log("- [7] active:", pkg[7]);
        console.log("- [8] exists:", pkg[8]);
      }
      
      // Test if we can format the values
      if (pkg.entryUSDT && pkg.exchangeRate) {
        console.log("\nFormatted values:");
        console.log("- Entry USDT:", ethers.formatUnits(pkg.entryUSDT, 6), "USDT");
        console.log("- Exchange Rate:", ethers.formatUnits(pkg.exchangeRate, 6), "USDT per BLOCKS");
        console.log("- Vest BPS:", Number(pkg.vestBps), `(${Number(pkg.vestBps) / 100}%)`);
      } else {
        console.log("\n❌ Cannot format values - some fields are undefined");
        console.log("- entryUSDT defined:", pkg.entryUSDT !== undefined);
        console.log("- exchangeRate defined:", pkg.exchangeRate !== undefined);
        console.log("- vestBps defined:", pkg.vestBps !== undefined);
      }
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log("Full error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
