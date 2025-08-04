const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🏦 Setting up Treasury BLOCKS approval for referral payments...");
  
  // Load deployment data
  const data = JSON.parse(fs.readFileSync("deployments/deployments-fresh-v2.json", "utf8"));

  const [deployer] = await ethers.getSigners();
  console.log("📍 Using account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Contract addresses
  const BLOCKS_ADDRESS = data.contracts.BLOCKS;
  const PACKAGE_MANAGER_ADDRESS = data.contracts.PackageManagerV2_1_Sustainable;
  const TREASURY_ADDRESS = data.contracts.Treasury;

  console.log("\n📍 Contract addresses:");
  console.log("BLOCKS Token:", BLOCKS_ADDRESS);
  console.log("PackageManager:", PACKAGE_MANAGER_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);

  // Get contract instances
  const blocks = await ethers.getContractAt("BLOCKS", BLOCKS_ADDRESS);
  const packageManager = await ethers.getContractAt("PackageManagerV2_1", PACKAGE_MANAGER_ADDRESS);

  console.log("\n📊 Step 1: Checking current state...");
  
  // Check treasury BLOCKS balance
  const treasuryBalance = await blocks.balanceOf(TREASURY_ADDRESS);
  console.log("Treasury BLOCKS balance:", ethers.formatEther(treasuryBalance));
  
  // Check current allowance
  const currentAllowance = await blocks.allowance(TREASURY_ADDRESS, PACKAGE_MANAGER_ADDRESS);
  console.log("Current allowance:", ethers.formatEther(currentAllowance));
  
  // Check if deployer is treasury (for approval)
  if (deployer.address.toLowerCase() !== TREASURY_ADDRESS.toLowerCase()) {
    console.log("⚠️  WARNING: Deployer is not the treasury address!");
    console.log("Treasury address:", TREASURY_ADDRESS);
    console.log("Deployer address:", deployer.address);
    console.log("\n📝 Manual steps required:");
    console.log("1. Connect to the treasury wallet");
    console.log("2. Call blocks.approve(packageManagerAddress, approvalAmount)");
    console.log("3. Use a large approval amount (e.g., 1,000,000 BLOCKS)");
    return;
  }

  console.log("\n✅ Deployer is treasury - proceeding with approval...");

  // Calculate approval amount (1 million BLOCKS for referral payments)
  const approvalAmount = ethers.parseEther("1000000"); // 1M BLOCKS
  
  console.log("\n🔐 Step 2: Approving PackageManager to spend treasury BLOCKS...");
  console.log("Approval amount:", ethers.formatEther(approvalAmount), "BLOCKS");
  
  const tx = await blocks.approve(PACKAGE_MANAGER_ADDRESS, approvalAmount);
  await tx.wait();
  console.log("✅ Approval transaction completed");
  
  // Verify approval
  const newAllowance = await blocks.allowance(TREASURY_ADDRESS, PACKAGE_MANAGER_ADDRESS);
  console.log("New allowance:", ethers.formatEther(newAllowance), "BLOCKS");

  console.log("\n🧪 Step 3: Testing referral system functions...");
  
  // Test treasury balance checking functions
  const treasuryBalanceFromPM = await packageManager.getTreasuryBlocksBalance();
  const allowanceFromPM = await packageManager.getTreasuryBlocksAllowance();
  
  console.log("Treasury balance (from PM):", ethers.formatEther(treasuryBalanceFromPM));
  console.log("Allowance (from PM):", ethers.formatEther(allowanceFromPM));

  console.log("\n📦 Step 4: Checking package configurations...");
  
  // Get package count and display referral rates
  const packageCount = await packageManager.getPackageCount();
  console.log("Total packages:", packageCount.toString());
  
  for (let i = 0; i < packageCount; i++) {
    const pkg = await packageManager.getPackage(i);
    console.log(`Package ${i}: ${pkg.name} - Referral Rate: ${Number(pkg.referralBps)/100}%`);
  }

  console.log("\n💾 Step 5: Updating deployment data...");
  
  // Update deployment data
  if (!data.deployment) data.deployment = {};
  data.deployment.treasurySetup = {
    timestamp: new Date().toISOString(),
    treasuryAddress: TREASURY_ADDRESS,
    blocksBalance: ethers.formatEther(treasuryBalance),
    approvalAmount: "1000000.0",
    packageManagerApproved: PACKAGE_MANAGER_ADDRESS,
    status: "ready_for_referrals"
  };

  fs.writeFileSync("deployments/deployments-fresh-v2.json", JSON.stringify(data, null, 2));
  console.log("✅ Deployment data updated");

  console.log("\n🎉 Treasury setup completed successfully!");
  console.log("\n📋 Summary:");
  console.log("- Treasury BLOCKS balance:", ethers.formatEther(treasuryBalance));
  console.log("- PackageManager allowance:", ethers.formatEther(newAllowance));
  console.log("- Referral system status: READY");
  
  console.log("\n✅ The referral system is now properly configured:");
  console.log("1. ✅ Referral rewards will be paid from treasury BLOCKS balance");
  console.log("2. ✅ ReferralPaid event will be emitted for tracking");
  console.log("3. ✅ Treasury has sufficient allowance for referral payments");
  console.log("4. ✅ Balance checking functions are available");
  
  console.log("\n📝 Next steps:");
  console.log("1. Update frontend to use new PackageManager address");
  console.log("2. Monitor treasury BLOCKS balance regularly");
  console.log("3. Top up treasury balance when needed");
  console.log("4. Test referral functionality with small purchases");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
