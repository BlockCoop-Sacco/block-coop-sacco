const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Fresh Deployment: BlockCoop V2 Complete System");
  console.log("=" .repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("⛽ Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Configuration
  const ADMIN_ADDRESS = deployer.address;
  const ADDITIONAL_ADMIN = "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987";
  const TREASURY_ADDRESS = deployer.address;
  
  // External contract addresses (BSC Testnet)
  const USDT_ADDRESS = "0x350eBe9e8030B5C2e70f831b82b92E44569736fF";
  const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const FACTORY_ADDRESS = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";

  console.log("\n📋 Configuration:");
  console.log("Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("USDT:", USDT_ADDRESS);
  console.log("Router:", ROUTER_ADDRESS);
  console.log("Factory:", FACTORY_ADDRESS);

  // Step 1: Deploy BLOCKS token
  console.log("\n📦 Step 1: Deploying BLOCKS token...");
  const BLOCKS = await ethers.getContractFactory("BLOCKS");
  const blocks = await BLOCKS.deploy("BlockCoop Sacco Token", "BLOCKS", ADMIN_ADDRESS);
  await blocks.waitForDeployment();
  const blocksAddress = await blocks.getAddress();
  console.log("✅ BLOCKS deployed to:", blocksAddress);

  // Step 2: Deploy BLOCKS-LP token
  console.log("\n📦 Step 2: Deploying BLOCKS-LP token...");
  const BLOCKS_LP = await ethers.getContractFactory("BLOCKS_LP");
  const blocksLP = await BLOCKS_LP.deploy("BlockCoop Sacco LP Token", "BLOCKS-LP", ADMIN_ADDRESS);
  await blocksLP.waitForDeployment();
  const blocksLPAddress = await blocksLP.getAddress();
  console.log("✅ BLOCKS-LP deployed to:", blocksLPAddress);

  // Step 3: Deploy VestingVault
  console.log("\n📦 Step 3: Deploying VestingVault...");
  const VestingVault = await ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(blocksAddress, ADMIN_ADDRESS);
  await vestingVault.waitForDeployment();
  const vestingVaultAddress = await vestingVault.getAddress();
  console.log("✅ VestingVault deployed to:", vestingVaultAddress);

  // Step 4: Deploy SwapTaxManager
  console.log("\n📦 Step 4: Deploying SwapTaxManager...");
  const SwapTaxManager = await ethers.getContractFactory("SwapTaxManager");
  const swapTaxManager = await SwapTaxManager.deploy(ADMIN_ADDRESS);
  await swapTaxManager.waitForDeployment();
  const swapTaxManagerAddress = await swapTaxManager.getAddress();
  console.log("✅ SwapTaxManager deployed to:", swapTaxManagerAddress);

  // Step 5: Deploy PackageManagerV2_1
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

  // Grant MANAGER_ROLE to admin for SwapTaxManager
  console.log("Granting MANAGER_ROLE to admin for SwapTaxManager...");
  const MANAGER_ROLE = await swapTaxManager.MANAGER_ROLE();
  await swapTaxManager.grantRole(MANAGER_ROLE, ADMIN_ADDRESS);
  console.log("✅ MANAGER_ROLE granted to admin for SwapTaxManager");

  console.log("\n💾 Step 7: Saving deployment information...");

  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: "fresh-v2-per-package-rates",
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

  const deployFile = path.resolve(__dirname, "../deployments/deployments-fresh-v2.json");
  fs.writeFileSync(deployFile, JSON.stringify(deploymentData, null, 2));
  console.log("✅ Deployment data saved to:", deployFile);

  console.log("\n🎉 Fresh BlockCoop V2 deployment completed successfully!");
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
  console.log("2. Update frontend ABIs using: npx hardhat run scripts/update-frontend-abi-fresh.cjs");
  console.log("3. Configure tax buckets if needed");
  console.log("4. Create test packages with different exchange rates");
  console.log("5. Verify contracts on BSCScan (optional)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
