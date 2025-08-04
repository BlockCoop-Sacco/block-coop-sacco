const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Post-deployment configuration script for PackageManagerV2_1
 * This script handles:
 * 1. Tax bucket configuration
 * 2. Initial package setup
 * 3. System validation
 */

async function main() {
  console.log("🔧 Starting PackageManagerV2_1 configuration...");
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Admin address:", deployer.address);
  console.log("🌐 Network:", network.name);
  
  const deployFile = path.resolve(__dirname, "../deployments/deployments.json");
  const data = JSON.parse(fs.readFileSync(deployFile));
  
  const { PackageManagerV2_1, SwapTaxManager } = data.contracts;
  
  if (!PackageManagerV2_1) {
    throw new Error("PackageManagerV2_1 not found in deployments. Please deploy first.");
  }
  
  console.log("📋 Using contracts:");
  console.log("PackageManagerV2_1:", PackageManagerV2_1);
  console.log("SwapTaxManager:", SwapTaxManager);

  // Get contract instances
  const pm = await ethers.getContractAt("PackageManagerV2_1", PackageManagerV2_1, deployer);
  const taxManager = await ethers.getContractAt("contracts/BlockCoopV2.sol:SwapTaxManager", SwapTaxManager, deployer);

  // 1. Configure Tax Buckets
  console.log("\n💰 Configuring tax buckets...");
  
  const MANAGER_ROLE = ethers.id("MANAGER_ROLE");
  
  // Grant MANAGER_ROLE to deployer if not already granted
  try {
    const hasManagerRole = await taxManager.hasRole(MANAGER_ROLE, deployer.address);
    if (!hasManagerRole) {
      console.log("📝 Granting MANAGER_ROLE to deployer...");
      const tx = await taxManager.grantRole(MANAGER_ROLE, deployer.address);
      await tx.wait();
      console.log("✅ MANAGER_ROLE granted");
    } else {
      console.log("✅ Deployer already has MANAGER_ROLE");
    }
  } catch (error) {
    console.error("❌ Error with MANAGER_ROLE:", error.message);
  }

  // Configure tax buckets
  const taxBuckets = [
    {
      key: ethers.id("PURCHASE"),
      rateBps: 250, // 2.5%
      recipient: deployer.address, // Treasury
      description: "Purchase Tax"
    },
    {
      key: ethers.id("REFERRAL"),
      rateBps: 100, // 1%
      recipient: deployer.address, // Treasury
      description: "Referral Tax"
    }
  ];

  for (const bucket of taxBuckets) {
    try {
      console.log(`📝 Setting ${bucket.description} (${bucket.rateBps / 100}%)...`);
      const tx = await taxManager.setBucket(bucket.key, bucket.rateBps, bucket.recipient);
      await tx.wait();
      console.log(`✅ ${bucket.description} configured`);
    } catch (error) {
      console.error(`❌ Error setting ${bucket.description}:`, error.message);
    }
  }

  // 2. Add Initial Packages
  console.log("\n📦 Adding initial investment packages...");
  
  const packages = [
    {
      name: "Starter Package",
      entryUSDT: ethers.parseUnits("100", 6), // 100 USDT (6 decimals)
      exchangeRateBps: 5000, // 50% exchange rate
      vestBps: 3000, // 30% vested
      cliff: 30 * 24 * 60 * 60, // 30 days
      duration: 365 * 24 * 60 * 60, // 1 year
      referralBps: 500 // 5% referral
    },
    {
      name: "Growth Package", 
      entryUSDT: ethers.parseUnits("500", 6), // 500 USDT
      exchangeRateBps: 4500, // 45% exchange rate
      vestBps: 4000, // 40% vested
      cliff: 60 * 24 * 60 * 60, // 60 days
      duration: 365 * 24 * 60 * 60, // 1 year
      referralBps: 750 // 7.5% referral
    },
    {
      name: "Premium Package",
      entryUSDT: ethers.parseUnits("1000", 6), // 1000 USDT
      exchangeRateBps: 4000, // 40% exchange rate
      vestBps: 5000, // 50% vested
      cliff: 90 * 24 * 60 * 60, // 90 days
      duration: 2 * 365 * 24 * 60 * 60, // 2 years
      referralBps: 1000 // 10% referral
    }
  ];

  for (const pkg of packages) {
    try {
      console.log(`📝 Adding ${pkg.name}...`);
      const tx = await pm.addPackage(
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

  // 3. Verify Configuration
  console.log("\n🔍 Verifying configuration...");
  
  try {
    // Check package count
    const packageCount = await pm.getPackageCount();
    console.log(`📊 Total packages: ${packageCount}`);
    
    // Check active packages
    const activePackageIds = await pm.getActivePackageIds();
    console.log(`📊 Active packages: ${activePackageIds.length}`);
    
    // Display package details
    for (let i = 0; i < activePackageIds.length; i++) {
      const packageId = activePackageIds[i];
      const packageInfo = await pm.getPackage(packageId);
      console.log(`   Package ${packageId}: ${packageInfo.name} - ${ethers.formatUnits(packageInfo.entryUSDT, 6)} USDT`);
    }
    
    // Verify tax buckets
    for (const bucket of taxBuckets) {
      const bucketInfo = await taxManager.buckets(bucket.key);
      console.log(`💰 ${bucket.description}: ${bucketInfo.rateBps / 100}% -> ${bucketInfo.recipient}`);
    }
    
  } catch (error) {
    console.error("❌ Verification error:", error.message);
  }

  console.log("\n🎉 Configuration completed successfully!");
  console.log("\n🔗 Next steps:");
  console.log("1. Test package purchases on testnet");
  console.log("2. Verify tax deductions are working");
  console.log("3. Update frontend with new package data");
  console.log("4. Monitor system performance");
}

main().catch(err => {
  console.error("\n❌ Configuration failed:");
  console.error(err);
  process.exit(1);
});
