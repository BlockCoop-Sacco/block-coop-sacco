const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔍 Checking Roles and Permissions for Fresh Deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Account:", deployer.address);
  console.log("🌐 Network:", network.name);

  // Load deployment data
  const deployFile = path.resolve(__dirname, "../deployments/deployments-fresh-v2.json");
  const deployData = JSON.parse(fs.readFileSync(deployFile));
  
  const contracts = deployData.contracts;
  
  console.log("📍 Using Fresh Deployment:");
  console.log("PackageManagerV2_1:", contracts.PackageManagerV2_1);
  console.log("BLOCKS:", contracts.BLOCKS);
  console.log("VestingVault:", contracts.VestingVault);

  // Get contract instances
  const pm = await ethers.getContractAt("PackageManagerV2_1", contracts.PackageManagerV2_1);
  const blocks = await ethers.getContractAt("BLOCKS", contracts.BLOCKS);
  const blocksLP = await ethers.getContractAt("BLOCKS_LP", contracts["BLOCKS-LP"]);
  const vestingVault = await ethers.getContractAt("VestingVault", contracts.VestingVault);

  console.log("\n🔍 Step 1: Check BLOCKS token roles...");
  
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  console.log("MINTER_ROLE:", MINTER_ROLE);
  
  // Check if PackageManager has MINTER_ROLE
  const pmHasMinterRole = await blocks.hasRole(MINTER_ROLE, contracts.PackageManagerV2_1);
  console.log(`PackageManager has MINTER_ROLE: ${pmHasMinterRole}`);
  
  // Check if VestingVault has MINTER_ROLE (it shouldn't need it)
  const vaultHasMinterRole = await blocks.hasRole(MINTER_ROLE, contracts.VestingVault);
  console.log(`VestingVault has MINTER_ROLE: ${vaultHasMinterRole}`);

  console.log("\n🔍 Step 2: Check VestingVault roles...");
  
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  console.log("LOCKER_ROLE:", LOCKER_ROLE);
  
  // Check if PackageManager has LOCKER_ROLE
  const pmHasLockerRole = await vestingVault.hasRole(LOCKER_ROLE, contracts.PackageManagerV2_1);
  console.log(`PackageManager has LOCKER_ROLE: ${pmHasLockerRole}`);

  console.log("\n🔍 Step 3: Check BLOCKS-LP token roles...");
  
  const LP_MINTER_ROLE = await blocksLP.MINTER_ROLE();
  const BURNER_ROLE = await blocksLP.BURNER_ROLE();
  console.log("LP MINTER_ROLE:", LP_MINTER_ROLE);
  console.log("BURNER_ROLE:", BURNER_ROLE);
  
  // Check if PackageManager has LP roles
  const pmHasLPMinterRole = await blocksLP.hasRole(LP_MINTER_ROLE, contracts.PackageManagerV2_1);
  const pmHasBurnerRole = await blocksLP.hasRole(BURNER_ROLE, contracts.PackageManagerV2_1);
  console.log(`PackageManager has LP MINTER_ROLE: ${pmHasLPMinterRole}`);
  console.log(`PackageManager has BURNER_ROLE: ${pmHasBurnerRole}`);

  console.log("\n🔍 Step 4: Check VestingVault configuration...");
  
  const vaultShareToken = await vestingVault.shareToken();
  console.log(`VestingVault shareToken address: ${vaultShareToken}`);
  console.log(`Expected BLOCKS address: ${contracts.BLOCKS}`);
  console.log(`Addresses match: ${vaultShareToken.toLowerCase() === contracts.BLOCKS.toLowerCase()}`);

  console.log("\n🔍 Step 5: Test VestingVault functionality...");
  
  try {
    // Try to check if we can call the lock function (this should fail if roles are wrong)
    console.log("Testing VestingVault lock function access...");
    
    // This should work if roles are set correctly
    const testAmount = ethers.parseUnits("1", 18);
    const testCliff = 0;
    const testDuration = 86400; // 1 day
    
    // We can't actually call this without proper setup, but we can check the interface
    const lockInterface = vestingVault.interface.getFunction("lock");
    console.log(`Lock function exists: ${!!lockInterface}`);
    
  } catch (error) {
    console.log("VestingVault test failed:", error.message);
  }

  console.log("\n📊 Role Check Summary:");
  console.log(`✅ PackageManager → BLOCKS MINTER_ROLE: ${pmHasMinterRole}`);
  console.log(`✅ PackageManager → VestingVault LOCKER_ROLE: ${pmHasLockerRole}`);
  console.log(`✅ PackageManager → BLOCKS-LP MINTER_ROLE: ${pmHasLPMinterRole}`);
  console.log(`✅ PackageManager → BLOCKS-LP BURNER_ROLE: ${pmHasBurnerRole}`);
  console.log(`✅ VestingVault → BLOCKS address correct: ${vaultShareToken.toLowerCase() === contracts.BLOCKS.toLowerCase()}`);

  // Check if all roles are properly set
  const allRolesCorrect = pmHasMinterRole && pmHasLockerRole && pmHasLPMinterRole && pmHasBurnerRole;
  
  if (allRolesCorrect) {
    console.log("\n🎉 All roles are properly configured!");
  } else {
    console.log("\n❌ Some roles are missing. Need to fix permissions.");
    
    if (!pmHasMinterRole) {
      console.log("🔧 Need to grant MINTER_ROLE to PackageManager for BLOCKS");
    }
    if (!pmHasLockerRole) {
      console.log("🔧 Need to grant LOCKER_ROLE to PackageManager for VestingVault");
    }
    if (!pmHasLPMinterRole) {
      console.log("🔧 Need to grant MINTER_ROLE to PackageManager for BLOCKS-LP");
    }
    if (!pmHasBurnerRole) {
      console.log("🔧 Need to grant BURNER_ROLE to PackageManager for BLOCKS-LP");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Role check failed:", error);
    process.exit(1);
  });
