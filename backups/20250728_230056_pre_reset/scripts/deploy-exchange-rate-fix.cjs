const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Exchange Rate Fix - PackageManagerV2_1...");
  console.log("====================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Use existing contract addresses from latest stable deployment
  const existingContracts = {
    BLOCKS: "0xCff8B55324b7c66BD04D66F3AFBFA5A20874c424",
    BLOCKS_LP: "0x70C74268f8b22C0c7702b497131ca8025947F0d5",
    VestingVault: "0xD79FdE9849a59b1f963A186E569bdBc7814b3d7c",
    SwapTaxManager: "0x4d757367e604DbE16116C0aa2F1f20765A415864",
    USDT: "0x350eBe9e8030B5C2e70f831b82b92E44569736fF",
    PancakeRouter: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    PancakeFactory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17",
    Treasury: "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4"
  };

  console.log("\n📋 Using existing contract addresses:");
  Object.entries(existingContracts).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });

  // Deploy fixed PackageManagerV2_1
  console.log("\n📦 Deploying Fixed PackageManagerV2_1...");
  const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
  
  // Constructor parameters
  const constructorArgs = [
    existingContracts.USDT,           // usdt_
    existingContracts.BLOCKS,         // share_
    existingContracts.BLOCKS_LP,      // lp_
    existingContracts.VestingVault,   // vault_
    existingContracts.PancakeRouter,  // router_
    existingContracts.PancakeFactory, // factory_
    existingContracts.Treasury,       // treasury_
    existingContracts.SwapTaxManager, // tax_
    deployer.address,                 // admin
    hre.ethers.parseEther("2.0")      // initialGlobalTargetPrice_ (2.0 USDT per BLOCKS)
  ];

  console.log("Constructor arguments:", constructorArgs);

  const packageManager = await PackageManagerV2_1.deploy(...constructorArgs);
  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();

  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Grant necessary roles
  console.log("\n🔐 Setting up roles...");
  
  const blocks = await hre.ethers.getContractAt("BLOCKS", existingContracts.BLOCKS);
  const blocksLP = await hre.ethers.getContractAt("BLOCKS_LP", existingContracts.BLOCKS_LP);
  const vestingVault = await hre.ethers.getContractAt("VestingVault", existingContracts.VestingVault);

  // Grant MINTER_ROLE to new PackageManager for BLOCKS token
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  console.log("Granting MINTER_ROLE to PackageManager for BLOCKS...");
  const grantMinterTx = await blocks.grantRole(MINTER_ROLE, packageManagerAddress);
  await grantMinterTx.wait();
  console.log("✅ MINTER_ROLE granted for BLOCKS");

  // Grant MINTER_ROLE and BURNER_ROLE to new PackageManager for BLOCKS-LP token
  const BURNER_ROLE = await blocksLP.BURNER_ROLE();
  console.log("Granting MINTER_ROLE to PackageManager for BLOCKS-LP...");
  const grantLPMinterTx = await blocksLP.grantRole(MINTER_ROLE, packageManagerAddress);
  await grantLPMinterTx.wait();
  console.log("✅ MINTER_ROLE granted for BLOCKS-LP");

  console.log("Granting BURNER_ROLE to PackageManager for BLOCKS-LP...");
  const grantLPBurnerTx = await blocksLP.grantRole(BURNER_ROLE, packageManagerAddress);
  await grantLPBurnerTx.wait();
  console.log("✅ BURNER_ROLE granted for BLOCKS-LP");

  // Grant LOCKER_ROLE to new PackageManager for VestingVault
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  console.log("Granting LOCKER_ROLE to PackageManager for VestingVault...");
  const grantLockerTx = await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  await grantLockerTx.wait();
  console.log("✅ LOCKER_ROLE granted for VestingVault");

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: "bsctestnet",
    deployer: deployer.address,
    version: "exchange-rate-fix",
    fix: "Fixed exchange rate calculation bug - removed 1 trillion times inflation",
    contracts: {
      PackageManagerV2_1: packageManagerAddress,
      BLOCKS: existingContracts.BLOCKS,
      BLOCKS_LP: existingContracts.BLOCKS_LP,
      VestingVault: existingContracts.VestingVault,
      SwapTaxManager: existingContracts.SwapTaxManager,
      USDT: existingContracts.USDT,
      PancakeRouter: existingContracts.PancakeRouter,
      PancakeFactory: existingContracts.PancakeFactory,
      Treasury: existingContracts.Treasury
    },
    gasUsed: {
      PackageManagerV2_1: (await packageManager.deploymentTransaction().wait()).gasUsed.toString()
    },
    constructorArgs,
    verification: {
      command: `npx hardhat verify --network bsctestnet ${packageManagerAddress} ${constructorArgs.map(arg => `"${arg}"`).join(' ')}`
    }
  };

  const deploymentFile = path.join(__dirname, "..", "deployments", "deployments-exchange-rate-fix.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment Summary:");
  console.log("======================");
  console.log("PackageManagerV2_1:", packageManagerAddress);
  console.log("Network: BSC Testnet");
  console.log("Fix: Exchange rate calculation corrected");
  console.log("Expected behavior: 100 USDT → ~200 BLOCKS (not 200 trillion)");
  console.log("Deployment file:", deploymentFile);

  console.log("\n🔍 Next Steps:");
  console.log("1. Verify contract on BSCScan");
  console.log("2. Update frontend configuration");
  console.log("3. Remove frontend correction logic");
  console.log("4. Test with 100 USDT purchase");

  console.log("\n✅ Exchange Rate Fix Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
