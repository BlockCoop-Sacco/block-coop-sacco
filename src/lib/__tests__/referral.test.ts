import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  copyToClipboard,
  copyToClipboardWithFeedback,
  generateReferralLink,
  getReferrerFromURL,
  isValidReferrer,
  validateReferralLink,
  copyReferralLink,
  copyReferralCode,
  shareReferralLink,
  REFERRER_PARAM,
  ReferralLinkData
} from '../referral';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock ethers isAddress function
vi.mock('ethers', () => ({
  isAddress: vi.fn((address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }),
}));

describe('Referral System', () => {
  const validAddress = '0x1234567890123456789012345678901234567890';
  const invalidAddress = 'invalid-address';
  const anotherValidAddress = '0x0987654321098765432109876543210987654321';

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://blockcoop.com',
        href: 'https://blockcoop.com/',
        search: '',
      },
      writable: true,
    });

    // Mock document
    Object.defineProperty(global, 'document', {
      value: {
        createElement: vi.fn(() => ({
          style: {},
          setAttribute: vi.fn(),
          focus: vi.fn(),
          select: vi.fn(),
          setSelectionRange: vi.fn(),
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn(() => true),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Clipboard Functionality', () => {
    it('should copy text using modern clipboard API when available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });

    it('should fallback to execCommand when clipboard API fails', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard API failed'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('test text');
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should return false when all clipboard methods fail', async () => {
      // No clipboard API available
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });
      
      // execCommand fails
      (document.execCommand as any).mockReturnValue(false);

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
    });

    it('should show success toast when copyToClipboardWithFeedback succeeds', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      await copyToClipboardWithFeedback('test text', 'Success!', 'Failed!');

      expect(toast.success).toHaveBeenCalledWith('Success!');
    });

    it('should show error toast when copyToClipboardWithFeedback fails', async () => {
      // No clipboard API available and execCommand fails
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });
      (document.execCommand as any).mockReturnValue(false);

      await copyToClipboardWithFeedback('test text', 'Success!', 'Failed!');

      expect(toast.error).toHaveBeenCalledWith(
        'Failed!. Please manually copy: test text',
        expect.objectContaining({
          duration: 8000,
          style: expect.objectContaining({
            maxWidth: '500px'
          })
        })
      );
    });
  });

  describe('Referral Link Generation', () => {
    it('should generate valid referral link for valid address', () => {
      const result = generateReferralLink(validAddress);

      expect(result).not.toBeNull();
      expect(result!.url).toBe(`https://blockcoop.com/?${REFERRER_PARAM}=${validAddress.toLowerCase()}`);
      expect(result!.code).toBe(validAddress.slice(2, 8).toUpperCase());
      expect(result!.referrerAddress).toBe(validAddress.toLowerCase());
    });

    it('should return null for invalid address', () => {
      const result = generateReferralLink(invalidAddress);

      expect(result).toBeNull();
    });

    it('should return null for empty address', () => {
      const result = generateReferralLink('');

      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      const result = generateReferralLink(null as any);

      expect(result).toBeNull();
    });
  });

  describe('URL Parameter Extraction', () => {
    it('should extract valid referrer from URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: `?${REFERRER_PARAM}=${validAddress}`,
        },
        writable: true,
      });

      const result = getReferrerFromURL();

      expect(result).toBe(validAddress.toLowerCase());
    });

    it('should return null for invalid referrer in URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: `?${REFERRER_PARAM}=${invalidAddress}`,
        },
        writable: true,
      });

      const result = getReferrerFromURL();

      expect(result).toBeNull();
    });

    it('should return null when no referrer parameter in URL', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?other=param',
        },
        writable: true,
      });

      const result = getReferrerFromURL();

      expect(result).toBeNull();
    });
  });

  describe('Referrer Validation', () => {
    it('should validate correct referrer address', () => {
      const result = isValidReferrer(validAddress);

      expect(result).toBe(true);
    });

    it('should reject invalid referrer address', () => {
      const result = isValidReferrer(invalidAddress);

      expect(result).toBe(false);
    });

    it('should reject self-referral', () => {
      const result = isValidReferrer(validAddress, validAddress);

      expect(result).toBe(false);
    });

    it('should allow different addresses', () => {
      const result = isValidReferrer(validAddress, anotherValidAddress);

      expect(result).toBe(true);
    });
  });

  describe('Referral Link Validation', () => {
    const validReferralLink: ReferralLinkData = {
      url: `https://blockcoop.com/?${REFERRER_PARAM}=${validAddress.toLowerCase()}`,
      code: validAddress.slice(2, 8).toUpperCase(),
      referrerAddress: validAddress.toLowerCase(),
    };

    it('should validate correct referral link', () => {
      const result = validateReferralLink(validReferralLink);

      expect(result).toBe(true);
    });

    it('should reject referral link with invalid address', () => {
      const invalidLink = {
        ...validReferralLink,
        referrerAddress: invalidAddress,
      };

      const result = validateReferralLink(invalidLink);

      expect(result).toBe(false);
    });

    it('should reject referral link with mismatched URL and address', () => {
      const mismatchedLink = {
        ...validReferralLink,
        url: `https://blockcoop.com/?${REFERRER_PARAM}=${anotherValidAddress}`,
      };

      const result = validateReferralLink(mismatchedLink);

      expect(result).toBe(false);
    });

    it('should reject referral link with invalid code format', () => {
      const invalidCodeLink = {
        ...validReferralLink,
        code: 'invalid',
      };

      const result = validateReferralLink(invalidCodeLink);

      expect(result).toBe(false);
    });

    it('should reject null or undefined referral link', () => {
      expect(validateReferralLink(null as any)).toBe(false);
      expect(validateReferralLink(undefined as any)).toBe(false);
    });

    it('should reject referral link with invalid URL', () => {
      const invalidUrlLink = {
        ...validReferralLink,
        url: 'not-a-valid-url',
      };

      const result = validateReferralLink(invalidUrlLink);

      expect(result).toBe(false);
    });
  });

  describe('Copy Functions with Validation', () => {
    const validReferralLink: ReferralLinkData = {
      url: `https://blockcoop.com/?${REFERRER_PARAM}=${validAddress.toLowerCase()}`,
      code: validAddress.slice(2, 8).toUpperCase(),
      referrerAddress: validAddress.toLowerCase(),
    };

    beforeEach(() => {
      // Mock successful clipboard operation
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });
    });

    it('should copy valid referral link', async () => {
      const result = await copyReferralLink(validReferralLink);

      expect(result).toBe(true);
      expect(toast.success).toHaveBeenCalledWith('Referral link copied to clipboard!');
    });

    it('should reject invalid referral link', async () => {
      const invalidLink = {
        ...validReferralLink,
        referrerAddress: invalidAddress,
      };

      const result = await copyReferralLink(invalidLink);

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Invalid referral link');
    });

    it('should copy valid referral code', async () => {
      const result = await copyReferralCode('ABCDEF');

      expect(result).toBe(true);
      expect(toast.success).toHaveBeenCalledWith('Referral code copied to clipboard!');
    });

    it('should reject invalid referral code', async () => {
      const result = await copyReferralCode('invalid');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Invalid referral code');
    });
  });

  describe('Share Function with Validation', () => {
    const validReferralLink: ReferralLinkData = {
      url: `https://blockcoop.com/?${REFERRER_PARAM}=${validAddress.toLowerCase()}`,
      code: validAddress.slice(2, 8).toUpperCase(),
      referrerAddress: validAddress.toLowerCase(),
    };

    it('should reject invalid referral link for sharing', async () => {
      const invalidLink = {
        ...validReferralLink,
        referrerAddress: invalidAddress,
      };

      const result = await shareReferralLink(invalidLink);

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Invalid referral link');
    });

    it('should handle Web Share API cancellation', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = vi.fn().mockRejectedValue(abortError);
      Object.defineProperty(navigator, 'share', {
        value: mockShare,
        writable: true,
      });
      Object.defineProperty(navigator, 'canShare', {
        value: vi.fn().mockReturnValue(true),
        writable: true,
      });

      const result = await shareReferralLink(validReferralLink);

      expect(result).toBe(false);
      expect(mockShare).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle window.location being undefined', () => {
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        value: undefined,
        writable: true,
      });

      expect(() => generateReferralLink(validAddress)).not.toThrow();

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
      });
    });

    it('should handle document.execCommand being unavailable', async () => {
      // No clipboard API available
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      // document.execCommand is undefined
      Object.defineProperty(document, 'execCommand', {
        value: undefined,
        writable: true,
      });

      const result = await copyToClipboard('test');

      expect(result).toBe(false);
    });

    it('should handle insecure context (no clipboard API)', async () => {
      // Simulate insecure context
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        writable: true,
      });

      // No clipboard API in insecure context
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      // execCommand fails
      (document.execCommand as any).mockReturnValue(false);

      const result = await copyToClipboard('test');

      expect(result).toBe(false);
    });
  });
});
