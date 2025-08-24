const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔄 Updating Frontend ABIs for BlockCoop V2 Complete Modular");
  console.log("=" .repeat(60));

  // Define source and destination paths
  const artifactsDir = path.resolve(__dirname, "../artifacts/contracts");
  const frontendAbiDir = path.resolve(__dirname, "../src/abi");

  // Ensure frontend ABI directory exists
  if (!fs.existsSync(frontendAbiDir)) {
    fs.mkdirSync(frontendAbiDir, { recursive: true });
    console.log("📁 Created frontend ABI directory:", frontendAbiDir);
  }

  // Contract mappings: [artifactPath, frontendFileName]
  const contractMappings = [
    // Core BlockCoop V2 contracts
    ["BlockCoopV2.sol/USDTTestToken.json", "USDTTestToken.json"],
    ["BlockCoopV2.sol/BLOCKS.json", "BLOCKS.json"],
    ["BlockCoopV2.sol/BLOCKS_LP.json", "BLOCKS_LP.json"],
    ["BlockCoopV2.sol/VestingVault.json", "VestingVault.json"],
    ["BlockCoopV2.sol/SwapTaxManager.json", "SwapTaxManager.json"],
    
    // Standalone contracts
    ["PackageManagerV2_1.sol/PackageManagerV2_1.json", "PackageManagerV2_1.json"],
    ["DividendDistributor.sol/DividendDistributor.json", "DividendDistributor.json"],
    ["SecondaryMarket.sol/SecondaryMarket.json", "SecondaryMarket.json"]
  ];

  let successCount = 0;
  let failCount = 0;

  console.log("\n📦 Processing contract ABIs...");

  for (const [artifactPath, frontendFileName] of contractMappings) {
    try {
      const fullArtifactPath = path.join(artifactsDir, artifactPath);
      const frontendFilePath = path.join(frontendAbiDir, frontendFileName);

      // Check if artifact exists
      if (!fs.existsSync(fullArtifactPath)) {
        console.log(`⚠️  Artifact not found: ${artifactPath}`);
        failCount++;
        continue;
      }

      // Read the artifact
      const artifact = JSON.parse(fs.readFileSync(fullArtifactPath, 'utf8'));
      
      // Extract ABI and create frontend-compatible format
      const frontendAbi = {
        contractName: artifact.contractName,
        abi: artifact.abi
      };

      // Write to frontend directory
      fs.writeFileSync(frontendFilePath, JSON.stringify(frontendAbi, null, 2));
      console.log(`✅ Updated: ${frontendFileName}`);
      successCount++;

    } catch (error) {
      console.log(`❌ Failed to process ${artifactPath}:`, error.message);
      failCount++;
    }
  }

  // Load deployment data to update contract addresses
  const deployFile = path.resolve(__dirname, "../deployments/deployments-v2-complete-modular.json");
  
  if (fs.existsSync(deployFile)) {
    console.log("\n🔧 Updating contract addresses...");
    
    const deployData = JSON.parse(fs.readFileSync(deployFile));
    const contracts = deployData.contracts;

    // Create contract addresses file for frontend
    const contractAddresses = {
      network: deployData.network,
      chainId: deployData.chainId,
      timestamp: deployData.timestamp,
      version: deployData.version,
      contracts: {
        // Map deployment names to frontend-expected names
        USDTTestToken: contracts.USDTTestToken,
        BLOCKS: contracts.BLOCKS,
        BLOCKS_LP: contracts["BLOCKS-LP"],
        VestingVault: contracts.VestingVault,
        SwapTaxManager: contracts.SwapTaxManager,
        PackageManagerV2_1: contracts.PackageManagerV2_1,
        DividendDistributor: contracts.DividendDistributor,
        SecondaryMarket: contracts.SecondaryMarket
      },
      externalContracts: deployData.externalContracts,
      configuration: deployData.configuration
    };

    const addressesFile = path.join(frontendAbiDir, "contractAddresses.json");
    fs.writeFileSync(addressesFile, JSON.stringify(contractAddresses, null, 2));
    console.log("✅ Updated contract addresses:", addressesFile);

    // Update .env.example with new addresses
    const envExamplePath = path.resolve(__dirname, "../.env.example");
    if (fs.existsSync(envExamplePath)) {
      let envContent = fs.readFileSync(envExamplePath, 'utf8');
      
      // Update contract addresses in .env.example
      envContent = envContent.replace(/VITE_USDT_ADDRESS=.*/g, `VITE_USDT_ADDRESS=${contracts.USDTTestToken}`);
      envContent = envContent.replace(/VITE_SHARE_ADDRESS=.*/g, `VITE_SHARE_ADDRESS=${contracts.BLOCKS}`);
      envContent = envContent.replace(/VITE_LP_ADDRESS=.*/g, `VITE_LP_ADDRESS=${contracts["BLOCKS-LP"]}`);
      envContent = envContent.replace(/VITE_VAULT_ADDRESS=.*/g, `VITE_VAULT_ADDRESS=${contracts.VestingVault}`);
      envContent = envContent.replace(/VITE_TAX_ADDRESS=.*/g, `VITE_TAX_ADDRESS=${contracts.SwapTaxManager}`);
      envContent = envContent.replace(/VITE_PACKAGE_MANAGER_ADDRESS=.*/g, `VITE_PACKAGE_MANAGER_ADDRESS=${contracts.PackageManagerV2_1}`);
      
      // Add new contract addresses
      if (!envContent.includes('VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=')) {
        envContent += `\nVITE_DIVIDEND_DISTRIBUTOR_ADDRESS=${contracts.DividendDistributor}`;
      } else {
        envContent = envContent.replace(/VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=.*/g, `VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=${contracts.DividendDistributor}`);
      }
      
      if (!envContent.includes('VITE_SECONDARY_MARKET_ADDRESS=')) {
        envContent += `\nVITE_SECONDARY_MARKET_ADDRESS=${contracts.SecondaryMarket}`;
      } else {
        envContent = envContent.replace(/VITE_SECONDARY_MARKET_ADDRESS=.*/g, `VITE_SECONDARY_MARKET_ADDRESS=${contracts.SecondaryMarket}`);
      }

      fs.writeFileSync(envExamplePath, envContent);
      console.log("✅ Updated .env.example with new contract addresses");
    }

  } else {
    console.log("⚠️  Deployment file not found. Contract addresses not updated.");
  }

  console.log("\n📊 ABI Update Summary:");
  console.log(`✅ Successfully updated: ${successCount} ABIs`);
  console.log(`❌ Failed to update: ${failCount} ABIs`);
  console.log(`📁 Frontend ABI directory: ${frontendAbiDir}`);

  if (successCount === contractMappings.length) {
    console.log("\n🎉 All ABIs updated successfully!");
    console.log("\n🔄 Next Steps:");
    console.log("1. Copy .env.example to .env and update with your specific values");
    console.log("2. Update backend .env file with new contract addresses");
    console.log("3. Test frontend integration with new contracts");
    console.log("4. Verify all contract interactions work correctly");
  } else {
    console.log("\n⚠️  Some ABIs failed to update. Please check the errors above.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI update failed:", error);
    process.exit(1);
  });
