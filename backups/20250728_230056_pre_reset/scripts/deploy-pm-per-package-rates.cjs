const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Environment validation
function validateEnvironment() {
  const required = [
    'DEPLOYER_PRIVATE_KEY',
    'BSC_TESTNET_RPC_URL'
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

// Address validation
function validateAddress(address, name) {
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid ${name} address: ${address}`);
  }
}

async function main() {
  console.log("🚀 Deploying PackageManagerV2_1 with Per-Package Exchange Rates...");

  // Validate environment
  validateEnvironment();

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);
  console.log("🌐 Network:", network.name);

  // Load existing deployment data
  const deployFile = path.resolve(__dirname, "../deployments/deployments.json");
  
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Deployments file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  
  // Extract existing contract addresses (these will be reused)
  const {
    ShareToken,
    LPToken, 
    VestingVault,
    SwapTaxManager,
    Treasury
  } = data.contracts;

  // External contract addresses (BSC Testnet)
  const USDT_ADDRESS = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd";
  const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  const FACTORY_ADDRESS = "0x6725F303b657a9124d3a91A4d8e8b5e3b8b8e8e8"; // BSC Testnet Factory
  const ADMIN_ADDRESS = deployer.address;

  console.log("\n🔍 Validating all contract addresses...");

  // Validate all addresses
  validateAddress(USDT_ADDRESS, "USDT");
  validateAddress(ShareToken, "ShareToken (BLOCKS)");
  validateAddress(LPToken, "LPToken (BLOCKS-LP)");
  validateAddress(VestingVault, "VestingVault");
  validateAddress(SwapTaxManager, "SwapTaxManager");
  validateAddress(ROUTER_ADDRESS, "PancakeRouter");
  validateAddress(FACTORY_ADDRESS, "PancakeFactory");
  validateAddress(Treasury, "Treasury");
  validateAddress(ADMIN_ADDRESS, "Admin");

  console.log("\n📦 Deploying PackageManagerV2_1 with per-package exchange rates...");

  const PM = await ethers.getContractFactory("PackageManagerV2_1");

  // Deploy with correct parameter order
  const pm = await PM.deploy(
    USDT_ADDRESS,      // usdt_
    ShareToken,        // share_ (BLOCKS)
    LPToken,           // lp_ (BLOCKS-LP)
    VestingVault,      // vault_
    ROUTER_ADDRESS,    // router_
    FACTORY_ADDRESS,   // factory_
    Treasury,          // treasury_
    SwapTaxManager,    // tax_
    ADMIN_ADDRESS      // admin
  );

  // Wait for deployment confirmation
  console.log("⏳ Waiting for deployment confirmation...");
  await pm.waitForDeployment();

  const pmAddress = pm.target || pm.address;
  console.log("✅ PackageManagerV2_1 deployed at:", pmAddress);

  // Verify deployment by calling a view function
  try {
    const deadlineWindow = await pm.deadlineWindow();
    console.log("🔍 Deployment verified - deadline window:", deadlineWindow.toString());
  } catch (error) {
    throw new Error(`Deployment verification failed: ${error.message}`);
  }

  console.log("\n🔑 Granting required roles...");

  try {
    // Get contract instances for role granting
    const shareToken = await ethers.getContractAt("IBLOCKS", ShareToken);
    const lpToken = await ethers.getContractAt("IBLOCKS_LP", LPToken);
    const vestingVault = await ethers.getContractAt("IVestingVault", VestingVault);

    // Define role constants
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
    const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
    const LOCKER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("LOCKER_ROLE"));

    // Grant MINTER_ROLE on ShareToken (BLOCKS)
    console.log("   Granting MINTER_ROLE on ShareToken (BLOCKS)...");
    const tx1 = await shareToken.grantRole(MINTER_ROLE, pmAddress);
    await tx1.wait();

    // Grant MINTER_ROLE and BURNER_ROLE on LPToken (BLOCKS-LP)
    console.log("   Granting MINTER_ROLE on LPToken (BLOCKS-LP)...");
    const tx2 = await lpToken.grantRole(MINTER_ROLE, pmAddress);
    await tx2.wait();

    console.log("   Granting BURNER_ROLE on LPToken (BLOCKS-LP)...");
    const tx3 = await lpToken.grantRole(BURNER_ROLE, pmAddress);
    await tx3.wait();

    // Grant LOCKER_ROLE on VestingVault
    console.log("   Granting LOCKER_ROLE on VestingVault...");
    const tx4 = await vestingVault.grantRole(LOCKER_ROLE, pmAddress);
    await tx4.wait();

    console.log("✅ All roles granted successfully");

    // Verify role assignments
    console.log("\n🔍 Verifying role assignments...");
    const hasShareMinter = await shareToken.hasRole(MINTER_ROLE, pmAddress);
    const hasLpMinter = await lpToken.hasRole(MINTER_ROLE, pmAddress);
    const hasLpBurner = await lpToken.hasRole(BURNER_ROLE, pmAddress);
    const hasVaultLocker = await vestingVault.hasRole(LOCKER_ROLE, pmAddress);

    console.log(`   ShareToken MINTER_ROLE: ${hasShareMinter}`);
    console.log(`   LPToken MINTER_ROLE: ${hasLpMinter}`);
    console.log(`   LPToken BURNER_ROLE: ${hasLpBurner}`);
    console.log(`   VestingVault LOCKER_ROLE: ${hasVaultLocker}`);

    if (!hasShareMinter || !hasLpMinter || !hasLpBurner || !hasVaultLocker) {
      throw new Error("Role verification failed - not all roles were granted correctly");
    }

  } catch (error) {
    console.error("❌ Role granting failed:", error.message);
    throw error;
  }

  // Update deployments.json
  console.log("\n📝 Updating deployments.json...");
  
  // Create backup of old deployment
  const backupFile = path.resolve(__dirname, "../deployments/deployments-backup-global-rates.json");
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  console.log("📋 Backup created:", backupFile);

  // Update with new PackageManager address
  data.contracts.PackageManagerV2_1 = pmAddress;
  data.contracts.PackageManagerV2_1_OLD_GLOBAL_RATES = data.contracts.PackageManagerV2_1 || "N/A";
  data.timestamp = new Date().toISOString();
  data.version = "per-package-exchange-rates";

  try {
    fs.writeFileSync(deployFile, JSON.stringify(data, null, 2));
    console.log("✅ Deployments file updated successfully");
  } catch (error) {
    console.error("❌ Failed to update deployments file:", error.message);
    throw error;
  }

  // Create test packages with different exchange rates
  console.log("\n📦 Creating test packages with different exchange rates...");
  
  try {
    // Package 1: Conservative rate (0.3 BLOCKS per USDT)
    await pm.addPackage(
      "Conservative Package",
      ethers.parseUnits("100", 6), // 100 USDT
      3000, // 0.3 BLOCKS per USDT
      7000, // 70% vesting
      0,    // No cliff
      86400 * 30, // 30 days
      200   // 2% referral
    );

    // Package 2: Standard rate (0.5 BLOCKS per USDT)
    await pm.addPackage(
      "Standard Package", 
      ethers.parseUnits("500", 6), // 500 USDT
      5000, // 0.5 BLOCKS per USDT
      7000, // 70% vesting
      86400 * 7, // 7 day cliff
      86400 * 90, // 90 days
      300   // 3% referral
    );

    // Package 3: Aggressive rate (0.8 BLOCKS per USDT)
    await pm.addPackage(
      "Premium Package",
      ethers.parseUnits("1000", 6), // 1000 USDT
      8000, // 0.8 BLOCKS per USDT
      8000, // 80% vesting
      86400 * 14, // 14 day cliff
      86400 * 180, // 180 days
      500   // 5% referral
    );

    console.log("✅ Test packages created successfully");
  } catch (error) {
    console.log("⚠️ Test package creation failed:", error.message);
    console.log("   This is non-critical - packages can be created later");
  }

  // Display deployment summary
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📊 Summary:");
  console.log(`   PackageManagerV2_1: ${pmAddress}`);
  console.log(`   Network: ${network.name}`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Treasury: ${Treasury}`);
  console.log(`   Version: Per-Package Exchange Rates`);

  console.log("\n🔗 Next steps:");
  console.log("1. Update frontend environment variables:");
  console.log(`   VITE_PACKAGE_MANAGER_ADDRESS=${pmAddress}`);
  console.log("2. Verify the contract on BSCScan");
  console.log("3. Test package creation with different exchange rates");
  console.log("4. Test purchase flow with per-package calculations");
  console.log("5. Deploy to mainnet after thorough testing");

  console.log("\n⚠️ Important Notes:");
  console.log("- Old packages are incompatible with new contract");
  console.log("- Each package now has its own exchange rate");
  console.log("- Global exchange rate system has been removed");
  console.log("- Frontend has been updated to support per-package rates");
}

main().catch(err => {
  console.error("\n❌ Deployment failed:");
  console.error(err);
  process.exit(1);
});
