const { ethers, network } = require("hardhat");

async function main() {
  console.log("⛽ Gas Cost Estimation for Staking Contract Deployment");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInBNB = ethers.formatEther(balance);
  
  console.log("Current Balance:", balanceInBNB, "BNB");
  console.log("Current Balance (wei):", balance.toString());

  // Load contract addresses
  const deploymentFile = "deployments/deployments-mainnet-v2_2-fixed-1756833373.json";
  let existingDeployment = {};
  
  if (require('fs').existsSync(deploymentFile)) {
    existingDeployment = JSON.parse(require('fs').readFileSync(deploymentFile, 'utf8'));
  }

  const USDT_ADDRESS = existingDeployment.usdt || "0x55d398326f99059ff775485246999027b3197955";
  const BLOCKS_ADDRESS = existingDeployment.blocks || "0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31";

  console.log("\n📋 Contract addresses:");
  console.log("USDT:", USDT_ADDRESS);
  console.log("BLOCKS:", BLOCKS_ADDRESS);

  // Get current gas price
  const gasPrice = await ethers.provider.getFeeData();
  console.log("\n⛽ Current Gas Price:", ethers.formatUnits(gasPrice.gasPrice, 'gwei'), "gwei");

  // Estimate gas for contract deployment
  const StakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
  
  try {
    const deployTx = StakingV2.getDeployTransaction(
      BLOCKS_ADDRESS,
      USDT_ADDRESS,
      deployer.address
    );

    const estimatedGas = await ethers.provider.estimateGas({
      ...deployTx,
      from: deployer.address
    });

    console.log("\n📊 Gas Estimation:");
    console.log("Estimated Gas Units:", estimatedGas.toString());
    console.log("Gas Price (wei):", gasPrice.gasPrice.toString());
    
    const totalCost = estimatedGas * gasPrice.gasPrice;
    const totalCostInBNB = ethers.formatEther(totalCost);
    
    console.log("Total Cost (wei):", totalCost.toString());
    console.log("Total Cost (BNB):", totalCostInBNB);
    
    console.log("\n💰 Cost Analysis:");
    console.log("Current Balance:", balanceInBNB, "BNB");
    console.log("Required Cost:", totalCostInBNB, "BNB");
    
    const shortfall = totalCost - balance;
    const shortfallInBNB = ethers.formatEther(shortfall);
    
    if (balance >= totalCost) {
      console.log("✅ Sufficient balance for deployment");
    } else {
      console.log("❌ Insufficient balance");
      console.log("Shortfall:", shortfallInBNB, "BNB");
      console.log("Shortfall (wei):", shortfall.toString());
    }

    // Calculate minimum required balance with buffer
    const buffer = ethers.parseEther("0.0001"); // 0.0001 BNB buffer
    const minimumRequired = totalCost + buffer;
    const minimumRequiredInBNB = ethers.formatEther(minimumRequired);
    
    console.log("\n🎯 Recommended Actions:");
    console.log("1. Send at least", minimumRequiredInBNB, "BNB to deployer address");
    console.log("2. Deployer address:", deployer.address);
    console.log("3. Current shortfall:", shortfallInBNB, "BNB");

  } catch (error) {
    console.error("❌ Error estimating gas:", error.message);
    
    // Fallback estimation
    console.log("\n📊 Fallback Gas Estimation:");
    console.log("Typical contract deployment: ~2,000,000 gas units");
    console.log("Current gas price:", ethers.formatUnits(gasPrice.gasPrice, 'gwei'), "gwei");
    
    const fallbackGas = 2000000n;
    const fallbackCost = fallbackGas * gasPrice.gasPrice;
    const fallbackCostInBNB = ethers.formatEther(fallbackCost);
    
    console.log("Estimated cost:", fallbackCostInBNB, "BNB");
    
    if (balance >= fallbackCost) {
      console.log("✅ Likely sufficient balance for deployment");
    } else {
      const shortfall = fallbackCost - balance;
      const shortfallInBNB = ethers.formatEther(shortfall);
      console.log("❌ Likely insufficient balance");
      console.log("Estimated shortfall:", shortfallInBNB, "BNB");
    }
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

