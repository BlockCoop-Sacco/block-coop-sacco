const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

/**
 * Configure PackageManagerV2_1 V3 with initial settings and tax buckets
 */

async function main() {
  console.log("🔧 Starting PackageManagerV2_1 V3 configuration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Admin address:", deployer.address);
  console.log("🌐 Network:", network.name);
  
  const deployFile = path.resolve(__dirname, "../deployments/deployments-v3-blocks.json");
  
  if (!fs.existsSync(deployFile)) {
    throw new Error("Deployment file not found. Please deploy contracts first using deploy-blocks-v3.cjs");
  }
  
  const data = JSON.parse(fs.readFileSync(deployFile));
  
  const { PackageManagerV2_1, SwapTaxManager } = data.contracts;
  
  if (!PackageManagerV2_1) {
    throw new Error("PackageManagerV2_1 not found in deployments. Please deploy first.");
  }
  
  console.log("📍 Using contracts:");
  console.log("PackageManagerV2_1:", PackageManagerV2_1);
  console.log("SwapTaxManager:", SwapTaxManager);
  
  // Get contract instances
  const pm = await ethers.getContractAt("PackageManagerV2_1", PackageManagerV2_1);
  const taxManager = await ethers.getContractAt("SwapTaxManager", SwapTaxManager);
  
  console.log("\n⚙️ Step 1: Configuring tax buckets...");
  
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
  
  console.log("\n⚙️ Step 3: Adding sample packages...");
  
  // Add sample packages with new structure (no exchangeRateBps)
  const packages = [
    {
      name: "Starter Package",
      entryUSDT: ethers.parseUnits("100", 6), // 100 USDT (6 decimals)
      vestBps: 7000, // 70% vesting
      cliff: 30 * 24 * 60 * 60, // 30 days cliff
      duration: 365 * 24 * 60 * 60, // 1 year vesting
      referralBps: 500 // 5% referral reward
    },
    {
      name: "Growth Package",
      entryUSDT: ethers.parseUnits("500", 6), // 500 USDT (6 decimals)
      vestBps: 6000, // 60% vesting
      cliff: 60 * 24 * 60 * 60, // 60 days cliff
      duration: 18 * 30 * 24 * 60 * 60, // 18 months vesting
      referralBps: 750 // 7.5% referral reward
    },
    {
      name: "Premium Package",
      entryUSDT: ethers.parseUnits("1000", 6), // 1000 USDT (6 decimals)
      vestBps: 5000, // 50% vesting
      cliff: 90 * 24 * 60 * 60, // 90 days cliff
      duration: 24 * 30 * 24 * 60 * 60, // 24 months vesting
      referralBps: 1000 // 10% referral reward
    }
  ];
  
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    console.log(`Adding package: ${pkg.name}...`);
    
    tx = await pm.addPackage(
      pkg.name,
      pkg.entryUSDT,
      pkg.vestBps,
      pkg.cliff,
      pkg.duration,
      pkg.referralBps
    );
    await tx.wait();
    console.log(`✅ Package ${i} added: ${pkg.name}`);
  }
  
  console.log("\n📊 Step 4: Verifying configuration...");
  
  // Verify exchange rate
  const finalRate = await pm.usdtToBlocksRateBps();
  console.log("Final exchange rate (BPS):", finalRate.toString());
  console.log("Exchange rate (BLOCKS per USDT):", (Number(finalRate) / 10000).toFixed(2));
  
  // Verify packages
  const packageCount = await pm.getPackageCount();
  console.log("Total packages created:", packageCount.toString());
  
  const activePackages = await pm.getActivePackageIds();
  console.log("Active package IDs:", activePackages.map(id => id.toString()));
  
  // Verify tax buckets
  const purchaseTax = await taxManager.getTaxBucket(purchaseTaxKey);
  const referralTax = await taxManager.getTaxBucket(referralTaxKey);
  
  console.log("Purchase tax:", {
    rate: (Number(purchaseTax.rateBps) / 100).toFixed(1) + "%",
    recipient: purchaseTax.recipient
  });

  console.log("Referral tax:", {
    rate: (Number(referralTax.rateBps) / 100).toFixed(1) + "%",
    recipient: referralTax.recipient
  });
  
  console.log("\n🎉 Configuration completed successfully!");
  console.log("\n📋 Summary:");
  console.log("- Exchange rate: 1 USDT = 0.5 BLOCKS");
  console.log("- Token distribution: 70% USDT to vesting, 30% USDT to liquidity");
  console.log("- BLOCKS distribution: 70% to vesting, 30% to liquidity");
  console.log("- BLOCKS-LP tokens: 1:1 with total BLOCKS amount");
  console.log("- Purchase tax: 2% to treasury");
  console.log("- Referral tax: 1% to treasury");
  console.log(`- Sample packages: ${packages.length} created`);
  
  console.log("\n🔄 Next Steps:");
  console.log("1. Test package purchase flow");
  console.log("2. Verify liquidity pool creation");
  console.log("3. Test vesting and redemption");
  console.log("4. Update frontend with new contract addresses");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Configuration failed:", error);
    process.exit(1);
  });
