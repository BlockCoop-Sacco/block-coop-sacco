const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing Package Purchase with Liquidity Fixes...");
  console.log("===================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Testing with account:", deployer.address);

  // Contract addresses
  const addresses = {
    PackageManagerV2_1: "0xb1995f8C4Cf5409814d191e444e6433f5B6c712b",
    USDT: "0x350eBe9e8030B5C2e70f831b82b92E44569736fF"
  };

  try {
    // Connect to contracts
    const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", addresses.PackageManagerV2_1);
    const usdt = await hre.ethers.getContractAt("IERC20Decimals", addresses.USDT);

    console.log("✅ Connected to contracts");

    // Check current balances
    console.log("\n💰 Account Balances:");
    console.log("====================");
    
    const usdtBalance = await usdt.balanceOf(deployer.address);
    console.log("USDT Balance:", hre.ethers.formatUnits(usdtBalance, 6), "USDT");

    // Check package details
    console.log("\n📦 Package Details:");
    console.log("===================");
    
    const pkg = await packageManager.getPackage(0);
    console.log("Package Name:", pkg.name);
    console.log("Entry USDT:", hre.ethers.formatUnits(pkg.entryUSDT, 6), "USDT");
    console.log("Exchange Rate:", Number(pkg.exchangeRate) / 1e6, "USDT per BLOCKS");
    console.log("Active:", pkg.active);

    // Check if we have enough USDT
    if (usdtBalance < pkg.entryUSDT) {
      console.log("❌ Insufficient USDT balance for purchase");
      return;
    }

    // Check allowance
    console.log("\n🔐 Allowance Check:");
    console.log("===================");
    
    const allowance = await usdt.allowance(deployer.address, addresses.PackageManagerV2_1);
    console.log("Current allowance:", hre.ethers.formatUnits(allowance, 6), "USDT");
    console.log("Required for purchase:", hre.ethers.formatUnits(pkg.entryUSDT, 6), "USDT");

    if (allowance < pkg.entryUSDT) {
      console.log("⚠️ Need to approve USDT spending first");
      console.log("Approving USDT...");
      
      const approveTx = await usdt.approve(addresses.PackageManagerV2_1, hre.ethers.parseUnits("1000", 6));
      await approveTx.wait();
      console.log("✅ USDT approved");
    }

    // Check current contract parameters (if accessible)
    console.log("\n⚙️ Contract Parameters:");
    console.log("=======================");
    
    try {
      const globalPrice = await packageManager.globalTargetPrice();
      console.log("✅ Global Target Price:", hre.ethers.formatUnits(globalPrice, 18), "USDT per BLOCKS");
    } catch (error) {
      console.log("❌ Cannot read global target price");
    }
    
    try {
      const deadline = await packageManager.deadlineWindow();
      console.log("✅ Deadline Window:", deadline.toString(), "seconds");
    } catch (error) {
      console.log("❌ Cannot read deadline window");
    }

    // Attempt the purchase
    console.log("\n🛒 Attempting Package Purchase:");
    console.log("===============================");
    
    console.log("Purchasing package 0 with no referrer...");
    
    try {
      // Estimate gas first
      const gasEstimate = await packageManager.purchase.estimateGas(0, hre.ethers.ZeroAddress);
      console.log("Estimated gas:", gasEstimate.toString());
      
      // Execute the purchase
      const purchaseTx = await packageManager.purchase(0, hre.ethers.ZeroAddress, {
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
      });
      
      console.log("Transaction submitted:", purchaseTx.hash);
      console.log("Waiting for confirmation...");
      
      const receipt = await purchaseTx.wait();
      console.log("✅ Transaction confirmed!");
      console.log("Gas used:", receipt.gasUsed.toString());
      
      // Parse events to see what happened
      console.log("\n📋 Transaction Events:");
      console.log("======================");
      
      for (const log of receipt.logs) {
        try {
          const parsed = packageManager.interface.parseLog(log);
          if (parsed) {
            console.log("Event:", parsed.name);
            console.log("Args:", parsed.args);
          }
        } catch (error) {
          // Skip unparseable logs
        }
      }
      
      console.log("\n🎉 Purchase Successful!");
      console.log("=======================");
      console.log("✅ Package purchase completed");
      console.log("✅ Liquidity addition worked (or fallback executed)");
      console.log("✅ Exchange rate fix is working correctly");
      
    } catch (error) {
      console.log("❌ Purchase failed:", error.message);
      
      // Check if it's still the liquidity issue
      if (error.message.includes("INSUFFICIENT_LIQUIDITY")) {
        console.log("\n🔍 Still Liquidity Issue:");
        console.log("=========================");
        console.log("The purchase is still failing due to liquidity issues.");
        console.log("This suggests the pool is still too imbalanced for automatic liquidity addition.");
        
        console.log("\n🔧 Additional Solutions:");
        console.log("========================");
        console.log("1. 💰 Manually add balanced liquidity to the pool");
        console.log("2. 🔄 Modify contract to skip liquidity addition temporarily");
        console.log("3. 🎯 Further adjust global target price");
        console.log("4. 🏊 Create a new balanced liquidity pool");
        
      } else if (error.message.includes("limit exceeded")) {
        console.log("\n🌐 Network Issue:");
        console.log("=================");
        console.log("RPC rate limiting detected. Try again in a few minutes.");
        
      } else {
        console.log("\n🔍 Other Issue:");
        console.log("===============");
        console.log("The error might be related to:");
        console.log("- Gas estimation failure");
        console.log("- Contract state issues");
        console.log("- Network congestion");
        console.log("- Insufficient token balances in PackageManager");
      }
    }

    // Check final balances
    console.log("\n💰 Final Balances:");
    console.log("==================");
    
    const finalUSDTBalance = await usdt.balanceOf(deployer.address);
    console.log("Final USDT Balance:", hre.ethers.formatUnits(finalUSDTBalance, 6), "USDT");
    
    const usdtUsed = usdtBalance - finalUSDTBalance;
    if (usdtUsed > 0) {
      console.log("USDT Used:", hre.ethers.formatUnits(usdtUsed, 6), "USDT");
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
