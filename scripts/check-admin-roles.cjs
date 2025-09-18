const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Admin Roles on PackageManager Contract...");
  
  // Contract addresses
  const PACKAGE_MANAGER_ADDRESS = "0x1e44B103349598aebe2D1F33E4c42B92D0d713B3";
  const NEW_ADMIN_WALLET = "0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8";
  
  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Current Signer Address:", deployer.address);
  console.log("🎯 New Admin Address:", NEW_ADMIN_WALLET);
  
  // Get the PackageManager contract
  const PackageManager = await ethers.getContractFactory("PackageManagerV2_2");
  const packageManager = PackageManager.attach(PACKAGE_MANAGER_ADDRESS);
  
  console.log("📋 PackageManager Contract:", PACKAGE_MANAGER_ADDRESS);
  
  // Check DEFAULT_ADMIN_ROLE
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  console.log("🔑 DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  
  // Check if current signer has admin role
  const hasAdminRole = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log("🔑 Current Signer Has Admin Role:", hasAdminRole);
  
  // Check if new wallet has admin role
  const newWalletHasRole = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, NEW_ADMIN_WALLET);
  console.log("🔑 New Wallet Has Admin Role:", newWalletHasRole);
  
  // Check ADMIN_ROLE constant
  try {
    const adminRoleConstant = await packageManager.ADMIN_ROLE();
    console.log("🔑 ADMIN_ROLE Constant:", adminRoleConstant);
    
    // Check if current signer has ADMIN_ROLE
    const hasAdminRoleConstant = await packageManager.hasRole(adminRoleConstant, deployer.address);
    console.log("🔑 Current Signer Has ADMIN_ROLE:", hasAdminRoleConstant);
    
    // Check if new wallet has ADMIN_ROLE
    const newWalletHasAdminRoleConstant = await packageManager.hasRole(adminRoleConstant, NEW_ADMIN_WALLET);
    console.log("🔑 New Wallet Has ADMIN_ROLE:", newWalletHasAdminRoleConstant);
  } catch (error) {
    console.log("⚠️ Could not get ADMIN_ROLE constant:", error.message);
  }
  
  // Check SERVER_ROLE
  try {
    const serverRole = await packageManager.SERVER_ROLE();
    console.log("🔑 SERVER_ROLE:", serverRole);
    
    // Check if current signer has SERVER_ROLE
    const hasServerRole = await packageManager.hasRole(serverRole, deployer.address);
    console.log("🔑 Current Signer Has SERVER_ROLE:", hasServerRole);
    
    // Check if new wallet has SERVER_ROLE
    const newWalletHasServerRole = await packageManager.hasRole(serverRole, NEW_ADMIN_WALLET);
    console.log("🔑 New Wallet Has SERVER_ROLE:", newWalletHasServerRole);
  } catch (error) {
    console.log("⚠️ Could not get SERVER_ROLE:", error.message);
  }
  
  // Check if contract is paused
  try {
    const isPaused = await packageManager.paused();
    console.log("⏸️ Contract Paused:", isPaused);
  } catch (error) {
    console.log("⚠️ Could not check pause status:", error.message);
  }
  
  // Check contract owner/admin
  try {
    const owner = await packageManager.owner();
    console.log("👑 Contract Owner:", owner);
  } catch (error) {
    console.log("⚠️ Contract does not have owner() function");
  }
  
  // Check getRoleAdmin for DEFAULT_ADMIN_ROLE
  try {
    const roleAdmin = await packageManager.getRoleAdmin(DEFAULT_ADMIN_ROLE);
    console.log("🔑 Role Admin for DEFAULT_ADMIN_ROLE:", roleAdmin);
  } catch (error) {
    console.log("⚠️ Could not get role admin:", error.message);
  }
  
  // Check getRoleMemberCount for DEFAULT_ADMIN_ROLE
  try {
    const memberCount = await packageManager.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
    console.log("👥 Members with DEFAULT_ADMIN_ROLE:", memberCount.toString());
    
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });


