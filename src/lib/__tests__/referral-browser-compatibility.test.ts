import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard, copyToClipboardWithFeedback } from '../referral';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Referral System Browser Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
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

  describe('Modern Browsers (Chrome 66+, Firefox 63+, Safari 13.1+)', () => {
    it('should use Clipboard API when available and secure', async () => {
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
      expect(document.execCommand).not.toHaveBeenCalled();
    });

    it('should handle Clipboard API permission denied', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(true); // Should fallback to execCommand
      expect(mockWriteText).toHaveBeenCalledWith('test text');
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('Legacy Browsers (IE 11, Chrome < 66, Firefox < 63)', () => {
    it('should use execCommand fallback when Clipboard API unavailable', async () => {
      // No Clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should handle execCommand failure gracefully', async () => {
      // No Clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });
      
      // execCommand fails
      (document.execCommand as any).mockReturnValue(false);

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should create proper textarea element for execCommand', async () => {
      const mockTextArea = {
        style: {},
        setAttribute: vi.fn(),
        focus: vi.fn(),
        select: vi.fn(),
        setSelectionRange: vi.fn(),
        value: '',
      };
      
      (document.createElement as any).mockReturnValue(mockTextArea);
      
      // No Clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      await copyToClipboard('test text');

      expect(document.createElement).toHaveBeenCalledWith('textarea');
      expect(mockTextArea.value).toBe('test text');
      expect(mockTextArea.setAttribute).toHaveBeenCalledWith('readonly', '');
      expect(mockTextArea.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
      expect(mockTextArea.focus).toHaveBeenCalled();
      expect(mockTextArea.select).toHaveBeenCalled();
      expect(mockTextArea.setSelectionRange).toHaveBeenCalledWith(0, 'test text'.length);
    });
  });

  describe('Insecure Contexts (HTTP, localhost without HTTPS)', () => {
    it('should fallback to execCommand in insecure context', async () => {
      // Clipboard API exists but insecure context
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        writable: true,
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockWriteText).not.toHaveBeenCalled(); // Should not use Clipboard API
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('Mobile Browsers', () => {
    it('should handle iOS Safari clipboard limitations', async () => {
      // Simulate iOS Safari where Clipboard API might be available but restricted
      const mockWriteText = vi.fn().mockRejectedValue(new DOMException('Document is not focused', 'NotAllowedError'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true,
      });
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        writable: true,
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(true); // Should fallback to execCommand
      expect(mockWriteText).toHaveBeenCalledWith('test text');
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should handle Android Chrome clipboard behavior', async () => {
      // Android Chrome typically supports Clipboard API well
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
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle completely unsupported browsers', async () => {
      // No Clipboard API and no execCommand
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(document, 'execCommand', {
        value: undefined,
        writable: true,
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
    });

    it('should provide user feedback for unsupported browsers', async () => {
      // No Clipboard API and no execCommand
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(document, 'execCommand', {
        value: undefined,
        writable: true,
      });

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

    it('should truncate long text in error messages', async () => {
      const longText = 'a'.repeat(100);
      
      // No Clipboard API and no execCommand
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(document, 'execCommand', {
        value: undefined,
        writable: true,
      });

      await copyToClipboardWithFeedback(longText, 'Success!', 'Failed!');

      expect(toast.error).toHaveBeenCalledWith(
        `Failed!. Please manually copy: ${'a'.repeat(50)}...`,
        expect.objectContaining({
          duration: 8000,
          style: expect.objectContaining({
            maxWidth: '500px'
          })
        })
      );
    });
  });

  describe('Feature Detection', () => {
    it('should properly detect Clipboard API availability', async () => {
      // Test various scenarios of Clipboard API availability
      const scenarios = [
        { clipboard: undefined, isSecureContext: true, expected: false },
        { clipboard: {}, isSecureContext: true, expected: false },
        { clipboard: { writeText: undefined }, isSecureContext: true, expected: false },
        { clipboard: { writeText: vi.fn() }, isSecureContext: false, expected: false },
        { clipboard: { writeText: vi.fn() }, isSecureContext: true, expected: true },
      ];

      for (const scenario of scenarios) {
        Object.defineProperty(navigator, 'clipboard', {
          value: scenario.clipboard,
          writable: true,
        });
        Object.defineProperty(window, 'isSecureContext', {
          value: scenario.isSecureContext,
          writable: true,
        });

        if (scenario.expected) {
          (scenario.clipboard as any).writeText.mockResolvedValue(undefined);
        }

        const result = await copyToClipboard('test');
        
        if (scenario.expected) {
          expect(result).toBe(true);
          expect((scenario.clipboard as any).writeText).toHaveBeenCalledWith('test');
        } else {
          // Should fallback to execCommand or fail
          expect(document.execCommand).toHaveBeenCalledWith('copy');
        }

        vi.clearAllMocks();
      }
    });
  });
});
