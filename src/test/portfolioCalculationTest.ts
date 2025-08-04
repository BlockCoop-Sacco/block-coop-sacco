/**
 * Test file to verify portfolio calculation logic
 * This tests the corrected calculation logic to ensure reasonable values
 */

import { ethers } from 'ethers';

// Test the corrected calculation logic
function testPortfolioCalculations() {
  console.log('=== Portfolio Calculation Test ===\n');

  // Test scenario: 100 USDT purchase
  const usdtAmount = 100n * 10n ** 6n; // 100 USDT with 6 decimals
  const exchangeRate = 2000000n; // 2.0 USDT per BLOCKS (in wei precision)
  const vestBps = 7000; // 70% vesting
  
  console.log('Input Parameters:');
  console.log(`USDT Amount: ${ethers.formatUnits(usdtAmount, 6)} USDT`);
  console.log(`Exchange Rate: ${Number(exchangeRate) / 1e6} USDT per BLOCKS`);
  console.log(`Vesting BPS: ${vestBps} (${vestBps / 100}%)\n`);

  // Step 1: Scale USDT to 18 decimals for calculation
  const scale = 10n ** (18n - 6n); // 10^12
  const netUSDT18 = usdtAmount * scale;
  console.log(`Scaled USDT (18 decimals): ${ethers.formatUnits(netUSDT18, 18)}`);

  // Step 2: Calculate total user tokens
  const totalUserTokens = (netUSDT18 * 10n ** 18n) / exchangeRate;
  console.log(`Total User Tokens: ${ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);

  // Step 3: Calculate treasury allocation (5%)
  const treasuryTokens = (totalUserTokens * 500n) / 10000n;
  console.log(`Treasury Tokens (5%): ${ethers.formatUnits(treasuryTokens, 18)} BLOCKS`);

  // Step 4: Calculate total tokens minted (including treasury)
  const totalTokens = totalUserTokens + treasuryTokens;
  console.log(`Total Tokens Minted: ${ethers.formatUnits(totalTokens, 18)} BLOCKS`);

  // Step 5: Calculate vesting and pool allocation
  const vestTokens = (totalUserTokens * BigInt(vestBps)) / 10000n;
  const poolTokens = totalUserTokens - vestTokens;
  console.log(`Vesting Tokens (70%): ${ethers.formatUnits(vestTokens, 18)} BLOCKS`);
  console.log(`Pool Tokens (30%): ${ethers.formatUnits(poolTokens, 18)} BLOCKS`);

  // Step 6: What should be stored in user stats (CORRECTED)
  console.log('\n=== User Stats (After Fix) ===');
  console.log(`totalTokensReceived: ${ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);
  console.log(`totalVestTokens: ${ethers.formatUnits(vestTokens, 18)} BLOCKS`);
  console.log(`totalPoolTokens: ${ethers.formatUnits(poolTokens, 18)} BLOCKS`);
  console.log(`totalLPTokens: ${ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);

  // Step 7: What was being stored before (INCORRECT)
  console.log('\n=== User Stats (Before Fix - INCORRECT) ===');
  console.log(`totalTokensReceived: ${ethers.formatUnits(totalTokens, 18)} BLOCKS`);
  console.log(`^ This included treasury allocation incorrectly!`);

  // Step 8: Test ROI calculation
  const investedNumber = Number(usdtAmount) / 1e6; // USDT with 6 decimals
  const tokensNumberCorrected = Number(totalUserTokens) / 1e18; // BLOCKS with 18 decimals
  const tokensNumberIncorrect = Number(totalTokens) / 1e18; // BLOCKS with 18 decimals

  const roiCorrected = ((tokensNumberCorrected - investedNumber) / investedNumber) * 100;
  const roiIncorrect = ((tokensNumberIncorrect - investedNumber) / investedNumber) * 100;

  console.log('\n=== ROI Calculation ===');
  console.log(`Invested: ${investedNumber} USDT`);
  console.log(`Tokens (Corrected): ${tokensNumberCorrected} BLOCKS`);
  console.log(`ROI (Corrected): ${roiCorrected.toFixed(2)}%`);
  console.log(`Tokens (Incorrect): ${tokensNumberIncorrect} BLOCKS`);
  console.log(`ROI (Incorrect): ${roiIncorrect.toFixed(2)}%`);

  // Step 9: Verify reasonable values
  console.log('\n=== Verification ===');
  const isReasonable = tokensNumberCorrected < 1000 && roiCorrected < 100;
  console.log(`Values are reasonable: ${isReasonable ? 'YES' : 'NO'}`);
  
  if (isReasonable) {
    console.log('✅ Fix successful - values are in reasonable range');
  } else {
    console.log('❌ Values still inflated - further investigation needed');
  }
}

// Run the test
testPortfolioCalculations();
