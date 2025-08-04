import { isAddress } from 'ethers';
import toast from 'react-hot-toast';

/**
 * Referral System Utilities
 *
 * This module provides utilities for managing referral links, codes, and URL parameters
 * for the BlockCoop referral system.
 */

/**
 * Clipboard Utilities with Fallback Support
 */

/**
 * Check if the Clipboard API is available and secure context is present
 */
function isClipboardAPIAvailable(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'clipboard' in navigator &&
    typeof navigator.clipboard?.writeText === 'function' &&
    window.isSecureContext
  );
}

/**
 * Fallback method to copy text using the legacy execCommand approach
 */
function fallbackCopyToClipboard(text: string): boolean {
  try {
    // Create a temporary textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Make it invisible but still selectable
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', '');
    textArea.setAttribute('aria-hidden', 'true');

    // Add to DOM, select, copy, and remove
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    console.error('Fallback copy failed:', error);
    return false;
  }
}

/**
 * Robust clipboard copy function with multiple fallback strategies
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    console.warn('Cannot copy empty text to clipboard');
    return false;
  }

  // Strategy 1: Modern Clipboard API (preferred)
  if (isClipboardAPIAvailable()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Clipboard API failed, trying fallback:', error);
      // Continue to fallback methods
    }
  }

  // Strategy 2: Legacy execCommand fallback
  if (typeof document !== 'undefined' && document.execCommand) {
    const success = fallbackCopyToClipboard(text);
    if (success) {
      return true;
    }
  }

  // Strategy 3: Show manual copy instructions as last resort
  console.error('All clipboard methods failed');
  return false;
}

/**
 * Copy text with user feedback via toast notifications
 */
export async function copyToClipboardWithFeedback(
  text: string,
  successMessage: string = 'Copied to clipboard!',
  errorMessage: string = 'Failed to copy to clipboard'
): Promise<boolean> {
  const success = await copyToClipboard(text);

  if (success) {
    toast.success(successMessage);
  } else {
    // Show manual copy fallback
    toast.error(
      `${errorMessage}. Please manually copy: ${text.length > 50 ? text.substring(0, 50) + '...' : text}`,
      {
        duration: 8000,
        style: {
          maxWidth: '500px'
        }
      }
    );
  }

  return success;
}

// URL parameter key for referrer address
export const REFERRER_PARAM = 'ref';

/**
 * Interface for referral link data
 */
export interface ReferralLinkData {
  url: string;
  code: string;
  referrerAddress: string;
}

/**
 * Interface for URL parameters
 */
export interface URLParams {
  [key: string]: string | null;
}

/**
 * Get URL parameters from current location
 */
export function getURLParams(): URLParams {
  const params: URLParams = {};
  const urlParams = new URLSearchParams(window.location.search);
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
}

/**
 * Get referrer address from URL parameters with validation
 */
export function getReferrerFromURL(): string | null {
  try {
    const params = getURLParams();
    const referrer = params[REFERRER_PARAM];

    if (!referrer || typeof referrer !== 'string') {
      return null;
    }

    // Trim whitespace and convert to lowercase for consistency
    const cleanReferrer = referrer.trim().toLowerCase();

    if (isAddress(cleanReferrer)) {
      return cleanReferrer;
    }

    console.warn('Invalid referrer address in URL:', referrer);
    return null;
  } catch (error) {
    console.error('Error extracting referrer from URL:', error);
    return null;
  }
}

/**
 * Generate a referral link for a given address
 */
