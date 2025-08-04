const fs = require("fs");
const path = require("path");

/**
 * Script to extract PackageManagerV2_1 ABI and update frontend
 */

async function main() {
  console.log("🔄 Updating frontend ABI for PackageManagerV2_1...");
  
  // Read the compiled artifact
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json");
  const frontendAbiPath = path.resolve(__dirname, "../src/abi/PackageManager.json");
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }
  
  // Read and parse the artifact
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  
  console.log(`📋 Extracted ABI with ${abi.length} functions/events`);
  
  // Check for key functions
  const keyFunctions = ['getUserStats', 'getUserPackages', 'getUserPackageCount', 'getPackagesByOwner'];
  const foundFunctions = [];
  
  for (const item of abi) {
    if (item.type === 'function' && keyFunctions.includes(item.name)) {
      foundFunctions.push(item.name);
    }
  }
  
  console.log(`✅ Found enhanced functions: ${foundFunctions.join(', ')}`);
  
  // Write the ABI to frontend
  fs.writeFileSync(frontendAbiPath, JSON.stringify(abi, null, 2));
  console.log(`✅ Updated frontend ABI: ${frontendAbiPath}`);
  
  // Also create a backup of the old ABI
  const backupPath = path.resolve(__dirname, "../src/abi/PackageManager.old.json");
  if (fs.existsSync(frontendAbiPath)) {
    const oldAbi = fs.readFileSync(frontendAbiPath, 'utf8');
    fs.writeFileSync(backupPath, oldAbi);
    console.log(`📦 Backed up old ABI: ${backupPath}`);
  }
  
  console.log("\n🎉 Frontend ABI update completed!");
  console.log("🔗 Next steps:");
  console.log("1. Restart the development server");
  console.log("2. Test the portfolio page");
  console.log("3. Verify enhanced functions are working");
}

main().catch(err => {
  console.error("\n❌ ABI update failed:");
  console.error(err);
  process.exit(1);
});
