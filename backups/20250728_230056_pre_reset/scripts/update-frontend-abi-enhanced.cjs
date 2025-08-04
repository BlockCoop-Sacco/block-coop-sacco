const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔄 Updating Frontend ABIs for Enhanced Contract...");

  // Load deployment data
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-enhanced-liquidity.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Enhanced deployment file not found!");
    process.exit(1);
  }

  const deployData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
  console.log("📋 Loaded deployment data from:", deploymentFile);
  console.log("🌐 Network:", deployData.network);
  console.log("📅 Deployed at:", deployData.timestamp);

  // Define contract mappings for ABI updates
  const contractMappings = [
    {
      name: "PackageManagerV2_1",
      artifactPath: "artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json",
      frontendPath: "src/abi/PackageManager.json",
      address: deployData.contracts.PackageManagerV2_1
    },
    {
      name: "BLOCKS",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS.json",
      frontendPath: "src/abi/ShareToken.json", // Keep same filename for compatibility
      address: deployData.contracts.BLOCKS
    },
    {
      name: "BLOCKS_LP",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS_LP.json",
      frontendPath: "src/abi/LPToken.json", // Keep same filename for compatibility
      address: deployData.contracts["BLOCKS_LP"] || deployData.contracts.BLOCKS_LP
    },
    {
      name: "VestingVault",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/VestingVault.json",
      frontendPath: "src/abi/VestingVault.json",
      address: deployData.contracts.VestingVault
    },
    {
      name: "SwapTaxManager",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/SwapTaxManager.json",
      frontendPath: "src/abi/SwapTaxManager.json",
      address: deployData.contracts.SwapTaxManager
    }
  ];

  // Update each contract ABI
  for (const contract of contractMappings) {
    console.log(`\n🔧 Processing ${contract.name}...`);
    
    try {
      // Read the compiled artifact
      const artifactPath = path.resolve(__dirname, "..", contract.artifactPath);
      if (!fs.existsSync(artifactPath)) {
        console.log(`   ⚠️  Artifact not found: ${artifactPath}`);
        continue;
      }

      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      
      // Create the frontend ABI file
      const frontendAbi = {
        abi: artifact.abi,
        address: contract.address,
        contractName: contract.name,
        updatedAt: new Date().toISOString(),
        deploymentInfo: {
          network: deployData.network,
          chainId: deployData.chainId,
          version: deployData.version
        }
      };

      // Ensure the frontend abi directory exists
      const frontendPath = path.resolve(__dirname, "..", contract.frontendPath);
      const frontendDir = path.dirname(frontendPath);
      if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
      }

      // Write the ABI file
      fs.writeFileSync(frontendPath, JSON.stringify(frontendAbi, null, 2));
      
      console.log(`   ✅ Updated: ${contract.frontendPath}`);
      console.log(`   📍 Address: ${contract.address}`);
      console.log(`   📊 ABI entries: ${artifact.abi.length}`);

    } catch (error) {
      console.error(`   ❌ Failed to update ${contract.name}:`, error.message);
    }
  }

  // Update the main ABI files that might be used directly
  console.log("\n🔧 Updating additional ABI files...");
  
  try {
    // Update PackageManagerV2_1.json (direct ABI file)
    const pmArtifactPath = path.resolve(__dirname, "../artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json");
    const pmFrontendPath = path.resolve(__dirname, "../src/abi/PackageManagerV2_1.json");
    
    if (fs.existsSync(pmArtifactPath)) {
      const pmArtifact = JSON.parse(fs.readFileSync(pmArtifactPath, 'utf8'));
      const pmAbi = {
        abi: pmArtifact.abi,
        address: deployData.contracts.PackageManagerV2_1,
        contractName: "PackageManagerV2_1",
        updatedAt: new Date().toISOString(),
        features: deployData.features,
        deploymentInfo: {
          network: deployData.network,
          chainId: deployData.chainId,
          version: deployData.version,
          timestamp: deployData.timestamp
        }
      };
      
      fs.writeFileSync(pmFrontendPath, JSON.stringify(pmAbi, null, 2));
      console.log("   ✅ Updated: src/abi/PackageManagerV2_1.json");
    }

    // Update BLOCKS.json (direct ABI file)
    const blocksArtifactPath = path.resolve(__dirname, "../artifacts/contracts/BlockCoopV2.sol/BLOCKS.json");
    const blocksFrontendPath = path.resolve(__dirname, "../src/abi/BLOCKS.json");
    
    if (fs.existsSync(blocksArtifactPath)) {
      const blocksArtifact = JSON.parse(fs.readFileSync(blocksArtifactPath, 'utf8'));
      const blocksAbi = {
        abi: blocksArtifact.abi,
        address: deployData.contracts.BLOCKS,
        contractName: "BLOCKS",
        updatedAt: new Date().toISOString(),
        deploymentInfo: {
          network: deployData.network,
          chainId: deployData.chainId,
          version: deployData.version
        }
      };
      
      fs.writeFileSync(blocksFrontendPath, JSON.stringify(blocksAbi, null, 2));
      console.log("   ✅ Updated: src/abi/BLOCKS.json");
    }

    // Update BLOCKS_LP.json (direct ABI file)
    const blocksLPArtifactPath = path.resolve(__dirname, "../artifacts/contracts/BlockCoopV2.sol/BLOCKS_LP.json");
    const blocksLPFrontendPath = path.resolve(__dirname, "../src/abi/BLOCKS_LP.json");
    
    if (fs.existsSync(blocksLPArtifactPath)) {
      const blocksLPArtifact = JSON.parse(fs.readFileSync(blocksLPArtifactPath, 'utf8'));
      const blocksLPAbi = {
        abi: blocksLPArtifact.abi,
        address: deployData.contracts["BLOCKS_LP"] || deployData.contracts.BLOCKS_LP,
        contractName: "BLOCKS_LP",
        updatedAt: new Date().toISOString(),
        deploymentInfo: {
          network: deployData.network,
          chainId: deployData.chainId,
          version: deployData.version
        }
      };
      
      fs.writeFileSync(blocksLPFrontendPath, JSON.stringify(blocksLPAbi, null, 2));
      console.log("   ✅ Updated: src/abi/BLOCKS_LP.json");
    }

  } catch (error) {
    console.error("   ❌ Failed to update additional ABI files:", error.message);
  }

  // Create a summary file for the frontend team
  console.log("\n📝 Creating frontend update summary...");
  
  const frontendUpdateSummary = {
    timestamp: new Date().toISOString(),
    enhancement: "Enhanced PackageManagerV2_1 with improved liquidity addition",
    contractUpdates: {
      PackageManagerV2_1: {
        previousAddress: deployData.contracts.PackageManagerV2_1_Previous,
        newAddress: deployData.contracts.PackageManagerV2_1,
        changes: [
          "Added slippage protection for liquidity addition",
          "Enhanced error handling with try-catch blocks",
          "New events: LiquidityAdded, LiquidityAdditionFailed, SlippageProtectionTriggered",
          "Configurable slippage tolerance (admin function)",
          "Fallback mechanism for failed liquidity additions"
        ]
      }
    },
    newFeatures: deployData.features,
    abiUpdates: contractMappings.map(c => ({
      contract: c.name,
      abiFile: c.frontendPath,
      address: c.address
    })),
    testingRequired: [
      "Test package purchases with new contract",
      "Verify new liquidity events are emitted",
      "Check portfolio metrics correction works",
      "Test slippage protection under various conditions",
      "Verify fallback mechanism when DEX is unavailable"
    ],
    environmentUpdate: {
      file: ".env",
      variable: "VITE_PACKAGE_MANAGER_ADDRESS",
      newValue: deployData.contracts.PackageManagerV2_1
    }
  };

  const summaryPath = path.resolve(__dirname, "../FRONTEND_ABI_UPDATE_SUMMARY.json");
  fs.writeFileSync(summaryPath, JSON.stringify(frontendUpdateSummary, null, 2));
  console.log("📁 Frontend update summary saved to:", summaryPath);

  console.log("\n🎉 Frontend ABI update completed!");
  console.log("📋 Summary:");
  console.log(`   📦 Contracts updated: ${contractMappings.length}`);
  console.log(`   🌐 Network: ${deployData.network}`);
  console.log(`   📍 New PackageManager: ${deployData.contracts.PackageManagerV2_1}`);
  console.log(`   🔧 Features: ${deployData.features.length} enhancements`);
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Restart the development server");
  console.log("   2. Test package purchases with new contract");
  console.log("   3. Verify portfolio metrics correction");
  console.log("   4. Monitor new liquidity addition events");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI update failed:", error);
    process.exit(1);
  });
