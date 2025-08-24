const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Validates that an address is not zero and is properly formatted
 * @param {string} address - The address to validate
 * @param {string} name - The name of the address for error reporting
 */
function validateAddress(address, name) {
  if (!address || address === ethers.ZeroAddress || address === "0x0000000000000000000000000000000000000000") {
    throw new Error(`Invalid ${name} address: ${address}`);
  }
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid ${name} address format: ${address}`);
  }
  console.log(`✅ ${name}: ${address}`);
}

/**
 * Validates environment variables required for deployment
 */
function validateEnvironment() {
  const required = [
    'VITE_USDT_ADDRESS',
    'PANCAKE_ROUTER'
  ];

  console.log("🔍 Validating environment variables...");
  for (const envVar of required) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
  console.log("✅ All required environment variables present");
}

async function main() {
  console.log("🚀 Starting PackageManagerV2_1 deployment...");

  // Validate environment first
  validateEnvironment();

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);

  const deployFile = path.resolve(__dirname, "../deployments/deployments.json");

  // Check if deployments file exists
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Deployments file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  const { ShareToken, LPToken, VestingVault, SwapTaxManager } = data.contracts;

  console.log("\n📋 Using existing contract addresses:");
  console.log("ShareToken:", ShareToken);
  console.log("LPToken:", LPToken);
  console.log("VestingVault:", VestingVault);
  console.log("SwapTaxManager:", SwapTaxManager);

  // Get addresses from environment
  const USDT_ADDRESS = process.env.VITE_USDT_ADDRESS;
  const ROUTER_ADDRESS = process.env.PANCAKE_ROUTER;
  const FACTORY_ADDRESS = "0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc"; // PancakeSwap V2 Factory on BSC Testnet
  const TREASURY_ADDRESS = deployer.address; // Using deployer as treasury
  const ADMIN_ADDRESS = deployer.address; // Using deployer as admin

  console.log("\n🔍 Validating all contract addresses...");

  // Validate all addresses
  validateAddress(USDT_ADDRESS, "USDT");
  validateAddress(ShareToken, "ShareToken");
  validateAddress(LPToken, "LPToken");
  validateAddress(VestingVault, "VestingVault");
  validateAddress(ROUTER_ADDRESS, "PancakeRouter");
  validateAddress(FACTORY_ADDRESS, "PancakeFactory");
  validateAddress(TREASURY_ADDRESS, "Treasury");
  validateAddress(SwapTaxManager, "SwapTaxManager");
  validateAddress(ADMIN_ADDRESS, "Admin");

  console.log("\n📦 Deploying PackageManagerV2_1...");

  const PM = await ethers.getContractFactory("PackageManagerV2_1");

  // Deploy with correct parameter order matching the constructor
  const pm = await PM.deploy(
    USDT_ADDRESS,      // usdt_
    ShareToken,        // share_
    LPToken,           // lp_
    VestingVault,      // vault_
    ROUTER_ADDRESS,    // router_
    FACTORY_ADDRESS,   // factory_
    TREASURY_ADDRESS,  // treasury_
    SwapTaxManager,    // tax_
    ADMIN_ADDRESS      // admin
  );
  // Wait for deployment confirmation
  console.log("⏳ Waiting for deployment confirmation...");
  if (typeof pm.waitForDeployment === "function") {
    await pm.waitForDeployment();
  }

  const pmAddress = pm.target ? pm.target : pm.address;
  console.log("✅ PackageManagerV2_1 deployed at:", pmAddress);

  // Verify deployment by calling a view function
  try {
    const deadlineWindow = await pm.deadlineWindow();
    console.log("🔍 Deployment verified - deadline window:", deadlineWindow.toString());
  } catch (error) {
    throw new Error(`Deployment verification failed: ${error.message}`);
  }

  console.log("\n🔐 Granting necessary roles...");

  // Get contract instances
  const share = await ethers.getContractAt("ShareToken", ShareToken, deployer);
  const lp = await ethers.getContractAt("LPToken", LPToken, deployer);
  const vault = await ethers.getContractAt("VestingVault", VestingVault, deployer);

  // Define role constants
  const MINTER_ROLE = ethers.id("MINTER_ROLE");
  const LOCKER_ROLE = ethers.id("LOCKER_ROLE");
  const BURNER_ROLE = ethers.id("BURNER_ROLE");

  try {
    // Grant MINTER_ROLE to PackageManager for ShareToken
    console.log("📝 Granting MINTER_ROLE to PackageManager for ShareToken...");
    const tx1 = await share.grantRole(MINTER_ROLE, pmAddress);
    await tx1.wait();
    console.log("✅ ShareToken MINTER_ROLE granted");

    // Grant MINTER_ROLE and BURNER_ROLE to PackageManager for LPToken
    console.log("📝 Granting MINTER_ROLE to PackageManager for LPToken...");
    const tx2 = await lp.grantRole(MINTER_ROLE, pmAddress);
    await tx2.wait();
    console.log("✅ LPToken MINTER_ROLE granted");

    console.log("📝 Granting BURNER_ROLE to PackageManager for LPToken...");
    const tx3 = await lp.grantRole(BURNER_ROLE, pmAddress);
    await tx3.wait();
    console.log("✅ LPToken BURNER_ROLE granted");

    // Grant LOCKER_ROLE to PackageManager for VestingVault
    console.log("📝 Granting LOCKER_ROLE to PackageManager for VestingVault...");
    const tx4 = await vault.grantRole(LOCKER_ROLE, pmAddress);
    await tx4.wait();
    console.log("✅ VestingVault LOCKER_ROLE granted");

    console.log("🔐 All roles granted successfully!");

  } catch (error) {
    console.error("❌ Error granting roles:", error.message);
    throw error;
  }

  // Verify roles were granted correctly
  console.log("\n🔍 Verifying role assignments...");
  try {
    const hasShareMinter = await share.hasRole(MINTER_ROLE, pmAddress);
    const hasLpMinter = await lp.hasRole(MINTER_ROLE, pmAddress);
    const hasLpBurner = await lp.hasRole(BURNER_ROLE, pmAddress);
    const hasVaultLocker = await vault.hasRole(LOCKER_ROLE, pmAddress);

    console.log("ShareToken MINTER_ROLE:", hasShareMinter ? "✅" : "❌");
    console.log("LPToken MINTER_ROLE:", hasLpMinter ? "✅" : "❌");
    console.log("LPToken BURNER_ROLE:", hasLpBurner ? "✅" : "❌");
    console.log("VestingVault LOCKER_ROLE:", hasVaultLocker ? "✅" : "❌");

    if (!hasShareMinter || !hasLpMinter || !hasLpBurner || !hasVaultLocker) {
      throw new Error("Role verification failed - not all roles were granted correctly");
    }

  } catch (error) {
    console.error("❌ Role verification failed:", error.message);
    throw error;
  }

  // Update deployments.json
  console.log("\n📝 Updating deployments.json...");
  data.contracts.PackageManagerV2_1 = pmAddress;
  data.timestamp = new Date().toISOString();

  try {
    fs.writeFileSync(deployFile, JSON.stringify(data, null, 2));
    console.log("✅ Deployments file updated successfully");
  } catch (error) {
    console.error("❌ Failed to update deployments file:", error.message);
    throw error;
  }

  // Display deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("� Summary:");
  console.log(`   PackageManagerV2_1: ${pmAddress}`);
  console.log(`   Network: ${network.name}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Treasury: ${TREASURY_ADDRESS}`);
  console.log(`   Admin: ${ADMIN_ADDRESS}`);
  console.log(`   Factory: ${FACTORY_ADDRESS}`);

  console.log("\n🔗 Next steps:");
  console.log("1. Verify the contract on BSCScan");
  console.log("2. Add initial investment packages");
  console.log("3. Configure tax buckets in SwapTaxManager");
  console.log("4. Update frontend environment variables");
}

main().catch(err => {
  console.error("\n❌ Deployment failed:");
  console.error(err);
  process.exit(1);
});
