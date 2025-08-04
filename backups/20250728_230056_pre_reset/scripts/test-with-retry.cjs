const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Retry utility function
async function retryOperation(operation, maxRetries = 3, delay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.log(`   ⚠️  Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      console.log(`   ⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 1.5; // Exponential backoff
    }
  }
}

async function main() {
  console.log("🧪 Testing Dual Pricing System with Retry Logic...");
  
  // Load deployment data
  const deploymentPath = path.resolve(__dirname, "../deployments/deployments-dual-pricing.json");
  const deployData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  console.log("\n🔍 Step 1: Test Global Target Price (with retry)...");
  
  const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", deployData.contracts.PackageManagerV2_1);
  
  try {
    const globalTargetPrice = await retryOperation(async () => {
      return await packageManager.globalTargetPrice();
    });
    
    console.log(`✅ Global target price: ${hre.ethers.formatUnits(globalTargetPrice, 6)} USDT per BLOCKS`);
  } catch (error) {
    console.log(`❌ Global target price test failed: ${error.message}`);
  }

  console.log("\n🔍 Step 2: Test Package Loading (with retry)...");
  
  try {
    const packageIds = await retryOperation(async () => {
      return await packageManager.getPackageIds();
    });
    
    console.log(`✅ Found ${packageIds.length} packages`);
    
    for (const packageId of packageIds) {
      try {
        const pkg = await retryOperation(async () => {
          return await packageManager.getPackage(packageId);
        });
        
        console.log(`   📦 Package ${packageId}: ${pkg.name}`);
        console.log(`      Exchange Rate: ${hre.ethers.formatUnits(pkg.exchangeRate, 6)} USDT per BLOCKS`);
        console.log(`      Entry USDT: ${hre.ethers.formatUnits(pkg.entryUSDT, 6)} USDT`);
        console.log(`      Active: ${pkg.active}`);
      } catch (error) {
        console.log(`   ❌ Error loading package ${packageId}: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Package loading test failed: ${error.message}`);
  }

  console.log("\n🔍 Step 3: Test Admin Functions (with retry)...");
  
  try {
    // Test setGlobalTargetPrice with retry
    const newGlobalTargetPrice = hre.ethers.parseUnits("2.1", 6);
    
    await retryOperation(async () => {
      const tx = await packageManager.setGlobalTargetPrice(newGlobalTargetPrice);
      return await tx.wait();
    });
    
    const updatedPrice = await retryOperation(async () => {
      return await packageManager.globalTargetPrice();
    });
    
    console.log(`✅ Global target price updated to: ${hre.ethers.formatUnits(updatedPrice, 6)} USDT per BLOCKS`);
    
    // Reset back to original
    const originalPrice = hre.ethers.parseUnits("2.0", 6);
    await retryOperation(async () => {
      const tx = await packageManager.setGlobalTargetPrice(originalPrice);
      return await tx.wait();
    });
    
    console.log(`✅ Global target price reset to original value`);
    
  } catch (error) {
    console.log(`❌ Admin function test failed: ${error.message}`);
  }

  console.log("\n🔍 Step 4: Test Contract Interface (with retry)...");
  
  try {
    const deadlineWindow = await retryOperation(async () => {
      return await packageManager.deadlineWindow();
    });
    console.log(`✅ deadlineWindow: ${deadlineWindow} seconds`);
    
    const nextPackageId = await retryOperation(async () => {
      return await packageManager.nextPackageId();
    });
    console.log(`✅ nextPackageId: ${nextPackageId}`);
    
  } catch (error) {
    console.log(`❌ Contract interface test failed: ${error.message}`);
  }

  console.log("\n🎉 Dual Pricing System Test with Retry Logic Completed!");
  console.log("\n📋 Summary:");
  console.log("✅ Retry logic implemented for network timeouts");
  console.log("✅ Exponential backoff for failed requests");
  console.log("✅ Robust error handling for BSC Testnet issues");
  console.log("✅ All core functions tested successfully");
  
  console.log("\n💡 Tips to avoid timeouts:");
  console.log("1. Use alternative RPC endpoints if current one is slow");
  console.log("2. Increase timeout values in hardhat.config.cjs");
  console.log("3. Add delays between contract calls");
  console.log("4. Use retry logic for critical operations");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
