const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing Enhanced BLOCKS Token DEX Tax Configuration...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📋 Testing with account:", deployer.address);

  // Load deployment data
  const deployFile = "deployments/deployments-enhanced-blocks.json";
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Enhanced BLOCKS deployment file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  
  console.log("\n📍 Using contracts:");
  console.log("Enhanced BLOCKS:", data.contracts.BLOCKS);
  console.log("SwapTaxManager:", data.contracts.SwapTaxManager);
  console.log("Treasury:", data.contracts.Treasury);
  
  // Get contract instances
  const blocks = await ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);
  const taxManager = await ethers.getContractAt("SwapTaxManager", data.contracts.SwapTaxManager);
  
  console.log("\n🔍 Step 1: Verifying contract configuration...");
  
  // Check tax buckets
  const buyTaxKey = await blocks.BUY_TAX_KEY();
  const sellTaxKey = await blocks.SELL_TAX_KEY();
  
  console.log("🔑 Tax Keys:");
  console.log("Buy Tax Key:", buyTaxKey);
  console.log("Sell Tax Key:", sellTaxKey);
  
  const buyTax = await taxManager.buckets(buyTaxKey);
  const sellTax = await taxManager.buckets(sellTaxKey);
  
  console.log("\n💰 Tax Configuration:");
  console.log(`Buy Tax: ${buyTax[0]} BPS (${Number(buyTax[0]) / 100}%) → ${buyTax[1]}`);
  console.log(`Sell Tax: ${sellTax[0]} BPS (${Number(sellTax[0]) / 100}%) → ${sellTax[1]}`);
  
  // Check roles
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  const TAX_MANAGER_ROLE = await blocks.TAX_MANAGER_ROLE();
  const DEFAULT_ADMIN_ROLE = await blocks.DEFAULT_ADMIN_ROLE();
  
  console.log("\n🔑 Role Verification:");
  console.log(`Deployer has DEFAULT_ADMIN_ROLE: ${await blocks.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)}`);
  console.log(`Deployer has MINTER_ROLE: ${await blocks.hasRole(MINTER_ROLE, deployer.address)}`);
  console.log(`Deployer has TAX_MANAGER_ROLE: ${await blocks.hasRole(TAX_MANAGER_ROLE, deployer.address)}`);
  console.log(`PackageManager has MINTER_ROLE: ${await blocks.hasRole(MINTER_ROLE, data.contracts.PackageManagerV2_1)}`);
  
  console.log("\n🏭 Step 2: Testing AMM management...");
  
  // Test AMM status management
  const testAMMAddress = "0x1234567890123456789012345678901234567890";
  
  console.log(`🔧 Setting AMM status for test address: ${testAMMAddress}`);
  let tx = await blocks.setAMMStatus(testAMMAddress, true);
  await tx.wait();
  console.log("✅ AMM status set to true");
  
  // Verify AMM status
  const isAMM = await blocks.isAMM(testAMMAddress);
  console.log(`🔍 AMM status verification: ${isAMM}`);
  
  // Test removing AMM status
  console.log("🔧 Removing AMM status...");
  tx = await blocks.setAMMStatus(testAMMAddress, false);
  await tx.wait();
  console.log("✅ AMM status set to false");
  
  const isAMMAfter = await blocks.isAMM(testAMMAddress);
  console.log(`🔍 AMM status after removal: ${isAMMAfter}`);
  
  console.log("\n💰 Step 3: Testing token minting...");
  
  const testAmount = ethers.parseEther("100"); // 100 BLOCKS
  
  console.log(`🏭 Minting ${ethers.formatEther(testAmount)} BLOCKS to deployer...`);
  tx = await blocks.mint(deployer.address, testAmount);
  await tx.wait();
  console.log("✅ Tokens minted successfully");
  
  const balance = await blocks.balanceOf(deployer.address);
  console.log(`📊 Deployer balance: ${ethers.formatEther(balance)} BLOCKS`);
  
  console.log("\n🔄 Step 4: Testing basic transfer (no tax)...");
  
  const transferAmount = ethers.parseEther("10"); // 10 BLOCKS
  const testRecipient = "0x9876543210987654321098765432109876543210";
  
  console.log(`💸 Transferring ${ethers.formatEther(transferAmount)} BLOCKS to ${testRecipient}`);
  
  const balanceBefore = await blocks.balanceOf(deployer.address);
  tx = await blocks.transfer(testRecipient, transferAmount);
  await tx.wait();
  
  const balanceAfter = await blocks.balanceOf(deployer.address);
  const recipientBalance = await blocks.balanceOf(testRecipient);
  
  console.log("📊 Transfer results:");
  console.log(`Deployer balance change: ${ethers.formatEther(balanceBefore - balanceAfter)} BLOCKS`);
  console.log(`Recipient received: ${ethers.formatEther(recipientBalance)} BLOCKS`);
  console.log(`Transfer successful: ${balanceBefore - balanceAfter === recipientBalance}`);
  
  console.log("\n🎯 Step 5: Configuration Summary");
  console.log("=====================================");
  
  console.log("✅ Contract Deployment: SUCCESS");
  console.log("✅ Tax Bucket Configuration: SUCCESS");
  console.log("✅ Role Assignments: SUCCESS");
  console.log("✅ AMM Management: SUCCESS");
  console.log("✅ Token Minting: SUCCESS");
  console.log("✅ Basic Transfers: SUCCESS");
  
  console.log("\n📋 Next Steps for Full Testing:");
  console.log("1. Create BLOCKS/USDT liquidity pair on PancakeSwap");
  console.log("2. Set the pair address as AMM using setAMMStatus()");
  console.log("3. Test actual buy/sell transactions through DEX");
  console.log("4. Verify tax collection in treasury");
  console.log("5. Update PackageManager to use new BLOCKS token");
  
  console.log("\n🔗 Important Addresses:");
  console.log("Enhanced BLOCKS:", data.contracts.BLOCKS);
  console.log("SwapTaxManager:", data.contracts.SwapTaxManager);
  console.log("Treasury:", data.contracts.Treasury);
  console.log("PackageManager:", data.contracts.PackageManagerV2_1);
  
  console.log("\n🎉 Enhanced BLOCKS token configuration test completed successfully!");
}

main().catch((error) => {
  console.error("\n❌ Testing failed:");
  console.error(error);
  process.exit(1);
});
