const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Referral Calculation Fix...");
  console.log("=====================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Load deployment data
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-referral-fix.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Referral fix deployment file not found. Please deploy the contract first.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(deploymentFile));
  const packageManagerAddress = data.contracts.PackageManagerV2_1;

  console.log("📋 Contract Address:", packageManagerAddress);

  // Get contract instances
  const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", packageManagerAddress);
  const usdt = await hre.ethers.getContractAt("IERC20", data.contracts.USDT);
  const blocks = await hre.ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);

  console.log("\n🔍 Step 1: Checking contract configuration...");
  
  // Check if packages exist
  const packageCount = await packageManager.getPackageCount();
  console.log("Package count:", packageCount.toString());

  if (packageCount === 0n) {
    console.log("📦 No packages found. Adding a test package...");
    
    // Add a test package with 5% referral rate
    const tx = await packageManager.addPackage(
      "Test Referral Package",
      hre.ethers.parseUnits("100", 6), // 100 USDT
      hre.ethers.parseUnits("2.0", 6),  // 2.0 USDT per BLOCKS exchange rate
      7000, // 70% vesting
      0,    // No cliff
      86400 * 30, // 30 days vesting
      500   // 5% referral (500 basis points)
    );
    await tx.wait();
    console.log("✅ Test package added");
  }

  // Get the first package for testing
  const pkg = await packageManager.getPackage(0);
  console.log("\n📦 Test Package Details:");
  console.log("Name:", pkg.name);
  console.log("Entry USDT:", hre.ethers.formatUnits(pkg.entryUSDT, 6));
  console.log("Exchange Rate:", hre.ethers.formatUnits(pkg.exchangeRate, 6), "USDT per BLOCKS");
  console.log("Referral BPS:", pkg.referralBps.toString(), "(", Number(pkg.referralBps) / 100, "%)");

  console.log("\n🧮 Step 2: Calculating expected referral amounts...");
  
  // Simulate the calculation logic
  const entryUSDT = pkg.entryUSDT;
  const exchangeRate = pkg.exchangeRate;
  const referralBps = pkg.referralBps;

  // Assume no purchase tax for simplicity
  const netUSDT = entryUSDT;
  const scale = 10n ** 12n; // Scale factor for USDT (6 decimals) to 18 decimals
  const netUSDT18 = netUSDT * scale;
  
  // Calculate total user tokens (this is what should be used for referral calculation)
  const totalUserTokens = (netUSDT18 * 10n**18n) / (exchangeRate * scale);
  
  // Calculate treasury tokens (5% of user tokens)
  const treasuryTokens = (totalUserTokens * 500n) / 10000n;
  
  // Calculate total tokens (user + treasury) - this was incorrectly used before
  const totalTokens = totalUserTokens + treasuryTokens;

  console.log("Entry USDT:", hre.ethers.formatUnits(entryUSDT, 6));
  console.log("Total User Tokens:", hre.ethers.formatEther(totalUserTokens));
  console.log("Treasury Tokens (5%):", hre.ethers.formatEther(treasuryTokens));
  console.log("Total Tokens (User + Treasury):", hre.ethers.formatEther(totalTokens));

  // Calculate referral amounts
  const correctReferral = (totalUserTokens * referralBps) / 10000n; // Fixed calculation
  const incorrectReferral = (totalTokens * referralBps) / 10000n;   // Old buggy calculation

  console.log("\n💰 Referral Calculations:");
  console.log("Correct (5% of user tokens):", hre.ethers.formatEther(correctReferral), "BLOCKS");
  console.log("Incorrect (5% of total tokens):", hre.ethers.formatEther(incorrectReferral), "BLOCKS");
  
  const percentageDifference = ((incorrectReferral - correctReferral) * 10000n) / correctReferral;
  console.log("Difference:", Number(percentageDifference) / 100, "% extra in old calculation");

  console.log("\n✅ Expected Behavior:");
  console.log("- Fixed contract should pay:", hre.ethers.formatEther(correctReferral), "BLOCKS (exactly 5%)");
  console.log("- Old contract would pay:", hre.ethers.formatEther(incorrectReferral), "BLOCKS (5.26%)");

  console.log("\n📋 To test with actual purchase:");
  console.log("1. Ensure treasury has sufficient BLOCKS balance");
  console.log("2. Ensure treasury has approved PackageManager to spend BLOCKS");
  console.log("3. Make a test purchase with a referrer");
  console.log("4. Check the referral amount paid matches the 'correct' calculation above");

  // Check treasury setup
  console.log("\n🏦 Step 3: Checking treasury setup...");
  const treasuryBalance = await blocks.balanceOf(data.contracts.Treasury);
  const treasuryAllowance = await blocks.allowance(data.contracts.Treasury, packageManagerAddress);
  
  console.log("Treasury BLOCKS balance:", hre.ethers.formatEther(treasuryBalance));
  console.log("Treasury allowance to PackageManager:", hre.ethers.formatEther(treasuryAllowance));
  
  if (treasuryBalance < correctReferral) {
    console.log("⚠️  Treasury balance may be insufficient for referral payment");
  }
  
  if (treasuryAllowance < correctReferral) {
    console.log("⚠️  Treasury allowance may be insufficient for referral payment");
    console.log("💡 Run: npx hardhat run scripts/setup-treasury-referral-approval.cjs --network bsctestnet");
  }

  console.log("\n🎉 Referral calculation test completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
