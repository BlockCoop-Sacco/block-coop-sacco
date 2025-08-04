const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Test script to verify frontend integration with PackageManagerV2_1
 */

async function main() {
  console.log("🧪 Testing frontend integration with PackageManagerV2_1...");
  
  // Read deployment info
  const deployFile = path.resolve(__dirname, "../deployments/deployments.json");
  const data = JSON.parse(fs.readFileSync(deployFile));
  const pmAddress = data.contracts.PackageManagerV2_1;
  
  console.log(`📍 Testing contract at: ${pmAddress}`);
  
  // Read frontend ABI
  const frontendAbiPath = path.resolve(__dirname, "../src/abi/PackageManager.json");
  const frontendAbi = JSON.parse(fs.readFileSync(frontendAbiPath, 'utf8'));
  
  console.log(`📋 Frontend ABI has ${frontendAbi.length} items`);
  
  // Test with frontend ABI
  const pm = await ethers.getContractAt(frontendAbi, pmAddress);
  
  const testAddress = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";
  
  console.log("\n🔍 Testing enhanced view functions with frontend ABI...");
  
  try {
    // Test getUserStats
    console.log("Testing getUserStats...");
    const userStats = await pm.getUserStats(testAddress);
    console.log(`✅ getUserStats: totalInvested=${userStats.totalInvested.toString()}`);
    
    // Test getUserPackageCount
    console.log("Testing getUserPackageCount...");
    const packageCount = await pm.getUserPackageCount(testAddress);
    console.log(`✅ getUserPackageCount: ${packageCount.toString()}`);
    
    // Test getUserPackages
    console.log("Testing getUserPackages...");
    const packages = await pm.getUserPackages(testAddress);
    console.log(`✅ getUserPackages: ${packages.length} packages`);
    
    // Test getPackagesByOwner
    console.log("Testing getPackagesByOwner...");
    const packagesByOwner = await pm.getPackagesByOwner(testAddress);
    console.log(`✅ getPackagesByOwner: ${packagesByOwner.length} packages`);
    
    console.log("\n🎉 All enhanced functions working correctly with frontend ABI!");
    
  } catch (error) {
    console.error(`❌ Error testing functions: ${error.message}`);
    throw error;
  }
  
  // Test basic functions
  console.log("\n🔍 Testing basic functions...");
  
  try {
    const packageCount = await pm.getPackageCount();
    console.log(`✅ getPackageCount: ${packageCount.toString()}`);
    
    const deadlineWindow = await pm.deadlineWindow();
    console.log(`✅ deadlineWindow: ${deadlineWindow.toString()}`);
    
    console.log("✅ Basic functions working correctly!");
    
  } catch (error) {
    console.error(`❌ Error testing basic functions: ${error.message}`);
    throw error;
  }
  
  console.log("\n✅ Frontend integration test completed successfully!");
  console.log("🔗 The contract is ready for frontend use.");
}

main().catch(err => {
  console.error("\n❌ Frontend integration test failed:");
  console.error(err);
  process.exit(1);
});
