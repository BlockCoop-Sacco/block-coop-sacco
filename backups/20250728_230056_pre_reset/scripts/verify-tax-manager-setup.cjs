const hre = require("hardhat");

async function main() {
  console.log("🔍 Verifying SwapTaxManager setup and permissions...\n");

  // Contract addresses from environment
  const TAX_MANAGER_ADDRESS = process.env.VITE_TAX_ADDRESS;
  const ADMIN_ADDRESS = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";
  const ADDITIONAL_ADMIN = "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987";

  console.log("📍 Contract addresses:");
  console.log("SwapTaxManager:", TAX_MANAGER_ADDRESS);
  console.log("Primary Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);

  // Get contract instance
  const taxManager = await hre.ethers.getContractAt("SwapTaxManager", TAX_MANAGER_ADDRESS);

  // Get role constants
  const DEFAULT_ADMIN_ROLE = await taxManager.DEFAULT_ADMIN_ROLE();
  const MANAGER_ROLE = await taxManager.MANAGER_ROLE();

  console.log("\n🔑 Role constants:");
  console.log("DEFAULT_ADMIN_ROLE:", DEFAULT_ADMIN_ROLE);
  console.log("MANAGER_ROLE:", MANAGER_ROLE);

  console.log("\n👥 Current role assignments:");
  
  // Check roles for primary admin
  const hasDefaultAdmin = await taxManager.hasRole(DEFAULT_ADMIN_ROLE, ADMIN_ADDRESS);
  const hasManagerRole = await taxManager.hasRole(MANAGER_ROLE, ADMIN_ADDRESS);
  
  console.log(`Primary Admin (${ADMIN_ADDRESS}):`);
  console.log(`  ✅ DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin}`);
  console.log(`  ✅ MANAGER_ROLE: ${hasManagerRole}`);

  // Check roles for additional admin
  const hasDefaultAdminAdd = await taxManager.hasRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN);
  const hasManagerRoleAdd = await taxManager.hasRole(MANAGER_ROLE, ADDITIONAL_ADMIN);
  
  console.log(`Additional Admin (${ADDITIONAL_ADMIN}):`);
  console.log(`  ${hasDefaultAdminAdd ? '✅' : '❌'} DEFAULT_ADMIN_ROLE: ${hasDefaultAdminAdd}`);
  console.log(`  ✅ MANAGER_ROLE: ${hasManagerRoleAdd}`);

  console.log("\n📋 Current tax buckets:");
  
  // Check common bucket keys
  const commonBucketKeys = ["buy", "sell", "transfer", "liquidity", "marketing", "development"];
  
  for (const key of commonBucketKeys) {
    try {
      const keyBytes = hre.ethers.encodeBytes32String(key);
      const bucket = await taxManager.buckets(keyBytes);
      
      if (bucket.rateBps > 0 || bucket.recipient !== hre.ethers.ZeroAddress) {
        console.log(`  📦 ${key}: ${bucket.rateBps} BPS (${bucket.rateBps / 100}%) → ${bucket.recipient}`);
      }
    } catch (error) {
      console.log(`  ❌ Error checking ${key}: ${error.message}`);
    }
  }

  console.log("\n🎯 Setup Status:");
  
  if (hasManagerRole && hasManagerRoleAdd) {
    console.log("✅ Both admin wallets have MANAGER_ROLE - tax bucket management is ready!");
    console.log("✅ You can now create and modify tax buckets through the frontend interface.");
    console.log("\n📝 To use the tax bucket interface:");
    console.log("1. Connect your wallet (0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4)");
    console.log("2. Navigate to Admin → Taxes");
    console.log("3. Create tax buckets with keys like 'buy', 'sell', 'transfer'");
    console.log("4. Set rates in basis points (100 = 1%, 250 = 2.5%, etc.)");
    console.log("5. Specify recipient addresses for tax collection");
  } else {
    console.log("❌ Missing MANAGER_ROLE permissions - run fix-tax-manager-roles.cjs first");
  }

  console.log("\n🔧 Available tax bucket operations:");
  console.log("- setBucket(key, rateBps, recipient) - Create/update tax bucket");
  console.log("- buckets(keyBytes32) - View bucket configuration");
  console.log("- hasRole(MANAGER_ROLE, address) - Check permissions");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
