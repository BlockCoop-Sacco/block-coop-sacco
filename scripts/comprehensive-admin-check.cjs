const { ethers, network } = require("hardhat");

async function main() {
  console.log("🔍 COMPREHENSIVE ADMIN ROLE CHECK FOR BLOCKCOOP SACCO");
  console.log("=" .repeat(70));
  console.log("Network:", network.name);
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Current Signer Address:", deployer.address);
  
  // All configured admin wallets from adminConfig.ts
  const ADMIN_WALLETS = [
    {
      address: "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4",
      name: "Primary Admin (Deployer)"
    },
    {
      address: "0xfF81cBA6Da71c50cC3123b277e612C95895ABC67", 
      name: "Additional Admin (Client Request)"
    },
    {
      address: "0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8",
      name: "New Admin (BlockCoop Sacco Management)"
    }
  ];
  
  console.log("\n🎯 CONFIGURED ADMIN WALLETS:");
  ADMIN_WALLETS.forEach((wallet, index) => {
    console.log(`   ${index + 1}. ${wallet.address} (${wallet.name})`);
  });
  
  // Load contracts
  const packageManagerAddress = "0x1e44B103349598aebe2D1F33E4c42B92D0d713B3";
  const packageManager = await ethers.getContractAt("PackageManagerV2_2", packageManagerAddress);
  
  console.log("\n📋 PackageManager Contract:", packageManagerAddress);
  
  // Role definitions
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const SERVER_ROLE = "0xa8a7bc421f721cb936ea99efdad79237e6ee0b871a2a08cf648691f9584cdc77";
  
  console.log("🔑 DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  console.log("🔑 SERVER_ROLE:", SERVER_ROLE);
  
  console.log("\n👥 ADMIN ROLE STATUS FOR ALL WALLETS:");
  
  for (const wallet of ADMIN_WALLETS) {
    const hasDefaultAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
    const hasServerRole = await packageManager.hasRole(SERVER_ROLE, wallet.address);
    
    console.log(`   ${wallet.address} (${wallet.name}):`);
    console.log(`     ✅ DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin}`);
    console.log(`     🔧 SERVER_ROLE: ${hasServerRole}`);
    console.log("");
  }
  
  // Check contract status
  console.log("📊 CONTRACT STATUS:");
  try {
    const isPaused = await packageManager.paused();
    console.log("   ⏸️  Paused:", isPaused);
  } catch (error) {
    console.log("   ⏸️  Paused: Could not check");
  }
  
  try {
    const packageCount = await packageManager.nextPackageId();
    console.log("   📦 Total Packages:", packageCount.toString());
  } catch (error) {
    console.log("   📦 Total Packages: Could not check");
  }
  
  // Check if current signer can grant roles
  console.log("\n🔐 ROLE MANAGEMENT CAPABILITIES:");
  try {
    const canGrantRole = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    console.log("   Current Signer Can Grant Roles:", canGrantRole);
  } catch (error) {
    console.log("   Current Signer Can Grant Roles: Could not check");
  }
  
  // Summary
  console.log("\n🎯 SUMMARY:");
  let adminCount = 0;
  let serverCount = 0;
  
  for (const wallet of ADMIN_WALLETS) {
    const hasDefaultAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
    const hasServerRole = await packageManager.hasRole(SERVER_ROLE, wallet.address);
    
    if (hasDefaultAdmin) adminCount++;
    if (hasServerRole) serverCount++;
    
    const status = hasDefaultAdmin ? "✅ HAS ADMIN" : "❌ NO ADMIN";
    console.log(`   ${wallet.name}: ${status}`);
  }
  
  console.log(`\n📊 TOTAL ADMIN WALLETS: ${adminCount}/${ADMIN_WALLETS.length}`);
  console.log(`📊 TOTAL SERVER ROLE WALLETS: ${serverCount}/${ADMIN_WALLETS.length}`);
  
  if (adminCount === 0) {
    console.log("\n⚠️  CRITICAL: No admin wallets have DEFAULT_ADMIN_ROLE!");
    console.log("   The contract may be unusable.");
  } else if (adminCount < ADMIN_WALLETS.length) {
    console.log("\n⚠️  WARNING: Some admin wallets are missing DEFAULT_ADMIN_ROLE");
    console.log("   Consider granting roles to missing wallets.");
  } else {
    console.log("\n✅ SUCCESS: All admin wallets have DEFAULT_ADMIN_ROLE");
  }
  
  console.log("\n" + "=" .repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
