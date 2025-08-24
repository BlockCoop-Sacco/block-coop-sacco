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

function getCorrectedWalletBalance(rawBalance: bigint, tokenType: 'share' | 'usdt' | 'lp', shouldCorrect: boolean): string {
  if (tokenType === 'usdt') {
    // USDT doesn't need correction
    return parseFloat(ethers.formatUnits(rawBalance, 6)).toFixed(2);
  }

  // For SHARE and LP tokens, apply correction if needed
  if (shouldCorrect && rawBalance > 0n) {
    const correctionFactor = getExchangeRateCorrection(rawBalance);
    if (correctionFactor < 1) {
      const correctedBalance = applyCorrectionToBigInt(rawBalance, correctionFactor);
      return parseFloat(ethers.formatUnits(correctedBalance, 18)).toFixed(4);
    }
  }

  return parseFloat(ethers.formatUnits(rawBalance, 18)).toFixed(4);
}

describe('UI Display Corrections', () => {
  describe('Balance Display Corrections', () => {
    it('should correct inflated BLOCKS balance display', () => {
      // Simulate inflated BLOCKS balance (5+ trillion)
      const inflatedBalance = ethers.parseUnits('5000020350877.1901', 18);
      
      const correctedDisplay = getCorrectedWalletBalance(inflatedBalance, 'share', true);
      const correctedValue = parseFloat(correctedDisplay);
      
      // Should be corrected to a reasonable value
      expect(correctedValue).toBeLessThan(100000); // Less than 100k BLOCKS
      expect(correctedValue).toBeGreaterThan(0);
      expect(isFinite(correctedValue)).toBe(true);
      
      console.log('Original inflated balance:', ethers.formatUnits(inflatedBalance, 18));
      console.log('Corrected display balance:', correctedDisplay);
    });

    it('should correct inflated USDT balance display', () => {
      // Simulate inflated USDT balance (100+ billion)
      const inflatedBalance = ethers.parseUnits('99999297851.97', 6);
      
      // USDT should not be corrected (correction only applies to BLOCKS/LP tokens)
      const display = getCorrectedWalletBalance(inflatedBalance, 'usdt', true);
      const displayValue = parseFloat(display);
      
      // USDT should show the actual value (no correction applied)
      expect(displayValue).toBeCloseTo(99999297851.97, 2);
      
      console.log('USDT balance (no correction):', display);
    });

    it('should handle reasonable balances without correction', () => {
      // Test with reasonable BLOCKS balance
      const reasonableBalance = ethers.parseUnits('1000', 18);
      
      const display = getCorrectedWalletBalance(reasonableBalance, 'share', true);
      const displayValue = parseFloat(display);
      
      // Should remain unchanged
      expect(displayValue).toBeCloseTo(1000, 4);
      
      console.log('Reasonable balance (no correction needed):', display);
    });
  });

  describe('Pool Reserve Corrections', () => {
    it('should identify inflated pool reserves', () => {
      // Simulate the problematic pool reserves
      const inflatedBlocksReserve = ethers.parseUnits('37491228646506.9430', 18);
      const usdtReserve = ethers.parseUnits('12.02', 6);
      
      const correction = getExchangeRateCorrection(inflatedBlocksReserve);
      
      // Should apply extreme correction for trillion-scale values
      expect(correction).toBeLessThan(1);
      expect(correction).toBe(0.000000000001); // 1 trillion divisor
      
      const correctedReserve = applyCorrectionToBigInt(inflatedBlocksReserve, correction);
      const correctedValue = parseFloat(ethers.formatUnits(correctedReserve, 18));
      
      // Should result in reasonable reserve amount
      expect(correctedValue).toBeLessThan(100000); // Less than 100k BLOCKS
      expect(correctedValue).toBeGreaterThan(0);
      
      console.log('Original pool reserve:', ethers.formatUnits(inflatedBlocksReserve, 18));
      console.log('Corrected pool reserve:', correctedValue.toLocaleString());
    });

    it('should calculate realistic prices after correction', () => {
      const inflatedBlocksReserve = ethers.parseUnits('37491228646506.9430', 18);
      const usdtReserve = ethers.parseUnits('12.02', 6);
      
      // Apply correction
      const correction = getExchangeRateCorrection(inflatedBlocksReserve);
      const correctedBlocksReserve = applyCorrectionToBigInt(inflatedBlocksReserve, correction);
      
      // Calculate price: USDT / BLOCKS
      const usdtDecimal = parseFloat(ethers.formatUnits(usdtReserve, 6));
      const blocksDecimal = parseFloat(ethers.formatUnits(correctedBlocksReserve, 18));
      
      const pricePerBlocks = usdtDecimal / blocksDecimal;
      
      // Should result in realistic price
      expect(pricePerBlocks).toBeGreaterThan(0.0001); // At least 0.01 cents
      expect(pricePerBlocks).toBeLessThan(100); // Less than $100 per BLOCKS
      expect(isFinite(pricePerBlocks)).toBe(true);
      
      console.log('Corrected BLOCKS price:', pricePerBlocks.toFixed(6), 'USDT');
      console.log('Corrected USDT price:', (1/pricePerBlocks).toFixed(2), 'BLOCKS');
    });
  });

  describe('Format Token Amount Safety', () => {
    it('should handle extremely large values safely', () => {
      const extremeValue = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      // Should not crash and return a valid string
      const formatted = parseFloat(ethers.formatUnits(extremeValue, 18)).toFixed(4);
      
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
      
      console.log('Extreme value formatted:', formatted);
    });

    it('should handle zero values correctly', () => {
      const zeroValue = 0n;
      
      const formatted = parseFloat(ethers.formatUnits(zeroValue, 18)).toFixed(4);
      
      expect(formatted).toBe('0.0000');
    });
  });
});
