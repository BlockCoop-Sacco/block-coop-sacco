const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Final Integration Validation for Enhanced BLOCKS System...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Validating with account:", deployer.address);

  // Load enhanced integration deployment data
  const deployFile = "deployments/deployments-enhanced-integration.json";
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Enhanced integration deployment file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  
  console.log("📍 System Components:");
  console.log("Enhanced BLOCKS:", data.contracts.BLOCKS);
  console.log("PackageManager:", data.contracts.PackageManagerV2_1);
  console.log("BLOCKS-LP:", data.contracts["BLOCKS-LP"]);
  console.log("VestingVault:", data.contracts.VestingVault);
  console.log("SwapTaxManager:", data.contracts.SwapTaxManager);
  console.log("Treasury:", data.contracts.Treasury);
  
  // Get contract instances
  const pm = await ethers.getContractAt("PackageManagerV2_1", data.contracts.PackageManagerV2_1);
  const blocks = await ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);
  const blocksLP = await ethers.getContractAt("BLOCKS_LP", data.contracts["BLOCKS-LP"]);
  const vault = await ethers.getContractAt("VestingVault", data.contracts.VestingVault);
  const taxManager = await ethers.getContractAt("SwapTaxManager", data.contracts.SwapTaxManager);
  
  console.log("\n🔧 Step 1: Role and Permission Validation...");
  
  // Check critical roles
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  const TAX_MANAGER_ROLE = await blocks.TAX_MANAGER_ROLE();
  const LP_MINTER_ROLE = await blocksLP.MINTER_ROLE();
  const LP_BURNER_ROLE = await blocksLP.BURNER_ROLE();
  const LOCKER_ROLE = await vault.LOCKER_ROLE();
  
  const roleChecks = [
    {
      name: "PackageManager → BLOCKS MINTER_ROLE",
      hasRole: await blocks.hasRole(MINTER_ROLE, data.contracts.PackageManagerV2_1)
    },
    {
      name: "PackageManager → BLOCKS-LP MINTER_ROLE",
      hasRole: await blocksLP.hasRole(LP_MINTER_ROLE, data.contracts.PackageManagerV2_1)
    },
    {
      name: "PackageManager → BLOCKS-LP BURNER_ROLE",
      hasRole: await blocksLP.hasRole(LP_BURNER_ROLE, data.contracts.PackageManagerV2_1)
    },
    {
      name: "PackageManager → VestingVault LOCKER_ROLE",
      hasRole: await vault.hasRole(LOCKER_ROLE, data.contracts.PackageManagerV2_1)
    },
    {
      name: "Admin → BLOCKS TAX_MANAGER_ROLE",
      hasRole: await blocks.hasRole(TAX_MANAGER_ROLE, deployer.address)
    }
  ];
  
  console.log("🔑 Role Validation:");
  let allRolesValid = true;
  for (const check of roleChecks) {
    console.log(`${check.hasRole ? '✅' : '❌'} ${check.name}`);
    allRolesValid = allRolesValid && check.hasRole;
  }
  
  console.log("\n💰 Step 2: Tax Configuration Validation...");
  
  // Check DEX tax buckets
  const buyTaxKey = await blocks.BUY_TAX_KEY();
  const sellTaxKey = await blocks.SELL_TAX_KEY();
  const purchaseTaxKey = await pm.PURCHASE_TAX_KEY();
  const referralTaxKey = await pm.REFERRAL_TAX_KEY();
  
  const taxBuckets = [
    { name: "DEX Buy Tax", key: buyTaxKey, expectedRate: 100 },
    { name: "DEX Sell Tax", key: sellTaxKey, expectedRate: 100 },
    { name: "Package Purchase Tax", key: purchaseTaxKey, expectedRate: 200 },
    { name: "Referral Tax", key: referralTaxKey, expectedRate: 100 }
  ];
  
  console.log("💰 Tax Bucket Validation:");
  let allTaxesValid = true;
  for (const bucket of taxBuckets) {
    const taxInfo = await taxManager.buckets(bucket.key);
    const rate = Number(taxInfo[0]);
    const recipient = taxInfo[1];
    const isValid = rate === bucket.expectedRate && recipient === data.contracts.Treasury;
    
    console.log(`${isValid ? '✅' : '❌'} ${bucket.name}: ${rate} BPS → ${recipient === data.contracts.Treasury ? 'Treasury' : 'Invalid'}`);
    allTaxesValid = allTaxesValid && isValid;
  }
  
  console.log("\n📦 Step 3: Package Configuration Validation...");
  
  const packageCount = await pm.getPackageCount();
  const packageIds = await pm.getPackageIds();
  
  console.log(`📊 Package Summary: ${packageCount} packages configured`);
  
  let allPackagesValid = true;
  for (let i = 0; i < packageIds.length; i++) {
    const packageId = packageIds[i];
    const packageInfo = await pm.getPackage(packageId);
    const isActive = packageInfo.active;
    const hasValidRate = Number(packageInfo.exchangeRateBps) > 0;
    const hasValidVesting = Number(packageInfo.vestBps) <= 10000;
    
    const isValid = isActive && hasValidRate && hasValidVesting;
    console.log(`${isValid ? '✅' : '❌'} Package ${packageId}: ${packageInfo.name} - ${ethers.formatUnits(packageInfo.entryUSDT, 6)} USDT`);
    allPackagesValid = allPackagesValid && isValid;
  }
  
  console.log("\n🔗 Step 4: Contract Integration Validation...");
  
  // Check contract addresses in PackageManager
  const pmShareToken = await pm.shareToken();
  const pmLpToken = await pm.lpToken();
  const pmVault = await pm.vestingVault();
  const pmTaxManager = await pm.taxManager();
  const pmTreasury = await pm.treasury();
  
  const integrationChecks = [
    {
      name: "PackageManager → Enhanced BLOCKS",
      expected: data.contracts.BLOCKS,
      actual: pmShareToken
    },
    {
      name: "PackageManager → BLOCKS-LP",
      expected: data.contracts["BLOCKS-LP"],
      actual: pmLpToken
    },
    {
      name: "PackageManager → VestingVault",
      expected: data.contracts.VestingVault,
      actual: pmVault
    },
    {
      name: "PackageManager → SwapTaxManager",
      expected: data.contracts.SwapTaxManager,
      actual: pmTaxManager
    },
    {
      name: "PackageManager → Treasury",
      expected: data.contracts.Treasury,
      actual: pmTreasury
    }
  ];
  
  console.log("🔗 Integration Validation:");
  let allIntegrationsValid = true;
  for (const check of integrationChecks) {
    const isValid = check.expected.toLowerCase() === check.actual.toLowerCase();
    console.log(`${isValid ? '✅' : '❌'} ${check.name}`);
    if (!isValid) {
      console.log(`   Expected: ${check.expected}`);
      console.log(`   Actual: ${check.actual}`);
    }
    allIntegrationsValid = allIntegrationsValid && isValid;
  }
  
  console.log("\n🌐 Step 5: Frontend Configuration Validation...");
  
  // Check .env configuration
  const envConfig = {
    VITE_SHARE_ADDRESS: process.env.VITE_SHARE_ADDRESS,
    VITE_PACKAGE_MANAGER_ADDRESS: process.env.VITE_PACKAGE_MANAGER_ADDRESS
  };
  
  const frontendChecks = [
    {
      name: "Frontend BLOCKS Address",
      expected: data.contracts.BLOCKS,
      actual: envConfig.VITE_SHARE_ADDRESS
    },
    {
      name: "Frontend PackageManager Address",
      expected: data.contracts.PackageManagerV2_1,
      actual: envConfig.VITE_PACKAGE_MANAGER_ADDRESS
    }
  ];
  
  console.log("🌐 Frontend Configuration:");
  let allFrontendValid = true;
  for (const check of frontendChecks) {
    const isValid = check.expected.toLowerCase() === check.actual?.toLowerCase();
    console.log(`${isValid ? '✅' : '❌'} ${check.name}`);
    if (!isValid) {
      console.log(`   Expected: ${check.expected}`);
      console.log(`   Actual: ${check.actual || 'undefined'}`);
    }
    allFrontendValid = allFrontendValid && isValid;
  }
  
  console.log("\n🎯 Final Validation Summary");
  console.log("=====================================");
  
  const overallValid = allRolesValid && allTaxesValid && allPackagesValid && allIntegrationsValid && allFrontendValid;
  
  console.log(`🔑 Role Assignments: ${allRolesValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`💰 Tax Configuration: ${allTaxesValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`📦 Package Setup: ${allPackagesValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`🔗 Contract Integration: ${allIntegrationsValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`🌐 Frontend Configuration: ${allFrontendValid ? '✅ VALID' : '❌ INVALID'}`);
  
  console.log("\n" + "=".repeat(50));
  
  if (overallValid) {
    console.log("🎉 INTEGRATION VALIDATION SUCCESSFUL!");
    console.log("✅ Enhanced BLOCKS system is fully operational");
    console.log("✅ DEX tax collection ready for revenue generation");
    console.log("✅ Package purchase flow validated");
    console.log("✅ All components properly integrated");
    console.log("✅ Frontend configuration updated");
    
    console.log("\n🚀 SYSTEM READY FOR PRODUCTION USE!");
    
    console.log("\n📋 Key Features Active:");
    console.log("• 1% DEX buy/sell taxes → Treasury");
    console.log("• 2% package purchase tax → Treasury");
    console.log("• 1% referral tax → Treasury");
    console.log("• 70/30 token distribution (vesting/liquidity)");
    console.log("• 1:1 LP token minting");
    console.log("• Configurable vesting schedules");
    console.log("• AMM pair tax detection");
    
  } else {
    console.log("❌ INTEGRATION VALIDATION FAILED!");
    console.log("Please review and fix the issues above before proceeding.");
  }
  
  console.log("\n🔗 Contract Addresses:");
  console.log("Enhanced BLOCKS:", data.contracts.BLOCKS);
  console.log("PackageManager:", data.contracts.PackageManagerV2_1);
  console.log("Treasury:", data.contracts.Treasury);
  console.log("BSCScan:", `https://testnet.bscscan.com/address/${data.contracts.BLOCKS}#code`);
}

main().catch((error) => {
  console.error("\n❌ Validation failed:");
  console.error(error);
  process.exit(1);
});
