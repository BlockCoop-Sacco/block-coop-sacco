const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Granting MINTER_ROLE to deployer for testing...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Granting role with account:", deployer.address);

  // Load deployment data
  const deployFile = "deployments/deployments-enhanced-blocks.json";
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Enhanced BLOCKS deployment file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  
  console.log("📍 Using Enhanced BLOCKS:", data.contracts.BLOCKS);
  
  // Get contract instance
  const blocks = await ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);
  
  // Grant MINTER_ROLE to deployer for testing
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  
  console.log("🔧 Granting MINTER_ROLE to deployer...");
  const tx = await blocks.grantRole(MINTER_ROLE, deployer.address);
  await tx.wait();
  console.log("✅ MINTER_ROLE granted to deployer");
  
  // Verify the role was granted
  const hasRole = await blocks.hasRole(MINTER_ROLE, deployer.address);
  console.log(`🔍 Verification - Deployer has MINTER_ROLE: ${hasRole}`);
  
  console.log("\n🎉 Role granted successfully! You can now run tests.");
}

main().catch((error) => {
  console.error("\n❌ Role granting failed:");
  console.error(error);
  process.exit(1);
});
