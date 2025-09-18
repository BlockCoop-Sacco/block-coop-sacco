const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🏊 Creating staking pools for BLOCKSStakingV2");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const contractAddress = '0xf30c5bc030C31e28a56ea18F74c78718783d7e6e';
  console.log("Contract Address:", contractAddress);

  try {
    const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
    const staking = StakingV2.attach(contractAddress);

    // Check if deployer has POOL_MANAGER_ROLE
    const POOL_MANAGER_ROLE = await staking.POOL_MANAGER_ROLE();
    const hasRole = await staking.hasRole(POOL_MANAGER_ROLE, deployer.address);
    console.log("Has POOL_MANAGER_ROLE:", hasRole);

    if (!hasRole) {
      console.log("❌ Deployer doesn't have POOL_MANAGER_ROLE");
      return;
    }

    console.log("\n🏊 Creating staking pools...");

    // Pool 1: Flexible Staking (0 lock period, 8% APY)
    console.log("Creating Pool 1: Flexible Staking...");
    const tx1 = await staking.createPool(
      "Flexible Staking",
      0,                    // lockPeriod (0 = no lock)
      800,                  // apyBasisPoints (8%)
      ethers.parseUnits("1", 18),  // minStake (1 BLOCKS)
      ethers.parseUnits("1000000", 18), // maxStake (1M BLOCKS)
      10000,                // rewardMultiplier (100%)
      0                     // emergencyExitPenalty (0%)
    );
    await tx1.wait();
    console.log("✅ Pool 1 created");

    // Pool 2: 30-Day Lock (12% APY)
    console.log("Creating Pool 2: 30-Day Lock...");
    const tx2 = await staking.createPool(
      "30-Day Lock",
      30 * 24 * 60 * 60,    // lockPeriod (30 days in seconds)
      1200,                 // apyBasisPoints (12%)
      ethers.parseUnits("10", 18),   // minStake (10 BLOCKS)
      ethers.parseUnits("1000000", 18), // maxStake (1M BLOCKS)
      11500,                // rewardMultiplier (115%)
      500                   // emergencyExitPenalty (5%)
    );
    await tx2.wait();
    console.log("✅ Pool 2 created");

    // Pool 3: 90-Day Lock (18% APY)
    console.log("Creating Pool 3: 90-Day Lock...");
    const tx3 = await staking.createPool(
      "90-Day Lock",
      90 * 24 * 60 * 60,    // lockPeriod (90 days in seconds)
      1800,                 // apyBasisPoints (18%)
      ethers.parseUnits("50", 18),   // minStake (50 BLOCKS)
      ethers.parseUnits("1000000", 18), // maxStake (1M BLOCKS)
      13000,                // rewardMultiplier (130%)
      1000                  // emergencyExitPenalty (10%)
    );
    await tx3.wait();
    console.log("✅ Pool 3 created");

    // Pool 4: 1-Year Lock (25% APY)
    console.log("Creating Pool 4: 1-Year Lock...");
    const tx4 = await staking.createPool(
      "1-Year Lock",
      365 * 24 * 60 * 60,   // lockPeriod (1 year in seconds)
      2500,                 // apyBasisPoints (25%)
      ethers.parseUnits("100", 18),  // minStake (100 BLOCKS)
      ethers.parseUnits("1000000", 18), // maxStake (1M BLOCKS)
      15000,                // rewardMultiplier (150%)
      2000                  // emergencyExitPenalty (20%)
    );
    await tx4.wait();
    console.log("✅ Pool 4 created");

    // Verify pools were created
    const poolCount = await staking.poolCount();
    console.log("\n📊 Final Pool Count:", poolCount.toString());

    // Display pool information
    console.log("\n📋 Staking Pools Created:");
    for (let i = 0; i < poolCount; i++) {
      const pool = await staking.stakingPools(i);
      console.log(`Pool ${i}: ${pool.name}`);
      console.log(`  - Lock Period: ${pool.lockPeriod} seconds (${pool.lockPeriod / (24 * 60 * 60)} days)`);
      console.log(`  - APY: ${pool.apyBasisPoints / 100}%`);
      console.log(`  - Min Stake: ${ethers.formatUnits(pool.minStake, 18)} BLOCKS`);
      console.log(`  - Max Stake: ${ethers.formatUnits(pool.maxStake, 18)} BLOCKS`);
      console.log(`  - Active: ${pool.isActive}`);
      console.log("");
    }

    // Update deployment configuration
    const deploymentFile = "deployments/deployments-mainnet-v2_2-fixed-1756833373.json";
    let existingDeployment = {};
    
    if (fs.existsSync(deploymentFile)) {
      existingDeployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    }

    const updatedDeployment = {
      ...existingDeployment,
      stakingPoolsCreated: poolCount.toString(),
      stakingStatus: "deployed_with_pools"
    };

    fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
    console.log("📝 Updated deployment configuration");

    console.log("\n🎉 All staking pools created successfully!");
    console.log("The staking contract is now fully functional and ready for use.");

  } catch (error) {
    console.error("❌ Error creating pools:", error.message);
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
