const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Debugging Package Loading Issues...");
  
  // Load deployment data
  const deploymentPath = path.resolve(__dirname, "../deployments/deployments-dual-pricing.json");
  const deployData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  console.log("PackageManager Address:", deployData.contracts.PackageManagerV2_1);

  // Get contract instance
  const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", deployData.contracts.PackageManagerV2_1);

  console.log("\n🔍 Step 1: Test basic contract connectivity...");
  
  try {
    const globalTargetPrice = await packageManager.globalTargetPrice();
    console.log(`✅ Contract connected. Global target price: ${hre.ethers.formatUnits(globalTargetPrice, 6)} USDT per BLOCKS`);
  } catch (error) {
    console.log(`❌ Contract connection failed: ${error.message}`);
    return;
  }

  console.log("\n🔍 Step 2: Test package loading...");
  
  try {
    const packageIds = await packageManager.getPackageIds();
    console.log(`✅ Found ${packageIds.length} package IDs:`, packageIds.map(id => Number(id)));
    
    if (packageIds.length === 0) {
      console.log("⚠️  No packages found. Creating a test package...");
      
      try {
        const tx = await packageManager.addPackage(
          "Debug Test Package",
          hre.ethers.parseUnits("100", 6),    // 100 USDT
          hre.ethers.parseUnits("1.5", 6),    // 1.5 USDT per BLOCKS
          7000,                                // 70% vesting
          0,                                   // No cliff
          86400 * 30,                         // 30 days
          250                                  // 2.5% referral
        );
        await tx.wait();
        console.log("✅ Test package created successfully");
        
        // Reload package IDs
        const newPackageIds = await packageManager.getPackageIds();
        console.log(`✅ Updated package count: ${newPackageIds.length}`);
      } catch (error) {
        console.log(`❌ Failed to create test package: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Package ID loading failed: ${error.message}`);
    return;
  }

  console.log("\n🔍 Step 3: Test individual package loading...");
  
  try {
    const packageIds = await packageManager.getPackageIds();
    
    for (const packageId of packageIds) {
      console.log(`\n📦 Loading Package ${packageId}:`);
      
      try {
        const pkg = await packageManager.getPackage(packageId);
        
        console.log(`   Raw contract response:`, {
          name: pkg.name,
          entryUSDT: pkg.entryUSDT?.toString(),
          exchangeRate: pkg.exchangeRate?.toString(),
          vestBps: pkg.vestBps?.toString(),
          cliff: pkg.cliff?.toString(),
          duration: pkg.duration?.toString(),
          referralBps: pkg.referralBps?.toString(),
          active: pkg.active,
          exists: pkg.exists
        });
        
        // Test the frontend package transformation
        const frontendPackage = {
          id: Number(packageId),
          name: pkg.name,
          entryUSDT: pkg.entryUSDT,
          exchangeRate: pkg.exchangeRate,
          vestBps: Number(pkg.vestBps),
          cliff: Number(pkg.cliff),
          duration: Number(pkg.duration),
          referralBps: Number(pkg.referralBps),
          active: pkg.active,
          exists: pkg.exists,
        };
        
        console.log(`   Frontend package object:`, {
          id: frontendPackage.id,
          name: frontendPackage.name,
          entryUSDT: frontendPackage.entryUSDT?.toString(),
          exchangeRate: frontendPackage.exchangeRate?.toString(),
          vestBps: frontendPackage.vestBps,
          cliff: frontendPackage.cliff,
          duration: frontendPackage.duration,
          referralBps: frontendPackage.referralBps,
          active: frontendPackage.active,
          exists: frontendPackage.exists
        });
        
        // Test calculateSplits function
        console.log(`   Testing calculateSplits...`);
        
        if (!frontendPackage.entryUSDT) {
          console.log(`   ❌ entryUSDT is undefined`);
        } else if (!frontendPackage.exchangeRate) {
          console.log(`   ❌ exchangeRate is undefined`);
        } else if (frontendPackage.vestBps === undefined) {
          console.log(`   ❌ vestBps is undefined`);
        } else {
          // Simulate the calculateSplits function
          try {
            const entryUSDTBig = BigInt(frontendPackage.entryUSDT);
            const exchangeRateBig = BigInt(frontendPackage.exchangeRate);
            const vestBpsBig = BigInt(frontendPackage.vestBps);
            
            const totalUserTokens = (entryUSDTBig * 1000000000000000000n) / exchangeRateBig;
            
            console.log(`   ✅ calculateSplits would succeed:`);
            console.log(`      Entry USDT: ${hre.ethers.formatUnits(entryUSDTBig, 6)} USDT`);
            console.log(`      Exchange Rate: ${hre.ethers.formatUnits(exchangeRateBig, 6)} USDT per BLOCKS`);
            console.log(`      Vest BPS: ${vestBpsBig} (${Number(vestBpsBig) / 100}%)`);
            console.log(`      Total User Tokens: ${hre.ethers.formatEther(totalUserTokens)} BLOCKS`);
            
          } catch (calcError) {
            console.log(`   ❌ calculateSplits would fail: ${calcError.message}`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error loading package ${packageId}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Individual package loading failed: ${error.message}`);
  }

  console.log("\n🔍 Step 4: Check ABI compatibility...");
  
  try {
    // Load the frontend ABI
    const abiPath = path.resolve(__dirname, "../src/abi/PackageManager.json");
    const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    
    // Check for getPackage function
    const getPackageFunction = abiData.abi.find(item => 
      item.type === 'function' && item.name === 'getPackage'
    );
    
    if (getPackageFunction) {
      console.log(`✅ getPackage function found in ABI`);
      console.log(`   Outputs:`, getPackageFunction.outputs?.map(output => ({
        name: output.name,
        type: output.type
      })));
    } else {
      console.log(`❌ getPackage function not found in ABI`);
    }
    
    // Check for exchangeRate in Package struct
    const hasExchangeRate = abiData.abi.some(item => 
      item.type === 'function' && 
      item.name === 'addPackage' && 
      item.inputs && 
      item.inputs.some(input => input.name === 'exchangeRate')
    );
    
    console.log(`✅ ABI has exchangeRate support: ${hasExchangeRate}`);
    
  } catch (error) {
    console.log(`❌ ABI check failed: ${error.message}`);
  }

  console.log("\n🎉 Package Loading Debug Complete!");
  console.log("\n📋 Summary:");
  console.log("- Check the raw contract responses above");
  console.log("- Look for undefined values in entryUSDT, exchangeRate, or vestBps");
  console.log("- Verify ABI compatibility with deployed contract");
  console.log("- If exchangeRate is undefined, the contract may not have dual pricing support");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Debug failed:", error);
    process.exit(1);
  });
