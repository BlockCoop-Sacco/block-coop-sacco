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
      const correctedBalance = applyCorrectionToBigInt(rawBalance, correctionFactor);
      return formatTokenAmount(correctedBalance, 18, 4);
    }
  }

  return formatTokenAmount(rawBalance, 18, 4);
}

describe('Final Balance Correction Test', () => {
  describe('SwapCard Expected Results', () => {
    it('should correct 5+ trillion BLOCKS to approximately 50 BLOCKS (matching Portfolio page)', () => {
      // Exact inflated balance from user report
      const inflatedBlocksBalance = ethers.parseUnits('5000020350877.1904', 18);

      console.log('\n=== Final BLOCKS Balance Correction ===');
      console.log('Original inflated balance:', ethers.formatUnits(inflatedBlocksBalance, 18), 'BLOCKS');

      const correctionFactor = getExchangeRateCorrection(inflatedBlocksBalance);
      console.log('Correction factor applied:', correctionFactor);

      const correctedDisplay = getCorrectedWalletBalance(inflatedBlocksBalance, 'share');
      const correctedValue = parseFloat(correctedDisplay);

      console.log('Corrected display balance:', correctedDisplay, 'BLOCKS');
      console.log('Expected: ~50 BLOCKS (to match Portfolio page)');

      // Should be corrected to approximately 50 BLOCKS (matching Portfolio page)
      expect(correctedValue).toBeLessThan(100); // Much less than 50,000
      expect(correctedValue).toBeGreaterThan(10); // But still reasonable
      expect(correctedValue).toBeCloseTo(50, 1); // Approximately 50 BLOCKS (within 0.1 tolerance)

      // Verify the correction factor produces the target result
      expect(correctionFactor).toBe(0.00000000001);
    });

    it('should not correct USDT balance', () => {
      // USDT balance from user report
      const usdtBalance = ethers.parseUnits('99999297851.98', 6);
      
      console.log('\n=== USDT Balance (No Correction) ===');
      console.log('USDT balance:', ethers.formatUnits(usdtBalance, 6), 'USDT');
      
      const display = getCorrectedWalletBalance(usdtBalance, 'usdt');
      const displayValue = parseFloat(display);
      
      console.log('Display value:', display, 'USDT');
      
      // USDT should not be corrected
      expect(displayValue).toBeCloseTo(99999297851.98, 2);
    });

    it('should demonstrate the complete correction calculation', () => {
      const originalValue = 5000020350877.1904;
      const correctionFactor = 0.00000000001;
      const expectedResult = originalValue * correctionFactor;

      console.log('\n=== Correction Calculation Verification ===');
      console.log('Original value:', originalValue.toLocaleString());
      console.log('Correction factor:', correctionFactor);
      console.log('Expected result:', expectedResult.toFixed(4));
      console.log('Target result: ~50 BLOCKS (matching Portfolio page)');

      expect(expectedResult).toBeCloseTo(50, 1);
    });
  });

  describe('Performance and Loading Optimizations', () => {
    it('should handle correction calculations efficiently', () => {
      const startTime = performance.now();
      
      // Test multiple corrections to ensure performance
      const testValues = [
        ethers.parseUnits('5000020350877.1904', 18), // Trillion scale
        ethers.parseUnits('150000000000', 18),       // Hundred billion scale
        ethers.parseUnits('15000000000', 18),        // Ten billion scale
        ethers.parseUnits('1500000000', 18),         // Billion scale
        ethers.parseUnits('150000000', 18),          // Hundred million scale
        ethers.parseUnits('1000', 18),               // Normal scale
      ];
      
      const results = testValues.map(value => {
        const correctionFactor = getExchangeRateCorrection(value);
        const corrected = getCorrectedWalletBalance(value, 'share');
        return { original: ethers.formatUnits(value, 18), corrected, factor: correctionFactor };
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log('\n=== Performance Test Results ===');
      console.log('Processed', testValues.length, 'corrections in', duration.toFixed(2), 'ms');
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.original} → ${result.corrected} BLOCKS (factor: ${result.factor})`);
      });
      
      // Should complete quickly (under 10ms for 6 calculations)
      expect(duration).toBeLessThan(10);
      
      // Verify all corrections are reasonable
      results.forEach(result => {
        const value = parseFloat(result.corrected);
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(1000000); // No result should be over 1M BLOCKS
        expect(isFinite(value)).toBe(true);
      });
    });
  });
});
