const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying Enhanced PackageManagerV2_1 on BSCScan...");

  // Load deployment data
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-enhanced-liquidity.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please deploy the contract first.");
    process.exit(1);
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  const contractAddress = deploymentData.contracts.PackageManagerV2_1;
  const constructorArgs = deploymentData.constructorArgs;

  console.log("📋 Contract Details:");
  console.log("   Address:", contractAddress);
  console.log("   Network:", deploymentData.network);
  console.log("   Deployed at:", deploymentData.timestamp);

  try {
    console.log("\n🔍 Verifying Enhanced PackageManagerV2_1...");
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
    });
    console.log("✅ Enhanced PackageManagerV2_1 verified successfully!");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract already verified on BSCScan");
    } else {
      console.error("❌ Verification failed:", error.message);
    }
  }

  console.log("\n🎉 Verification process completed!");
  console.log("📝 You can view the contract at:");
  console.log(`   https://testnet.bscscan.com/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
