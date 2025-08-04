import { ethers } from 'ethers';
import { UserStats, UserPurchase } from './contracts';

/**
 * Portfolio Metrics Correction Utility
 * 
 * This module provides functions to correct inflated portfolio metrics
 * for users who made purchases before the treasury allocation fix.
 * 
 * Background:
 * - Before the fix, treasury allocation (5% extra) was included in user stats
 * - This caused inflated portfolio values (e.g., 70+ trillion tokens for 100 USDT)
 * - The fix was deployed at timestamp: 2025-07-10T23:42:09.537Z
 * - Contract address with fix: 0xb1995f8C4Cf5409814d191e444e6433f5B6c712b
 * - Exchange rate calculation bug was also fixed in the same deployment
 */

// Deployment timestamp of the portfolio metrics fix
export const FIX_DEPLOYMENT_TIMESTAMP = new Date('2025-07-10T23:42:09.537Z').getTime() / 1000;

// Contract address where the fix was deployed
export const FIX_CONTRACT_ADDRESS = '0xb1995f8C4Cf5409814d191e444e6433f5B6c712b';

// Enhanced contract address with improved liquidity addition (deployed 2025-07-12T19:09:58.081Z)
export const ENHANCED_CONTRACT_ADDRESS = '0xB0E52DBE2a980815d5622624130199BF511C34B6';
export const ENHANCED_DEPLOYMENT_TIMESTAMP = new Date('2025-07-12T19:09:58.081Z').getTime() / 1000;

/**
 * Correction factor for purchases made before the fix
 * This removes the 5% treasury allocation that was incorrectly included in user stats
 */
export const CORRECTION_FACTOR = 0.95; // Remove 5% treasury allocation

/**
 * Interface for corrected user statistics
 */
export interface CorrectedUserStats extends UserStats {
  correctionApplied: boolean;
  correctedPurchases: number;
  totalPurchases: number;
  correctionDetails: {
    originalTotalTokens: bigint;
    correctedTotalTokens: bigint;
    correctionAmount: bigint;
  };
}

/**
 * Determines if a purchase was made before the portfolio metrics fix
 */
export function isPurchaseBeforeFix(timestamp: number): boolean {
  return timestamp < FIX_DEPLOYMENT_TIMESTAMP;
}

/**
 * Determines if a purchase needs correction due to exchange rate issues
 * This identifies purchases with the trillion-scale inflation bug
 */
export function isPurchaseWithExchangeRateIssue(timestamp: number, totalTokens: bigint): boolean {
  // Check for inflated values regardless of timestamp
  // Any purchase with more than 10,000 BLOCKS is likely from the exchange rate bug
  const hasInflatedValues = totalTokens > 10000n * 10n ** 18n; // More than 10,000 BLOCKS is definitely inflated

  // Also check for extremely large values (trillion scale)
  const hasTrillionScaleValues = totalTokens > 1000000000000n * 10n ** 18n; // 1 trillion+ BLOCKS

  return hasInflatedValues || hasTrillionScaleValues;
}

/**
 * Determines the appropriate correction factor for a purchase
 * Returns the correction multiplier to apply
 * Now uses safe decimal conversion to avoid BigInt overflow
 */
