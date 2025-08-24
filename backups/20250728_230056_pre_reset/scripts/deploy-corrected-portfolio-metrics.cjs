const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Corrected PackageManagerV2_1 (Portfolio Metrics Fix)...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Use existing contract addresses from latest stable deployment
  const existingContracts = {
    BLOCKS: "0xCff8B55324b7c66BD04D66F3AFBFA5A20874c424",
    BLOCKS_LP: "0x70C74268f8b22C0c7702b497131ca8025947F0d5",
    VestingVault: "0xD79FdE9849a59b1f963A186E569bdBc7814b3d7c",
    SwapTaxManager: "0x4d757367e604DbE16116C0aa2F1f20765A415864",
    USDT: "0x350eBe9e8030B5C2e70f831b82b92E44569736fF",
    PancakeRouter: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    PancakeFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", // BSC Testnet Factory
    Treasury: deployer.address
  };

  console.log("Using existing contract addresses:");
  Object.entries(existingContracts).forEach(([name, address]) => {
    console.log(`${name}: ${address}`);
  });

  // Deploy corrected PackageManagerV2_1
  console.log("\n📦 Deploying corrected PackageManagerV2_1...");
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

  const packageManager = await PackageManagerV2_1.deploy(...constructorArgs);
  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ Corrected PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Grant necessary roles
  console.log("\n🔐 Setting up roles...");
  
  // Get contract instances
  const shareToken = await hre.ethers.getContractAt("BLOCKS", existingContracts.BLOCKS);
  const lpToken = await hre.ethers.getContractAt("BLOCKS_LP", existingContracts.BLOCKS_LP);
  const vestingVault = await hre.ethers.getContractAt("VestingVault", existingContracts.VestingVault);

  // Grant MINTER_ROLE to new PackageManager for BLOCKS token
  console.log("Granting MINTER_ROLE to PackageManager for BLOCKS token...");
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  await shareToken.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to PackageManager for BLOCKS");

  // Grant MINTER_ROLE and BURNER_ROLE to new PackageManager for BLOCKS-LP token
  console.log("Granting MINTER_ROLE to PackageManager for BLOCKS-LP token...");
  const LP_MINTER_ROLE = await lpToken.MINTER_ROLE();
  await lpToken.grantRole(LP_MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to PackageManager for BLOCKS-LP");

  console.log("Granting BURNER_ROLE to PackageManager for BLOCKS-LP token...");
  const BURNER_ROLE = await lpToken.BURNER_ROLE();
  await lpToken.grantRole(BURNER_ROLE, packageManagerAddress);
  console.log("✅ BURNER_ROLE granted to PackageManager for BLOCKS-LP");

  // Grant LOCKER_ROLE to new PackageManager for VestingVault
  console.log("Granting LOCKER_ROLE to PackageManager for VestingVault...");
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ LOCKER_ROLE granted to PackageManager for VestingVault");

  // Save deployment information
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    deployer: deployer.address,
    fix: "Portfolio metrics inflation bug - treasury allocation excluded from user stats",
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
    constructorArgs: constructorArgs.map(arg => arg.toString()),
    gasUsed: {
      PackageManagerV2_1: (await packageManager.deploymentTransaction().wait()).gasUsed.toString()
    }
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, "deployments-corrected-portfolio-metrics.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to: ${deploymentFile}`);

  // Verification info
  console.log("\n🔍 Contract verification info:");
  console.log("PackageManagerV2_1:", packageManagerAddress);
  console.log("Constructor args:", JSON.stringify(constructorArgs.map(arg => arg.toString()), null, 2));

  console.log("\n✅ Deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Verify contract on BscScan using verify-corrected-portfolio-metrics.cjs");
  console.log("2. Update frontend contract addresses");
  console.log("3. Test with small purchase to verify fix");
  console.log("4. Deploy to mainnet after successful testing");

  return {
    packageManagerAddress,
    existingContracts,
    deploymentInfo
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
