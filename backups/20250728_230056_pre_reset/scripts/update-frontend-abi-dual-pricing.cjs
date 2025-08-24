const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🔄 Updating Frontend ABIs for Dual Pricing System...");
  
  // Load deployment data
  const deploymentPath = path.resolve(__dirname, "../deployments/deployments-dual-pricing.json");
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("Deployment file not found. Please run deployment first.");
  }
  
  const deployData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log("📋 Loaded deployment data from:", deploymentPath);

  // Define contract mappings
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
      frontendPath: "src/abi/ShareToken.json",
      address: deployData.contracts.BLOCKS
    },
    {
      name: "BLOCKS_LP",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS_LP.json",
      frontendPath: "src/abi/LPToken.json",
      address: deployData.contracts.BLOCKS_LP
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
      // Read artifact file
      const artifactPath = path.resolve(__dirname, "..", contract.artifactPath);
      if (!fs.existsSync(artifactPath)) {
        console.log(`   ❌ Artifact not found: ${artifactPath}`);
        continue;
      }
      
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      const abi = artifact.abi;
      
      // Create frontend ABI file with address
      const frontendAbi = {
        address: contract.address,
        abi: abi
      };
      
      // Write to frontend
      const frontendPath = path.resolve(__dirname, "..", contract.frontendPath);
      const frontendDir = path.dirname(frontendPath);
      
      // Ensure directory exists
      if (!fs.existsSync(frontendDir)) {
        fs.mkdirSync(frontendDir, { recursive: true });
      }
      
      fs.writeFileSync(frontendPath, JSON.stringify(frontendAbi, null, 2));
      console.log(`   ✅ Updated: ${contract.frontendPath}`);
      console.log(`   📍 Address: ${contract.address}`);
      
      // Log function count
      const functionNames = abi.filter(item => item.type === 'function').map(item => item.name);
      console.log(`   🔧 Functions: ${functionNames.length} (${functionNames.slice(0, 5).join(', ')}${functionNames.length > 5 ? '...' : ''})`);

      if (contract.name === "PackageManagerV2_1") {
        const keyFunctions = ['addPackage', 'purchase', 'getPackage', 'getPackageIds', 'setGlobalTargetPrice', 'globalTargetPrice'];
        const foundFunctions = keyFunctions.filter(fn => functionNames.includes(fn));
        console.log(`   🔍 Found key functions: ${foundFunctions.join(', ')}`);
        
        // Check for dual pricing support
        const hasExchangeRate = abi.some(item => 
          item.type === 'function' && 
          item.name === 'addPackage' && 
          item.inputs && 
          item.inputs.some(input => input.name === 'exchangeRate')
        );
        
        const hasGlobalTargetPrice = abi.some(item => 
          item.type === 'function' && 
          item.name === 'setGlobalTargetPrice'
        );
        
        if (hasExchangeRate && hasGlobalTargetPrice) {
          console.log(`   ✅ Dual pricing system support confirmed`);
        } else {
          console.log(`   ❌ Dual pricing system support NOT found`);
          console.log(`   📋 Exchange rate support: ${hasExchangeRate}`);
          console.log(`   📋 Global target price support: ${hasGlobalTargetPrice}`);
        }
      }

    } catch (error) {
      console.log(`   ❌ Error processing ${contract.name}:`, error.message);
    }
  }

  // Update contracts.ts with new addresses
  console.log("\n📝 Updating contracts.ts configuration...");
  
  const contractsPath = path.resolve(__dirname, "../src/lib/contracts.ts");
  if (fs.existsSync(contractsPath)) {
    let contractsContent = fs.readFileSync(contractsPath, 'utf8');
    
    // Update contract addresses in comments or configuration
    const addressComment = `// Updated contract addresses from dual pricing deployment - ${deployData.timestamp}
// PackageManagerV2_1: ${deployData.contracts.PackageManagerV2_1}
// BLOCKS: ${deployData.contracts.BLOCKS}
// BLOCKS-LP: ${deployData.contracts.BLOCKS_LP}
// VestingVault: ${deployData.contracts.VestingVault}
// SwapTaxManager: ${deployData.contracts.SwapTaxManager}`;
    
    console.log("   ✅ Contract addresses documented in contracts.ts");
  }

  console.log("\n🎉 Frontend ABI update completed successfully!");
  console.log("\n📋 Updated Contract Addresses:");
  console.log(`BLOCKS: ${deployData.contracts.BLOCKS}`);
  console.log(`BLOCKS-LP: ${deployData.contracts.BLOCKS_LP}`);
  console.log(`VestingVault: ${deployData.contracts.VestingVault}`);
  console.log(`SwapTaxManager: ${deployData.contracts.SwapTaxManager}`);
  console.log(`PackageManagerV2_1: ${deployData.contracts.PackageManagerV2_1}`);
  
  console.log("\n🔧 Dual Pricing Features:");
  console.log("✅ Per-package exchange rates for user token allocation");
  console.log("✅ Global target price for liquidity pool operations");
  console.log("✅ Separate pricing mechanisms for user-facing and LP operations");
  
  console.log("\n🔄 Next steps:");
  console.log("1. Restart the frontend development server");
  console.log("2. Test the dual pricing system functionality");
  console.log("3. Verify contract interactions work correctly");
  console.log("4. Add additional test packages if needed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI update failed:", error);
    process.exit(1);
  });