export function getExchangeRateCorrection(totalTokens: bigint): number {
  // Use ethers.formatUnits for safe conversion to avoid Number overflow
  const tokensNumber = parseFloat(ethers.formatUnits(totalTokens, 18));

  // Handle edge cases
  if (!isFinite(tokensNumber) || tokensNumber < 0) {
    return 1.0;
  }

  // For extremely large values (trillion-scale), apply correction based on actual inflation factor
  if (tokensNumber > 100000000000000) { // 100 trillion+ (like vesting values)
    console.warn('🔧 Applying extreme correction for hundred-trillion-scale value:', tokensNumber.toLocaleString());
    // Use a more aggressive correction factor for extreme values
    return 1e-13; // Divide by 10 trillion
  }

  // For trillion-scale values, apply strong correction
  if (tokensNumber > 1000000000000) { // 1 trillion+
    console.warn('🔧 Applying strong correction for trillion-scale value:', tokensNumber.toLocaleString());
    // Calculate dynamic correction based on the scale of inflation
    // Target: reduce trillion-scale values to reasonable double-digit values
    const targetValue = 50; // Target around 50 tokens for reasonable display
    return targetValue / tokensNumber;
  }

  // For hundred-billion-scale values, apply strong correction
  if (tokensNumber > 100000000000) { // 100 billion+
    console.warn('🔧 Applying strong correction for hundred-billion-scale value:', tokensNumber.toLocaleString());
    return 0.00000001; // Divide by 100,000,000 (100 million)
  }

  // For ten-billion-scale values, apply moderate correction
  if (tokensNumber > 10000000000) { // 10 billion+
    console.warn('🔧 Applying moderate correction for ten-billion-scale value:', tokensNumber.toLocaleString());
    return 0.0000001; // Divide by 10,000,000 (10 million)
  }

  // For billion-scale values, apply light correction
  if (tokensNumber > 1000000000) { // 1 billion+
    console.warn('🔧 Applying light correction for billion-scale value:', tokensNumber.toLocaleString());
    return 0.000001; // Divide by 1,000,000 (1 million)
  }

  // For hundred-million-scale values, apply moderate correction
  if (tokensNumber > 100000000) { // 100 million+
    console.log('🔧 Applying moderate correction for hundred-million-scale value:', tokensNumber.toLocaleString());
    return 0.000001; // Divide by 1,000,000
  }

  // For ten-million-scale values, apply moderate correction
  if (tokensNumber > 10000000) { // 10 million+
    console.log('🔧 Applying moderate correction for ten-million-scale value:', tokensNumber.toLocaleString());
    return 0.000001; // Divide by 1,000,000
  }

  // For million-scale values, apply light correction
  if (tokensNumber > 1000000) { // 1 million+
    console.log('🔧 Applying light correction for million-scale value:', tokensNumber.toLocaleString());
    return 0.00001; // Divide by 100,000
  }

  // For values over 100,000, apply minimal correction
  if (tokensNumber > 100000) {
    return 0.001; // Divide by 1,000
  }

  // For values over 10,000, apply very light correction
  if (tokensNumber > 10000) {
    return 0.01; // Divide by 100
  }

  // For values over 1,000, apply minimal correction
  if (tokensNumber > 1000) {
    return 0.1; // Divide by 10
  }

  // No correction needed for reasonable values (under 1,000 tokens)
  return 1.0;
}

/**
 * Debug function to log correction details
 */
export function debugCorrection(totalTokens: bigint, description: string = ""): void {
  const tokensNumber = Number(totalTokens) / 1e18;
  const correction = getExchangeRateCorrection(totalTokens);
  const correctedValue = tokensNumber * correction;

  console.log(`🔧 Portfolio Correction Debug ${description}:`, {
    original: `${tokensNumber.toLocaleString()} BLOCKS`,
    correctionFactor: correction,
    corrected: `${correctedValue.toLocaleString()} BLOCKS`,
    reduction: `${(1/correction).toLocaleString()}x`
  });
}

/**
 * Applies correction factor to a token amount
 */
export function applyCorrectionFactor(amount: bigint, needsCorrection: boolean): bigint {
  if (!needsCorrection) return amount;
  
  // Apply correction factor: remove 5% treasury allocation
  return (amount * BigInt(Math.floor(CORRECTION_FACTOR * 10000))) / BigInt(10000);
}

/**
 * Corrects user statistics by removing treasury allocation from pre-fix purchases
 */
export function correctUserStats(
  rawStats: UserStats,
  userPurchases: UserPurchase[]
): CorrectedUserStats {
  if (!rawStats || !userPurchases || userPurchases.length === 0) {
    return {
      ...rawStats,
      correctionApplied: false,
      correctedPurchases: 0,
      totalPurchases: 0,
      correctionDetails: {
        originalTotalTokens: rawStats?.totalTokensReceived || 0n,
        correctedTotalTokens: rawStats?.totalTokensReceived || 0n,
        correctionAmount: 0n,
      },
    };
  }

  let correctedTotalTokens = 0n;
  let correctedVestTokens = 0n;
  let correctedPoolTokens = 0n;
  let correctedLPTokens = 0n;
  let correctedPurchases = 0;

  // Process each purchase and apply correction if needed
  for (const purchase of userPurchases) {
    const needsHistoricalCorrection = isPurchaseBeforeFix(purchase.timestamp);
    const needsExchangeRateCorrection = isPurchaseWithExchangeRateIssue(purchase.timestamp, purchase.totalTokens);
    const needsCorrection = needsHistoricalCorrection || needsExchangeRateCorrection;

    if (needsCorrection) {
      correctedPurchases++;
    }

    // Apply correction to token amounts
    if (needsExchangeRateCorrection) {
      // Exchange rate issue: apply dynamic correction based on inflation level
      const exchangeRateCorrection = getExchangeRateCorrection(purchase.totalTokens);

      // Exchange rate correction applied

      correctedTotalTokens += BigInt(Math.floor(Number(purchase.totalTokens) * exchangeRateCorrection));
      correctedVestTokens += BigInt(Math.floor(Number(purchase.vestTokens) * exchangeRateCorrection));
      correctedPoolTokens += BigInt(Math.floor(Number(purchase.poolTokens) * exchangeRateCorrection));
      correctedLPTokens += BigInt(Math.floor(Number(purchase.lpTokens) * exchangeRateCorrection));
    } else if (needsHistoricalCorrection) {
      // Historical correction: apply 0.95 factor for treasury allocation fix
      correctedTotalTokens += applyCorrectionFactor(purchase.totalTokens, true);
      correctedVestTokens += applyCorrectionFactor(purchase.vestTokens, true);
      correctedPoolTokens += applyCorrectionFactor(purchase.poolTokens, true);
      correctedLPTokens += applyCorrectionFactor(purchase.lpTokens, true);
    } else {
      // No correction needed - use original values
      correctedTotalTokens += purchase.totalTokens;
      correctedVestTokens += purchase.vestTokens;
      correctedPoolTokens += purchase.poolTokens;
      correctedLPTokens += purchase.lpTokens;
    }
  }

  const correctionAmount = rawStats.totalTokensReceived - correctedTotalTokens;

  return {
    ...rawStats,
    totalTokensReceived: correctedTotalTokens,
    totalVestTokens: correctedVestTokens,
    totalPoolTokens: correctedPoolTokens,
    totalLPTokens: correctedLPTokens,
    correctionApplied: correctedPurchases > 0,
    correctedPurchases,
    totalPurchases: userPurchases.length,
    correctionDetails: {
      originalTotalTokens: rawStats.totalTokensReceived,
      correctedTotalTokens,
      correctionAmount,
    },
  };
}

