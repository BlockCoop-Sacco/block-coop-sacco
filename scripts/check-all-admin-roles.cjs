const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Comprehensive Admin Role Check for All Wallets...");
  
  // Contract addresses
  const PACKAGE_MANAGER_ADDRESS = "0x1e44B103349598aebe2D1F33E4c42B92D0d713B3";
  const ADMIN_WALLET_1 = "0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8";
  const ADMIN_WALLET_2 = "0xfF81cBA6Da71c50cC3123b277e612C95895ABC67";
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Current Signer Address:", deployer.address);
  console.log("🎯 Admin Wallet 1:", ADMIN_WALLET_1);
  console.log("🎯 Admin Wallet 2:", ADMIN_WALLET_2);
  
  // Get the PackageManager contract
  const PackageManager = await ethers.getContractFactory("PackageManagerV2_2");
  const packageManager = PackageManager.attach(PACKAGE_MANAGER_ADDRESS);
  
  console.log("📋 PackageManager Contract:", PACKAGE_MANAGER_ADDRESS);
  
  // Check DEFAULT_ADMIN_ROLE
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  console.log("🔑 DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  
  // Check all wallets for admin role
  console.log("\n👥 ADMIN ROLE STATUS FOR ALL WALLETS:");
  
  // Current signer
  const deployerHasAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log(`   ${deployer.address} (Current Signer):`);
  console.log(`     ✅ DEFAULT_ADMIN_ROLE: ${deployerHasAdmin}`);
  
  // Admin Wallet 1
  const wallet1HasAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, ADMIN_WALLET_1);
  console.log(`   ${ADMIN_WALLET_1} (Admin Wallet 1):`);
  console.log(`     ✅ DEFAULT_ADMIN_ROLE: ${wallet1HasAdmin}`);
  
  // Admin Wallet 2
  const wallet2HasAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, ADMIN_WALLET_2);
  console.log(`   ${ADMIN_WALLET_2} (Admin Wallet 2):`);
  console.log(`     ✅ DEFAULT_ADMIN_ROLE: ${wallet2HasAdmin}`);
  
  // Check SERVER_ROLE
  try {
    const serverRole = await packageManager.SERVER_ROLE();
    console.log("\n🔑 SERVER_ROLE:", serverRole);
    
    // Check if all wallets have SERVER_ROLE
    const deployerHasServer = await packageManager.hasRole(serverRole, deployer.address);
    const wallet1HasServer = await packageManager.hasRole(serverRole, ADMIN_WALLET_1);
    const wallet2HasServer = await packageManager.hasRole(serverRole, ADMIN_WALLET_2);
    
    console.log(`   ${deployer.address} (Current Signer): SERVER_ROLE: ${deployerHasServer}`);
    console.log(`   ${ADMIN_WALLET_1} (Admin Wallet 1): SERVER_ROLE: ${wallet1HasServer}`);
    console.log(`   ${ADMIN_WALLET_2} (Admin Wallet 2): SERVER_ROLE: ${wallet2HasServer}`);
  } catch (error) {
    console.log("⚠️ Could not get SERVER_ROLE:", error.message);
  }
  
  // Check contract status
  console.log("\n📊 CONTRACT STATUS:");
  try {
    const isPaused = await packageManager.paused();
    console.log(`   ⏸️  Paused: ${isPaused}`);
  } catch (error) {
    console.log("⚠️ Could not check pause status:", error.message);
  }
  
  // Check if contract is working
  try {
    const packageCount = await packageManager.getPackageCount();
    console.log(`   📦 Total Packages: ${packageCount.toString()}`);
  } catch (error) {
    console.log("⚠️ Could not get package count:", error.message);
  }
  
  // Check getRoleMemberCount for DEFAULT_ADMIN_ROLE
  try {
    const memberCount = await packageManager.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
    console.log(`\n👥 Members with DEFAULT_ADMIN_ROLE: ${memberCount.toString()}`);
    
    // List all members with DEFAULT_ADMIN_ROLE
    for (let i = 0; i < memberCount; i++) {
      try {
        const member = await packageManager.getRoleMember(DEFAULT_ADMIN_ROLE, i);
        console.log(`   Member ${i}: ${member}`);
      } catch (error) {
        console.log(`   Could not get member ${i}:`, error.message);
      }
    }
  } catch (error) {
    console.log("⚠️ Could not get role member count:", error.message);
  }
  
  // Summary
  console.log("\n🎯 SUMMARY:");
  console.log(`   Current Signer (${deployer.address}): ${deployerHasAdmin ? '✅ HAS ADMIN' : '❌ NO ADMIN'}`);
  console.log(`   Admin Wallet 1 (${ADMIN_WALLET_1}): ${wallet1HasAdmin ? '✅ HAS ADMIN' : '❌ NO ADMIN'}`);
  console.log(`   Admin Wallet 2 (${ADMIN_WALLET_2}): ${wallet2HasAdmin ? '✅ HAS ADMIN' : '❌ NO ADMIN'}`);
  
  if (!wallet2HasAdmin) {
    console.log("\n🔧 RECOMMENDATION:");
    console.log("   Admin Wallet 2 still doesn't have admin role.");
    console.log("   This might be due to a contract issue or role management problem.");
    console.log("   Consider checking the transaction on BSCScan for more details.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });

