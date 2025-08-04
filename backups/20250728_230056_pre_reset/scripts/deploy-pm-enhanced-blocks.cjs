const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying PackageManagerV2_1 with Enhanced BLOCKS Token Integration...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB\n");

  // Load enhanced BLOCKS deployment data
  const enhancedDeployFile = "deployments/deployments-enhanced-blocks.json";
  if (!fs.existsSync(enhancedDeployFile)) {
    throw new Error(`Enhanced BLOCKS deployment file not found: ${enhancedDeployFile}`);
  }

  const enhancedData = JSON.parse(fs.readFileSync(enhancedDeployFile));
  
  console.log("📦 Using enhanced BLOCKS deployment:");
  console.log("Enhanced BLOCKS:", enhancedData.contracts.BLOCKS);
  console.log("BLOCKS-LP:", enhancedData.contracts["BLOCKS-LP"]);
  console.log("VestingVault:", enhancedData.contracts.VestingVault);
  console.log("SwapTaxManager:", enhancedData.contracts.SwapTaxManager);
  console.log("Treasury:", enhancedData.contracts.Treasury);

  // Configuration from enhanced deployment
  const USDT_ADDRESS = enhancedData.externalContracts.USDT;
  const ENHANCED_BLOCKS_ADDRESS = enhancedData.contracts.BLOCKS;
  const BLOCKS_LP_ADDRESS = enhancedData.contracts["BLOCKS-LP"];
  const VESTING_VAULT_ADDRESS = enhancedData.contracts.VestingVault;
  const ROUTER_ADDRESS = enhancedData.externalContracts.PancakeRouter;
  const FACTORY_ADDRESS = enhancedData.externalContracts.PancakeFactory;
  const TREASURY_ADDRESS = enhancedData.contracts.Treasury;
  const SWAP_TAX_MANAGER_ADDRESS = enhancedData.contracts.SwapTaxManager;
  const ADMIN_ADDRESS = enhancedData.admins.primary;
  const ADDITIONAL_ADMIN = enhancedData.admins.additional;

  console.log("\n📦 Step 1: Deploying PackageManagerV2_1 with Enhanced BLOCKS...");
  const PackageManagerV2_1 = await ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    USDT_ADDRESS,                // usdt_
    ENHANCED_BLOCKS_ADDRESS,     // share_ (Enhanced BLOCKS with DEX taxes)
    BLOCKS_LP_ADDRESS,           // lp_ (BLOCKS-LP)
    VESTING_VAULT_ADDRESS,       // vault_
    ROUTER_ADDRESS,              // router_
    FACTORY_ADDRESS,             // factory_
    TREASURY_ADDRESS,            // treasury_
    SWAP_TAX_MANAGER_ADDRESS,    // tax_
    ADMIN_ADDRESS                // admin (additional admin is granted in constructor)
  );
  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  console.log("\n⚙️ Step 2: Configuring roles and permissions...");
  
  // Get contract instances for role management
  const enhancedBlocks = await ethers.getContractAt("BLOCKS", ENHANCED_BLOCKS_ADDRESS);
  const blocksLP = await ethers.getContractAt("BLOCKS_LP", BLOCKS_LP_ADDRESS);
  const vestingVault = await ethers.getContractAt("VestingVault", VESTING_VAULT_ADDRESS);

  // Grant MINTER_ROLE to new PackageManager on enhanced BLOCKS token
  console.log("🔧 Granting MINTER_ROLE to PackageManager on enhanced BLOCKS...");
  const MINTER_ROLE = await enhancedBlocks.MINTER_ROLE();
  let tx = await enhancedBlocks.grantRole(MINTER_ROLE, packageManagerAddress);
  await tx.wait();
  console.log("✅ MINTER_ROLE granted to PackageManager on enhanced BLOCKS");

  // Grant MINTER_ROLE to new PackageManager on BLOCKS-LP token
  console.log("🔧 Granting MINTER_ROLE to PackageManager on BLOCKS-LP...");
  const LP_MINTER_ROLE = await blocksLP.MINTER_ROLE();
  tx = await blocksLP.grantRole(LP_MINTER_ROLE, packageManagerAddress);
  await tx.wait();
  console.log("✅ MINTER_ROLE granted to PackageManager on BLOCKS-LP");

  // Grant BURNER_ROLE to new PackageManager on BLOCKS-LP token
  console.log("🔧 Granting BURNER_ROLE to PackageManager on BLOCKS-LP...");
  const BURNER_ROLE = await blocksLP.BURNER_ROLE();
  tx = await blocksLP.grantRole(BURNER_ROLE, packageManagerAddress);
  await tx.wait();
  console.log("✅ BURNER_ROLE granted to PackageManager on BLOCKS-LP");

  // Grant LOCKER_ROLE to new PackageManager on VestingVault
  console.log("🔧 Granting LOCKER_ROLE to PackageManager on VestingVault...");
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  tx = await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  await tx.wait();
  console.log("✅ LOCKER_ROLE granted to PackageManager on VestingVault");

  console.log("\n🔍 Step 3: Verifying role assignments...");
  
  // Verify all roles are properly assigned
  const hasBlocksMinterRole = await enhancedBlocks.hasRole(MINTER_ROLE, packageManagerAddress);
  const hasLPMinterRole = await blocksLP.hasRole(LP_MINTER_ROLE, packageManagerAddress);
  const hasLPBurnerRole = await blocksLP.hasRole(BURNER_ROLE, packageManagerAddress);
  const hasVaultLockerRole = await vestingVault.hasRole(LOCKER_ROLE, packageManagerAddress);

  console.log("🔑 Role Verification:");
  console.log(`PackageManager has MINTER_ROLE on enhanced BLOCKS: ${hasBlocksMinterRole}`);
  console.log(`PackageManager has MINTER_ROLE on BLOCKS-LP: ${hasLPMinterRole}`);
  console.log(`PackageManager has BURNER_ROLE on BLOCKS-LP: ${hasLPBurnerRole}`);
  console.log(`PackageManager has LOCKER_ROLE on VestingVault: ${hasVaultLockerRole}`);

  if (!hasBlocksMinterRole || !hasLPMinterRole || !hasLPBurnerRole || !hasVaultLockerRole) {
    throw new Error("❌ Role assignment verification failed!");
  }

  console.log("\n💾 Step 4: Saving deployment information...");

  const deploymentData = {
    network: enhancedData.network,
    chainId: enhancedData.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: "enhanced-blocks-integration",
    contracts: {
      ...enhancedData.contracts,
      PackageManagerV2_1: packageManagerAddress, // New PackageManager with enhanced BLOCKS
    },
    admins: enhancedData.admins,
    externalContracts: enhancedData.externalContracts,
    taxConfiguration: enhancedData.taxConfiguration,
    integration: {
      previousPackageManager: "0x3FCe59bEd215B5762fB6595c468Fd8f4aEa8AC66",
      enhancedBLOCKS: ENHANCED_BLOCKS_ADDRESS,
      migrationTimestamp: new Date().toISOString()
    }
  };

  const outputFile = "deployments/deployments-enhanced-integration.json";
  fs.writeFileSync(outputFile, JSON.stringify(deploymentData, null, 2));
  console.log("✅ Deployment data saved to:", outputFile);

  console.log("\n🎯 Step 5: Deployment Summary");
  console.log("=====================================");
  console.log("Enhanced BLOCKS Token:", ENHANCED_BLOCKS_ADDRESS);
  console.log("New PackageManagerV2_1:", packageManagerAddress);
  console.log("Previous PackageManager:", "0x3FCe59bEd215B5762fB6595c468Fd8f4aEa8AC66");
  console.log("BLOCKS-LP Token:", BLOCKS_LP_ADDRESS);
  console.log("VestingVault:", VESTING_VAULT_ADDRESS);
  console.log("SwapTaxManager:", SWAP_TAX_MANAGER_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("=====================================");

  console.log("\n📋 Next Steps:");
  console.log("1. Update .env VITE_PACKAGE_MANAGER_ADDRESS to new address");
  console.log("2. Test package purchase flow with enhanced BLOCKS");
  console.log("3. Verify DEX tax collection during purchases");
  console.log("4. Update frontend to use new PackageManager address");
  console.log("5. Add initial packages to new PackageManager");

  console.log("\n🔗 Verification Commands:");
  console.log(`npx hardhat verify --network bsctestnet ${packageManagerAddress} "${USDT_ADDRESS}" "${ENHANCED_BLOCKS_ADDRESS}" "${BLOCKS_LP_ADDRESS}" "${VESTING_VAULT_ADDRESS}" "${ROUTER_ADDRESS}" "${FACTORY_ADDRESS}" "${TREASURY_ADDRESS}" "${SWAP_TAX_MANAGER_ADDRESS}" "${ADMIN_ADDRESS}"`);

  console.log("\n🎉 Enhanced BLOCKS integration deployment completed successfully!");
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:");
  console.error(error);
  process.exit(1);
});
