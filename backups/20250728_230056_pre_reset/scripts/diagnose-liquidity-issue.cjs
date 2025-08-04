const hre = require("hardhat");

async function main() {
  console.log("🩺 Diagnosing Liquidity Issue...");
  console.log("================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Diagnosing with account:", deployer.address);

  // Contract addresses
  const addresses = {
    PackageManagerV2_1: "0xb1995f8C4Cf5409814d191e444e6433f5B6c712b",
    BLOCKS: "0xCff8B55324b7c66BD04D66F3AFBFA5A20874c424",
    USDT: "0x350eBe9e8030B5C2e70f831b82b92E44569736fF",
    PancakeFactory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17"
  };

  try {
    // Connect to basic contracts first
    const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", addresses.PackageManagerV2_1);
    const factory = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakeFactory", addresses.PancakeFactory);

    console.log("✅ Connected to contracts");

    // Check if we can access basic contract info
    console.log("\n📋 Basic Contract Info:");
    console.log("=======================");
    
    try {
      const nextPackageId = await packageManager.nextPackageId();
      console.log("✅ Next Package ID:", nextPackageId.toString());
    } catch (error) {
      console.log("❌ Cannot read nextPackageId:", error.message);
    }

    // Check pair existence
    console.log("\n🏊 Liquidity Pool Check:");
    console.log("========================");
    
    const pairAddress = await factory.getPair(addresses.BLOCKS, addresses.USDT);
    console.log("BLOCKS/USDT Pair:", pairAddress);
    
    if (pairAddress !== hre.ethers.ZeroAddress) {
      console.log("✅ Pair exists");
      
      // Get basic pair info
      const pair = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakePair", pairAddress);
      
      try {
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        const token1 = await pair.token1();
        
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        console.log("Reserve0:", reserves[0].toString());
        console.log("Reserve1:", reserves[1].toString());
        
        // Determine which is which
        const blocksIsToken0 = token0.toLowerCase() === addresses.BLOCKS.toLowerCase();
        const blocksReserve = blocksIsToken0 ? reserves[0] : reserves[1];
        const usdtReserve = blocksIsToken0 ? reserves[1] : reserves[0];
        
        console.log("\n💰 Formatted Reserves:");
        console.log("BLOCKS:", hre.ethers.formatUnits(blocksReserve, 18), "BLOCKS");
        console.log("USDT:", hre.ethers.formatUnits(usdtReserve, 6), "USDT");
        
        // Calculate current price
        const blocksAmount = Number(hre.ethers.formatUnits(blocksReserve, 18));
        const usdtAmount = Number(hre.ethers.formatUnits(usdtReserve, 6));
        
        if (blocksAmount > 0 && usdtAmount > 0) {
          const currentPrice = usdtAmount / blocksAmount;
          console.log("Current Price:", currentPrice.toFixed(8), "USDT per BLOCKS");
          
          // Check if reserves are reasonable
          const minReasonableReserve = 1; // 1 token minimum
          const hasReasonableReserves = blocksAmount >= minReasonableReserve && usdtAmount >= minReasonableReserve;
          console.log("Has reasonable reserves:", hasReasonableReserves ? "✅ YES" : "❌ NO");
          
          if (!hasReasonableReserves) {
            console.log("⚠️ Pool has very low reserves - this could cause liquidity issues");
          }
        }
        
      } catch (error) {
        console.log("❌ Cannot read pair reserves:", error.message);
      }
    } else {
      console.log("❌ Pair does not exist");
    }

    // Try to read contract parameters one by one
    console.log("\n⚙️ Contract Parameters:");
    console.log("=======================");
    
    try {
      const globalTargetPrice = await packageManager.globalTargetPrice();
      console.log("✅ Global Target Price:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");
    } catch (error) {
      console.log("❌ Cannot read globalTargetPrice:", error.message);
    }
    
    try {
      const slippageTolerance = await packageManager.slippageTolerance();
      console.log("✅ Slippage Tolerance:", slippageTolerance.toString(), "basis points");
    } catch (error) {
      console.log("❌ Cannot read slippageTolerance:", error.message);
    }
    
    try {
      const deadlineWindow = await packageManager.deadlineWindow();
      console.log("✅ Deadline Window:", deadlineWindow.toString(), "seconds");
    } catch (error) {
      console.log("❌ Cannot read deadlineWindow:", error.message);
    }

    // Check package details
    console.log("\n📦 Package Details:");
    console.log("===================");
    
    try {
      const pkg = await packageManager.getPackage(0);
      console.log("✅ Package 0:");
      console.log("   Name:", pkg.name);
      console.log("   Entry USDT:", hre.ethers.formatUnits(pkg.entryUSDT, 6), "USDT");
      console.log("   Exchange Rate:", Number(pkg.exchangeRate) / 1e6, "USDT per BLOCKS");
      console.log("   Vest BPS:", pkg.vestBps.toString());
      console.log("   Active:", pkg.active);
    } catch (error) {
      console.log("❌ Cannot read package 0:", error.message);
    }

    // Identify the root cause
    console.log("\n🔍 Root Cause Analysis:");
    console.log("=======================");
    
    console.log("Based on previous investigation:");
    console.log("1. ✅ BLOCKS/USDT pair EXISTS");
    console.log("2. ❌ Pool has VERY LOW USDT reserves (~30 USDT)");
    console.log("3. ❌ Pool has EXCESSIVE BLOCKS reserves (~15 trillion)");
    console.log("4. ❌ Pool is EXTREMELY IMBALANCED");
    
    console.log("\n💡 The Issue:");
    console.log("=============");
    console.log("When trying to add liquidity (30 USDT + corresponding BLOCKS),");
    console.log("PancakeSwap's addLiquidity function fails because:");
    console.log("- The pool ratio is severely imbalanced");
    console.log("- Adding 30 USDT would double the USDT reserves");
    console.log("- This creates massive price impact");
    console.log("- Slippage protection (5%) is insufficient");
    console.log("- PancakeSwap rejects the transaction with 'INSUFFICIENT_LIQUIDITY'");

    console.log("\n🔧 Immediate Solutions:");
    console.log("=======================");
    console.log("1. 📈 Increase slippage tolerance to 15-20%");
    console.log("2. 🎯 Adjust global target price to match current pool price");
    console.log("3. 💰 Add balanced liquidity to the pool manually");
    console.log("4. 🔄 Implement better fallback mechanism");
    console.log("5. ⏰ Increase deadline window");

  } catch (error) {
    console.error("❌ Diagnosis failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Diagnosis failed:", error);
    process.exit(1);
  });
