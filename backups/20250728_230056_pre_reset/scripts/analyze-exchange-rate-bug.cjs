const hre = require("hardhat");

async function main() {
  console.log("🔍 Analyzing Exchange Rate Bug...\n");

  // Simulate the current problematic calculation
  console.log("📊 CURRENT PROBLEMATIC CALCULATION:");
  console.log("=====================================");
  
  // Current deployment values
  const usdtAmount = hre.ethers.parseUnits("100", 6); // 100 USDT (6 decimals)
  const exchangeRate = hre.ethers.parseUnits("1.5", 6); // 1.5 USDT per BLOCKS (6 decimals) - WRONG!
  
  console.log(`💰 USDT Amount: ${hre.ethers.formatUnits(usdtAmount, 6)} USDT`);
  console.log(`📈 Exchange Rate (raw): ${exchangeRate}`);
  console.log(`📈 Exchange Rate (formatted): ${hre.ethers.formatUnits(exchangeRate, 6)} USDT per BLOCKS`);
  
  // Smart contract calculation (current buggy version)
  const usdtDecimals = 6;
  const scale = 10n ** (18n - BigInt(usdtDecimals)); // 10^12
  const netUSDT18 = usdtAmount * scale; // Convert to 18 decimals
  const totalUserTokens = (netUSDT18 * 10n ** 18n) / exchangeRate;
  
  console.log(`\n🧮 Calculation Steps:`);
  console.log(`   Scale Factor: ${scale}`);
  console.log(`   USDT in 18 decimals: ${netUSDT18}`);
  console.log(`   Formula: (${netUSDT18} * 10^18) / ${exchangeRate}`);
  console.log(`   Total User Tokens (wei): ${totalUserTokens}`);
  console.log(`   Total User Tokens (BLOCKS): ${hre.ethers.formatUnits(totalUserTokens, 18)}`);
  
  const tokensNumber = Number(hre.ethers.formatUnits(totalUserTokens, 18));
  const ratio = tokensNumber / 100;
  console.log(`   Tokens per USDT: ${ratio.toFixed(2)}`);
  console.log(`   🚨 RESULT: ${tokensNumber.toExponential(2)} BLOCKS (MASSIVELY INFLATED!)`);
  
  // Show what the correct calculation should be
  console.log("\n✅ CORRECT CALCULATION:");
  console.log("========================");
  
  // Option 1: Exchange rate in 18 decimals
  const correctExchangeRate18 = hre.ethers.parseUnits("1.5", 18); // 1.5 USDT per BLOCKS (18 decimals)
  const correctTokens18 = (netUSDT18 * 10n ** 18n) / correctExchangeRate18;
  
  console.log(`📈 Correct Exchange Rate (18-decimal): ${correctExchangeRate18}`);
  console.log(`🧮 Correct Calculation: (${netUSDT18} * 10^18) / ${correctExchangeRate18}`);
  console.log(`✅ Correct Tokens: ${hre.ethers.formatUnits(correctTokens18, 18)} BLOCKS`);
  
  // Option 2: Adjust the calculation to work with 6-decimal exchange rates
  const correctTokens6 = netUSDT18 / exchangeRate; // Remove the extra 10^18 multiplication
  console.log(`\n🔧 Alternative Fix (adjust calculation):`);
  console.log(`🧮 Adjusted Calculation: ${netUSDT18} / ${exchangeRate}`);
  console.log(`✅ Adjusted Tokens: ${hre.ethers.formatUnits(correctTokens6, 18)} BLOCKS`);
  
  // Show the correction factor that frontend is applying
  console.log("\n🩹 FRONTEND CORRECTION:");
  console.log("========================");
  const frontendCorrectionFactor = 0.000001; // 1/1,000,000
  const frontendCorrectedTokens = tokensNumber * frontendCorrectionFactor;
  console.log(`🔧 Frontend applies: ${tokensNumber.toExponential(2)} * ${frontendCorrectionFactor}`);
  console.log(`🩹 Frontend result: ${frontendCorrectedTokens.toFixed(2)} BLOCKS`);
  console.log(`💭 This is just masking the symptom, not fixing the root cause!`);
  
  // Calculate what the exchange rate should actually be
  console.log("\n🎯 RECOMMENDED FIX:");
  console.log("===================");
  
  const targetTokensPerUSDT = 0.67; // ~67 tokens per 100 USDT = 0.67 tokens per USDT
  const targetTotalTokens = 100 * targetTokensPerUSDT; // 67 BLOCKS for 100 USDT
  const targetTotalTokensWei = hre.ethers.parseUnits(targetTotalTokens.toString(), 18);
  
  // Calculate what exchange rate would give us the target
  const requiredExchangeRate = (netUSDT18 * 10n ** 18n) / targetTotalTokensWei;
  
  console.log(`🎯 Target: ${targetTotalTokens} BLOCKS for 100 USDT`);
  console.log(`📊 Required Exchange Rate: ${requiredExchangeRate}`);
  console.log(`📊 Required Exchange Rate (18-decimal): ${hre.ethers.formatUnits(requiredExchangeRate, 18)} USDT per BLOCKS`);
  console.log(`📊 Required Exchange Rate (6-decimal): ${hre.ethers.formatUnits(requiredExchangeRate, 6)} USDT per BLOCKS`);
  
  // Verify the fix
  const verifyTokens = (netUSDT18 * 10n ** 18n) / requiredExchangeRate;
  console.log(`✅ Verification: ${hre.ethers.formatUnits(verifyTokens, 18)} BLOCKS`);
  
  console.log("\n📋 SUMMARY:");
  console.log("============");
  console.log(`❌ Current: ${tokensNumber.toExponential(2)} BLOCKS (inflated by ~${(tokensNumber / targetTotalTokens).toExponential(2)}x)`);
  console.log(`✅ Expected: ${targetTotalTokens} BLOCKS`);
  console.log(`🔧 Fix: Update exchange rates to use 18-decimal precision OR adjust calculation`);
  console.log(`🩹 Current frontend: Applies 1,000,000x correction factor (band-aid solution)`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
