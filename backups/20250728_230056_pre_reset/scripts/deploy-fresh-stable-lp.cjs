const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Complete BlockCoop System with Stable LP Pricing...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // External contract addresses
  const USDT_ADDRESS = process.env.VITE_USDT_ADDRESS;
  const ROUTER_ADDRESS = process.env.VITE_ROUTER_ADDRESS;
  const FACTORY_ADDRESS = process.env.VITE_FACTORY_ADDRESS;

  // Treasury address (deployer for now)
  const TREASURY_ADDRESS = deployer.address;

  console.log("Using external contract addresses:");
  console.log("USDT:", USDT_ADDRESS);
  console.log("PancakeRouter:", ROUTER_ADDRESS);
  console.log("PancakeFactory:", FACTORY_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);

  // Deploy all BlockCoop contracts fresh
  console.log("\n📦 Deploying SwapTaxManager...");
  const SwapTaxManager = await hre.ethers.getContractFactory("SwapTaxManager");
  const swapTaxManager = await SwapTaxManager.deploy(deployer.address);
  await swapTaxManager.waitForDeployment();
  const taxAddress = await swapTaxManager.getAddress();
  console.log("✅ SwapTaxManager deployed to:", taxAddress);

  console.log("\n📦 Deploying BLOCKS token...");
  const BLOCKS = await hre.ethers.getContractFactory("BLOCKS");
  const shareToken = await BLOCKS.deploy("BLOCKS", "BLOCKS", deployer.address, taxAddress);
  await shareToken.waitForDeployment();
  const shareAddress = await shareToken.getAddress();
  console.log("✅ BLOCKS token deployed to:", shareAddress);

  console.log("\n📦 Deploying BLOCKS-LP token...");
  const BLOCKS_LP = await hre.ethers.getContractFactory("BLOCKS_LP");
  const lpToken = await BLOCKS_LP.deploy("BLOCKS-LP", "BLOCKS-LP", deployer.address);
  await lpToken.waitForDeployment();
  const lpAddress = await lpToken.getAddress();
  console.log("✅ BLOCKS-LP token deployed to:", lpAddress);

  console.log("\n📦 Deploying VestingVault...");
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(shareAddress, deployer.address);
  await vestingVault.waitForDeployment();
  const vaultAddress = await vestingVault.getAddress();
  console.log("✅ VestingVault deployed to:", vaultAddress);

  console.log("\n📦 Deploying PackageManagerV2_1...");
  const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    USDT_ADDRESS,
    shareAddress,
    lpAddress,
    vaultAddress,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    taxAddress,
    deployer.address // admin
  );

  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Grant roles
  console.log("\n🔐 Granting roles...");
  
  // Grant MINTER_ROLE to PackageManager for BLOCKS token
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  await shareToken.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ Granted MINTER_ROLE to PackageManager for BLOCKS token");

  // Grant MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP token
  await lpToken.grantRole(MINTER_ROLE, packageManagerAddress);
  const BURNER_ROLE = await lpToken.BURNER_ROLE();
  await lpToken.grantRole(BURNER_ROLE, packageManagerAddress);
  console.log("✅ Granted MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP token");

  // Grant LOCKER_ROLE to PackageManager for VestingVault
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ Granted LOCKER_ROLE to PackageManager for VestingVault");

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      PackageManagerV2_1: packageManagerAddress,
      BLOCKS: shareAddress,
      BLOCKS_LP: lpAddress,
      VestingVault: vaultAddress,
      SwapTaxManager: taxAddress,
      USDT: USDT_ADDRESS,
      PancakeRouter: ROUTER_ADDRESS,
      Treasury: TREASURY_ADDRESS
    },
    gasUsed: {
      BLOCKS: (await shareToken.deploymentTransaction().wait()).gasUsed.toString(),
      BLOCKS_LP: (await lpToken.deploymentTransaction().wait()).gasUsed.toString(),
      VestingVault: (await vestingVault.deploymentTransaction().wait()).gasUsed.toString(),
      SwapTaxManager: (await swapTaxManager.deploymentTransaction().wait()).gasUsed.toString(),
      PackageManagerV2_1: (await packageManager.deploymentTransaction().wait()).gasUsed.toString()
    }
  };

  // Write deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, "deployments-stable-lp-fresh.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to:", deploymentFile);

  console.log("\n🎉 Complete BlockCoop System with Stable LP Pricing deployed successfully!");
  console.log("📋 Summary:");
  console.log("- BLOCKS:", shareAddress);
  console.log("- BLOCKS-LP:", lpAddress);
  console.log("- VestingVault:", vaultAddress);
  console.log("- SwapTaxManager:", taxAddress);
  console.log("- PackageManagerV2_1:", packageManagerAddress);
  console.log("- All roles granted successfully");
  console.log("- Ready for verification and frontend integration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
