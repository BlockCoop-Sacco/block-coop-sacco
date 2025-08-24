import { ethers } from 'ethers';
import { getExchangeRateCorrection } from '../lib/portfolioCorrection';

// Helper functions for testing (copied from useContracts.ts)
function applyCorrectionToBigInt(value: bigint, correctionFactor: number): bigint {
  if (correctionFactor >= 1) {
    return value;
  }

  const precision = 1000000000000; // 12 decimal places of precision
  const correctionNumerator = BigInt(Math.floor(correctionFactor * precision));
  
  return (value * correctionNumerator) / BigInt(precision);
}

function formatTokenAmount(amount: bigint, decimals: number = 18, displayDecimals: number = 4): string {
  return parseFloat(ethers.formatUnits(amount, decimals)).toFixed(displayDecimals);
}

function getCorrectedWalletBalance(rawBalance: bigint, tokenType: 'share' | 'usdt' | 'lp'): string {
  if (tokenType === 'usdt') {
    // USDT doesn't need correction
    return formatTokenAmount(rawBalance, 18, 2);
  }

  // For SHARE and LP tokens, always check if correction is needed
  if (rawBalance > 0n) {
    const correctionFactor = getExchangeRateCorrection(rawBalance);
    if (correctionFactor < 1) {
      console.log(`🔧 Applying wallet balance correction for ${tokenType}:`, {
        original: rawBalance.toString(),
        originalFormatted: ethers.formatUnits(rawBalance, 18),
        correctionFactor,
        corrected: applyCorrectionToBigInt(rawBalance, correctionFactor).toString(),
        correctedFormatted: ethers.formatUnits(applyCorrectionToBigInt(rawBalance, correctionFactor), 18)
      });
      const correctedBalance = applyCorrectionToBigInt(rawBalance, correctionFactor);
      return formatTokenAmount(correctedBalance, 18, 4);
    }
  }

  return formatTokenAmount(rawBalance, 18, 4);
}

describe('Balance Correction Debug', () => {
  describe('SwapCard Balance Issues', () => {
    it('should correct inflated BLOCKS balance (5+ trillion to ~50)', () => {
      // Simulate the exact inflated balance from SwapCard
      const inflatedBlocksBalance = ethers.parseUnits('5000020350877.1904', 18);
      
      console.log('\n=== BLOCKS Balance Correction Test ===');
      console.log('Input balance:', ethers.formatUnits(inflatedBlocksBalance, 18), 'BLOCKS');
      
      const correctedDisplay = getCorrectedWalletBalance(inflatedBlocksBalance, 'share');
      const correctedValue = parseFloat(correctedDisplay);
      
      console.log('Corrected display:', correctedDisplay, 'BLOCKS');
      console.log('Expected range: 40-60 BLOCKS');
      
      // Should be corrected to approximately 50 BLOCKS (matching Portfolio page)
      expect(correctedValue).toBeLessThan(100); // Much less than original
      expect(correctedValue).toBeGreaterThan(10); // But still reasonable
      // With the correction factor (0.00000000001), 5 trillion becomes ~50 BLOCKS
      expect(correctedValue).toBeCloseTo(50, 1); // Approximately 50 BLOCKS (matching Portfolio page)
    });

    it('should not correct USDT balance (should show actual value)', () => {
      // Simulate the USDT balance from SwapCard
      const usdtBalance = ethers.parseUnits('99999297851.98', 6);
      
      console.log('\n=== USDT Balance Test ===');
      console.log('Input balance:', ethers.formatUnits(usdtBalance, 6), 'USDT');
      
      const display = getCorrectedWalletBalance(usdtBalance, 'usdt');
      const displayValue = parseFloat(display);
      
      console.log('Display value:', display, 'USDT');
      
      // USDT should not be corrected - should show actual value
      expect(displayValue).toBeCloseTo(99999297851.98, 2);
    });

    it('should detect when correction is needed', () => {
      const inflatedBalance = ethers.parseUnits('5000020350877.1904', 18);
      const reasonableBalance = ethers.parseUnits('50', 18);
      
      const inflatedCorrection = getExchangeRateCorrection(inflatedBalance);
      const reasonableCorrection = getExchangeRateCorrection(reasonableBalance);
      
      console.log('\n=== Correction Detection Test ===');
      console.log('Inflated balance correction factor:', inflatedCorrection);
      console.log('Reasonable balance correction factor:', reasonableCorrection);
      
      // Inflated balance should need correction
      expect(inflatedCorrection).toBeLessThan(1);
      expect(inflatedCorrection).toBe(0.00000000001); // Correction for trillion-scale to match Portfolio page
      
      // Reasonable balance should not need correction
      expect(reasonableCorrection).toBe(1.0);
    });

    it('should calculate wallet correction flag correctly', () => {
      const inflatedShareBalance = ethers.parseUnits('5000020350877.1904', 18);
      const reasonableUsdtBalance = ethers.parseUnits('1000', 6);
      const reasonableLpBalance = ethers.parseUnits('100', 18);
      
      // Simulate the wallet correction flag logic
      const shareCorrectionNeeded = inflatedShareBalance > 0n && getExchangeRateCorrection(inflatedShareBalance) < 1;
      const lpCorrectionNeeded = reasonableLpBalance > 0n && getExchangeRateCorrection(reasonableLpBalance) < 1;
      const walletCorrectionApplied = shareCorrectionNeeded || lpCorrectionNeeded;
      
      console.log('\n=== Wallet Correction Flag Test ===');
      console.log('Share correction needed:', shareCorrectionNeeded);
      console.log('LP correction needed:', lpCorrectionNeeded);
      console.log('Wallet correction applied:', walletCorrectionApplied);
      
      expect(shareCorrectionNeeded).toBe(true);
      expect(lpCorrectionNeeded).toBe(false);
      expect(walletCorrectionApplied).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle the exact SwapCard scenario', () => {
      // Exact values from the user's report
      const blocksBalance = ethers.parseUnits('5000020350877.1904', 18);
      const usdtBalance = ethers.parseUnits('99999297851.98', 6);
      
      console.log('\n=== Real SwapCard Scenario ===');
      
      const correctedBlocks = getCorrectedWalletBalance(blocksBalance, 'share');
      const displayedUsdt = getCorrectedWalletBalance(usdtBalance, 'usdt');
      
      console.log('Original BLOCKS:', ethers.formatUnits(blocksBalance, 18));
      console.log('Corrected BLOCKS:', correctedBlocks);
      console.log('USDT (no correction):', displayedUsdt);
      
      // Verify the correction produces expected results
      const correctedBlocksValue = parseFloat(correctedBlocks);
      const usdtValue = parseFloat(displayedUsdt);
      
      expect(correctedBlocksValue).toBeLessThan(100);
      expect(correctedBlocksValue).toBeGreaterThan(10);
      expect(usdtValue).toBeCloseTo(99999297851.98, 2);
    });
  });
});
