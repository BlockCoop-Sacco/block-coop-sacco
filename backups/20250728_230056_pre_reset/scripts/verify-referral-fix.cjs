const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying PackageManagerV2_1 with Referral Fix on BSCScan...");
  console.log("===============================================================");

  // Load deployment data
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-referral-fix.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Referral fix deployment file not found. Please deploy the contract first.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(deploymentFile));
  const contractAddress = data.contracts.PackageManagerV2_1;
  const constructorArgs = data.constructorArgs;

  console.log("📋 Contract Details:");
  console.log("Address:", contractAddress);
  console.log("Network:", data.network);
  console.log("Version:", data.version);

  try {
    console.log("\n🔍 Verifying PackageManagerV2_1 with referral fix...");
    
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs,
      contract: "contracts/PackageManagerV2_1.sol:PackageManagerV2_1"
    });

    console.log("✅ PackageManagerV2_1 verified successfully!");

    // Save verification results
    const verificationInfo = {
      timestamp: new Date().toISOString(),
      network: hre.network.name,
      contracts: {
        PackageManagerV2_1: {
          address: contractAddress,
          verified: true,
          constructorArgs: constructorArgs,
          fix: "Referral calculation bug - now uses totalUserTokens instead of totalTokens"
        }
      },
      bscscanUrl: `https://testnet.bscscan.com/address/${contractAddress}#code`
    };

    const verificationFile = path.resolve(__dirname, "../deployments/verification-referral-fix.json");
    fs.writeFileSync(verificationFile, JSON.stringify(verificationInfo, null, 2));
    console.log("✅ Verification info saved to:", verificationFile);

  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contract already verified on BSCScan");
    } else {
      console.error("❌ Verification failed:", error.message);
      
      // Save verification data for manual verification
      const manualVerificationData = {
        address: contractAddress,
        constructorArguments: constructorArgs,
        contract: "contracts/PackageManagerV2_1.sol:PackageManagerV2_1",
        timestamp: new Date().toISOString(),
        error: error.message
      };
      
      const manualFile = path.resolve(__dirname, "../deployments/manual-verification-referral-fix.json");
      fs.writeFileSync(manualFile, JSON.stringify(manualVerificationData, null, 2));
      console.log("📝 Manual verification data saved to:", manualFile);
    }
  }

  console.log("\n🎉 Verification process completed!");
  console.log("📝 You can view the contract at:");
  console.log(`   https://testnet.bscscan.com/address/${contractAddress}#code`);
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update frontend .env with new contract address");
  console.log("2. Test referral system functionality");
  console.log("3. Configure packages and tax settings");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
