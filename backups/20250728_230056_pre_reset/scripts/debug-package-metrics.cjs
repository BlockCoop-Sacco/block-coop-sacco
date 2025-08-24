const hre = require("hardhat");

async function main() {
  console.log("🔍 Debugging Package Metrics Issues");
  console.log("=====================================");

  // Get the deployed contract
  const packageManagerAddress = "0xDAF4B3628DfEE1E8AB97694C031895F06f762e40";
  const packageManager = await hre.ethers.getContractAt("PackageManagerV2_1", packageManagerAddress);

  try {
    // Get all package IDs
    const packageIds = await packageManager.getPackageIds();
    console.log(`📦 Found ${packageIds.length} packages: [${packageIds.join(', ')}]`);

    for (const packageId of packageIds) {
      console.log(`\n📦 Package ${packageId} Analysis:`);
      console.log("================================");
      
      const pkg = await packageManager.getPackage(packageId);
      
      console.log("📊 Raw Contract Data:");
      console.log(`   Name: ${pkg.name}`);
      console.log(`   Entry USDT (raw): ${pkg.entryUSDT.toString()}`);
      console.log(`   Exchange Rate (raw): ${pkg.exchangeRate.toString()}`);
      console.log(`   Vest BPS: ${pkg.vestBps}`);
      console.log(`   Active: ${pkg.active}`);
      console.log(`   Exists: ${pkg.exists}`);

      // Format the values for display - try both 6 and 18 decimals to see which makes sense
      console.log("\n📊 Formatted Values (6 decimals):");
      console.log(`   Entry USDT: ${hre.ethers.formatUnits(pkg.entryUSDT, 6)} USDT`);
      console.log(`   Exchange Rate: ${hre.ethers.formatUnits(pkg.exchangeRate, 6)} USDT/BLOCKS`);

      console.log("\n📊 Formatted Values (18 decimals):");
      console.log(`   Entry USDT: ${hre.ethers.formatUnits(pkg.entryUSDT, 18)} USDT`);
      console.log(`   Exchange Rate: ${hre.ethers.formatUnits(pkg.exchangeRate, 18)} USDT/BLOCKS`);
      console.log(`   Vest Percentage: ${Number(pkg.vestBps) / 100}%`);

      // Calculate splits using the same logic as frontend
      const entryUSDTBig = BigInt(pkg.entryUSDT);
      const exchangeRateBig = BigInt(pkg.exchangeRate);
      const vestBpsBig = BigInt(pkg.vestBps);

      console.log("\n🧮 Split Calculations:");
      
      // Step 1: Calculate total user tokens
      const totalUserTokens = (entryUSDTBig * 1000000000000000000n) / exchangeRateBig;
      console.log(`   Total User Tokens: ${totalUserTokens.toString()} wei = ${hre.ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);

      // Step 2: Calculate USDT splits
      const usdtPool = (entryUSDTBig * (10000n - vestBpsBig)) / 10000n;
      const usdtVault = entryUSDTBig - usdtPool;
      console.log(`   USDT Pool (30%): ${usdtPool.toString()} wei = ${hre.ethers.formatUnits(usdtPool, 18)} USDT`);
      console.log(`   USDT Vault (70%): ${usdtVault.toString()} wei = ${hre.ethers.formatUnits(usdtVault, 18)} USDT`);

      // Step 3: Calculate token splits
      const vestTokens = (totalUserTokens * vestBpsBig) / 10000n;
      const poolTokens = totalUserTokens - vestTokens;
      console.log(`   Vest Tokens (70%): ${vestTokens.toString()} wei = ${hre.ethers.formatUnits(vestTokens, 18)} BLOCKS`);
      console.log(`   Pool Tokens (30%): ${poolTokens.toString()} wei = ${hre.ethers.formatUnits(poolTokens, 18)} BLOCKS`);

      // Check for zero values
      console.log("\n🚨 Zero Value Check:");
      console.log(`   Entry USDT is zero: ${entryUSDTBig === 0n}`);
      console.log(`   Exchange Rate is zero: ${exchangeRateBig === 0n}`);
      console.log(`   USDT Pool is zero: ${usdtPool === 0n}`);
      console.log(`   USDT Vault is zero: ${usdtVault === 0n}`);

      // Verify the exchange rate makes sense - test both 6 and 18 decimal interpretations
      if (exchangeRateBig > 0n) {
        console.log("\n✅ Verification (assuming 6-decimal data):");
        const exchangeRateFormatted6 = Number(hre.ethers.formatUnits(exchangeRateBig, 6));
        const entryUSDTFormatted6 = Number(hre.ethers.formatUnits(entryUSDTBig, 6));
        const expectedTokens6 = entryUSDTFormatted6 / exchangeRateFormatted6;
        console.log(`   Expected Tokens (6-decimal): ${expectedTokens6.toFixed(4)} BLOCKS`);

        console.log("\n✅ Verification (assuming 18-decimal data):");
        const exchangeRateFormatted18 = Number(hre.ethers.formatUnits(exchangeRateBig, 18));
        const entryUSDTFormatted18 = Number(hre.ethers.formatUnits(entryUSDTBig, 18));
        const expectedTokens18 = entryUSDTFormatted18 / exchangeRateFormatted18;
        console.log(`   Expected Tokens (18-decimal): ${expectedTokens18.toFixed(4)} BLOCKS`);

        const actualTokens = Number(hre.ethers.formatUnits(totalUserTokens, 18));
        console.log(`   Calculated Tokens: ${actualTokens.toFixed(4)} BLOCKS`);
        console.log(`   Matches 6-decimal: ${Math.abs(expectedTokens6 - actualTokens) < 0.001 ? '✅ YES' : '❌ NO'}`);
        console.log(`   Matches 18-decimal: ${Math.abs(expectedTokens18 - actualTokens) < 0.001 ? '✅ YES' : '❌ NO'}`);
      }
    }

    // Check global target price
    console.log("\n🎯 Global Target Price:");
    const globalTargetPrice = await packageManager.globalTargetPrice();
    console.log(`   Raw: ${globalTargetPrice.toString()}`);
    console.log(`   Formatted: ${hre.ethers.formatUnits(globalTargetPrice, 18)} USDT/BLOCKS`);

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
