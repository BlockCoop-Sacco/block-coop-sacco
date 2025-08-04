const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Script to check what functions are available in the deployed contract
 */

async function main() {
  console.log("🔍 Checking deployed contract functions...");
  console.log(`🌐 Network: ${network.name}`);
  
  const deployFile = path.resolve(__dirname, "../deployments/deployments.json");
  const data = JSON.parse(fs.readFileSync(deployFile));
  const pmAddress = data.contracts.PackageManagerV2_1;
  
  console.log(`📍 PackageManagerV2_1 Address: ${pmAddress}`);
  
  // Get contract instance
  const pm = await ethers.getContractAt("PackageManagerV2_1", pmAddress);
  
  console.log("\n🔍 Testing available functions...");
  
  // Test basic functions
  try {
    const packageCount = await pm.getPackageCount();
    console.log(`✅ getPackageCount(): ${packageCount.toString()}`);
  } catch (error) {
    console.log(`❌ getPackageCount(): ${error.message}`);
  }
  
  try {
    const packageIds = await pm.getPackageIds();
    console.log(`✅ getPackageIds(): ${packageIds.length} packages`);
  } catch (error) {
    console.log(`❌ getPackageIds(): ${error.message}`);
  }
  
  // Test new view functions
  const testAddress = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";
  
  try {
    const userPackageCount = await pm.getUserPackageCount(testAddress);
    console.log(`✅ getUserPackageCount(): ${userPackageCount.toString()}`);
  } catch (error) {
    console.log(`❌ getUserPackageCount(): ${error.message}`);
  }
  
  try {
    const userPackages = await pm.getUserPackages(testAddress);
    console.log(`✅ getUserPackages(): ${userPackages.length} packages`);
  } catch (error) {
    console.log(`❌ getUserPackages(): ${error.message}`);
  }
  
  try {
    const packagesByOwner = await pm.getPackagesByOwner(testAddress);
    console.log(`✅ getPackagesByOwner(): ${packagesByOwner.length} packages`);
  } catch (error) {
    console.log(`❌ getPackagesByOwner(): ${error.message}`);
  }
  
  // Test if this is the old contract
  try {
    const result = await pm.purchase(0, ethers.ZeroAddress);
    console.log(`✅ This appears to be the old PackageManager contract`);
  } catch (error) {
    if (error.message.includes("Invalid package")) {
      console.log(`✅ This appears to be a PackageManager contract (old or new)`);
    } else {
      console.log(`❌ purchase() test: ${error.message}`);
    }
  }
  
  console.log("\n🔍 Contract interface analysis complete!");
}

main().catch(err => {
  console.error("\n❌ Script failed:");
  console.error(err);
  process.exit(1);
});
