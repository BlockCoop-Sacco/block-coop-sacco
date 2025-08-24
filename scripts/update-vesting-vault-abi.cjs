const fs = require("fs");
const path = require("path");

/**
 * Script to extract VestingVault ABI from BlockCoopV2.sol and update frontend
 */

async function main() {
  console.log("🔄 Updating frontend ABI for VestingVault...");
  
  // Read the compiled artifact for BlockCoopV2
  const artifactPath = path.resolve(__dirname, "../artifacts/contracts/BlockCoopV2.sol/VestingVault.json");
  const frontendAbiPath = path.resolve(__dirname, "../src/abi/VestingVault.json");
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }
  
  // Read and parse the artifact
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  
  console.log(`📋 Extracted VestingVault ABI with ${abi.length} functions/events`);
  
  // Check for key functions
  const keyFunctions = ['totalLocked', 'released', 'vestedAmount', 'userSchedule', 'claim'];
  const foundFunctions = [];
  
  for (const item of abi) {
    if (item.type === 'function' && keyFunctions.includes(item.name)) {
      foundFunctions.push(item.name);
    }
  }
  
  console.log(`✅ Found required functions: ${foundFunctions.join(', ')}`);
  
  // Create backup of old ABI
  if (fs.existsSync(frontendAbiPath)) {
    const backupPath = path.resolve(__dirname, "../src/abi/VestingVault.old.json");
    const oldAbi = fs.readFileSync(frontendAbiPath, 'utf8');
    fs.writeFileSync(backupPath, oldAbi);
    console.log(`📦 Backed up old ABI: ${backupPath}`);
  }
  
  // Write the ABI to frontend
  fs.writeFileSync(frontendAbiPath, JSON.stringify(abi, null, 2));
  console.log(`✅ Updated frontend ABI: ${frontendAbiPath}`);
  
  console.log("\n🎉 VestingVault ABI update completed!");
  console.log("🔗 The VestingVault contract interface is now synchronized.");
}

main().catch(err => {
  console.error("\n❌ VestingVault ABI update failed:");
  console.error(err);
  process.exit(1);
});
