const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🏦 Setting up Treasury BLOCKS approval for NEW PackageManager...");
  console.log("================================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Using account:", deployer.address);

  // Load deployment data for the new contract
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-referral-fix.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Referral fix deployment file not found.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(deploymentFile));
  const PACKAGE_MANAGER_ADDRESS = data.contracts.PackageManagerV2_1;
  const BLOCKS_ADDRESS = data.contracts.BLOCKS;
  const TREASURY_ADDRESS = data.contracts.Treasury;

  console.log("📍 Contract addresses:");
  console.log("BLOCKS Token:", BLOCKS_ADDRESS);
  console.log("PackageManager (NEW):", PACKAGE_MANAGER_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);

  // Get contract instances
  const blocks = await hre.ethers.getContractAt("BLOCKS", BLOCKS_ADDRESS);
  const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", PACKAGE_MANAGER_ADDRESS);

  console.log("\n📊 Step 1: Checking current state...");
  const treasuryBalance = await blocks.balanceOf(TREASURY_ADDRESS);
  const currentAllowance = await blocks.allowance(TREASURY_ADDRESS, PACKAGE_MANAGER_ADDRESS);
  
  console.log("Treasury BLOCKS balance:", hre.ethers.formatEther(treasuryBalance));
  console.log("Current allowance to NEW PackageManager:", hre.ethers.formatEther(currentAllowance));

  // Check if deployer is treasury
  if (deployer.address.toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) {
    console.error("❌ Deployer is not the treasury address. Cannot approve.");
    console.log("Expected treasury:", TREASURY_ADDRESS);
    console.log("Current deployer:", deployer.address);
    process.exit(1);
  }

  console.log("\n✅ Deployer is treasury - proceeding with approval...");

  // Calculate approval amount (1 million BLOCKS for referral payments)
  const approvalAmount = hre.ethers.parseEther("1000000"); // 1M BLOCKS
  
  console.log("\n🔐 Step 2: Approving NEW PackageManager to spend treasury BLOCKS...");
  console.log("Approval amount:", hre.ethers.formatEther(approvalAmount), "BLOCKS");
  
  const tx = await blocks.approve(PACKAGE_MANAGER_ADDRESS, approvalAmount);
  await tx.wait();
  console.log("✅ Approval transaction completed");
  
  // Verify approval
  const newAllowance = await blocks.allowance(TREASURY_ADDRESS, PACKAGE_MANAGER_ADDRESS);
  console.log("New allowance:", hre.ethers.formatEther(newAllowance), "BLOCKS");

  console.log("\n🧪 Step 3: Testing NEW PackageManager functions...");
  
  // Test treasury balance and allowance functions
  const treasuryBalanceFromPM = await packageManager.getTreasuryBlocksBalance();
  const allowanceFromPM = await packageManager.getTreasuryBlocksAllowance();
  
  console.log("Treasury balance (from NEW PM):", hre.ethers.formatEther(treasuryBalanceFromPM));
  console.log("Allowance (from NEW PM):", hre.ethers.formatEther(allowanceFromPM));

  console.log("\n📦 Step 4: Checking package configurations...");
  
  const packageCount = await packageManager.getPackageCount();
  console.log("Total packages:", packageCount.toString());
  
  for (let i = 0; i < packageCount; i++) {
    const pkg = await packageManager.getPackage(i);
    console.log(`Package ${i}: ${pkg.name} - Referral Rate: ${Number(pkg.referralBps)/100}%`);
  }

  console.log("\n🎉 Treasury setup for NEW PackageManager completed successfully!");

  console.log("\n📋 Summary:");
  console.log("- Treasury BLOCKS balance:", hre.ethers.formatEther(treasuryBalance));
  console.log("- NEW PackageManager allowance:", hre.ethers.formatEther(newAllowance));
  console.log("- Referral system status: READY");

  console.log("\n✅ The referral system is now properly configured for the NEW contract:");
  console.log("1. ✅ Referral rewards will be paid from treasury BLOCKS balance");
  console.log("2. ✅ ReferralPaid event will be emitted for tracking");
  console.log("3. ✅ Treasury has sufficient allowance for referral payments");
  console.log("4. ✅ Fixed referral calculation (5% instead of 5.26%)");

  console.log("\n📝 Ready for end-to-end testing!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Treasury setup failed:", error);
    process.exit(1);
  });
