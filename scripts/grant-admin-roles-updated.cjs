const { ethers, network } = require("hardhat");

async function main() {
  console.log("🔐 GRANTING ADMIN ROLES TO ADDITIONAL ADMIN WALLETS");
  console.log("=" .repeat(70));
  console.log("Network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Current Signer Address:", deployer.address);
  
  // Updated admin wallet addresses
  const ADDITIONAL_ADMIN_1 = "0xfF81cBA6Da71c50cC3123b277e612C95895ABC67"; // Additional Admin (Client Request)
  const ADDITIONAL_ADMIN_2 = "0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8"; // New Admin (BlockCoop Sacco Management)
  
  console.log("🎯 Additional Admin 1:", ADDITIONAL_ADMIN_1);
  console.log("🎯 Additional Admin 2:", ADDITIONAL_ADMIN_2);
  
  // Load contracts
  const packageManagerAddress = "0x1e44B103349598aebe2D1F33E4c42B92D0d713B3";
  const packageManager = await ethers.getContractAt("PackageManagerV2_2", packageManagerAddress);
  
  console.log("\n📋 PackageManager Contract:", packageManagerAddress);
  
  // Role definitions
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const SERVER_ROLE = "0xa8a7bc421f721cb936ea99efdad79237e6ee0b871a2a08cf648691f9584cdc77";
  
  console.log("🔑 DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  console.log("🔑 SERVER_ROLE:", SERVER_ROLE);
  
  // Check current signer permissions
  console.log("\n🔐 VERIFYING CURRENT SIGNER PERMISSIONS:");
  const hasDefaultAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log("   Current Signer Has DEFAULT_ADMIN_ROLE:", hasDefaultAdmin);
  
  if (!hasDefaultAdmin) {
    console.error("❌ Current signer does not have DEFAULT_ADMIN_ROLE. Cannot grant roles.");
    process.exit(1);
  }
  
  // Check current status of additional admin wallets
  console.log("\n📊 CURRENT STATUS OF ADDITIONAL ADMIN WALLETS:");
  
  const admin1HasDefault = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN_1);
  const admin1HasServer = await packageManager.hasRole(SERVER_ROLE, ADDITIONAL_ADMIN_1);
  const admin2HasDefault = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN_2);
  const admin2HasServer = await packageManager.hasRole(SERVER_ROLE, ADDITIONAL_ADMIN_2);
  
  console.log(`   ${ADDITIONAL_ADMIN_1}:`);
  console.log(`     DEFAULT_ADMIN_ROLE: ${admin1HasDefault ? "✅" : "❌"}`);
  console.log(`     SERVER_ROLE: ${admin1HasServer ? "✅" : "❌"}`);
  
  console.log(`   ${ADDITIONAL_ADMIN_2}:`);
  console.log(`     DEFAULT_ADMIN_ROLE: ${admin2HasDefault ? "✅" : "❌"}`);
  console.log(`     SERVER_ROLE: ${admin2HasServer ? "✅" : "❌"}`);
  
  // Grant roles to Additional Admin 1
  console.log("\n🔐 GRANTING ROLES TO ADDITIONAL ADMIN 1...");
  
  if (!admin1HasDefault) {
    console.log("   Granting DEFAULT_ADMIN_ROLE...");
    try {
      const tx1 = await packageManager.grantRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN_1);
      console.log("   Transaction hash:", tx1.hash);
      await tx1.wait();
      console.log("   ✅ DEFAULT_ADMIN_ROLE granted successfully!");
    } catch (error) {
      console.error("   ❌ Failed to grant DEFAULT_ADMIN_ROLE:", error.message);
    }
  } else {
    console.log("   ✅ DEFAULT_ADMIN_ROLE already exists");
  }
  
  if (!admin1HasServer) {
    console.log("   Granting SERVER_ROLE...");
    try {
      const tx2 = await packageManager.grantRole(SERVER_ROLE, ADDITIONAL_ADMIN_1);
      console.log("   Transaction hash:", tx2.hash);
      await tx2.wait();
      console.log("   ✅ SERVER_ROLE granted successfully!");
    } catch (error) {
      console.error("   ❌ Failed to grant SERVER_ROLE:", error.message);
    }
  } else {
    console.log("   ✅ SERVER_ROLE already exists");
  }
  
  // Grant roles to Additional Admin 2
  console.log("\n🔐 GRANTING ROLES TO ADDITIONAL ADMIN 2...");
  
  if (!admin2HasDefault) {
    console.log("   Granting DEFAULT_ADMIN_ROLE...");
    try {
      const tx3 = await packageManager.grantRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN_2);
      console.log("   Transaction hash:", tx3.hash);
      await tx3.wait();
      console.log("   ✅ DEFAULT_ADMIN_ROLE granted successfully!");
    } catch (error) {
      console.error("   ❌ Failed to grant DEFAULT_ADMIN_ROLE:", error.message);
    }
  } else {
    console.log("   ✅ DEFAULT_ADMIN_ROLE already exists");
  }
  
  if (!admin2HasServer) {
    console.log("   Granting SERVER_ROLE...");
    try {
      const tx4 = await packageManager.grantRole(SERVER_ROLE, ADDITIONAL_ADMIN_2);
      console.log("   Transaction hash:", tx4.hash);
      await tx4.wait();
      console.log("   ✅ SERVER_ROLE granted successfully!");
    } catch (error) {
      console.error("   ❌ Failed to grant SERVER_ROLE:", error.message);
    }
  } else {
    console.log("   ✅ SERVER_ROLE already exists");
  }
  
  // Verify final status
  console.log("\n🔍 VERIFYING FINAL STATUS:");
  
  const finalAdmin1Default = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN_1);
  const finalAdmin1Server = await packageManager.hasRole(SERVER_ROLE, ADDITIONAL_ADMIN_1);
  const finalAdmin2Default = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN_2);
  const finalAdmin2Server = await packageManager.hasRole(SERVER_ROLE, ADDITIONAL_ADMIN_2);
  
  console.log(`   ${ADDITIONAL_ADMIN_1}:`);
  console.log(`     DEFAULT_ADMIN_ROLE: ${finalAdmin1Default ? "✅" : "❌"}`);
  console.log(`     SERVER_ROLE: ${finalAdmin1Server ? "✅" : "❌"}`);
  
  console.log(`   ${ADDITIONAL_ADMIN_2}:`);
  console.log(`     DEFAULT_ADMIN_ROLE: ${finalAdmin2Default ? "✅" : "❌"}`);
  console.log(`     SERVER_ROLE: ${finalAdmin2Server ? "✅" : "❌"}`);
  
  // Summary
  console.log("\n🎯 SUMMARY:");
  const totalAdmins = 3; // Primary + 2 Additional
  let activeAdmins = 1; // Primary admin
  
  if (finalAdmin1Default) activeAdmins++;
  if (finalAdmin2Default) activeAdmins++;
  
  console.log(`   Total Admin Wallets: ${totalAdmins}`);
  console.log(`   Active Admin Wallets: ${activeAdmins}`);
  console.log(`   Admin Coverage: ${((activeAdmins / totalAdmins) * 100).toFixed(1)}%`);
  
  if (activeAdmins === totalAdmins) {
    console.log("\n✅ SUCCESS: All admin wallets now have DEFAULT_ADMIN_ROLE!");
  } else {
    console.log("\n⚠️  WARNING: Some admin wallets still missing DEFAULT_ADMIN_ROLE");
  }
  
  console.log("\n" + "=" .repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });










