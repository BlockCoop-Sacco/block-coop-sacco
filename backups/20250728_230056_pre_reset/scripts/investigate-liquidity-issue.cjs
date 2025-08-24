const hre = require("hardhat");

async function main() {
  console.log("🔍 Investigating Liquidity Pool Issue...");
  console.log("=======================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Investigating with account:", deployer.address);

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
    const router = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakeRouter", addresses.PancakeRouter);
    const factory = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakeFactory", addresses.PancakeFactory);

    console.log("✅ Connected to all contracts");

    // Investigation 1: Check liquidity pool existence
    console.log("\n🏊 Investigation 1: Liquidity Pool State");
    console.log("=======================================");
    
    const pairAddress = await factory.getPair(addresses.BLOCKS, addresses.USDT);
    console.log("BLOCKS/USDT Pair Address:", pairAddress);
    
    if (pairAddress === hre.ethers.ZeroAddress) {
      console.log("❌ BLOCKS/USDT pair does NOT exist!");
      console.log("This is likely the root cause of the INSUFFICIENT_LIQUIDITY error.");
    } else {
      console.log("✅ BLOCKS/USDT pair exists");
      
      // Get pair contract and check reserves
      const pair = await hre.ethers.getContractAt("contracts/PackageManagerV2_1.sol:IPancakePair", pairAddress);
      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();
      
      console.log("\n📊 Pair Details:");
      console.log("Token0:", token0);
      console.log("Token1:", token1);
      console.log("Reserve0:", hre.ethers.formatUnits(reserves[0], 18));
      console.log("Reserve1:", hre.ethers.formatUnits(reserves[1], 18));
      
      // Determine which token is which
      const blocksIsToken0 = token0.toLowerCase() === addresses.BLOCKS.toLowerCase();
      const blocksReserve = blocksIsToken0 ? reserves[0] : reserves[1];
      const usdtReserve = blocksIsToken0 ? reserves[1] : reserves[0];
      
      console.log("\n💰 Liquidity Reserves:");
      console.log("BLOCKS Reserve:", hre.ethers.formatUnits(blocksReserve, 18), "BLOCKS");
      console.log("USDT Reserve:", hre.ethers.formatUnits(usdtReserve, 6), "USDT");
      
      // Check if reserves are sufficient
      const minLiquidity = hre.ethers.parseUnits("1", 18); // 1 token minimum
      const hasMinLiquidity = blocksReserve > minLiquidity && usdtReserve > minLiquidity;
      console.log("Has minimum liquidity:", hasMinLiquidity ? "✅ YES" : "❌ NO");
    }

    // Investigation 2: Check contract configuration
    console.log("\n⚙️ Investigation 2: Contract Configuration");
    console.log("==========================================");
    
    const globalTargetPrice = await packageManager.globalTargetPrice();
    const slippageTolerance = await packageManager.slippageTolerance();
    const deadlineWindow = await packageManager.deadlineWindow();
    
    console.log("Global Target Price:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");
    console.log("Slippage Tolerance:", slippageTolerance.toString(), "basis points (", Number(slippageTolerance) / 100, "%)");
    console.log("Deadline Window:", deadlineWindow.toString(), "seconds");

    // Investigation 3: Simulate purchase calculation
    console.log("\n🧮 Investigation 3: Purchase Simulation");
    console.log("=======================================");
    
    const pkg = await packageManager.getPackage(0);
    console.log("Package Details:");
    console.log("- Name:", pkg.name);
    console.log("- Entry USDT:", hre.ethers.formatUnits(pkg.entryUSDT, 6), "USDT");
    console.log("- Exchange Rate:", Number(pkg.exchangeRate) / 1e6, "USDT per BLOCKS");
    console.log("- Vest BPS:", pkg.vestBps.toString(), "(", Number(pkg.vestBps) / 100, "%)");

    // Simulate the purchase calculation
    const entryUSDT = pkg.entryUSDT;
    const vestBps = pkg.vestBps;
    
    // Calculate USDT allocation (30% to liquidity pool)
    const usdtForPool = (entryUSDT * (10000n - vestBps)) / 10000n;
    const usdtForVault = entryUSDT - usdtForPool;
    
    console.log("\n💰 USDT Allocation:");
    console.log("- For Pool (liquidity):", hre.ethers.formatUnits(usdtForPool, 6), "USDT");
    console.log("- For Vault (vesting):", hre.ethers.formatUnits(usdtForVault, 6), "USDT");
    
    // Calculate BLOCKS for liquidity using global target price
    const poolTokens = (usdtForPool * hre.ethers.parseUnits("1", 18)) / globalTargetPrice;
    
    console.log("\n🪙 BLOCKS Calculation for Liquidity:");
    console.log("- BLOCKS for Pool:", hre.ethers.formatUnits(poolTokens, 18), "BLOCKS");
    console.log("- Using Global Target Price:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");

    // Investigation 4: Check token balances and allowances
    console.log("\n💳 Investigation 4: Token Balances & Allowances");
    console.log("===============================================");
    
    const packageManagerBalance = await blocks.balanceOf(addresses.PackageManagerV2_1);
    const deployerUSDTBalance = await usdt.balanceOf(deployer.address);
    const deployerBLOCKSBalance = await blocks.balanceOf(deployer.address);
    
    console.log("PackageManager BLOCKS Balance:", hre.ethers.formatUnits(packageManagerBalance, 18), "BLOCKS");
    console.log("Deployer USDT Balance:", hre.ethers.formatUnits(deployerUSDTBalance, 6), "USDT");
    console.log("Deployer BLOCKS Balance:", hre.ethers.formatUnits(deployerBLOCKSBalance, 18), "BLOCKS");
    
    // Check if PackageManager has enough BLOCKS for liquidity
    const hasEnoughBLOCKS = packageManagerBalance >= poolTokens;
    console.log("PackageManager has enough BLOCKS for liquidity:", hasEnoughBLOCKS ? "✅ YES" : "❌ NO");
    
    if (!hasEnoughBLOCKS) {
      console.log("⚠️ POTENTIAL ISSUE: PackageManager doesn't have enough BLOCKS for liquidity addition");
      console.log("   Required:", hre.ethers.formatUnits(poolTokens, 18), "BLOCKS");
      console.log("   Available:", hre.ethers.formatUnits(packageManagerBalance, 18), "BLOCKS");
    }

    // Investigation 5: Check router allowances
    console.log("\n🔐 Investigation 5: Router Allowances");
    console.log("====================================");
    
    const blocksAllowance = await blocks.allowance(addresses.PackageManagerV2_1, addresses.PancakeRouter);
    const usdtAllowance = await usdt.allowance(addresses.PackageManagerV2_1, addresses.PancakeRouter);
    
    console.log("BLOCKS allowance to router:", hre.ethers.formatUnits(blocksAllowance, 18), "BLOCKS");
    console.log("USDT allowance to router:", hre.ethers.formatUnits(usdtAllowance, 6), "USDT");
    
    const hasEnoughBLOCKSAllowance = blocksAllowance >= poolTokens;
    const hasEnoughUSDTAllowance = usdtAllowance >= usdtForPool;
    
    console.log("Sufficient BLOCKS allowance:", hasEnoughBLOCKSAllowance ? "✅ YES" : "❌ NO");
    console.log("Sufficient USDT allowance:", hasEnoughUSDTAllowance ? "✅ YES" : "❌ NO");

    // Summary and recommendations
    console.log("\n📋 Investigation Summary");
    console.log("========================");
    
    const issues = [];
    
    if (pairAddress === hre.ethers.ZeroAddress) {
      issues.push("❌ BLOCKS/USDT pair does not exist");
    }
    
    if (!hasEnoughBLOCKS) {
      issues.push("❌ PackageManager has insufficient BLOCKS balance");
    }
    
    if (!hasEnoughBLOCKSAllowance) {
      issues.push("❌ Insufficient BLOCKS allowance to PancakeRouter");
    }
    
    if (!hasEnoughUSDTAllowance) {
      issues.push("❌ Insufficient USDT allowance to PancakeRouter");
    }
    
    if (issues.length === 0) {
      console.log("✅ No obvious issues found. The problem might be:");
      console.log("   - Slippage tolerance too low");
      console.log("   - Deadline window too short");
      console.log("   - Network congestion");
      console.log("   - Price impact too high");
    } else {
      console.log("🚨 Issues Found:");
      issues.forEach(issue => console.log("   " + issue));
    }

    console.log("\n🔧 Recommended Actions:");
    if (pairAddress === hre.ethers.ZeroAddress) {
      console.log("1. Create BLOCKS/USDT liquidity pair");
      console.log("2. Add initial liquidity to the pair");
    }
    if (!hasEnoughBLOCKS) {
      console.log("3. Mint BLOCKS tokens to PackageManager");
    }
    if (!hasEnoughBLOCKSAllowance || !hasEnoughUSDTAllowance) {
      console.log("4. Approve router allowances");
    }
    console.log("5. Consider increasing slippage tolerance");
    console.log("6. Consider increasing deadline window");

  } catch (error) {
    console.error("❌ Investigation failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Investigation failed:", error);
    process.exit(1);
  });
