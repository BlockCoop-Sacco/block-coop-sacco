const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

/**
 * Deploy BlockCoop V3 with BLOCKS and BLOCKS-LP tokens
 * This script deploys the rebranded token contracts and updated PackageManager
 */

function validateAddress(address, name) {
  if (!address || address === "") {
    throw new Error(`${name} address is required`);
  }
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid ${name} address: ${address}`);
  }
  console.log(`✅ ${name}: ${address}`);
}

async function main() {
  console.log("🚀 Starting BlockCoop V3 deployment with BLOCKS tokens...");
  console.log("🌐 Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer address:", deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Additional admin wallet
  const ADDITIONAL_ADMIN = "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987";

  // Get addresses from environment
  const USDT_ADDRESS = process.env.VITE_USDT_ADDRESS;
  const ROUTER_ADDRESS = process.env.VITE_ROUTER_ADDRESS;
  const FACTORY_ADDRESS = process.env.VITE_FACTORY_ADDRESS;
  const TREASURY_ADDRESS = deployer.address; // Using deployer as treasury
  const ADMIN_ADDRESS = deployer.address; // Using deployer as primary admin

  console.log("\n🔍 Validating external contract addresses...");
  validateAddress(USDT_ADDRESS, "USDT");
  validateAddress(ROUTER_ADDRESS, "PancakeRouter");
  validateAddress(FACTORY_ADDRESS, "PancakeFactory");
  validateAddress(TREASURY_ADDRESS, "Treasury");
  validateAddress(ADMIN_ADDRESS, "Primary Admin");
  validateAddress(ADDITIONAL_ADMIN, "Additional Admin");

  console.log("\n📦 Step 1: Deploying BLOCKS token...");
  const BLOCKS = await ethers.getContractFactory("BLOCKS");
  const blocks = await BLOCKS.deploy(
    "BlockCoop Sacco Share Token", // name
    "BLOCKS",                      // symbol
    ADMIN_ADDRESS                  // admin
  );
  await blocks.waitForDeployment();
  const blocksAddress = await blocks.getAddress();
  console.log("✅ BLOCKS deployed to:", blocksAddress);

  console.log("\n📦 Step 2: Deploying BLOCKS-LP token...");
  const BLOCKS_LP = await ethers.getContractFactory("BLOCKS_LP");
  const blocksLP = await BLOCKS_LP.deploy(
    "BlockCoop Sacco LP Token", // name
    "BLOCKS-LP",                // symbol
    ADMIN_ADDRESS               // admin
  );
  await blocksLP.waitForDeployment();
  const blocksLPAddress = await blocksLP.getAddress();
  console.log("✅ BLOCKS-LP deployed to:", blocksLPAddress);

  console.log("\n📦 Step 3: Deploying VestingVault...");
  const VestingVault = await ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(
    blocksAddress,  // shareToken (now BLOCKS)
    ADMIN_ADDRESS   // admin
  );
  await vestingVault.waitForDeployment();
  const vestingVaultAddress = await vestingVault.getAddress();
  console.log("✅ VestingVault deployed to:", vestingVaultAddress);

  console.log("\n📦 Step 4: Deploying SwapTaxManager...");
  const SwapTaxManager = await ethers.getContractFactory("SwapTaxManager");
  const swapTaxManager = await SwapTaxManager.deploy(ADMIN_ADDRESS);
  await swapTaxManager.waitForDeployment();
  const swapTaxManagerAddress = await swapTaxManager.getAddress();
  console.log("✅ SwapTaxManager deployed to:", swapTaxManagerAddress);

  console.log("\n📦 Step 5: Deploying PackageManagerV2_1...");
  const PackageManagerV2_1 = await ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    USDT_ADDRESS,           // usdt_
    blocksAddress,          // share_ (now BLOCKS)
    blocksLPAddress,        // lp_ (now BLOCKS-LP)
    vestingVaultAddress,    // vault_
    ROUTER_ADDRESS,         // router_
    FACTORY_ADDRESS,        // factory_
    TREASURY_ADDRESS,       // treasury_
    swapTaxManagerAddress,  // tax_
    ADMIN_ADDRESS           // admin (additional admin is granted in constructor)
  );
  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  console.log("\n🔐 Step 6: Setting up roles and permissions...");

  // Grant MINTER_ROLE to PackageManager for BLOCKS token
  console.log("Granting MINTER_ROLE to PackageManager for BLOCKS...");
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  await blocks.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to PackageManager for BLOCKS");

  // Grant MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP token
  console.log("Granting MINTER_ROLE to PackageManager for BLOCKS-LP...");
  const LP_MINTER_ROLE = await blocksLP.MINTER_ROLE();
  await blocksLP.grantRole(LP_MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to PackageManager for BLOCKS-LP");

  console.log("Granting BURNER_ROLE to PackageManager for BLOCKS-LP...");
  const BURNER_ROLE = await blocksLP.BURNER_ROLE();
  await blocksLP.grantRole(BURNER_ROLE, packageManagerAddress);
  console.log("✅ BURNER_ROLE granted to PackageManager for BLOCKS-LP");

  // Grant LOCKER_ROLE to PackageManager for VestingVault
  console.log("Granting LOCKER_ROLE to PackageManager for VestingVault...");
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ LOCKER_ROLE granted to PackageManager for VestingVault");

  // Grant MANAGER_ROLE to both admins for SwapTaxManager
  console.log("Granting MANAGER_ROLE to admins for SwapTaxManager...");
  const MANAGER_ROLE = await swapTaxManager.MANAGER_ROLE();
  await swapTaxManager.grantRole(MANAGER_ROLE, ADMIN_ADDRESS);
  await swapTaxManager.grantRole(MANAGER_ROLE, ADDITIONAL_ADMIN);
  console.log("✅ MANAGER_ROLE granted to both admins for SwapTaxManager");

  // Grant admin roles to additional admin for all contracts
  console.log("Granting admin roles to additional admin...");
  const DEFAULT_ADMIN_ROLE = await blocks.DEFAULT_ADMIN_ROLE();
  
  await blocks.grantRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN);
  console.log("✅ Admin role granted to additional admin for BLOCKS");
  
  await blocksLP.grantRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN);
  console.log("✅ Admin role granted to additional admin for BLOCKS-LP");
  
  await vestingVault.grantRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN);
  console.log("✅ Admin role granted to additional admin for VestingVault");
  
  await swapTaxManager.grantRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN);
  console.log("✅ Admin role granted to additional admin for SwapTaxManager");

  console.log("\n💾 Step 7: Saving deployment information...");

  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: "v3-blocks",
    contracts: {
      BLOCKS: blocksAddress,
      "BLOCKS-LP": blocksLPAddress,
      VestingVault: vestingVaultAddress,
      SwapTaxManager: swapTaxManagerAddress,
      PackageManagerV2_1: packageManagerAddress,
      Treasury: TREASURY_ADDRESS
    },
    admins: {
      primary: ADMIN_ADDRESS,
      additional: ADDITIONAL_ADMIN
    },
    externalContracts: {
      USDT: USDT_ADDRESS,
      PancakeRouter: ROUTER_ADDRESS,
      PancakeFactory: FACTORY_ADDRESS
    }
  };

  const deployFile = path.resolve(__dirname, "../deployments/deployments-v3-blocks.json");
  fs.writeFileSync(deployFile, JSON.stringify(deploymentData, null, 2));
  console.log("✅ Deployment data saved to:", deployFile);

  console.log("\n🎉 BlockCoop V3 deployment completed successfully!");
  console.log("\n📋 Contract Summary:");
  console.log("BLOCKS:", blocksAddress);
  console.log("BLOCKS-LP:", blocksLPAddress);
  console.log("VestingVault:", vestingVaultAddress);
  console.log("SwapTaxManager:", swapTaxManagerAddress);
  console.log("PackageManagerV2_1:", packageManagerAddress);
  console.log("Treasury:", TREASURY_ADDRESS);
  
  console.log("\n👥 Admin Addresses:");
  console.log("Primary Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);

  console.log("\n🔄 Next Steps:");
  console.log("1. Update frontend .env file with new contract addresses");
  console.log("2. Update frontend ABIs using: npx hardhat run scripts/update-frontend-abi-v3.cjs");
  console.log("3. Configure tax buckets using: npx hardhat run scripts/configure-pm-v3.cjs");
  console.log("4. Verify contracts on BSCScan (optional)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
