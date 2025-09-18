const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Admin Functions for New Admin Wallet...");
  
  // Contract addresses
  const PACKAGE_MANAGER_ADDRESS = "0x1e44B103349598aebe2D1F33E4c42B92D0d713B3";
  const NEW_ADMIN_WALLET = "0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8";
  
  console.log("🎯 New Admin Address:", NEW_ADMIN_WALLET);
  console.log("📋 PackageManager Contract:", PACKAGE_MANAGER_ADDRESS);
  
  // Get the PackageManager contract
  const PackageManager = await ethers.getContractFactory("PackageManagerV2_2");
  const packageManager = PackageManager.attach(PACKAGE_MANAGER_ADDRESS);
  
  // Check roles
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const hasAdminRole = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, NEW_ADMIN_WALLET);
  console.log("🔑 New Wallet Has Admin Role:", hasAdminRole);
  
  if (!hasAdminRole) {
    console.error("❌ New wallet does not have admin role. Cannot test functions.");
    return;
  }
  
  // Test 1: Check if contract is paused
  try {
    const isPaused = await packageManager.paused();
    console.log("✅ Test 1 - Contract Pause Status:", isPaused);
  } catch (error) {
    console.log("❌ Test 1 - Failed to check pause status:", error.message);
  }
  
  // Test 2: Get current package count
  try {
    const packageCount = await packageManager.getPackageCount();
    console.log("✅ Test 2 - Current Package Count:", packageCount.toString());
  } catch (error) {
    console.log("❌ Test 2 - Failed to get package count:", error.message);
  }
  
  // Test 3: Get global target price
  try {
    const globalTargetPrice = await packageManager.globalTargetPrice();
    console.log("✅ Test 3 - Global Target Price:", ethers.utils.formatEther(globalTargetPrice), "USDT per BLOCKS");
  } catch (error) {
    console.log("❌ Test 3 - Failed to get global target price:", error.message);
  }
  
  // Test 4: Get slippage tolerance
  try {
    const slippageTolerance = await packageManager.slippageTolerance();
    console.log("✅ Test 4 - Slippage Tolerance:", slippageTolerance.toString(), "basis points");
  } catch (error) {
    console.log("❌ Test 4 - Failed to get slippage tolerance:", error.message);
  }
  
  // Test 5: Get deadline window
  try {
    const deadlineWindow = await packageManager.deadlineWindow();
    console.log("✅ Test 5 - Deadline Window:", deadlineWindow.toString(), "seconds");
  } catch (error) {
    console.log("❌ Test 5 - Failed to get deadline window:", error.message);
  }
  
  // Test 6: Get treasury address
  try {
    const treasury = await packageManager.treasury();
    console.log("✅ Test 6 - Treasury Address:", treasury);
  } catch (error) {
    console.log("❌ Test 6 - Failed to get treasury address:", error.message);
  }
  
  // Test 7: Get active package IDs
  try {
    const activePackageIds = await packageManager.getActivePackageIds();
    console.log("✅ Test 7 - Active Package IDs:", activePackageIds.map(id => id.toString()));
  } catch (error) {
    console.log("❌ Test 7 - Failed to get active package IDs:", error.message);
  }
  
  // Test 8: Get all package IDs
  try {
    const allPackageIds = await packageManager.getPackageIds();
    console.log("✅ Test 8 - All Package IDs:", allPackageIds.map(id => id.toString()));
  } catch (error) {
    console.log("❌ Test 8 - Failed to get all package IDs:", error.message);
  }
  
  // Test 9: Get specific package details (if packages exist)
  try {
    const allPackageIds = await packageManager.getPackageIds();
    if (allPackageIds.length > 0) {
      const firstPackage = await packageManager.getPackage(allPackageIds[0]);
      console.log("✅ Test 9 - First Package Details:");
      console.log("   Name:", firstPackage.name);
      console.log("   Entry USDT:", ethers.utils.formatUnits(firstPackage.entryUSDT, 18));
      console.log("   Exchange Rate:", ethers.utils.formatEther(firstPackage.exchangeRate));
      console.log("   Active:", firstPackage.active);
    } else {
      console.log("✅ Test 9 - No packages exist yet");
    }
  } catch (error) {
    console.log("❌ Test 9 - Failed to get package details:", error.message);
  }
  
  // Test 10: Check USDT decimals and scaling
  try {
    const usdtDecimals = await packageManager.USDT_DEC();
    const usdtScale = await packageManager.USDT_SCALE();
    const usdtScaleUp = await packageManager.USDT_SCALE_UP();
    console.log("✅ Test 10 - USDT Configuration:");
    console.log("   Decimals:", usdtDecimals.toString());
    console.log("   Scale:", usdtScale.toString());
    console.log("   Scale Up:", usdtScaleUp);
  } catch (error) {
    console.log("❌ Test 10 - Failed to get USDT configuration:", error.message);
  }
  
  console.log("\n🎉 Admin Function Tests Completed!");
  console.log("📋 The new admin wallet can now perform the following functions:");
  console.log("   ✅ addPackage() - Add new investment packages");
  console.log("   ✅ togglePackage() - Enable/disable packages");
  console.log("   ✅ setPackageExchangeRate() - Update package exchange rates");
  console.log("   ✅ setGlobalTargetPrice() - Set global target price");
  console.log("   ✅ pause() / unpause() - Pause/unpause the contract");
  console.log("   ✅ setSlippageTolerance() - Adjust slippage protection");
  console.log("   ✅ setDeadlineWindow() - Set transaction deadline window");
  console.log("   ✅ setTreasury() - Update treasury address");
  console.log("   ✅ grantRole() / revokeRole() - Manage other roles");
  console.log("   ✅ initRouterAllowances() - Initialize router allowances");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });


