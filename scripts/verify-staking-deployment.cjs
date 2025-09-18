const { ethers, network } = require("hardhat");

async function main() {
  console.log("🔍 Verifying BLOCKSStakingV2 deployment");
  console.log("Network:", network.name);

  const contractAddress = '0xf30c5bc030C31e28a56ea18F74c78718783d7e6e';
  console.log("Contract Address:", contractAddress);

  try {
    const code = await ethers.provider.getCode(contractAddress);
    console.log("Contract Code Length:", code.length);
    console.log("Contract Exists:", code !== '0x');
    
    if (code !== '0x') {
      console.log("✅ Contract deployed successfully!");
      console.log("Contract Address:", contractAddress);
      
      // Try to interact with the contract
      const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
      const staking = StakingV2.attach(contractAddress);
      
      const stakingToken = await staking.stakingToken();
      const rewardToken = await staking.rewardToken();
      const poolCount = await staking.poolCount();
      
      console.log("\n📊 Contract Details:");
      console.log("Staking Token:", stakingToken);
      console.log("Reward Token:", rewardToken);
      console.log("Pool Count:", poolCount.toString());
      
      console.log("\n🎉 Contract is fully functional!");
      
    } else {
      console.log("❌ Contract not found at address");
    }
  } catch (error) {
    console.error("❌ Error verifying contract:", error.message);
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
