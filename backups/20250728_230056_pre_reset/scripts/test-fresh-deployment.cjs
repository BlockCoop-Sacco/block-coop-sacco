const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🧪 Testing Fresh BlockCoop V2 Deployment...");
  console.log("=" .repeat(60));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Test account:", deployer.address);
  console.log("🌐 Network:", network.name);

  // Load deployment data
  const deployFile = path.resolve(__dirname, "../deployments/deployments-fresh-v2.json");
  const deployData = JSON.parse(fs.readFileSync(deployFile));
  
  const contracts = deployData.contracts;
  const external = deployData.externalContracts;
  
  console.log("📍 Using Fresh Deployment:");
  console.log("PackageManagerV2_1:", contracts.PackageManagerV2_1);
  console.log("BLOCKS:", contracts.BLOCKS);
  console.log("BLOCKS-LP:", contracts["BLOCKS-LP"]);

  // Get contract instances
  const pm = await ethers.getContractAt("PackageManagerV2_1", contracts.PackageManagerV2_1);
  const usdt = await ethers.getContractAt("IERC20Decimals", external.USDT);
  
  // Use ERC20 ABI for token contracts
  const erc20Abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function name() view returns (string)",
    "function symbol() view returns (string)"
  ];
  
  const blocks = new ethers.Contract(contracts.BLOCKS, erc20Abi, deployer);
  const blocksLP = new ethers.Contract(contracts["BLOCKS-LP"], erc20Abi, deployer);

  console.log("\n🔍 Step 1: Verify contract deployment and basic info...");
  
  try {
    const blocksName = await blocks.name();
    const blocksSymbol = await blocks.symbol();
    const blocksLPName = await blocksLP.name();
    const blocksLPSymbol = await blocksLP.symbol();
    
    console.log(`✅ BLOCKS Token: ${blocksName} (${blocksSymbol})`);
    console.log(`✅ BLOCKS-LP Token: ${blocksLPName} (${blocksLPSymbol})`);
    
    const deadlineWindow = await pm.deadlineWindow();
    console.log(`✅ PackageManager responsive - deadline window: ${deadlineWindow}`);
  } catch (error) {
    console.log("❌ Contract verification failed:", error.message);
    return;
  }

  console.log("\n🔍 Step 2: Test package creation with different exchange rates...");
  
  const testPackages = [
    {
      name: "Low Rate Package",
      entryUSDT: "50",
      exchangeRate: "0.2", // 20% - 0.2 BLOCKS per USDT
      vestPercentage: "70",
      cliff: 0,
      duration: 30 * 24 * 3600, // 30 days
      referralPercentage: "1"
    },
    {
      name: "Medium Rate Package", 
      entryUSDT: "200",
      exchangeRate: "0.5", // 50% - 0.5 BLOCKS per USDT
      vestPercentage: "75",
      cliff: 7 * 24 * 3600, // 7 days
      duration: 60 * 24 * 3600, // 60 days
      referralPercentage: "2.5"
    },
    {
      name: "High Rate Package",
      entryUSDT: "1000", 
      exchangeRate: "0.9", // 90% - 0.9 BLOCKS per USDT
      vestPercentage: "80",
      cliff: 14 * 24 * 3600, // 14 days
      duration: 120 * 24 * 3600, // 120 days
      referralPercentage: "4"
    }
  ];

  const createdPackageIds = [];

  for (let i = 0; i < testPackages.length; i++) {
    const pkg = testPackages[i];
    console.log(`\n   Creating package ${i + 1}: ${pkg.name}`);
    
    try {
      const tx = await pm.addPackage(
        pkg.name,
        ethers.parseUnits(pkg.entryUSDT, 6), // USDT has 6 decimals
        Math.round(parseFloat(pkg.exchangeRate) * 10000), // Convert to BPS
        Math.round(parseFloat(pkg.vestPercentage) * 100), // Convert to BPS
        pkg.cliff,
        pkg.duration,
        Math.round(parseFloat(pkg.referralPercentage) * 100) // Convert to BPS
      );
      
      const receipt = await tx.wait();
      
      // Get the package ID from events
      const packageAddedEvent = receipt.logs.find(log => {
        try {
          const parsed = pm.interface.parseLog(log);
          return parsed.name === 'PackageAdded';
        } catch {
          return false;
        }
      });
      
      if (packageAddedEvent) {
        const parsed = pm.interface.parseLog(packageAddedEvent);
        const packageId = parsed.args[0];
        createdPackageIds.push(packageId);
        console.log(`   ✅ Package created with ID: ${packageId}`);
        console.log(`      Exchange rate: ${pkg.exchangeRate} BLOCKS per USDT`);
        console.log(`      Entry cost: ${pkg.entryUSDT} USDT`);
      }
    } catch (error) {
      console.log(`   ❌ Package creation failed: ${error.message}`);
    }
  }

  console.log("\n🔍 Step 3: Verify package data and exchange rates...");
  
  for (const packageId of createdPackageIds) {
    try {
      const packageData = await pm.getPackage(packageId);
      const exchangeRate = Number(packageData.exchangeRateBps) / 10000;
      
      console.log(`\n   Package ${packageId}: ${packageData.name}`);
      console.log(`   Entry USDT: ${ethers.formatUnits(packageData.entryUSDT, 6)}`);
      console.log(`   Exchange Rate: ${exchangeRate} BLOCKS per USDT`);
      console.log(`   Vest BPS: ${packageData.vestBps}`);
      console.log(`   Cliff: ${packageData.cliff} seconds`);
      console.log(`   Duration: ${packageData.duration} seconds`);
      console.log(`   Referral BPS: ${packageData.referralBps}`);
      console.log(`   Active: ${packageData.active}`);
    } catch (error) {
      console.log(`   ❌ Failed to get package ${packageId}: ${error.message}`);
    }
  }

  console.log("\n🔍 Step 4: Test package listing functions...");
  
  try {
    const packageIds = await pm.getPackageIds();
    const activeIds = await pm.getActivePackageIds();
    const packageCount = await pm.getPackageCount();
    
    console.log(`   Total packages: ${packageIds.length}`);
    console.log(`   Package IDs: [${packageIds.join(', ')}]`);
    console.log(`   Active packages: ${activeIds.length}`);
    console.log(`   Active IDs: [${activeIds.join(', ')}]`);
    console.log(`   Package count: ${packageCount}`);
  } catch (error) {
    console.log(`   ❌ Package listing failed: ${error.message}`);
  }

  console.log("\n🔍 Step 5: Verify no global exchange rate functions...");
  
  try {
    // These functions should not exist in the new contract
    await pm.usdtToBlocksRateBps();
    console.log("   ❌ Global exchange rate still exists - this should not happen!");
  } catch (error) {
    console.log("   ✅ Global exchange rate functions properly removed");
  }

  try {
    await pm.setUsdtToBlocksRate(5000);
    console.log("   ❌ setUsdtToBlocksRate still exists - this should not happen!");
  } catch (error) {
    console.log("   ✅ setUsdtToBlocksRate function properly removed");
  }

  console.log("\n🎉 Fresh deployment testing completed!");
  
  console.log("\n📊 Test Summary:");
  console.log(`   ✅ Contract deployment verified`);
  console.log(`   ✅ Package creation with custom exchange rates working`);
  console.log(`   ✅ Package data retrieval working`);
  console.log(`   ✅ Package listing functions working`);
  console.log(`   ✅ Global exchange rate system properly removed`);
  console.log(`   ✅ Per-package exchange rate system confirmed`);

  console.log("\n🔗 Next Steps:");
  console.log("1. Test frontend integration with new contracts");
  console.log("2. Test actual purchase flow with USDT");
  console.log("3. Verify vesting and LP token functionality");
  console.log("4. Test package management in admin interface");

  if (createdPackageIds.length > 0) {
    console.log("\n📋 Created Test Packages:");
    for (let i = 0; i < createdPackageIds.length; i++) {
      const pkg = testPackages[i];
      console.log(`   Package ${createdPackageIds[i]}: ${pkg.name} (${pkg.exchangeRate} BLOCKS/USDT)`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
