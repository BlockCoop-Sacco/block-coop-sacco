const { ethers, network } = require("hardhat");

async function main() {
  console.log("💰 Checking deployer balance");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInBNB = ethers.formatEther(balance);
  
  console.log("Balance:", balanceInBNB, "BNB");
  console.log("Balance (wei):", balance.toString());
  
  // Estimate gas cost for staking deployment
  const estimatedGasCost = ethers.parseEther("0.003"); // ~0.003 BNB
  console.log("Estimated gas cost:", ethers.formatEther(estimatedGasCost), "BNB");
  
  if (balance < estimatedGasCost) {
    console.log("❌ Insufficient balance for deployment");
    console.log("Need at least", ethers.formatEther(estimatedGasCost), "BNB");
  } else {
    console.log("✅ Sufficient balance for deployment");
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});

