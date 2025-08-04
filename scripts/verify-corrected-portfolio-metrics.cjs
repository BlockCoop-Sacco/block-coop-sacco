const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verifying Corrected PackageManagerV2_1 Contract...");

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", "deployments-corrected-portfolio-metrics.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run deploy-corrected-portfolio-metrics.cjs first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const packageManagerAddress = deploymentInfo.contracts.PackageManagerV2_1;
  const constructorArgs = deploymentInfo.constructorArgs;

  console.log("Contract address:", packageManagerAddress);
  console.log("Network:", deploymentInfo.network);

  try {
    console.log("\n📋 Verifying PackageManagerV2_1...");
    
    await hre.run("verify:verify", {
      address: packageManagerAddress,
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
          address: packageManagerAddress,
          verified: true,
          constructorArgs: constructorArgs
        }
      },
      fix: "Portfolio metrics inflation bug - treasury allocation excluded from user stats"
    };

    const verificationFile = path.join(__dirname, "..", "deployments", "verification-corrected-portfolio-metrics.json");
    fs.writeFileSync(verificationFile, JSON.stringify(verificationInfo, null, 2));
    console.log(`\n📄 Verification info saved to: ${verificationFile}`);

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    
    // Save failed verification attempt
    const verificationInfo = {
      timestamp: new Date().toISOString(),
      network: hre.network.name,
      contracts: {
        PackageManagerV2_1: {
          address: packageManagerAddress,
          verified: false,
          error: error.message,
          constructorArgs: constructorArgs
        }
      },
      fix: "Portfolio metrics inflation bug - treasury allocation excluded from user stats"
    };

    const verificationFile = path.join(__dirname, "..", "deployments", "verification-corrected-portfolio-metrics.json");
    fs.writeFileSync(verificationFile, JSON.stringify(verificationInfo, null, 2));
    console.log(`\n📄 Verification attempt saved to: ${verificationFile}`);
    
    process.exit(1);
  }

  console.log("\n✅ Verification completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
