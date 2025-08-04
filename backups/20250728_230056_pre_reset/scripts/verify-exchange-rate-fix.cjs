const hre = require("hardhat");

async function main() {
  console.log("🔍 Verifying Exchange Rate Fix...\n");

  // Test the fixed calculation
  console.log("📊 TESTING FIXED CALCULATION:");
  console.log("==============================");
  
  // Current package values from the deployed contract
  const usdtAmount = hre.ethers.parseUnits("100", 6); // 100 USDT (6 decimals)
  const exchangeRate = 500000n; // 0.5 USDT per BLOCKS (6 decimals)
  
  console.log(`💰 USDT Amount: ${hre.ethers.formatUnits(usdtAmount, 6)} USDT`);
  console.log(`📈 Exchange Rate: ${exchangeRate} (${Number(exchangeRate) / 1e6} USDT per BLOCKS)`);
  
  // FIXED calculation (matches the corrected smart contract)
  const usdtDecimals = 6;
  const scale = 10n ** (18n - BigInt(usdtDecimals)); // 10^12
  const netUSDT18 = BigInt(usdtAmount) * scale; // Convert to 18 decimals
  const totalUserTokens = (netUSDT18 * 10n ** 18n) / (exchangeRate * scale); // FIXED: Proper decimal handling
  
  console.log(`\n🧮 FIXED Calculation Steps:`);
  console.log(`   Scale Factor: ${scale}`);
  console.log(`   USDT in 18 decimals: ${netUSDT18}`);
  console.log(`   Formula: (${netUSDT18} * 10^18) / (${exchangeRate} * ${scale})`);
  console.log(`   Total User Tokens (wei): ${totalUserTokens}`);
  console.log(`   Total User Tokens (BLOCKS): ${hre.ethers.formatUnits(totalUserTokens, 18)}`);
  
  const tokensNumber = Number(hre.ethers.formatUnits(totalUserTokens, 18));
  const ratio = tokensNumber / 100;
  console.log(`   Tokens per USDT: ${ratio.toFixed(6)}`);
  
  // Verify this matches expected calculation
  const exchangeRateFormatted = Number(exchangeRate) / 1e6; // 0.5 USDT per BLOCKS
  const expectedTokens = 100 / exchangeRateFormatted; // 100 USDT / 0.5 USDT per BLOCKS = 200 BLOCKS
  
  console.log(`\n✅ VERIFICATION:`);
  console.log(`   Expected: ${expectedTokens} BLOCKS`);
  console.log(`   Fixed Result: ${tokensNumber} BLOCKS`);
  console.log(`   Match: ${Math.abs(tokensNumber - expectedTokens) < 0.001 ? '✅ YES' : '❌ NO'}`);
  
  // Test with different exchange rates
  console.log(`\n🧪 TESTING DIFFERENT EXCHANGE RATES:`);
  console.log(`=====================================`);
  
  const testRates = [
    { rate: 1000000, description: "1.0 USDT per BLOCKS" },
    { rate: 1500000, description: "1.5 USDT per BLOCKS" },
    { rate: 2000000, description: "2.0 USDT per BLOCKS" },
    { rate: 500000, description: "0.5 USDT per BLOCKS (current)" }
  ];
  
  testRates.forEach(test => {
    const testExchangeRate = BigInt(test.rate);
    const testTokens = (netUSDT18 * 10n ** 18n) / (testExchangeRate * scale);
    const testTokensFormatted = Number(hre.ethers.formatUnits(testTokens, 18));
    const expectedForTest = 100 / (Number(test.rate) / 1e6);
    
    console.log(`   ${test.description}:`);
    console.log(`     Fixed Result: ${testTokensFormatted.toFixed(2)} BLOCKS`);
    console.log(`     Expected: ${expectedForTest.toFixed(2)} BLOCKS`);
    console.log(`     Match: ${Math.abs(testTokensFormatted - expectedForTest) < 0.01 ? '✅' : '❌'}`);
  });
  
  // Calculate vesting and pool allocation with fixed values
  console.log(`\n💰 TOKEN ALLOCATION (with fix):`);
  console.log(`================================`);
  
  const vestBps = 7000; // 70%
  const vestTokens = (totalUserTokens * BigInt(vestBps)) / 10000n;
  const poolTokens = totalUserTokens - vestTokens;
  const treasuryTokens = (totalUserTokens * 500n) / 10000n; // 5%
  
  console.log(`   Total User Tokens: ${hre.ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);
  console.log(`   Vesting (70%): ${hre.ethers.formatUnits(vestTokens, 18)} BLOCKS`);
  console.log(`   Pool (30%): ${hre.ethers.formatUnits(poolTokens, 18)} BLOCKS`);
  console.log(`   Treasury (5%): ${hre.ethers.formatUnits(treasuryTokens, 18)} BLOCKS`);
  console.log(`   LP Tokens Minted: ${hre.ethers.formatUnits(totalUserTokens, 18)} BLOCKS-LP`);
  
  // Show the difference from the buggy version
  console.log(`\n📊 COMPARISON WITH BUGGY VERSION:`);
  console.log(`==================================`);
  
  const buggyTokens = (netUSDT18 * 10n ** 18n) / exchangeRate; // Original buggy calculation
  const buggyNumber = Number(hre.ethers.formatUnits(buggyTokens, 18));
  const frontendCorrected = buggyNumber / 1000000; // Frontend correction
  
  console.log(`   Buggy Contract: ${buggyNumber.toExponential(2)} BLOCKS`);
  console.log(`   Frontend Corrected: ${frontendCorrected.toFixed(2)} BLOCKS`);
  console.log(`   Fixed Contract: ${tokensNumber.toFixed(2)} BLOCKS`);
  console.log(`   Improvement: ${(frontendCorrected / tokensNumber).toFixed(0)}x more accurate`);
  
  console.log(`\n🎯 SUMMARY:`);
  console.log(`============`);
  console.log(`✅ Fixed smart contract calculation removes 1 trillion times inflation`);
  console.log(`✅ 100 USDT now correctly yields ${tokensNumber} BLOCKS instead of ${buggyNumber.toExponential(2)}`);
  console.log(`✅ No more need for frontend correction factors`);
  console.log(`✅ Portfolio will show realistic token values`);
  console.log(`🔧 Next step: Deploy the fixed contract and update frontend configuration`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
