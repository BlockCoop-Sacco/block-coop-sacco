const hre = require("hardhat");

async function main() {
  console.log("🔍 Comprehensive Exchange Rate Analysis...\n");

  console.log("📋 CURRENT SYSTEM ANALYSIS:");
  console.log("============================");
  
  // The exchange rate is already configurable by admin via addPackage()
  console.log("✅ Exchange rates ARE configurable by admin during package creation");
  console.log("✅ Admin can set different rates for different packages");
  console.log("❌ The CALCULATION in purchase() function is wrong");
  
  console.log("\n🔧 THE REAL PROBLEM:");
  console.log("=====================");
  console.log("The issue is NOT that exchange rates are hardcoded.");
  console.log("The issue is the CALCULATION formula in the purchase() function.");
  
  // Current deployed package analysis
  console.log("\n📦 CURRENT DEPLOYED PACKAGE:");
  console.log("=============================");
  console.log("Package #0: 'Gold'");
  console.log("Entry USDT: 100.0 USDT");
  console.log("Exchange Rate: 500000 (0.5 USDT per BLOCKS)");
  console.log("This means: 1 BLOCKS costs 0.5 USDT");
  console.log("Therefore: 100 USDT should buy 200 BLOCKS");
  
  // Show the calculation problem
  console.log("\n🚨 CALCULATION PROBLEM:");
  console.log("========================");
  
  const usdtAmount = 100n * 10n ** 6n; // 100 USDT in 6 decimals
  const exchangeRate = 500000n; // 0.5 USDT per BLOCKS in 6 decimals
  const scale = 10n ** 12n; // Scale from 6 to 18 decimals
  const netUSDT18 = usdtAmount * scale; // 100 USDT in 18 decimals
  
  console.log(`USDT Amount: ${usdtAmount} (6-decimal)`);
  console.log(`USDT Amount: ${netUSDT18} (18-decimal)`);
  console.log(`Exchange Rate: ${exchangeRate} (6-decimal)`);
  
  // Current BUGGY calculation
  const buggyResult = (netUSDT18 * 10n ** 18n) / exchangeRate;
  console.log(`\n❌ CURRENT BUGGY: (${netUSDT18} * 10^18) / ${exchangeRate}`);
  console.log(`   Result: ${buggyResult} wei = ${Number(buggyResult) / 1e18} BLOCKS`);
  console.log(`   This gives: ${(Number(buggyResult) / 1e18).toExponential(2)} BLOCKS (WRONG!)`);
  
  // CORRECT calculation options
  console.log(`\n✅ CORRECT CALCULATION OPTIONS:`);
  console.log(`===============================`);
  
  // Option 1: Adjust the formula to handle 6-decimal exchange rates
  const correct1 = (netUSDT18 * 10n ** 18n) / (exchangeRate * scale);
  console.log(`Option 1: (${netUSDT18} * 10^18) / (${exchangeRate} * ${scale})`);
  console.log(`   Result: ${correct1} wei = ${Number(correct1) / 1e18} BLOCKS`);
  
  // Option 2: Use exchange rate as BLOCKS per USDT instead of USDT per BLOCKS
  const blocksPerUSDT = 10n ** 6n / exchangeRate * 2n; // 2 BLOCKS per USDT for 0.5 USDT per BLOCKS
  const correct2 = (netUSDT18 * blocksPerUSDT) / 10n ** 6n;
  console.log(`Option 2: Convert to BLOCKS per USDT: ${blocksPerUSDT / 10n**18n} BLOCKS per USDT`);
  console.log(`   Result: ${correct2} wei = ${Number(correct2) / 1e18} BLOCKS`);
  
  // Option 3: Simple division with proper scaling
  const correct3 = netUSDT18 * 10n ** 6n / exchangeRate;
  console.log(`Option 3: ${netUSDT18} * 10^6 / ${exchangeRate}`);
  console.log(`   Result: ${correct3} wei = ${Number(correct3) / 1e18} BLOCKS`);
  
  // Verify which option gives the expected 200 BLOCKS
  const expected = 200;
  console.log(`\n🎯 VERIFICATION (Expected: ${expected} BLOCKS):`);
  console.log(`==============================================`);
  console.log(`Option 1: ${Number(correct1) / 1e18} BLOCKS ${Math.abs(Number(correct1) / 1e18 - expected) < 1 ? '✅' : '❌'}`);
  console.log(`Option 2: ${Number(correct2) / 1e18} BLOCKS ${Math.abs(Number(correct2) / 1e18 - expected) < 1 ? '✅' : '❌'}`);
  console.log(`Option 3: ${Number(correct3) / 1e18} BLOCKS ${Math.abs(Number(correct3) / 1e18 - expected) < 1 ? '✅' : '❌'}`);
  
  // Test with different admin-set exchange rates
  console.log(`\n🧪 TESTING DIFFERENT ADMIN-SET EXCHANGE RATES:`);
  console.log(`===============================================`);
  
  const testRates = [
    { rate: 1000000n, desc: "1.0 USDT per BLOCKS", expectedTokens: 100 },
    { rate: 1500000n, desc: "1.5 USDT per BLOCKS", expectedTokens: 66.67 },
    { rate: 2000000n, desc: "2.0 USDT per BLOCKS", expectedTokens: 50 },
    { rate: 500000n, desc: "0.5 USDT per BLOCKS", expectedTokens: 200 }
  ];
  
  testRates.forEach(test => {
    const result = (netUSDT18 * 10n ** 18n) / (test.rate * scale);
    const resultFormatted = Number(result) / 1e18;
    console.log(`${test.desc}:`);
    console.log(`   Expected: ${test.expectedTokens} BLOCKS`);
    console.log(`   Fixed Formula: ${resultFormatted.toFixed(2)} BLOCKS`);
    console.log(`   Match: ${Math.abs(resultFormatted - test.expectedTokens) < 1 ? '✅' : '❌'}`);
  });
  
  console.log(`\n📝 RECOMMENDED SMART CONTRACT FIX:`);
  console.log(`==================================`);
  console.log(`Change line 551 in PackageManagerV2_1.sol from:`);
  console.log(`   uint256 totalUserTokens = (netUSDT18 * 1e18) / pkg.exchangeRate;`);
  console.log(`To:`);
  console.log(`   uint256 totalUserTokens = (netUSDT18 * 1e18) / (pkg.exchangeRate * scale);`);
  
  console.log(`\n🎯 ADMIN PACKAGE CREATION WORKFLOW:`);
  console.log(`===================================`);
  console.log(`1. Admin calls addPackage() with desired exchange rate`);
  console.log(`2. Exchange rate format: 6-decimal precision`);
  console.log(`   - 500000 = 0.5 USDT per BLOCKS`);
  console.log(`   - 1000000 = 1.0 USDT per BLOCKS`);
  console.log(`   - 2000000 = 2.0 USDT per BLOCKS`);
  console.log(`3. Users purchase packages and get correct token amounts`);
  console.log(`4. No frontend corrections needed`);
  
  console.log(`\n✅ SUMMARY:`);
  console.log(`============`);
  console.log(`• Exchange rates ARE already configurable by admin ✅`);
  console.log(`• The problem is the calculation formula in purchase() ❌`);
  console.log(`• Fix: Add proper decimal scaling in the calculation`);
  console.log(`• Result: Realistic token amounts without frontend band-aids`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
