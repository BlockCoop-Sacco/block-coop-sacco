const fs = require("fs");
const path = require("path");

/**
 * Script to extract ABIs for BlockCoop V3 contracts and update frontend
 */

async function main() {
  console.log("🔄 Updating frontend ABIs for BlockCoop V3...");
  
  const contracts = [
    {
      name: "PackageManagerV2_1",
      artifactPath: "../artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json",
      frontendPath: "../src/abi/PackageManager.json"
    },
    {
      name: "BLOCKS",
      artifactPath: "../artifacts/contracts/BlockCoopV2.sol/BLOCKS.json",
      frontendPath: "../src/abi/ShareToken.json" // Keep same filename for compatibility
    },
    {
      name: "BLOCKS_LP",
      artifactPath: "../artifacts/contracts/BlockCoopV2.sol/BLOCKS_LP.json",
      frontendPath: "../src/abi/LPToken.json" // Keep same filename for compatibility
    },
    {
      name: "VestingVault",
      artifactPath: "../artifacts/contracts/BlockCoopV2.sol/VestingVault.json",
      frontendPath: "../src/abi/VestingVault.json"
    },
    {
      name: "SwapTaxManager",
      artifactPath: "../artifacts/contracts/BlockCoopV2.sol/SwapTaxManager.json",
      frontendPath: "../src/abi/SwapTaxManager.json"
    }
  ];

  for (const contract of contracts) {
    console.log(`\n📋 Processing ${contract.name}...`);
    
    const artifactPath = path.resolve(__dirname, contract.artifactPath);
    const frontendPath = path.resolve(__dirname, contract.frontendPath);
    
    if (!fs.existsSync(artifactPath)) {
      console.log(`⚠️  Artifact not found: ${artifactPath}`);
      console.log(`   Skipping ${contract.name}...`);
      continue;
    }
    
    // Read and parse the artifact
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;
    
    console.log(`   📄 Extracted ABI with ${abi.length} functions/events`);
    
    // Create backup of old ABI if it exists
    if (fs.existsSync(frontendPath)) {
      const backupPath = frontendPath.replace('.json', '.old.json');
      const oldAbi = fs.readFileSync(frontendPath, 'utf8');
      fs.writeFileSync(backupPath, oldAbi);
      console.log(`   📦 Backed up old ABI: ${path.basename(backupPath)}`);
    }
    
    // Write the new ABI to frontend
    fs.writeFileSync(frontendPath, JSON.stringify(abi, null, 2));
    console.log(`   ✅ Updated frontend ABI: ${path.basename(frontendPath)}`);
    
    // Check for key functions for PackageManager
    if (contract.name === "PackageManagerV2_1") {
      const keyFunctions = [
        'getUserStats', 
        'getUserPackages', 
        'getUserPackageCount', 
        'getPackagesByOwner',
        'setUsdtToBlocksRate',
        'usdtToBlocksRateBps'
      ];
      const foundFunctions = [];
      
      for (const item of abi) {
        if (item.type === 'function' && keyFunctions.includes(item.name)) {
          foundFunctions.push(item.name);
        }
      }
      
      console.log(`   🔍 Found key functions: ${foundFunctions.join(', ')}`);
      
      if (foundFunctions.length !== keyFunctions.length) {
        const missing = keyFunctions.filter(f => !foundFunctions.includes(f));
        console.log(`   ⚠️  Missing functions: ${missing.join(', ')}`);
      }
    }
  }

  console.log("\n✅ Frontend ABI update completed!");
  console.log("\n🔄 Next Steps:");
  console.log("1. Update .env file with new contract addresses from deployments-v3-blocks.json");
  console.log("2. Test frontend integration with new contracts");
  console.log("3. Update any hardcoded references to ShareToken/LPToken in frontend code");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ABI update failed:", error);
    process.exit(1);
  });
