const { ethers } = require("hardhat");

async function main() {
  console.log("🔐 Granting Admin Role to New Wallet...");
  
  // Contract addresses
  const PACKAGE_MANAGER_ADDRESS = "0x1e44B103349598aebe2D1F33E4c42B92D0d713B3";
  const NEW_ADMIN_WALLET = "0x0A1956562aB097cC90f3D1b005Ce50F2c90B80d8";
  
  // Get the signer (current admin)
  const [deployer] = await ethers.getSigners();
  console.log("👤 Current Admin Address:", deployer.address);
  console.log("🎯 New Admin Address:", NEW_ADMIN_WALLET);
  
  // Get the PackageManager contract
  const PackageManager = await ethers.getContractFactory("PackageManagerV2_2");
  const packageManager = PackageManager.attach(PACKAGE_MANAGER_ADDRESS);
  
  console.log("📋 PackageManager Contract:", PACKAGE_MANAGER_ADDRESS);
  
  // Check if current signer has admin role
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const hasAdminRole = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  console.log("🔑 Current Signer Has Admin Role:", hasAdminRole);
  
  if (!hasAdminRole) {
    console.error("❌ Current signer does not have admin role. Cannot proceed.");
    return;
  }
  
  // Check if new wallet already has admin role
  const newWalletHasRole = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, NEW_ADMIN_WALLET);
  console.log("🔑 New Wallet Already Has Admin Role:", newWalletHasRole);
  
  if (newWalletHasRole) {
    console.log("✅ New wallet already has admin role. No action needed.");
    return;
  }
  
  // Grant admin role to new wallet
  console.log("🚀 Granting admin role to new wallet...");
  const tx = await packageManager.grantRole(DEFAULT_ADMIN_ROLE, NEW_ADMIN_WALLET);
  console.log("📝 Transaction Hash:", tx.hash);
  
  // Wait for transaction to be mined
  console.log("⏳ Waiting for transaction to be mined...");
  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
  
  // Verify the role was granted
  const roleGranted = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, NEW_ADMIN_WALLET);
  console.log("🔍 Verification - New Wallet Has Admin Role:", roleGranted);
  
  if (roleGranted) {
    console.log("🎉 Success! New wallet now has admin role.");
    console.log("📋 New admin can now:");
    console.log("   - Add packages (addPackage)");
    console.log("   - Toggle packages (togglePackage)");
    console.log("   - Update exchange rates (setPackageExchangeRate)");
    console.log("   - Set global target price (setGlobalTargetPrice)");
    console.log("   - Pause/unpause contract (pause/unpause)");
    console.log("   - Grant roles to other addresses");
  } else {
    console.error("❌ Failed to grant admin role. Please check the transaction.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 Error:", error);
    process.exit(1);
  });


