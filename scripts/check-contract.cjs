const { ethers, network } = require("hardhat");

async function main() {
  console.log("🔍 Checking contract deployment status");
  console.log("Network:", network.name);

  const contractAddress = '0xeB92F3f7991891Eb7d1392946A9B3bd9A0C8C0EE';
  console.log("Contract Address:", contractAddress);

  try {
    const code = await ethers.provider.getCode(contractAddress);
    console.log("Contract Code Length:", code.length);
    console.log("Contract Exists:", code !== '0x');
    
    if (code !== '0x') {
      console.log("✅ Contract deployed successfully!");
      console.log("Contract Address:", contractAddress);
      
      // Try to interact with the contract
      try {
        const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
        const staking = StakingV2.attach(contractAddress);
        
        // Try to call a view function
        const stakingToken = await staking.stakingToken();
        const rewardToken = await staking.rewardToken();
        const poolCount = await staking.poolCount();
        
        console.log("\n📊 Contract Details:");
        console.log("Staking Token:", stakingToken);
        console.log("Reward Token:", rewardToken);
        console.log("Pool Count:", poolCount.toString());
        
        console.log("\n🎉 Contract is fully functional!");
        
      } catch (interactionError) {
        console.log("⚠️ Contract deployed but may have issues:");
        console.log("Error:", interactionError.message);
      }
      
    } else {
      console.log("❌ Contract not found at address");
    }
  } catch (error) {
    console.error("❌ Error checking contract:", error.message);
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

