const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying BLOCKSStakingV2 contract");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load existing deployment configuration
  const deploymentFile = "deployments/deployments-mainnet-v2_2-fixed-1756833373.json";
  let existingDeployment = {};
  
  if (fs.existsSync(deploymentFile)) {
    existingDeployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log("📋 Loaded existing deployment config");
  } else {
    console.log("⚠️ No existing deployment file found, using environment variables");
  }

  // Contract addresses from existing deployment or environment
  const USDT_ADDRESS = existingDeployment.usdt || process.env.VITE_USDT_ADDRESS || "0x55d398326f99059ff775485246999027b3197955";
  const BLOCKS_ADDRESS = existingDeployment.blocks || process.env.VITE_SHARE_ADDRESS || "0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31";
  const TREASURY_ADDRESS = existingDeployment.treasury || process.env.TREASURY_ADDRESS || deployer.address;

  console.log("📋 Contract addresses:");
  console.log("USDT:", USDT_ADDRESS);
  console.log("BLOCKS:", BLOCKS_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);

  // Deploy BLOCKSStakingV2 with optimized gas settings
  console.log("\n1️⃣ Deploying BLOCKSStakingV2...");
  const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
  
  // Optimize gas settings for deployment
  const gasPrice = await ethers.provider.getGasPrice();
  const optimizedGasPrice = gasPrice * 110n / 100n; // 10% above current gas price
  
  const staking = await StakingV2.deploy(
    BLOCKS_ADDRESS,  // stakingToken (BLOCKS)
    USDT_ADDRESS,    // rewardToken (USDT)
    deployer.address, // admin
    {
      gasLimit: 3000000, // Set explicit gas limit
      gasPrice: optimizedGasPrice
    }
  );
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("✅ BLOCKSStakingV2 deployed at:", stakingAddr);

  // Grant admin roles with optimized gas
  console.log("\n2️⃣ Setting up admin roles...");
  const POOL_MANAGER_ROLE = await staking.POOL_MANAGER_ROLE();
  const REWARD_DISTRIBUTOR_ROLE = await staking.REWARD_DISTRIBUTOR_ROLE();
  const EMERGENCY_ROLE = await staking.EMERGENCY_ROLE();

  // Batch role grants to save gas
  const roleGrants = [
    staking.grantRole(POOL_MANAGER_ROLE, deployer.address),
    staking.grantRole(REWARD_DISTRIBUTOR_ROLE, deployer.address),
    staking.grantRole(EMERGENCY_ROLE, deployer.address)
  ];
  
  await Promise.all(roleGrants.map(tx => tx.wait()));
  console.log("✅ Admin roles granted");

  // Create minimal staking pools to save gas
  console.log("\n3️⃣ Creating essential staking pools...");
  
  // Create only 2 essential pools to minimize gas usage
  const poolCreations = [
    // Pool 0: Flexible Staking (0 lock period, 8% APY)
    staking.createPool(
      "Flexible Staking",
      0,                    // lockPeriod (0 = no lock)
      800,                  // apyBasisPoints (8%)
      ethers.parseUnits("1", 18),  // minStake (1 BLOCKS)
      ethers.parseUnits("1000000", 18), // maxStake (1M BLOCKS)
      10000,                // rewardMultiplier (100%)
      500                   // emergencyExitPenalty (5%)
    ),
    // Pool 1: 30-Day Lock (12% APY)
    staking.createPool(
      "30-Day Lock",
      30 * 24 * 60 * 60,    // lockPeriod (30 days in seconds)
      1200,                 // apyBasisPoints (12%)
      ethers.parseUnits("10", 18),   // minStake (10 BLOCKS)
      ethers.parseUnits("1000000", 18), // maxStake (1M BLOCKS)
      15000,                // rewardMultiplier (150%)
      1000                  // emergencyExitPenalty (10%)
    )
  ];

  // Execute pool creations in parallel to save gas
  await Promise.all(poolCreations.map(tx => tx.wait()));
  console.log("✅ Essential staking pools created (2 pools)");

  // Update deployment configuration
  const updatedDeployment = {
    ...existingDeployment,
    staking: stakingAddr,
    stakingDeployedAt: Date.now(),
    stakingDeployer: deployer.address
  };

  // Save updated deployment
  fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
  console.log("\n📝 Updated deployment configuration");

  console.log("\n🎉 BLOCKSStakingV2 deployment completed!");
  console.log("Staking Contract:", stakingAddr);
  console.log("Pools created: 2 (Flexible, 30-Day) - Additional pools can be added later");
  
  // Display pool information
  console.log("\n📊 Staking Pools Created:");
  for (let i = 0; i < 2; i++) {
    const pool = await staking.pools(i);
    console.log(`Pool ${i}: ${pool.name}`);
    console.log(`  - Lock Period: ${pool.lockPeriod} seconds (${pool.lockPeriod / (24 * 60 * 60)} days)`);
    console.log(`  - APY: ${pool.apyBasisPoints / 100}%`);
    console.log(`  - Min Stake: ${ethers.formatUnits(pool.minStake, 18)} BLOCKS`);
    console.log(`  - Max Stake: ${ethers.formatUnits(pool.maxStake, 18)} BLOCKS`);
    console.log(`  - Active: ${pool.isActive}`);
    console.log("");
  }

  console.log("\n🔧 Next Steps:");
  console.log("1. Update your .env file with VITE_STAKING_ADDRESS=" + stakingAddr);
  console.log("2. Set VITE_STAKING_ENABLED=true in your .env file");
  console.log("3. Fund the staking contract with USDT for rewards");
  console.log("4. Test the staking functionality in the frontend");
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
