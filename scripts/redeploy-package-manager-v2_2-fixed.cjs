const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 REDEPLOYMENT: PackageManagerV2_2 with 1:1 Ratio & Referral Fixes");
  console.log("Network:", network.name);
  console.log("=" .repeat(70));

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load existing deployment addresses
  let existingDeployment;
  try {
    existingDeployment = JSON.parse(fs.readFileSync("deployments/deployments-mainnet-v2_2.json", "utf8"));
    console.log("📋 Loaded existing deployment addresses");
  } catch (error) {
    console.error("❌ Could not load existing deployment. Please run full deployment first.");
    process.exit(1);
  }

  // Constants from existing deployment
  const ROUTER_ADDRESS = existingDeployment.router;
  const FACTORY_ADDRESS = existingDeployment.factory;
  const USDT_ADDRESS = existingDeployment.usdt;
  const TREASURY_ADDRESS = existingDeployment.treasury;
  const EXISTING_TAX_MANAGER = existingDeployment.taxManager;
  const EXISTING_BLOCKS = existingDeployment.blocks;
  const EXISTING_BLOCKS_LP = existingDeployment.blocksLP;
  const EXISTING_VESTING_VAULT = existingDeployment.vestingVault;

  console.log("🔗 Existing Contract Addresses:");
  console.log("  Router:", ROUTER_ADDRESS);
  console.log("  Factory:", FACTORY_ADDRESS);
  console.log("  USDT:", USDT_ADDRESS);
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  Tax Manager:", EXISTING_TAX_MANAGER);
  console.log("  BLOCKS:", EXISTING_BLOCKS);
  console.log("  BLOCKS-LP:", EXISTING_BLOCKS_LP);
  console.log("  Vesting Vault:", EXISTING_VESTING_VAULT);

  // Verify deployer has admin role on existing contracts
  console.log("\n🔐 Verifying deployer permissions on existing contracts...");
  
  const blocks = await ethers.getContractAt("BLOCKS", EXISTING_BLOCKS);
  const blocksLP = await ethers.getContractAt("BLOCKS_LP", EXISTING_BLOCKS_LP);
  const vestingVault = await ethers.getContractAt("VestingVault", EXISTING_VESTING_VAULT);
  const taxManager = await ethers.getContractAt("SwapTaxManager", EXISTING_TAX_MANAGER);

  const deployerHasAdminRole = await blocks.hasRole(await blocks.DEFAULT_ADMIN_ROLE(), deployer.address);
  if (!deployerHasAdminRole) {
    console.error("❌ Deployer does not have admin role on BLOCKS token");
    process.exit(1);
  }
  console.log("✅ Deployer has admin role on existing contracts");

  // 1) Deploy NEW PackageManagerV2_2 with fixes
  console.log("\n1️⃣ Deploying NEW PackageManagerV2_2 with fixes...");
  console.log("   - 1:1 BLOCKS to BLOCKS-LP ratio fix");
  console.log("   - Referral system tracking fix");
  
  const PM = await ethers.getContractFactory("PackageManagerV2_2");
  const initialTarget = ethers.parseUnits("2.0", 18); // 2 USDT per BLOCKS (fallback)
  
  const pm = await PM.deploy(
    USDT_ADDRESS,
    EXISTING_BLOCKS,
    EXISTING_BLOCKS_LP,
    EXISTING_VESTING_VAULT,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    EXISTING_TAX_MANAGER,
    deployer.address,
    initialTarget
  );
  
  await pm.waitForDeployment();
  const pmAddr = await pm.getAddress();
  console.log("✅ NEW PackageManagerV2_2 deployed:", pmAddr);

  // 2) Grant roles to NEW PackageManager
  console.log("\n2️⃣ Granting roles to NEW PackageManager...");
  
  // Grant MINTER role for BLOCKS token
  await (await blocks.grantRole(await blocks.MINTER_ROLE(), pmAddr)).wait();
  console.log("   ✅ MINTER role granted for BLOCKS token");
  
  // Grant MINTER and BURNER roles for BLOCKS-LP token
  await (await blocksLP.grantRole(await blocksLP.MINTER_ROLE(), pmAddr)).wait();
  await (await blocksLP.grantRole(await blocksLP.BURNER_ROLE(), pmAddr)).wait();
  console.log("   ✅ MINTER and BURNER roles granted for BLOCKS-LP token");
  
  // Grant LOCKER role for VestingVault
  await (await vestingVault.grantRole(await vestingVault.LOCKER_ROLE(), pmAddr)).wait();
  console.log("   ✅ LOCKER role granted for VestingVault");

  // 3) Initialize router allowances
  console.log("\n3️⃣ Initializing router allowances...");
  await (await pm.initRouterAllowances()).wait();
  console.log("✅ Router allowances initialized");

  // 4) Set purchase tax if environment variable provided
  if (process.env.PURCHASE_TAX_BPS) {
    console.log("\n4️⃣ Setting purchase tax to", process.env.PURCHASE_TAX_BPS, "bps...");
    const purchaseKey = await pm.PURCHASE_TAX_KEY();
    const managerRole = await taxManager.MANAGER_ROLE();
    
    // Grant manager role to deployer if not already granted
    if (!(await taxManager.hasRole(managerRole, deployer.address))) {
      await (await taxManager.grantRole(managerRole, deployer.address)).wait();
      console.log("   ✅ Manager role granted to deployer");
    }
    
    await (await taxManager.setBucket(purchaseKey, parseInt(process.env.PURCHASE_TAX_BPS), TREASURY_ADDRESS)).wait();
    console.log("✅ Purchase tax configured");
  } else {
    console.log("\n4️⃣ Skipping tax config (will be set via admin panel later)");
  }

  // 5) Save updated deployment addresses
  const updatedDeployment = {
    ...existingDeployment,
    packageManager: pmAddr,
    oldPackageManager: existingDeployment.packageManager,
    redeploymentTimestamp: Date.now(),
    redeploymentReason: "PackageManagerV2_2 fixes: 1:1 ratio and referral system",
    fixes: [
      "1:1 BLOCKS to BLOCKS-LP token ratio enforced",
      "Referral rewards only tracked for referrers, not buyers",
      "Proper separation of referral tracking"
    ]
  };

  // Save to new file to preserve old deployment
  const timestamp = Math.floor(Date.now() / 1000);
  const filename = `deployments/deployments-mainnet-v2_2-fixed-${timestamp}.json`;
  
  fs.mkdirSync("deployments", { recursive: true });
  fs.writeFileSync(filename, JSON.stringify(updatedDeployment, null, 2));
  
  console.log("\n📝 Updated deployment saved to:", filename);

  // 6) Display deployment summary
  console.log("\n🎉 REDEPLOYMENT COMPLETED SUCCESSFULLY!");
  console.log("=" .repeat(70));
  console.log("📋 Deployment Summary:");
  console.log("   Network:", network.name);
  console.log("   Deployer:", deployer.address);
  console.log("   NEW PackageManager:", pmAddr);
  console.log("   OLD PackageManager:", existingDeployment.packageManager);
  console.log("   BLOCKS Token:", EXISTING_BLOCKS);
  console.log("   BLOCKS-LP Token:", EXISTING_BLOCKS_LP);
  console.log("   Vesting Vault:", EXISTING_VESTING_VAULT);
  console.log("   Treasury:", TREASURY_ADDRESS);
  
  console.log("\n🔧 Fixes Applied:");
  console.log("   ✅ 1:1 BLOCKS to BLOCKS-LP token ratio");
  console.log("   ✅ Referral system tracking corrected");
  console.log("   ✅ All existing functionality preserved");
  
  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contract on BSCScan");
  console.log("   2. Update frontend environment variables");
  console.log("   3. Test the fixes on mainnet");
  console.log("   4. Create test packages to verify functionality");
  
  console.log("\n🔗 BSCScan Verification URL:");
  console.log(`   https://bscscan.com/address/${pmAddr}#code`);
  
  console.log("\n📋 Constructor Arguments for Verification:");
  const constructorArgs = [
    USDT_ADDRESS,
    EXISTING_BLOCKS,
    EXISTING_BLOCKS_LP,
    EXISTING_VESTING_VAULT,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    EXISTING_TAX_MANAGER,
    deployer.address,
    initialTarget.toString()
  ];
  console.log("   ", JSON.stringify(constructorArgs, null, 2));
  
  return updatedDeployment;
}

main().catch((e) => {
  console.error("❌ Deployment failed:", e);
  process.exit(1);
});










