const fs = require("fs");
const path = require("path");

/**
 * Update .env file with new BlockCoop V3 contract addresses
 */

async function main() {
  console.log("🔄 Updating .env file with BlockCoop V3 contract addresses...");
  
  const deployFile = path.resolve(__dirname, "../deployments/deployments-v3-blocks.json");
  const envFile = path.resolve(__dirname, "../.env");
  
  if (!fs.existsSync(deployFile)) {
    throw new Error("Deployment file not found. Please deploy contracts first using deploy-blocks-v3.cjs");
  }
  
  if (!fs.existsSync(envFile)) {
    throw new Error(".env file not found");
  }
  
  const deploymentData = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  console.log("📍 Reading deployment data...");
  console.log("Network:", deploymentData.network);
  console.log("Version:", deploymentData.version);
  
  // Create backup of current .env
  const backupFile = path.resolve(__dirname, "../.env.backup");
  fs.writeFileSync(backupFile, envContent);
  console.log("📦 Backed up current .env to .env.backup");
  
  // Update contract addresses
  let updatedContent = envContent;
  
  const updates = [
    {
      key: "VITE_SHARE_ADDRESS",
      value: deploymentData.contracts.BLOCKS,
      description: "BLOCKS token address"
    },
    {
      key: "VITE_LP_ADDRESS", 
      value: deploymentData.contracts["BLOCKS-LP"],
      description: "BLOCKS-LP token address"
    },
    {
      key: "VITE_VAULT_ADDRESS",
      value: deploymentData.contracts.VestingVault,
      description: "VestingVault address"
    },
    {
      key: "VITE_TAX_ADDRESS",
      value: deploymentData.contracts.SwapTaxManager,
      description: "SwapTaxManager address"
    },
    {
      key: "VITE_PACKAGE_MANAGER_ADDRESS",
      value: deploymentData.contracts.PackageManagerV2_1,
      description: "PackageManagerV2_1 address"
    }
  ];
  
  console.log("\n🔄 Updating environment variables...");
  
  for (const update of updates) {
    const regex = new RegExp(`^${update.key}=.*$`, 'm');
    const newLine = `${update.key}=${update.value}`;
    
    if (regex.test(updatedContent)) {
      updatedContent = updatedContent.replace(regex, newLine);
      console.log(`✅ Updated ${update.key} (${update.description})`);
    } else {
      // Add new line if key doesn't exist
      updatedContent += `\n${newLine}`;
      console.log(`➕ Added ${update.key} (${update.description})`);
    }
  }
  
  // Add comment about V3 deployment
  const timestamp = new Date().toISOString();
  const comment = `\n# BlockCoop V3 deployment - ${timestamp}\n# BLOCKS and BLOCKS-LP tokens with new mechanics\n`;
  
  if (!updatedContent.includes("BlockCoop V3 deployment")) {
    updatedContent += comment;
  }
  
  // Write updated .env file
  fs.writeFileSync(envFile, updatedContent);
  console.log("✅ .env file updated successfully");
  
  console.log("\n📋 Updated Contract Addresses:");
  for (const update of updates) {
    console.log(`${update.description}: ${update.value}`);
  }
  
  console.log("\n👥 Admin Addresses:");
  console.log("Primary Admin:", deploymentData.admins.primary);
  console.log("Additional Admin:", deploymentData.admins.additional);
  
  console.log("\n🔄 Next Steps:");
  console.log("1. Restart your development server to load new environment variables");
  console.log("2. Update frontend ABIs using: npx hardhat run scripts/update-frontend-abi-v3.cjs");
  console.log("3. Test frontend integration with new contracts");
  console.log("4. Update any hardcoded references to ShareToken/LPToken in frontend code");
  
  console.log("\n⚠️  Important Notes:");
  console.log("- Token names changed: ShareToken → BLOCKS, LPToken → BLOCKS-LP");
  console.log("- New exchange rate system: 1 USDT = 0.5 BLOCKS (configurable)");
  console.log("- New token distribution: 70% vesting, 30% liquidity for both USDT and BLOCKS");
  console.log("- BLOCKS-LP tokens minted 1:1 with total BLOCKS amount");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Environment update failed:", error);
    process.exit(1);
  });
