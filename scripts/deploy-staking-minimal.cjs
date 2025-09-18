const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Minimal BLOCKSStakingV2 deployment (gas optimized)");
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

  // Deploy BLOCKSStakingV2 with minimal gas settings
  console.log("\n1️⃣ Deploying BLOCKSStakingV2...");
  const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
  
  // Use minimal gas settings
  const gasPrice = await ethers.provider.getGasPrice();
  const minimalGasPrice = gasPrice * 105n / 100n; // Only 5% above current gas price
  
  const staking = await StakingV2.deploy(
    BLOCKS_ADDRESS,  // stakingToken (BLOCKS)
    USDT_ADDRESS,    // rewardToken (USDT)
    deployer.address, // admin
    {
      gasLimit: 2500000, // Reduced gas limit
      gasPrice: minimalGasPrice
    }
  );
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("✅ BLOCKSStakingV2 deployed at:", stakingAddr);

  // Grant only essential admin role to save gas
  console.log("\n2️⃣ Setting up essential admin role...");
  const POOL_MANAGER_ROLE = await staking.POOL_MANAGER_ROLE();
  await (await staking.grantRole(POOL_MANAGER_ROLE, deployer.address)).wait();
  console.log("✅ Essential admin role granted");

  // Create only 1 essential pool to minimize gas
  console.log("\n3️⃣ Creating essential staking pool...");
  await (await staking.createPool(
    "Flexible Staking",
    0,                    // lockPeriod (0 = no lock)
    800,                  // apyBasisPoints (8%)
    ethers.parseUnits("1", 18),  // minStake (1 BLOCKS)
    ethers.parseUnits("1000000", 18), // maxStake (1M BLOCKS)
    10000,                // rewardMultiplier (100%)
    500                   // emergencyExitPenalty (5%)
  )).wait();
  console.log("✅ Essential staking pool created");

  // Update deployment configuration
  const updatedDeployment = {
    ...existingDeployment,
    staking: stakingAddr,
    stakingDeployedAt: Date.now(),
    stakingDeployer: deployer.address,
    stakingPoolsCreated: 1
  };

  // Save updated deployment
  fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
  console.log("\n📝 Updated deployment configuration");

  console.log("\n🎉 Minimal BLOCKSStakingV2 deployment completed!");
  console.log("Staking Contract:", stakingAddr);
  console.log("Pools created: 1 (Flexible Staking)");
  
  // Display pool information
  console.log("\n📊 Staking Pool Created:");
  const pool = await staking.pools(0);
  console.log(`Pool 0: ${pool.name}`);
  console.log(`  - Lock Period: ${pool.lockPeriod} seconds (${pool.lockPeriod / (24 * 60 * 60)} days)`);
  console.log(`  - APY: ${pool.apyBasisPoints / 100}%`);
  console.log(`  - Min Stake: ${ethers.formatUnits(pool.minStake, 18)} BLOCKS`);
  console.log(`  - Max Stake: ${ethers.formatUnits(pool.maxStake, 18)} BLOCKS`);
  console.log(`  - Active: ${pool.isActive}`);

  console.log("\n🔧 Next Steps:");
  console.log("1. Update your .env file with VITE_STAKING_ADDRESS=" + stakingAddr);
  console.log("2. Set VITE_STAKING_ENABLED=true in your .env file");
  console.log("3. Fund the staking contract with USDT for rewards");
  console.log("4. Add additional pools later using admin functions");
  console.log("5. Grant additional admin roles as needed");
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});