export function generateReferralLink(referrerAddress: string): ReferralLinkData | null {
  if (!referrerAddress || typeof referrerAddress !== 'string') {
    console.error('Invalid referrer address: must be a non-empty string');
    return null;
  }

  if (!isAddress(referrerAddress)) {
    console.error('Invalid referrer address: not a valid Ethereum address');
    return null;
  }

  // Normalize the address to checksum format
  const normalizedAddress = referrerAddress.toLowerCase();

  try {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/?${REFERRER_PARAM}=${normalizedAddress}`;

    // Generate a short code from the address (first 6 chars after 0x)
    const code = normalizedAddress.slice(2, 8).toUpperCase();

    return {
      url,
      code,
      referrerAddress: normalizedAddress,
    };
  } catch (error) {
    console.error('Failed to generate referral link:', error);
    return null;
  }
}

/**
 * Copy referral link to clipboard with validation
 */
export async function copyReferralLink(referralLink: ReferralLinkData): Promise<boolean> {
  if (!validateReferralLink(referralLink)) {
    console.error('Invalid referral link data:', referralLink);
    toast.error('Invalid referral link');
    return false;
  }

  return await copyToClipboardWithFeedback(
    referralLink.url,
    'Referral link copied to clipboard!',
    'Failed to copy referral link'
  );
}

/**
 * Copy referral code to clipboard with validation
 */
export async function copyReferralCode(code: string): Promise<boolean> {
  if (!code || typeof code !== 'string' || !/^[A-F0-9]{6}$/.test(code)) {
    console.error('Invalid referral code:', code);
    toast.error('Invalid referral code');
    return false;
  }

  return await copyToClipboardWithFeedback(
    code,
    'Referral code copied to clipboard!',
    'Failed to copy referral code'
  );
}

/**
 * Validate referrer address with additional security checks
 */
export function isValidReferrer(address: string, currentUserAddress?: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  if (!isAddress(address)) {
    return false;
  }

  // Prevent self-referrals
  if (currentUserAddress && address.toLowerCase() === currentUserAddress.toLowerCase()) {
    console.warn('Self-referral attempted:', address);
    return false;
  }

  return true;
}

/**
 * Validate and sanitize referral link data
 */
export function validateReferralLink(referralLink: ReferralLinkData): boolean {
  if (!referralLink || typeof referralLink !== 'object') {
    return false;
  }

  const { url, code, referrerAddress } = referralLink;

  // Validate referrer address
  if (!isValidReferrer(referrerAddress)) {
    return false;
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    const urlReferrer = urlObj.searchParams.get(REFERRER_PARAM);
    if (urlReferrer?.toLowerCase() !== referrerAddress.toLowerCase()) {
      return false;
    }
  } catch {
    return false;
  }

  // Validate code format (should be 6 uppercase hex characters)
  if (!code || !/^[A-F0-9]{6}$/.test(code)) {
    return false;
  }

  return true;
}

/**
 * Format referrer address for display
 */
export function formatReferrerAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Update URL with referrer parameter without page reload
 */
export function updateURLWithReferrer(referrerAddress: string): void {
  if (!isAddress(referrerAddress)) {
    console.error('Invalid referrer address for URL update:', referrerAddress);
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set(REFERRER_PARAM, referrerAddress);
  
  // Update URL without page reload
  window.history.replaceState({}, '', url.toString());
}

/**
 * Remove referrer parameter from URL
 */
export function removeReferrerFromURL(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(REFERRER_PARAM);
  
  // Update URL without page reload
  window.history.replaceState({}, '', url.toString());
}

/**
 * Share referral link via Web Share API (mobile) or fallback to clipboard
 */
export async function shareReferralLink(referralLink: ReferralLinkData): Promise<boolean> {
  if (!validateReferralLink(referralLink)) {
    console.error('Invalid referral link data for sharing:', referralLink);
    toast.error('Invalid referral link');
    return false;
  }

  const shareData = {
    title: 'Join BlockCoop SACCO',
    text: `Join BlockCoop SACCO using my referral link and start earning with blockchain-powered investments!`,
    url: referralLink.url,
  };

  // Check if Web Share API is supported and available
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare(shareData)
  ) {
    try {
      await navigator.share(shareData);
      toast.success('Referral link shared successfully!');
      return true;
    } catch (error) {
      // User cancelled sharing or error occurred
      console.log('Share cancelled or failed:', error);

      // Check if it was user cancellation (don't show error for this)
      if (error instanceof Error && error.name === 'AbortError') {
        return false; // User cancelled, don't fallback
      }

      // For other errors, fallback to clipboard
      toast.info('Sharing failed, copying to clipboard instead...');
      return await copyReferralLink(referralLink);
    }
  } else {
    // Fallback to clipboard copy
    return await copyReferralLink(referralLink);
  }
}

/**
 * Generate referral statistics summary text
 */
export function generateReferralSummaryText(
  totalRewards: string,
  referralCount: number,
  referralLink: ReferralLinkData
): string {
  return `🎉 My BlockCoop Referral Stats:
💰 Total Rewards: ${totalRewards} BLOCKS
👥 Referrals: ${referralCount}
🔗 Join using my link: ${referralLink.url}

#BlockCoop #SACCO #DeFi #Referral`;
}

/**
 * Interface for referral transaction data
 */
export interface ReferralTransaction {
  referrer: string;
  buyer: string;
  reward: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

/**
 * Interface for referral statistics
 */
export interface ReferralStats {
  totalRewards: bigint;
  referralCount: number;
  transactions: ReferralTransaction[];
}

/**
 * Interface for referral performance metrics
 */
export interface ReferralPerformance {
  totalRewards: bigint;
  totalReferrals: number;
  averageReward: bigint;
  lastReferralDate: number | null;
  topReferralReward: bigint;
  recentActivity: ReferralTransaction[];
}
