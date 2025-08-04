const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔄 Updating frontend ABIs for Fresh BlockCoop V2...");

  // Load deployment data
  const deployFile = path.resolve(__dirname, "../deployments/deployments-fresh-v2.json");
  if (!fs.existsSync(deployFile)) {
    console.error("❌ Deployment file not found:", deployFile);
    process.exit(1);
  }

  const deployData = JSON.parse(fs.readFileSync(deployFile));
  console.log("📋 Loaded deployment data from:", deployFile);

  // Define contract mappings
  const contractMappings = [
    {
      name: "PackageManagerV2_1",
      artifactPath: "artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json",
      frontendPath: "src/abi/PackageManager.json",
      address: deployData.contracts.PackageManagerV2_1_Sustainable || deployData.contracts.PackageManagerV2_1
    },
    {
      name: "BLOCKS",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS.json",
      frontendPath: "src/abi/ShareToken.json",
      address: deployData.contracts.BLOCKS
    },
    {
      name: "BLOCKS_LP",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS_LP.json",
      frontendPath: "src/abi/LPToken.json",
      address: deployData.contracts["BLOCKS-LP"]
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

  // Process each contract
  for (const contract of contractMappings) {
    console.log(`\n📋 Processing ${contract.name}...`);
    
    try {
      // Read artifact
      const artifactPath = path.resolve(__dirname, "..", contract.artifactPath);
      if (!fs.existsSync(artifactPath)) {
        console.log(`   ⚠️  Artifact not found: ${artifactPath}`);
        continue;
      }

      const artifact = JSON.parse(fs.readFileSync(artifactPath));
      const abi = artifact.abi;

      console.log(`   📄 Extracted ABI with ${abi.length} functions/events`);

      // Backup old ABI if it exists
      const frontendPath = path.resolve(__dirname, "..", contract.frontendPath);
      if (fs.existsSync(frontendPath)) {
        const backupPath = frontendPath.replace('.json', '.old.json');
        fs.copyFileSync(frontendPath, backupPath);
        console.log(`   📦 Backed up old ABI: ${path.basename(backupPath)}`);
      }

      // Create frontend ABI structure
      const frontendAbi = {
        abi: abi,
        address: contract.address,
        contractName: contract.name,
        deploymentInfo: {
          network: deployData.network,
          chainId: deployData.chainId,
          timestamp: deployData.timestamp,
          version: deployData.version
        }
      };

      // Write new ABI
      fs.writeFileSync(frontendPath, JSON.stringify(frontendAbi, null, 2));
      console.log(`   ✅ Updated frontend ABI: ${path.basename(frontendPath)}`);

      // Check for key functions
      const functionNames = abi
        .filter(item => item.type === 'function')
        .map(item => item.name);

      if (contract.name === "PackageManagerV2_1") {
        const keyFunctions = ['addPackage', 'purchase', 'getPackage', 'getPackageIds'];
        const foundFunctions = keyFunctions.filter(fn => functionNames.includes(fn));
        console.log(`   🔍 Found key functions: ${foundFunctions.join(', ')}`);
        
        // Check for per-package exchange rate support
        const hasExchangeRate = abi.some(item => 
          item.type === 'function' && 
          item.name === 'addPackage' && 
          item.inputs && 
          item.inputs.some(input => input.name === 'exchangeRateBps')
        );
        
        if (hasExchangeRate) {
          console.log(`   ✅ Per-package exchange rate support confirmed`);
        } else {
          console.log(`   ❌ Per-package exchange rate support NOT found`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error processing ${contract.name}:`, error.message);
    }
  }

  console.log("\n✅ Frontend ABI update completed!");

  console.log("\n🔄 Next Steps:");
  console.log("1. Restart the frontend development server");
  console.log("2. Test package creation with different exchange rates");
  console.log("3. Test purchase flow with the new contracts");
  console.log("4. Verify all frontend functionality works correctly");

  console.log("\n📋 Updated Contract Addresses:");
  console.log(`BLOCKS: ${deployData.contracts.BLOCKS}`);
  console.log(`BLOCKS-LP: ${deployData.contracts["BLOCKS-LP"]}`);
  console.log(`VestingVault: ${deployData.contracts.VestingVault}`);
  console.log(`SwapTaxManager: ${deployData.contracts.SwapTaxManager}`);
  console.log(`PackageManagerV2_1 (Sustainable): ${deployData.contracts.PackageManagerV2_1_Sustainable || deployData.contracts.PackageManagerV2_1}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI update failed:", error);
    process.exit(1);
  });
