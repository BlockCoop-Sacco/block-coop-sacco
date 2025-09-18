const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 BLOCKSStakingV2 deployment with exact gas estimation");
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

  // Deploy BLOCKSStakingV2 with exact gas estimation
  console.log("\n1️⃣ Deploying BLOCKSStakingV2...");
  const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
  
  // Get exact gas estimation
  const deployTx = StakingV2.getDeployTransaction(
    BLOCKS_ADDRESS,
    USDT_ADDRESS,
    deployer.address
  );

  const estimatedGas = await ethers.provider.estimateGas({
    ...deployTx,
    from: deployer.address
  });

  console.log("📊 Gas Estimation:");
  console.log("Estimated Gas Units:", estimatedGas.toString());
  
  // Use the actual minimum required gas (501,330) with 20% buffer
  const minimumGas = 501330n;
  const gasLimit = (minimumGas * 120n) / 100n;
  console.log("Minimum Gas Required:", minimumGas.toString());
  console.log("Gas Limit with buffer:", gasLimit.toString());
  
  // Calculate and display cost
  const gasPrice = await ethers.provider.getFeeData();
  const totalCost = gasLimit * gasPrice.gasPrice;
  const totalCostInBNB = ethers.formatEther(totalCost);
  console.log("Estimated Total Cost:", totalCostInBNB, "BNB");

  const staking = await StakingV2.deploy(
    BLOCKS_ADDRESS,  // stakingToken (BLOCKS)
    USDT_ADDRESS,    // rewardToken (USDT)
    deployer.address, // admin
    {
      gasLimit: gasLimit
    }
  );
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("✅ BLOCKSStakingV2 deployed at:", stakingAddr);

  // Update deployment configuration immediately
  const updatedDeployment = {
    ...existingDeployment,
    staking: stakingAddr,
    stakingDeployedAt: Date.now(),
    stakingDeployer: deployer.address,
    stakingPoolsCreated: 0,
    stakingStatus: "deployed_minimal"
  };

  // Save updated deployment
  fs.writeFileSync(deploymentFile, JSON.stringify(updatedDeployment, null, 2));
  console.log("\n📝 Updated deployment configuration");

  console.log("\n🎉 BLOCKSStakingV2 deployment completed!");
  console.log("Staking Contract:", stakingAddr);
  console.log("Status: Contract deployed successfully");

  console.log("\n🔧 Next Steps:");
  console.log("1. Update your .env file with VITE_STAKING_ADDRESS=" + stakingAddr);
  console.log("2. Set VITE_STAKING_ENABLED=true in your .env file");
  console.log("3. Fund the staking contract with USDT for rewards");
  console.log("4. Add staking pools using admin functions");
  console.log("5. Grant admin roles as needed");
  
  console.log("\n💡 The staking contract is now deployed and ready for configuration!");
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});
