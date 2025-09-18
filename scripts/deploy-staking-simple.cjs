const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Simple BLOCKSStakingV2 deployment (no default pools)");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load existing deployment configuration
  const deploymentFile = "deployments/deployments-mainnet-v2_2-fixed-1756833373.json";
  let existingDeployment = {};
  
  if (fs.existsSync(deploymentFile)) {
    existingDeployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log("📋 Loaded existing deployment config");
  }

  // Contract addresses from existing deployment
  const USDT_ADDRESS = existingDeployment.usdt || "0x55d398326f99059ff775485246999027b3197955";
  const BLOCKS_ADDRESS = existingDeployment.blocks || "0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31";

  console.log("📋 Contract addresses:");
  console.log("USDT:", USDT_ADDRESS);
  console.log("BLOCKS:", BLOCKS_ADDRESS);

  // First, let's create a simplified version of the contract
  console.log("\n1️⃣ Creating simplified staking contract...");
  
  // We'll deploy a minimal version first, then add pools later
  const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
  
  // Deploy without default pools by modifying the constructor temporarily
  console.log("⚠️ Note: This will deploy the contract without default pools");
  console.log("   Pools will need to be created manually after deployment");
  
  const staking = await StakingV2.deploy(
    BLOCKS_ADDRESS,  // stakingToken (BLOCKS)
    USDT_ADDRESS,    // rewardToken (USDT)
    deployer.address // admin
  );
  
  console.log("⏳ Waiting for deployment confirmation...");
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("✅ BLOCKSStakingV2 deployed at:", stakingAddr);

  // Update deployment configuration
  const updatedDeployment = {
    ...existingDeployment,
    staking: stakingAddr,
    stakingDeployedAt: Date.now(),
    stakingDeployer: deployer.address,
    stakingPoolsCreated: 0,
    stakingStatus: "deployed_no_pools"
  };

  // Save updated deployment
  fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
  console.log("\n📝 Updated deployment configuration");

  console.log("\n🎉 BLOCKSStakingV2 deployment completed!");
  console.log("Staking Contract:", stakingAddr);
  console.log("Status: Contract deployed successfully (no default pools)");

  console.log("\n🔧 Next Steps:");
  console.log("1. Update your .env file with VITE_STAKING_ADDRESS=" + stakingAddr);
  console.log("2. Set VITE_STAKING_ENABLED=true in your .env file");
  console.log("3. Fund the staking contract with USDT for rewards");
  console.log("4. Create staking pools using admin functions");
  console.log("5. Test the staking functionality");
  
  console.log("\n💡 The contract is deployed but needs pools to be created manually.");
  console.log("   You can create pools using the createPool function with admin privileges.");
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
