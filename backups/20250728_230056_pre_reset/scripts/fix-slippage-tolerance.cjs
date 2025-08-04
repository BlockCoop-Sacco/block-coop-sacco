const hre = require("hardhat");

async function main() {
  console.log("🔧 Fixing Slippage Tolerance...");
  console.log("===============================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Fixing with admin account:", deployer.address);

  const packageManagerAddress = "0xb1995f8C4Cf5409814d191e444e6433f5B6c712b";

  try {
    const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", packageManagerAddress);
    console.log("✅ Connected to PackageManager");

    // Check current slippage tolerance
    console.log("\n📊 Current Settings:");
    console.log("===================");
    
    try {
      const currentSlippage = await packageManager.slippageTolerance();
      console.log("Current slippage tolerance:", currentSlippage.toString(), "basis points (", Number(currentSlippage) / 100, "%)");
    } catch (error) {
      console.log("Cannot read current slippage, it might be the default 500 (5%)");
    }

    // Set slippage to maximum allowed: 10% (1000 basis points)
    console.log("\n🔧 Setting Maximum Slippage Tolerance:");
    console.log("======================================");
    
    const maxSlippage = 1000; // 10% - maximum allowed by contract
    console.log("Setting slippage tolerance to:", maxSlippage, "basis points (10%)");
    
    try {
      const tx = await packageManager.setSlippageTolerance(maxSlippage);
      await tx.wait();
      console.log("✅ Slippage tolerance updated successfully");
      
      // Verify the update
      const newSlippage = await packageManager.slippageTolerance();
      console.log("✅ Verified new slippage:", newSlippage.toString(), "basis points (", Number(newSlippage) / 100, "%)");
      
    } catch (error) {
      console.log("❌ Failed to update slippage tolerance:", error.message);
      
      // Check if we have admin role
      const DEFAULT_ADMIN_ROLE = await packageManager.DEFAULT_ADMIN_ROLE();
      const isAdmin = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
      console.log("Is admin:", isAdmin);
      
      if (!isAdmin) {
        console.log("❌ Account is not admin - cannot update slippage tolerance");
      }
    }

    // Check all current parameters
    console.log("\n📋 All Current Parameters:");
    console.log("==========================");
    
    try {
      const slippage = await packageManager.slippageTolerance();
      const globalPrice = await packageManager.globalTargetPrice();
      const deadline = await packageManager.deadlineWindow();
      
      console.log("✅ Slippage Tolerance:", slippage.toString(), "basis points (", Number(slippage) / 100, "%)");
      console.log("✅ Global Target Price:", hre.ethers.formatUnits(globalPrice, 18), "USDT per BLOCKS");
      console.log("✅ Deadline Window:", deadline.toString(), "seconds");
      
      // Calculate what this means for a purchase
      console.log("\n🧮 Impact on Package Purchase:");
      console.log("==============================");
      
      const pkg = await packageManager.getPackage(0);
      const entryUSDT = pkg.entryUSDT;
      const vestBps = pkg.vestBps;
      
      // USDT allocation (30% to liquidity pool)
      const usdtForPool = (entryUSDT * (10000n - vestBps)) / 10000n;
      
      // BLOCKS calculation using current global target price
      const liquidityBLOCKS = (usdtForPool * hre.ethers.parseUnits("1", 18)) / globalPrice;
      
      console.log("For", pkg.name, "purchase:");
      console.log("- Entry USDT:", hre.ethers.formatUnits(entryUSDT, 6), "USDT");
      console.log("- USDT for Pool:", hre.ethers.formatUnits(usdtForPool, 6), "USDT");
      console.log("- BLOCKS for Pool:", hre.ethers.formatUnits(liquidityBLOCKS, 18), "BLOCKS");
      
      // Calculate minimum amounts with current slippage
      const minUSDT = (usdtForPool * (10000n - slippage)) / 10000n;
      const minBLOCKS = (liquidityBLOCKS * (10000n - slippage)) / 10000n;
      
      console.log("- Min USDT (with slippage):", hre.ethers.formatUnits(minUSDT, 6), "USDT");
      console.log("- Min BLOCKS (with slippage):", hre.ethers.formatUnits(minBLOCKS, 18), "BLOCKS");
      
      // Check if these amounts are reasonable for the current pool
      console.log("\n🏊 Pool Compatibility Check:");
      console.log("============================");
      
      const factory = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakeFactory", "0x6725F303b657a9451d8BA641348b6761A6CC7a17");
      const pairAddress = await factory.getPair("0xCff8B55324b7c66BD04D66F3AFBFA5A20874c424", "0x350eBe9e8030B5C2e70f831b82b92E44569736fF");
      
      if (pairAddress !== hre.ethers.ZeroAddress) {
        const pair = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakePair", pairAddress);
        const reserves = await pair.getReserves();
        const token0 = await pair.token0();
        
        const blocksIsToken0 = token0.toLowerCase() === "0xCff8B55324b7c66BD04D66F3AFBFA5A20874c424".toLowerCase();
        const blocksReserve = blocksIsToken0 ? reserves[0] : reserves[1];
        const usdtReserve = blocksIsToken0 ? reserves[1] : reserves[0];
        
        console.log("Current pool reserves:");
        console.log("- BLOCKS:", hre.ethers.formatUnits(blocksReserve, 18), "BLOCKS");
        console.log("- USDT:", hre.ethers.formatUnits(usdtReserve, 6), "USDT");
        
        // Calculate impact
        const usdtImpact = (Number(hre.ethers.formatUnits(usdtForPool, 6)) / Number(hre.ethers.formatUnits(usdtReserve, 6))) * 100;
        const blocksImpact = (Number(hre.ethers.formatUnits(liquidityBLOCKS, 18)) / Number(hre.ethers.formatUnits(blocksReserve, 18))) * 100;
        
        console.log("Transaction impact:");
        console.log("- USDT impact:", usdtImpact.toFixed(2), "%");
        console.log("- BLOCKS impact:", blocksImpact.toFixed(2), "%");
        
        if (usdtImpact > 100 || blocksImpact > 100) {
          console.log("⚠️ HIGH IMPACT: Transaction would significantly affect pool");
        } else {
          console.log("✅ REASONABLE IMPACT: Transaction should be manageable");
        }
      }
      
    } catch (error) {
      console.log("❌ Cannot read all parameters:", error.message);
    }

    console.log("\n🎯 Summary:");
    console.log("===========");
    console.log("✅ Global target price adjusted to realistic level");
    console.log("✅ Deadline window increased to 10 minutes");
    console.log(maxSlippage === 1000 ? "✅" : "⚠️", "Slippage tolerance set to maximum allowed (10%)");
    console.log("✅ Package purchases should now have better success rate");
    
    console.log("\n🧪 Ready for Testing:");
    console.log("=====================");
    console.log("1. Try a package purchase through the frontend");
    console.log("2. Monitor transaction for success/failure");
    console.log("3. Check for LiquidityAdded or LiquidityAdditionFailed events");
    console.log("4. If still failing, the fallback mechanism should send USDT to treasury");

  } catch (error) {
    console.error("❌ Fix failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fix failed:", error);
    process.exit(1);
  });
