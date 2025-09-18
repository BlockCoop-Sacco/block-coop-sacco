const { ethers, network } = require("hardhat");

async function main() {
  console.log("🔍 Verifying staking pools");
  console.log("Network:", network.name);

  const contractAddress = '0xf30c5bc030C31e28a56ea18F74c78718783d7e6e';
  console.log("Contract Address:", contractAddress);

  try {
    const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
    const staking = StakingV2.attach(contractAddress);

    const poolCount = await staking.poolCount();
    console.log("Pool Count:", poolCount.toString());

    // Display pool information
    console.log("\n📋 Staking Pools:");
    for (let i = 0; i < poolCount; i++) {
      const pool = await staking.stakingPools(i);
      console.log(`Pool ${i}: ${pool.name}`);
      console.log(`  - Lock Period: ${pool.lockPeriod} seconds (${Number(pool.lockPeriod) / (24 * 60 * 60)} days)`);
      console.log(`  - APY: ${Number(pool.apyBasisPoints) / 100}%`);
      console.log(`  - Min Stake: ${ethers.formatUnits(pool.minStake, 18)} BLOCKS`);
      console.log(`  - Max Stake: ${ethers.formatUnits(pool.maxStake, 18)} BLOCKS`);
      console.log(`  - Active: ${pool.isActive}`);
      console.log("");
    }

    console.log("🎉 All pools verified successfully!");

  } catch (error) {
    console.error("❌ Error verifying pools:", error.message);
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