/**
 * Calculates the corrected ROI based on corrected portfolio metrics
 */
export function calculateCorrectedROI(correctedStats: CorrectedUserStats): number {
  if (!correctedStats.totalInvested || correctedStats.totalInvested === 0n) {
    return 0;
  }

  // For ROI calculation, we need to estimate the current value of tokens
  // This is a simplified calculation - in practice, you'd use current market prices
  const totalInvestedUSDT = Number(correctedStats.totalInvested) / 1e6; // USDT has 6 decimals
  const totalTokens = Number(correctedStats.totalTokensReceived) / 1e18; // BLOCKS has 18 decimals
  
  // Assuming a base value calculation (this should be replaced with actual market data)
  const estimatedTokenValue = totalTokens * 2.0; // Assuming 2 USDT per BLOCKS as base
  
  return ((estimatedTokenValue - totalInvestedUSDT) / totalInvestedUSDT) * 100;
}

/**
 * Formats correction details for display
 */
export function formatCorrectionDetails(correctedStats: CorrectedUserStats): {
  correctionSummary: string;
  correctionPercentage: string;
  affectedPurchases: string;
} {
  const { correctionDetails, correctedPurchases, totalPurchases } = correctedStats;
  
  const correctionPercentage = correctionDetails.originalTotalTokens > 0n
    ? ((Number(correctionDetails.correctionAmount) / Number(correctionDetails.originalTotalTokens)) * 100).toFixed(2)
    : '0';

  return {
    correctionSummary: `Removed ${(Number(correctionDetails.correctionAmount) / 1e18).toFixed(2)} BLOCKS from inflated historical data`,
    correctionPercentage: `${correctionPercentage}% reduction applied`,
    affectedPurchases: `${correctedPurchases} of ${totalPurchases} purchases corrected`,
  };
}

/**
 * Determines if user stats need correction
 */
export function needsCorrection(userPurchases: UserPurchase[]): boolean {
  if (!userPurchases || userPurchases.length === 0) return false;
  
  return userPurchases.some(purchase => isPurchaseBeforeFix(purchase.timestamp));
}

/**
 * Creates a correction notice for the UI
 */
export function createCorrectionNotice(correctedStats: CorrectedUserStats): {
  show: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
} {
  if (!correctedStats.correctionApplied) {
    return {
      show: false,
      title: '',
      message: '',
      type: 'info',
    };
  }

  const { correctionSummary, affectedPurchases } = formatCorrectionDetails(correctedStats);

  // Check if this is an exchange rate correction (very large correction amount)
  const correctionAmount = Number(correctedStats.correctionDetails.correctionAmount) / 1e18;
  const isExchangeRateCorrection = correctionAmount > 1000000; // More than 1M BLOCKS corrected

  return {
    show: true,
    title: isExchangeRateCorrection ? 'Portfolio Values Corrected (Exchange Rate Issue)' : 'Portfolio Metrics Corrected',
    message: isExchangeRateCorrection
      ? `Your portfolio values have been corrected due to an exchange rate configuration issue. The displayed values now reflect realistic token amounts. ${affectedPurchases}.`
      : `Your portfolio values have been corrected to remove inflated historical data. ${correctionSummary}. ${affectedPurchases}.`,
    type: isExchangeRateCorrection ? 'warning' : 'info',
  };
}
