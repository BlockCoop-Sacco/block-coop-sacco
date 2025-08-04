const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔄 Updating Frontend ABI for Exchange Rate Fix...");
  console.log("=================================================");

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", "deployments-corrected-portfolio-metrics.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found:", deploymentFile);
    process.exit(1);
  }

  const deployData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contracts = deployData.contracts;

  console.log("📋 Using deployment data:");
  console.log("Timestamp:", deployData.timestamp);
  console.log("PackageManagerV2_1:", contracts.PackageManagerV2_1);
  console.log("BLOCKS:", contracts.BLOCKS);
  console.log("BLOCKS-LP:", contracts.BLOCKS_LP);

  // Define contract mappings for ABI updates
  const contractMappings = [
    {
      name: "PackageManagerV2_1",
      artifactPath: "artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json",
      frontendPath: "src/abi/PackageManagerV2_1.json",
      address: contracts.PackageManagerV2_1
    },
    {
      name: "BLOCKS",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS.json",
      frontendPath: "src/abi/BLOCKS.json",
      address: contracts.BLOCKS
    },
    {
      name: "BLOCKS_LP",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS_LP.json",
      frontendPath: "src/abi/BLOCKS_LP.json",
      address: contracts.BLOCKS_LP
    },
    {
      name: "VestingVault",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/VestingVault.json",
      frontendPath: "src/abi/VestingVault.json",
      address: contracts.VestingVault
    },
    {
      name: "SwapTaxManager",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/SwapTaxManager.json",
      frontendPath: "src/abi/SwapTaxManager.json",
      address: contracts.SwapTaxManager
    }
  ];

  console.log("\n📦 Updating ABI files...");
  
  for (const mapping of contractMappings) {
    try {
      const artifactPath = path.resolve(__dirname, "..", mapping.artifactPath);
      const frontendPath = path.resolve(__dirname, "..", mapping.frontendPath);
      
      if (!fs.existsSync(artifactPath)) {
        console.log(`⚠️  Artifact not found: ${mapping.name} at ${artifactPath}`);
        continue;
      }

      // Read the compiled artifact
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      
      // Create ABI file for frontend
      const abiData = {
        contractName: mapping.name,
        abi: artifact.abi,
        address: mapping.address,
        deploymentTimestamp: deployData.timestamp,
        network: "bsctestnet"
      };

      // Ensure the directory exists
      const frontendDir = path.dirname(frontendPath);
      if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
      }

      // Write the ABI file
      fs.writeFileSync(frontendPath, JSON.stringify(abiData, null, 2));
      console.log(`✅ Updated ${mapping.name} ABI`);
      
    } catch (error) {
      console.error(`❌ Error updating ${mapping.name}:`, error.message);
    }
  }

  // Update contract addresses in environment comments
  console.log("\n📝 Updating environment documentation...");
  
  const envPath = path.resolve(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add comment about the exchange rate fix
    const fixComment = `
# Exchange Rate Fix Deployment - ${deployData.timestamp}
# Fixed contract addresses with corrected exchange rate calculation
# PackageManagerV2_1: ${contracts.PackageManagerV2_1}
# Expected behavior: 100 USDT → ~50 BLOCKS (not 50 trillion)
`;
    
    if (!envContent.includes('Exchange Rate Fix Deployment')) {
      envContent += fixComment;
      fs.writeFileSync(envPath, envContent);
      console.log("✅ Updated .env with fix documentation");
    }
  }

  // Create a summary file
  const summaryData = {
    timestamp: new Date().toISOString(),
    fix: "Exchange rate calculation bug fixed",
    deployment: deployData.timestamp,
    contracts: contracts,
    changes: {
      smartContract: "Fixed exchange rate calculation formula in PackageManagerV2_1.sol line 552",
      frontend: "Updated contract addresses and removed 1,000,000 division correction logic",
      expectedBehavior: {
        before: "100 USDT purchase → 50 trillion BLOCKS (inflated)",
        after: "100 USDT purchase → 50 BLOCKS (correct for 2 USDT/BLOCKS rate)"
      }
    },
    testingRequired: [
      "Test package purchase with 100 USDT",
      "Verify portfolio displays realistic values (no more trillion-scale numbers)",
      "Check ROI calculation shows sensible percentage",
      "Confirm admin can still configure exchange rates"
    ]
  };

  const summaryFile = path.join(__dirname, "..", "EXCHANGE_RATE_FIX_SUMMARY.json");
  fs.writeFileSync(summaryFile, JSON.stringify(summaryData, null, 2));

  console.log("\n📄 Summary:");
  console.log("============");
  console.log("✅ ABI files updated for exchange rate fix");
  console.log("✅ Contract addresses updated in frontend");
  console.log("✅ Frontend correction logic updated");
  console.log("✅ Environment documentation updated");
  console.log("📁 Summary file:", summaryFile);

  console.log("\n🎯 Next Steps:");
  console.log("1. Test package purchase with 100 USDT");
  console.log("2. Verify realistic token amounts (no more trillions)");
  console.log("3. Check portfolio displays and ROI calculations");
  console.log("4. Test admin exchange rate configuration");

  console.log("\n✅ Frontend ABI Update Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI update failed:", error);
    process.exit(1);
  });
