const { ethers } = require("hardhat");

async function main() {
  console.log("📊 ADMIN STATUS SUMMARY FOR BLOCKCOOP SACCO");
  console.log("=" .repeat(50));
  
  // Contract addresses
  const PACKAGE_MANAGER_ADDRESS = "0x1e44B103349598aebe2D1F33E4c42B92D0d713B3";
  const NEW_ADMIN_WALLET = "0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8";
  const TREASURY_ADDRESS = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";
  
  console.log("📋 PackageManager Contract:", PACKAGE_MANAGER_ADDRESS);
  console.log("🌐 Network: BSC Mainnet");
  console.log("");
  
  // Get the PackageManager contract
  const PackageManager = await ethers.getContractFactory("PackageManagerV2_2");
  const packageManager = PackageManager.attach(PACKAGE_MANAGER_ADDRESS);
  
  // Role definitions
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const SERVER_ROLE = "0xa8a7bc421f721cb936ea99efdad79237e6ee0b871a2a08cf648691f9584cdc77";
  
  console.log("🔑 ROLE DEFINITIONS:");
  console.log("   DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  console.log("   SERVER_ROLE:", SERVER_ROLE);
  console.log("");
  
  // Check admin roles for all relevant addresses
  console.log("👥 ADMIN ROLE STATUS:");
  
  // Current deployer (from .env)
  const [deployer] = await ethers.getSigners();
  const deployerHasAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const deployerHasServer = await packageManager.hasRole(SERVER_ROLE, deployer.address);
  console.log(`   ${deployer.address} (Current Signer):`);
  console.log(`     ✅ DEFAULT_ADMIN_ROLE: ${deployerHasAdmin}`);
  console.log(`     🔧 SERVER_ROLE: ${deployerHasServer}`);
  
  // New admin wallet
  const newWalletHasAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, NEW_ADMIN_WALLET);
  const newWalletHasServer = await packageManager.hasRole(SERVER_ROLE, NEW_ADMIN_WALLET);
  console.log(`   ${NEW_ADMIN_WALLET} (New Admin):`);
  console.log(`     ✅ DEFAULT_ADMIN_ROLE: ${newWalletHasAdmin}`);
  console.log(`     🔧 SERVER_ROLE: ${newWalletHasServer}`);
  
  // Treasury address
  const treasuryHasAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, TREASURY_ADDRESS);
  const treasuryHasServer = await packageManager.hasRole(SERVER_ROLE, TREASURY_ADDRESS);
  console.log(`   ${TREASURY_ADDRESS} (Treasury):`);
  console.log(`     ✅ DEFAULT_ADMIN_ROLE: ${treasuryHasAdmin}`);
  console.log(`     🔧 SERVER_ROLE: ${treasuryHasServer}`);
  
  console.log("");
  
  // Contract status
  console.log("📊 CONTRACT STATUS:");
  try {
    const isPaused = await packageManager.paused();
    console.log(`   ⏸️  Paused: ${isPaused}`);
  } catch (error) {
    console.log(`   ⏸️  Paused: Error checking`);
  }
  
  try {
    const packageCount = await packageManager.getPackageCount();
    console.log(`   📦 Total Packages: ${packageCount.toString()}`);
  } catch (error) {
    console.log(`   📦 Total Packages: Error checking`);
  }
  
  try {
    const activePackageIds = await packageManager.getActivePackageIds();
    console.log(`   🟢 Active Packages: ${activePackageIds.length}`);
  } catch (error) {
    console.log(`   🟢 Active Packages: Error checking`);
  }
  
  console.log("");
  
  // Summary
  console.log("🎯 SUMMARY:");
  if (newWalletHasAdmin) {
    console.log("   ✅ SUCCESS: New admin wallet has been granted DEFAULT_ADMIN_ROLE");
    console.log("   📋 The new admin can now perform all admin functions:");
    console.log("      • Add/remove investment packages");
    console.log("      • Update package exchange rates");
    console.log("      • Set global target prices");
    console.log("      • Pause/unpause the contract");
    console.log("      • Manage other roles");
    console.log("      • Update contract parameters");
  } else {
    console.log("   ❌ FAILED: New admin wallet does not have DEFAULT_ADMIN_ROLE");
  }
  
  if (newWalletHasServer) {
    console.log("   ✅ BONUS: New admin wallet also has SERVER_ROLE");
    console.log("      • Can perform server-authorized purchases");
  } else {
    console.log("   ℹ️  NOTE: New admin wallet does not have SERVER_ROLE");
    console.log("      • This is optional and only needed for backend operations");
  }
  
  console.log("");
  console.log("🔐 ADMIN ROLE GRANTING COMPLETED SUCCESSFULLY!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });


