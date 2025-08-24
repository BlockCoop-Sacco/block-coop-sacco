const hre = require("hardhat");

async function main() {
  console.log("🔧 Fixing SwapTaxManager roles for tax bucket management...\n");

  // Get deployer signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("🔑 Deployer address:", deployer.address);
  console.log("💰 Deployer balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB");

  // Contract addresses from environment
  const TAX_MANAGER_ADDRESS = process.env.VITE_TAX_ADDRESS;
  const ADMIN_ADDRESS = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4"; // Primary admin
  const ADDITIONAL_ADMIN = "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987"; // Additional admin

  console.log("\n📍 Contract addresses:");
  console.log("SwapTaxManager:", TAX_MANAGER_ADDRESS);
  console.log("Primary Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);

  // Get contract instance
  const taxManager = await hre.ethers.getContractAt("SwapTaxManager", TAX_MANAGER_ADDRESS);

  // Get role constants
  const DEFAULT_ADMIN_ROLE = await taxManager.DEFAULT_ADMIN_ROLE();
  const MANAGER_ROLE = await taxManager.MANAGER_ROLE();

  console.log("\n🔍 Checking current roles...");
  
  // Check current roles for primary admin
  const hasDefaultAdmin = await taxManager.hasRole(DEFAULT_ADMIN_ROLE, ADMIN_ADDRESS);
  const hasManagerRole = await taxManager.hasRole(MANAGER_ROLE, ADMIN_ADDRESS);
  
  console.log(`Primary Admin (${ADMIN_ADDRESS}):`);
  console.log(`  - DEFAULT_ADMIN_ROLE: ${hasDefaultAdmin}`);
  console.log(`  - MANAGER_ROLE: ${hasManagerRole}`);

  // Check current roles for additional admin
  const hasDefaultAdminAdd = await taxManager.hasRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN);
  const hasManagerRoleAdd = await taxManager.hasRole(MANAGER_ROLE, ADDITIONAL_ADMIN);
  
  console.log(`Additional Admin (${ADDITIONAL_ADMIN}):`);
  console.log(`  - DEFAULT_ADMIN_ROLE: ${hasDefaultAdminAdd}`);
  console.log(`  - MANAGER_ROLE: ${hasManagerRoleAdd}`);

  // Check deployer roles
  const deployerHasDefaultAdmin = await taxManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const deployerHasManagerRole = await taxManager.hasRole(MANAGER_ROLE, deployer.address);
  
  console.log(`Deployer (${deployer.address}):`);
  console.log(`  - DEFAULT_ADMIN_ROLE: ${deployerHasDefaultAdmin}`);
  console.log(`  - MANAGER_ROLE: ${deployerHasManagerRole}`);

  console.log("\n🔧 Granting necessary roles...");

  // Grant MANAGER_ROLE to primary admin if not already granted
  if (!hasManagerRole) {
    console.log("📝 Granting MANAGER_ROLE to primary admin...");
    try {
      const tx1 = await taxManager.grantRole(MANAGER_ROLE, ADMIN_ADDRESS);
      await tx1.wait();
      console.log("✅ MANAGER_ROLE granted to primary admin");
    } catch (error) {
      console.error("❌ Failed to grant MANAGER_ROLE to primary admin:", error.message);
    }
  } else {
    console.log("✅ Primary admin already has MANAGER_ROLE");
  }

  // Grant MANAGER_ROLE to additional admin if not already granted
  if (!hasManagerRoleAdd) {
    console.log("📝 Granting MANAGER_ROLE to additional admin...");
    try {
      const tx2 = await taxManager.grantRole(MANAGER_ROLE, ADDITIONAL_ADMIN);
      await tx2.wait();
      console.log("✅ MANAGER_ROLE granted to additional admin");
    } catch (error) {
      console.error("❌ Failed to grant MANAGER_ROLE to additional admin:", error.message);
    }
  } else {
    console.log("✅ Additional admin already has MANAGER_ROLE");
  }

  console.log("\n🔍 Verifying roles after granting...");
  
  // Verify roles were granted
  const finalHasManagerRole = await taxManager.hasRole(MANAGER_ROLE, ADMIN_ADDRESS);
  const finalHasManagerRoleAdd = await taxManager.hasRole(MANAGER_ROLE, ADDITIONAL_ADMIN);
  
  console.log(`Primary Admin MANAGER_ROLE: ${finalHasManagerRole}`);
  console.log(`Additional Admin MANAGER_ROLE: ${finalHasManagerRoleAdd}`);

  console.log("\n🧪 Testing setBucket function...");
  
  // Test setBucket function with a test bucket
  try {
    const testKey = hre.ethers.encodeBytes32String("test");
    const testRate = 100; // 1%
    const testRecipient = ADMIN_ADDRESS;
    
    console.log("📝 Testing setBucket with test parameters...");
    const testTx = await taxManager.setBucket(testKey, testRate, testRecipient);
    await testTx.wait();
    console.log("✅ setBucket test successful!");
    
    // Verify the bucket was set
    const bucket = await taxManager.buckets(testKey);
    console.log(`Test bucket: ${bucket.rateBps} BPS → ${bucket.recipient}`);
    
  } catch (error) {
    console.error("❌ setBucket test failed:", error.message);
  }

  console.log("\n✅ Role fixing complete!");
  console.log("🎯 You can now use the tax bucket management interface in the frontend.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
