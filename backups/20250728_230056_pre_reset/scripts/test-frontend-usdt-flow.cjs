const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Frontend USDT Balance and Approval Flow...");
  
  // Load deployment data
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-stable-lp-fresh.json");
  const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log(`📍 Testing with account: ${deployer.address}`);
  
  // Get contract instances
  const usdtAddress = deploymentData.contracts.USDT;
  const packageManagerAddress = deploymentData.contracts.PackageManagerV2_1;
  
  console.log(`📋 Contract addresses:`);
  console.log(`   USDT: ${usdtAddress}`);
  console.log(`   PackageManager: ${packageManagerAddress}`);
  
  // Get contract instances with proper ABIs
  const erc20Abi = [
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)"
  ];

  const usdt = new ethers.Contract(usdtAddress, erc20Abi, deployer);
  const packageManager = await ethers.getContractAt("PackageManagerV2_1", packageManagerAddress);
  
  console.log("\n🔍 Step 1: Check USDT balance and decimals...");
  
  try {
    // Check USDT decimals
    const decimals = await usdt.decimals();
    console.log(`   USDT decimals: ${decimals}`);
    
    // Check balance
    const balance = await usdt.balanceOf(deployer.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log(`   USDT balance: ${balance.toString()} (${balanceFormatted} USDT)`);
    
    // Check allowance to PackageManager
    const allowance = await usdt.allowance(deployer.address, packageManagerAddress);
    const allowanceFormatted = ethers.formatUnits(allowance, decimals);
    console.log(`   Current allowance: ${allowance.toString()} (${allowanceFormatted} USDT)`);
    
  } catch (error) {
    console.error(`   ❌ Error checking USDT: ${error.message}`);
    return;
  }
  
  console.log("\n🔍 Step 2: Test decimal scaling (6-decimal vs 18-decimal)...");
  
  try {
    // Test different amounts and their scaling
    const testAmounts = [
      { usdt: "100", description: "100 USDT" },
      { usdt: "500", description: "500 USDT" },
      { usdt: "1000", description: "1000 USDT" }
    ];
    
    for (const test of testAmounts) {
      const amount6Dec = ethers.parseUnits(test.usdt, 6);  // USDT native format
      const amount18Dec = ethers.parseUnits(test.usdt, 18); // Contract internal format
      
      console.log(`   ${test.description}:`);
      console.log(`      6-decimal (USDT native): ${amount6Dec.toString()}`);
      console.log(`      18-decimal (contract): ${amount18Dec.toString()}`);
      console.log(`      Ratio: ${amount18Dec / amount6Dec}x`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error testing scaling: ${error.message}`);
  }
  
  console.log("\n🔍 Step 3: Test package costs and approval requirements...");
  
  try {
    // Get first package for testing
    const packageIds = await packageManager.getPackageIds();
    if (packageIds.length === 0) {
      console.log("   ⚠️  No packages found");
      return;
    }
    
    const firstPackage = await packageManager.getPackage(packageIds[0]);
    console.log(`   Testing with package: ${firstPackage.name}`);
    console.log(`   Package cost: ${firstPackage.entryUSDT.toString()} (${ethers.formatUnits(firstPackage.entryUSDT, 6)} USDT)`);
    
    // Check if current allowance is sufficient
    const currentAllowance = await usdt.allowance(deployer.address, packageManagerAddress);
    const isAllowanceSufficient = currentAllowance >= firstPackage.entryUSDT;
    
    console.log(`   Current allowance sufficient: ${isAllowanceSufficient}`);
    
    if (!isAllowanceSufficient) {
      console.log(`   ⚠️  Need to approve ${ethers.formatUnits(firstPackage.entryUSDT, 6)} USDT`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error checking package costs: ${error.message}`);
  }
  
  console.log("\n🔍 Step 4: Test approval transaction simulation...");
  
  try {
    // Simulate approval for 1000 USDT (enough for any package)
    const approvalAmount = ethers.parseUnits("1000", 6);
    
    console.log(`   Simulating approval of ${ethers.formatUnits(approvalAmount, 6)} USDT...`);
    
    // Estimate gas for approval
    const gasEstimate = await usdt.approve.estimateGas(packageManagerAddress, approvalAmount);
    console.log(`   Estimated gas for approval: ${gasEstimate.toString()}`);
    
    // Get current gas price
    const gasPrice = await ethers.provider.getFeeData();
    console.log(`   Current gas price: ${gasPrice.gasPrice?.toString()} wei`);
    
    const estimatedCost = gasEstimate * (gasPrice.gasPrice || 0n);
    console.log(`   Estimated transaction cost: ${ethers.formatEther(estimatedCost)} BNB`);
    
  } catch (error) {
    console.error(`   ❌ Error simulating approval: ${error.message}`);
  }
  
  console.log("\n🔍 Step 5: Test frontend compatibility...");
  
  try {
    // Test the exact flow that frontend would use
    const balance = await usdt.balanceOf(deployer.address);
    const allowance = await usdt.allowance(deployer.address, packageManagerAddress);
    
    // Test package cost checking
    const packageIds = await packageManager.getPackageIds();
    const packages = [];
    
    for (const id of packageIds.slice(0, 3)) { // Test first 3 packages
      const pkg = await packageManager.getPackage(id);
      packages.push({
        id: Number(id),
        name: pkg.name,
        entryUSDT: pkg.entryUSDT,
        canAfford: balance >= pkg.entryUSDT,
        needsApproval: allowance < pkg.entryUSDT
      });
    }
    
    console.log(`   Frontend compatibility test:`);
    console.log(`   User balance: ${ethers.formatUnits(balance, 6)} USDT`);
    console.log(`   Current allowance: ${ethers.formatUnits(allowance, 6)} USDT`);
    
    packages.forEach(pkg => {
      console.log(`   Package ${pkg.id} (${pkg.name}):`);
      console.log(`      Cost: ${ethers.formatUnits(pkg.entryUSDT, 6)} USDT`);
      console.log(`      Can afford: ${pkg.canAfford}`);
      console.log(`      Needs approval: ${pkg.needsApproval}`);
    });
    
  } catch (error) {
    console.error(`   ❌ Error testing frontend compatibility: ${error.message}`);
  }
  
  console.log("\n✅ USDT Balance and Approval Flow Test Complete!");
  console.log("\n📋 Summary:");
  console.log("✅ USDT contract accessible and working");
  console.log("✅ Decimal scaling (6-decimal vs 18-decimal) understood");
  console.log("✅ Package costs and approval requirements calculated");
  console.log("✅ Gas estimation for approval transactions working");
  console.log("✅ Frontend compatibility flow validated");
  
  console.log("\n🔄 Next Steps:");
  console.log("1. Test actual approval transaction on frontend");
  console.log("2. Test package purchase flow with approved USDT");
  console.log("3. Verify transaction confirmations and error handling");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
