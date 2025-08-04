const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Comprehensive deployment validation script for PackageManagerV2_1
 * This script validates:
 * 1. Contract deployment and basic functionality
 * 2. Constructor parameters and configuration
 * 3. Role assignments and permissions
 * 4. New view functions (getUserPackages, getUserPackageCount, getPackagesByOwner)
 * 5. Existing functionality compatibility
 */

async function validateAddress(address, name, requireContract = true) {
  if (!address || !ethers.isAddress(address)) {
    throw new Error(`Invalid ${name} address: ${address}`);
  }

  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    if (requireContract) {
      throw new Error(`No contract found at ${name} address: ${address}`);
    } else {
      console.log(`✅ ${name}: ${address} (EOA verified)`);
      return;
    }
  }

  console.log(`✅ ${name}: ${address} (contract verified)`);
}

async function validatePackageManagerV2_1() {
  console.log("🔍 Starting PackageManagerV2_1 deployment validation...");
  console.log(`🌐 Network: ${network.name}`);
  
  const deployFile = path.resolve(__dirname, "../deployments/deployments.json");
  
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Deployments file not found: ${deployFile}`);
  }
  
  const data = JSON.parse(fs.readFileSync(deployFile));
  const pmAddress = data.contracts.PackageManagerV2_1;
  
  if (!pmAddress) {
    throw new Error("PackageManagerV2_1 address not found in deployments.json");
  }
  
  console.log(`📍 PackageManagerV2_1 Address: ${pmAddress}`);
  
  // Validate contract exists
  await validateAddress(pmAddress, "PackageManagerV2_1");
  
  // Get contract instance
  const pm = await ethers.getContractAt("PackageManagerV2_1", pmAddress);
  
  console.log("\n🔍 Validating basic contract functionality...");
  
  try {
    // Test basic view functions
    const deadlineWindow = await pm.deadlineWindow();
    console.log(`✅ deadlineWindow: ${deadlineWindow.toString()}`);
    
    const packageCount = await pm.getPackageCount();
    console.log(`✅ Package count: ${packageCount.toString()}`);
    
    // Test constructor parameters
    console.log("\n🔍 Validating constructor parameters...");

    const usdt = await pm.usdt();
    const shareToken = await pm.shareToken();
    const lpToken = await pm.lpToken();
    const vestingVault = await pm.vestingVault();
    const router = await pm.router();
    const treasury = await pm.treasury();
    const taxManager = await pm.taxManager();

    console.log(`✅ USDT: ${usdt}`);
    console.log(`✅ ShareToken: ${shareToken}`);
    console.log(`✅ LPToken: ${lpToken}`);
    console.log(`✅ VestingVault: ${vestingVault}`);
    console.log(`✅ Router: ${router}`);
    console.log(`✅ Treasury: ${treasury}`);
    console.log(`✅ Tax Manager: ${taxManager}`);

    // Validate all referenced contracts exist
    await validateAddress(usdt, "USDT");
    await validateAddress(shareToken, "ShareToken");
    await validateAddress(lpToken, "LPToken");
    await validateAddress(vestingVault, "VestingVault");
    await validateAddress(router, "PancakeRouter");
    await validateAddress(treasury, "Treasury", false); // Treasury can be EOA
    await validateAddress(taxManager, "SwapTaxManager");
    
  } catch (error) {
    throw new Error(`Basic functionality validation failed: ${error.message}`);
  }
  
  console.log("\n🔍 Validating role assignments...");
  
  try {
    // Check roles on dependent contracts
    const shareContract = await ethers.getContractAt("ShareToken", await pm.shareToken());
    const lpContract = await ethers.getContractAt("LPToken", await pm.lpToken());
    const vaultContract = await ethers.getContractAt("VestingVault", await pm.vestingVault());
    
    // Check MINTER_ROLE on ShareToken
    const MINTER_ROLE = await shareContract.MINTER_ROLE();
    const hasShareMinter = await shareContract.hasRole(MINTER_ROLE, pmAddress);
    console.log(`✅ PackageManager has MINTER_ROLE on ShareToken: ${hasShareMinter}`);
    
    // Check MINTER_ROLE on LPToken
    const hasLpMinter = await lpContract.hasRole(MINTER_ROLE, pmAddress);
    console.log(`✅ PackageManager has MINTER_ROLE on LPToken: ${hasLpMinter}`);
    
    // Check BURNER_ROLE on LPToken
    const BURNER_ROLE = await lpContract.BURNER_ROLE();
    const hasLpBurner = await lpContract.hasRole(BURNER_ROLE, pmAddress);
    console.log(`✅ PackageManager has BURNER_ROLE on LPToken: ${hasLpBurner}`);
    
    // Check LOCKER_ROLE on VestingVault
    const LOCKER_ROLE = await vaultContract.LOCKER_ROLE();
    const hasVaultLocker = await vaultContract.hasRole(LOCKER_ROLE, pmAddress);
    console.log(`✅ PackageManager has LOCKER_ROLE on VestingVault: ${hasVaultLocker}`);
    
    if (!hasShareMinter || !hasLpMinter || !hasLpBurner || !hasVaultLocker) {
      throw new Error("Critical role assignments missing!");
    }
    
  } catch (error) {
    throw new Error(`Role validation failed: ${error.message}`);
  }
  
  console.log("\n🔍 Testing new view functions...");
  
  try {
    // Test new view functions with a test address
    const testAddress = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4"; // deployer address
    
    // Test getUserPackageCount
    const userPackageCount = await pm.getUserPackageCount(testAddress);
    console.log(`✅ getUserPackageCount(${testAddress}): ${userPackageCount.toString()}`);
    
    // Test getUserPackages
    const userPackages = await pm.getUserPackages(testAddress);
    console.log(`✅ getUserPackages(${testAddress}): ${userPackages.length} packages`);
    
    // Test getPackagesByOwner
    const packagesByOwner = await pm.getPackagesByOwner(testAddress);
    console.log(`✅ getPackagesByOwner(${testAddress}): ${packagesByOwner.length} packages`);
    
    console.log("✅ All new view functions are working correctly!");
    
  } catch (error) {
    throw new Error(`New view functions validation failed: ${error.message}`);
  }
  
  console.log("\n🔍 Testing existing functionality...");

  try {
    // Get current package count
    const currentPackageCount = await pm.getPackageCount();

    // Test package listing
    if (currentPackageCount > 0) {
      const firstPackage = await pm.getPackage(0);
      console.log(`✅ getPackage(0): ${firstPackage.name}`);
    }

    // Test package IDs retrieval
    const packageIds = await pm.getPackageIds();
    console.log(`✅ getPackageIds(): ${packageIds.length} packages`);

    console.log("✅ Existing functionality is working correctly!");

  } catch (error) {
    throw new Error(`Existing functionality validation failed: ${error.message}`);
  }
  
  // Get final package count for return
  const finalPackageCount = await pm.getPackageCount();

  return {
    address: pmAddress,
    packageCount: finalPackageCount.toString(),
    rolesValid: true,
    newFunctionsWorking: true,
    existingFunctionsWorking: true
  };
}

async function main() {
  try {
    const result = await validatePackageManagerV2_1();
    
    console.log("\n🎉 Deployment validation completed successfully!");
    console.log("📋 Summary:");
    console.log(`   Contract Address: ${result.address}`);
    console.log(`   Package Count: ${result.packageCount}`);
    console.log(`   Roles Valid: ${result.rolesValid}`);
    console.log(`   New Functions Working: ${result.newFunctionsWorking}`);
    console.log(`   Existing Functions Working: ${result.existingFunctionsWorking}`);
    
    console.log("\n✅ PackageManagerV2_1 is ready for enhanced features testing!");
    
  } catch (error) {
    console.error("\n❌ Deployment validation failed:");
    console.error(error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("\n❌ Validation script failed:");
  console.error(err);
  process.exit(1);
});
