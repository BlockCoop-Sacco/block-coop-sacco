const hre = require("hardhat");

async function main() {
  console.log("🔧 Analyzing Liquidity Addition Parameters...");
  console.log("=============================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Analyzing with account:", deployer.address);

  // Contract addresses
  const addresses = {
    PackageManagerV2_1: "0xb1995f8C4Cf5409814d191e444e6433f5B6c712b",
    BLOCKS: "0xCff8B55324b7c66BD04D66F3AFBFA5A20874c424",
    USDT: "0x350eBe9e8030B5C2e70f831b82b92E44569736fF",
    PancakeRouter: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    PancakeFactory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17"
  };

  try {
    // Connect to contracts
    const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", addresses.PackageManagerV2_1);
    const blocks = await hre.ethers.getContractAt("BLOCKS", addresses.BLOCKS);
    const usdt = await hre.ethers.getContractAt("IERC20Decimals", addresses.USDT);
    const factory = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakeFactory", addresses.PancakeFactory);

    console.log("✅ Connected to all contracts");

    // Analysis 1: Current contract parameters
    console.log("\n⚙️ Analysis 1: Contract Parameters");
    console.log("==================================");
    
    const globalTargetPrice = await packageManager.globalTargetPrice();
    const slippageTolerance = await packageManager.slippageTolerance();
    const deadlineWindow = await packageManager.deadlineWindow();
    
    console.log("Global Target Price:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");
    console.log("Slippage Tolerance:", slippageTolerance.toString(), "basis points (", Number(slippageTolerance) / 100, "%)");
    console.log("Deadline Window:", deadlineWindow.toString(), "seconds");

    // Analysis 2: Current pool state
    console.log("\n🏊 Analysis 2: Current Pool State");
    console.log("=================================");
    
    const pairAddress = await factory.getPair(addresses.BLOCKS, addresses.USDT);
    console.log("Pair Address:", pairAddress);
    
    if (pairAddress !== hre.ethers.ZeroAddress) {
      const pair = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakePair", pairAddress);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      // Determine which token is which
      const blocksIsToken0 = token0.toLowerCase() === addresses.BLOCKS.toLowerCase();
      const blocksReserve = blocksIsToken0 ? reserves[0] : reserves[1];
      const usdtReserve = blocksIsToken0 ? reserves[1] : reserves[0];
      
      console.log("BLOCKS Reserve:", hre.ethers.formatUnits(blocksReserve, 18), "BLOCKS");
      console.log("USDT Reserve:", hre.ethers.formatUnits(usdtReserve, 6), "USDT");
      
      // Calculate current pool price
      const currentPrice = (Number(hre.ethers.formatUnits(usdtReserve, 6)) / Number(hre.ethers.formatUnits(blocksReserve, 18)));
      console.log("Current Pool Price:", currentPrice.toFixed(6), "USDT per BLOCKS");
      console.log("Global Target Price:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");
      
      const priceDiscrepancy = Math.abs(currentPrice - Number(hre.ethers.formatUnits(globalTargetPrice, 18)));
      console.log("Price Discrepancy:", priceDiscrepancy.toFixed(6), "USDT");
      
      if (priceDiscrepancy > 0.1) {
        console.log("⚠️ LARGE PRICE DISCREPANCY detected!");
        console.log("   This could cause liquidity addition to fail due to slippage");
      }
    }

    // Analysis 3: Simulate purchase liquidity calculation
    console.log("\n🧮 Analysis 3: Purchase Simulation");
    console.log("==================================");
    
    const pkg = await packageManager.getPackage(0);
    console.log("Package:", pkg.name);
    console.log("Entry USDT:", hre.ethers.formatUnits(pkg.entryUSDT, 6), "USDT");
    console.log("Exchange Rate:", Number(pkg.exchangeRate) / 1e6, "USDT per BLOCKS");
    console.log("Vest BPS:", pkg.vestBps.toString(), "(", Number(pkg.vestBps) / 100, "%)");

    // Calculate liquidity amounts
    const entryUSDT = pkg.entryUSDT;
    const vestBps = pkg.vestBps;
    
    // USDT allocation (30% to liquidity pool)
    const usdtForPool = (entryUSDT * (10000n - vestBps)) / 10000n;
    
    // BLOCKS calculation using global target price
    const liquidityBLOCKS = (usdtForPool * hre.ethers.parseUnits("1", 18)) / globalTargetPrice;
    
    console.log("\nLiquidity Addition Amounts:");
    console.log("USDT for Pool:", hre.ethers.formatUnits(usdtForPool, 6), "USDT");
    console.log("BLOCKS for Pool:", hre.ethers.formatUnits(liquidityBLOCKS, 18), "BLOCKS");
    
    // Calculate minimum amounts with current slippage
    const minUSDT = (usdtForPool * (10000n - slippageTolerance)) / 10000n;
    const minBLOCKS = (liquidityBLOCKS * (10000n - slippageTolerance)) / 10000n;
    
    console.log("\nMinimum Amounts (with", Number(slippageTolerance) / 100, "% slippage):");
    console.log("Min USDT:", hre.ethers.formatUnits(minUSDT, 6), "USDT");
    console.log("Min BLOCKS:", hre.ethers.formatUnits(minBLOCKS, 18), "BLOCKS");

    // Analysis 4: Check if amounts are reasonable for current pool
    console.log("\n📊 Analysis 4: Liquidity Impact Assessment");
    console.log("==========================================");
    
    if (pairAddress !== hre.ethers.ZeroAddress) {
      const pair = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakePair", pairAddress);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      
      const blocksIsToken0 = token0.toLowerCase() === addresses.BLOCKS.toLowerCase();
      const blocksReserve = blocksIsToken0 ? reserves[0] : reserves[1];
      const usdtReserve = blocksIsToken0 ? reserves[1] : reserves[0];
      
      // Calculate impact percentages
      const usdtImpact = (Number(hre.ethers.formatUnits(usdtForPool, 6)) / Number(hre.ethers.formatUnits(usdtReserve, 6))) * 100;
      const blocksImpact = (Number(hre.ethers.formatUnits(liquidityBLOCKS, 18)) / Number(hre.ethers.formatUnits(blocksReserve, 18))) * 100;
      
      console.log("USDT Impact on Pool:", usdtImpact.toFixed(2), "%");
      console.log("BLOCKS Impact on Pool:", blocksImpact.toFixed(2), "%");
      
      if (usdtImpact > 50 || blocksImpact > 50) {
        console.log("⚠️ HIGH IMPACT TRANSACTION!");
        console.log("   This transaction would significantly affect pool reserves");
        console.log("   Consider increasing slippage tolerance or reducing transaction size");
      }
      
      // Check if the pool can handle the transaction
      const wouldExceedReserves = usdtForPool > usdtReserve || liquidityBLOCKS > blocksReserve;
      if (wouldExceedReserves) {
        console.log("❌ TRANSACTION WOULD EXCEED POOL RESERVES!");
        console.log("   This is likely why the transaction is failing");
      }
    }

    // Analysis 5: Recommended fixes
    console.log("\n🔧 Analysis 5: Recommended Solutions");
    console.log("====================================");
    
    console.log("Based on the analysis, here are potential solutions:");
    
    console.log("\n1. 📈 Increase Slippage Tolerance:");
    console.log("   Current:", Number(slippageTolerance) / 100, "%");
    console.log("   Recommended: 10-15% for imbalanced pools");
    
    console.log("\n2. 🎯 Adjust Global Target Price:");
    console.log("   Current:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");
    console.log("   Consider setting closer to current pool price");
    
    console.log("\n3. 💰 Add More Balanced Liquidity:");
    console.log("   Current pool is heavily imbalanced");
    console.log("   Add more USDT to balance the pool");
    
    console.log("\n4. ⏰ Increase Deadline Window:");
    console.log("   Current:", deadlineWindow.toString(), "seconds");
    console.log("   Consider 600-900 seconds for network congestion");
    
    console.log("\n5. 🔄 Implement Fallback Mechanism:");
    console.log("   The contract already has fallback (sends USDT to treasury)");
    console.log("   But the transaction still reverts before reaching fallback");

    // Check PackageManager token balances
    console.log("\n💳 Token Balance Check:");
    console.log("======================");
    
    const pmBLOCKSBalance = await blocks.balanceOf(addresses.PackageManagerV2_1);
    const pmUSDTBalance = await usdt.balanceOf(addresses.PackageManagerV2_1);
    
    console.log("PackageManager BLOCKS:", hre.ethers.formatUnits(pmBLOCKSBalance, 18), "BLOCKS");
    console.log("PackageManager USDT:", hre.ethers.formatUnits(pmUSDTBalance, 6), "USDT");
    console.log("Required BLOCKS for liquidity:", hre.ethers.formatUnits(liquidityBLOCKS, 18), "BLOCKS");
    console.log("Required USDT for liquidity:", hre.ethers.formatUnits(usdtForPool, 6), "USDT");
    
    const hasEnoughBLOCKS = pmBLOCKSBalance >= liquidityBLOCKS;
    const hasEnoughUSDT = pmUSDTBalance >= usdtForPool;
    
    console.log("Has enough BLOCKS:", hasEnoughBLOCKS ? "✅ YES" : "❌ NO");
    console.log("Has enough USDT:", hasEnoughUSDT ? "✅ YES" : "❌ NO");

  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Analysis failed:", error);
    process.exit(1);
  });
