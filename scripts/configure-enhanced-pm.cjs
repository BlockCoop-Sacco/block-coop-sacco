const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔧 Configuring Enhanced PackageManager with Initial Packages...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Configuring with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB\n");

  // Load enhanced integration deployment data
  const deployFile = "deployments/deployments-enhanced-integration.json";
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Enhanced integration deployment file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  
  console.log("📍 Using enhanced integration deployment:");
  console.log("Enhanced BLOCKS:", data.contracts.BLOCKS);
  console.log("New PackageManager:", data.contracts.PackageManagerV2_1);
  console.log("SwapTaxManager:", data.contracts.SwapTaxManager);
  console.log("Treasury:", data.contracts.Treasury);
  
  // Get contract instances
  const pm = await ethers.getContractAt("PackageManagerV2_1", data.contracts.PackageManagerV2_1);
  const taxManager = await ethers.getContractAt("SwapTaxManager", data.contracts.SwapTaxManager);
  
  console.log("\n⚙️ Step 1: Configuring tax buckets for PackageManager...");
  
  // Configure purchase tax bucket (2% to treasury)
  const purchaseTaxKey = await pm.PURCHASE_TAX_KEY();
  console.log("Setting purchase tax: 2% to treasury...");
  let tx = await taxManager.setBucket(
    purchaseTaxKey,
    200, // 2% in basis points
    data.contracts.Treasury
  );
  await tx.wait();
  console.log("✅ Purchase tax bucket configured");
  
  // Configure referral tax bucket (1% to treasury)
  const referralTaxKey = await pm.REFERRAL_TAX_KEY();
  console.log("Setting referral tax: 1% to treasury...");
  tx = await taxManager.setBucket(
    referralTaxKey,
    100, // 1% in basis points
    data.contracts.Treasury
  );
  await tx.wait();
  console.log("✅ Referral tax bucket configured");
  
  console.log("\n📦 Step 2: Adding initial packages...");
  
  const packages = [
    {
      name: "Starter Package",
      entryUSDT: ethers.parseUnits("100", 6), // 100 USDT
      exchangeRateBps: 5000, // 0.5 BLOCKS per USDT
      vestBps: 7000, // 70% vesting
      cliff: 0, // No cliff
      duration: 86400 * 30, // 30 days
      referralBps: 200, // 2% referral
      description: "Entry-level package for new investors"
    },
    {
      name: "Growth Package",
      entryUSDT: ethers.parseUnits("500", 6), // 500 USDT
      exchangeRateBps: 5000, // 0.5 BLOCKS per USDT
      vestBps: 7000, // 70% vesting
      cliff: 86400 * 7, // 7 day cliff
      duration: 86400 * 90, // 90 days
      referralBps: 300, // 3% referral
      description: "Mid-tier package for growing portfolios"
    },
    {
      name: "Premium Package",
      entryUSDT: ethers.parseUnits("1000", 6), // 1000 USDT
      exchangeRateBps: 5000, // 0.5 BLOCKS per USDT
      vestBps: 7000, // 70% vesting
      cliff: 86400 * 14, // 14 day cliff
      duration: 86400 * 180, // 180 days
      referralBps: 500, // 5% referral
      description: "Premium package for serious investors"
    }
  ];

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    try {
      console.log(`📝 Adding ${pkg.name}...`);
      tx = await pm.addPackage(
        pkg.name,
        pkg.entryUSDT,
        pkg.exchangeRateBps,
        pkg.vestBps,
        pkg.cliff,
        pkg.duration,
        pkg.referralBps
      );
      await tx.wait();
      console.log(`✅ ${pkg.name} added successfully`);
    } catch (error) {
      console.error(`❌ Error adding ${pkg.name}:`, error.message);
    }
  }
  
  console.log("\n🔍 Step 3: Verifying configuration...");
  
  try {
    // Verify tax buckets
    const purchaseTax = await taxManager.buckets(purchaseTaxKey);
    const referralTax = await taxManager.buckets(referralTaxKey);
    
    console.log("💰 Tax Configuration:");
    console.log(`Purchase Tax: ${purchaseTax[0]} BPS (${Number(purchaseTax[0]) / 100}%) → ${purchaseTax[1]}`);
    console.log(`Referral Tax: ${referralTax[0]} BPS (${Number(referralTax[0]) / 100}%) → ${referralTax[1]}`);
    
    // Verify packages
    const packageCount = await pm.getPackageCount();
    console.log(`📦 Total packages added: ${packageCount}`);
    
    const packageIds = await pm.getPackageIds();
    console.log("📋 Package IDs:", packageIds.map(id => Number(id)));
    
    // Get package details
    for (let i = 0; i < packageIds.length; i++) {
      const packageId = packageIds[i];
      const packageInfo = await pm.getPackage(packageId);
      console.log(`📦 Package ${packageId}: ${packageInfo.name} - ${ethers.formatUnits(packageInfo.entryUSDT, 6)} USDT`);
    }
    
    // Verify roles
    const blocks = await ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);
    const MINTER_ROLE = await blocks.MINTER_ROLE();
    const hasRole = await blocks.hasRole(MINTER_ROLE, data.contracts.PackageManagerV2_1);
    console.log(`🔑 PackageManager has MINTER_ROLE on enhanced BLOCKS: ${hasRole}`);
    
  } catch (error) {
    console.error("❌ Verification error:", error.message);
  }

  console.log("\n🎉 Enhanced PackageManager configuration completed successfully!");
  
  console.log("\n📋 Configuration Summary:");
  console.log("=====================================");
  console.log("Enhanced BLOCKS Token:", data.contracts.BLOCKS);
  console.log("PackageManager:", data.contracts.PackageManagerV2_1);
  console.log("Purchase Tax: 2% → Treasury");
  console.log("Referral Tax: 1% → Treasury");
  console.log("DEX Buy Tax: 1% → Treasury (via enhanced BLOCKS)");
  console.log("DEX Sell Tax: 1% → Treasury (via enhanced BLOCKS)");
  console.log("Treasury Address:", data.contracts.Treasury);
  console.log("Packages Added: 3 (Starter, Growth, Premium)");
  console.log("=====================================");
  
  console.log("\n🔗 Next Steps:");
  console.log("1. Test package purchase with enhanced BLOCKS integration");
  console.log("2. Verify token distribution (70% vesting, 30% liquidity)");
  console.log("3. Test DEX tax collection during token transfers");
  console.log("4. Update frontend to use new PackageManager address");
  console.log("5. Create BLOCKS/USDT liquidity pool for DEX trading");
}

main().catch((error) => {
  console.error("\n❌ Configuration failed:");
  console.error(error);
  process.exit(1);
});
