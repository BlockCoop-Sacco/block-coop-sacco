const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying Complete BlockCoop System on BSCScan...");

  // Load deployment data
  const data = JSON.parse(fs.readFileSync("deployments/deployments-stable-lp-fresh.json", "utf8"));
  
  console.log("📋 Contracts to verify:");
  console.log("- SwapTaxManager:", data.contracts.SwapTaxManager);
  console.log("- BLOCKS:", data.contracts.BLOCKS);
  console.log("- BLOCKS-LP:", data.contracts.BLOCKS_LP);
  console.log("- VestingVault:", data.contracts.VestingVault);
  console.log("- PackageManagerV2_1:", data.contracts.PackageManagerV2_1);

  const verificationResults = {};

  try {
    console.log("\n🔍 Verifying SwapTaxManager...");
    await hre.run("verify:verify", {
      address: data.contracts.SwapTaxManager,
      constructorArguments: [
        data.deployer
      ],
      contract: "contracts/BlockCoopV2.sol:SwapTaxManager"
    });
    console.log("✅ SwapTaxManager verified successfully!");
    verificationResults.SwapTaxManager = "SUCCESS";
  } catch (error) {
    console.error("❌ SwapTaxManager verification failed:", error.message);
    verificationResults.SwapTaxManager = "FAILED: " + error.message;
  }

  try {
    console.log("\n🔍 Verifying BLOCKS token...");
    await hre.run("verify:verify", {
      address: data.contracts.BLOCKS,
      constructorArguments: [
        "BLOCKS",
        "BLOCKS", 
        data.deployer,
        data.contracts.SwapTaxManager
      ],
      contract: "contracts/BlockCoopV2.sol:BLOCKS"
    });
    console.log("✅ BLOCKS token verified successfully!");
    verificationResults.BLOCKS = "SUCCESS";
  } catch (error) {
    console.error("❌ BLOCKS verification failed:", error.message);
    verificationResults.BLOCKS = "FAILED: " + error.message;
  }

  try {
    console.log("\n🔍 Verifying BLOCKS-LP token...");
    await hre.run("verify:verify", {
      address: data.contracts.BLOCKS_LP,
      constructorArguments: [
        "BLOCKS-LP",
        "BLOCKS-LP",
        data.deployer
      ],
      contract: "contracts/BlockCoopV2.sol:BLOCKS_LP"
    });
    console.log("✅ BLOCKS-LP token verified successfully!");
    verificationResults.BLOCKS_LP = "SUCCESS";
  } catch (error) {
    console.error("❌ BLOCKS-LP verification failed:", error.message);
    verificationResults.BLOCKS_LP = "FAILED: " + error.message;
  }

  try {
    console.log("\n🔍 Verifying VestingVault...");
    await hre.run("verify:verify", {
      address: data.contracts.VestingVault,
      constructorArguments: [
        data.contracts.BLOCKS,
        data.deployer
      ],
      contract: "contracts/BlockCoopV2.sol:VestingVault"
    });
    console.log("✅ VestingVault verified successfully!");
    verificationResults.VestingVault = "SUCCESS";
  } catch (error) {
    console.error("❌ VestingVault verification failed:", error.message);
    verificationResults.VestingVault = "FAILED: " + error.message;
  }

  try {
    console.log("\n🔍 Verifying PackageManagerV2_1...");
    await hre.run("verify:verify", {
      address: data.contracts.PackageManagerV2_1,
      constructorArguments: [
        data.contracts.USDT,
        data.contracts.BLOCKS,
        data.contracts.BLOCKS_LP,
        data.contracts.VestingVault,
        data.contracts.PancakeRouter,
        "0x6725F303b657a9451d8BA641348b6761A6CC7a17", // PancakeFactory
        data.contracts.Treasury,
        data.contracts.SwapTaxManager,
        data.deployer
      ],
      contract: "contracts/PackageManagerV2_1.sol:PackageManagerV2_1"
    });
    console.log("✅ PackageManagerV2_1 verified successfully!");
    verificationResults.PackageManagerV2_1 = "SUCCESS";
  } catch (error) {
    console.error("❌ PackageManagerV2_1 verification failed:", error.message);
    verificationResults.PackageManagerV2_1 = "FAILED: " + error.message;
  }

  // Save verification results
  const verificationFile = "deployments/verification-stable-lp-fresh.json";
  const verificationData = {
    timestamp: new Date().toISOString(),
    network: data.network,
    results: verificationResults
  };
  
  fs.writeFileSync(verificationFile, JSON.stringify(verificationData, null, 2));
  console.log("📄 Verification results saved to:", verificationFile);

  console.log("\n🎉 Verification process completed!");
  console.log("📋 Summary:");
  Object.entries(verificationResults).forEach(([contract, result]) => {
    console.log(`- ${contract}: ${result}`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
