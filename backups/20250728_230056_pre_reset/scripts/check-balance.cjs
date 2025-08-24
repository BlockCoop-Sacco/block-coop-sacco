const hre = require("hardhat");

async function main() {
  console.log("💰 Checking Deployment Wallet Balance...");
  console.log("========================================");

  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceEther = hre.ethers.formatEther(balance);
  
  console.log("Wallet Address:", deployer.address);
  console.log("Current Balance:", balanceEther, "tBNB");
  console.log("Network:", hre.network.name);
  
  // Check if balance is sufficient (typical contract deployment costs 0.01-0.03 tBNB)
  const balanceFloat = parseFloat(balanceEther);
  const isEnough = balanceFloat >= 0.01;
  
  console.log("\n📊 Balance Assessment:");
  console.log("Minimum required: ~0.01 tBNB");
  console.log("Current balance:", balanceFloat, "tBNB");
  console.log("Status:", isEnough ? "✅ SUFFICIENT" : "❌ INSUFFICIENT");
  
  if (isEnough) {
    console.log("\n🚀 Ready to proceed with deployment!");
  } else {
    console.log("\n⚠️  Please add more tBNB to the wallet before deployment.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Balance check failed:", error);
    process.exit(1);
  });
