import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReferralLinkCard } from '../ReferralLinkCard';
import * as referralLib from '../../../lib/referral';
import toast from 'react-hot-toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock the referral library
vi.mock('../../../lib/referral', () => ({
  generateReferralLink: vi.fn(),
  copyReferralLink: vi.fn(),
  copyReferralCode: vi.fn(),
  shareReferralLink: vi.fn(),
  generateReferralSummaryText: vi.fn(),
  copyToClipboardWithFeedback: vi.fn(),
  validateReferralLink: vi.fn(),
  REFERRER_PARAM: 'ref',
}));

// Mock utils library
vi.mock('../../../lib/utils', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    formatBLOCKS: vi.fn((value: bigint) => `${value.toString()}.00`),
    cn: vi.fn((...classes: any[]) => classes.filter(Boolean).join(' ')),
  };
});

describe('ReferralLinkCard', () => {
  const mockProps = {
    userAddress: '0x1234567890123456789012345678901234567890',
    totalRewards: BigInt('1000000000000000000'), // 1 BLOCKS
    referralCount: 5,
  };

  const mockReferralLink = {
    url: 'https://blockcoop.com/?ref=0x1234567890123456789012345678901234567890',
    code: '123456',
    referrerAddress: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    vi.mocked(referralLib.generateReferralLink).mockReturnValue(mockReferralLink);
    vi.mocked(referralLib.validateReferralLink).mockReturnValue(true);
    vi.mocked(referralLib.copyReferralLink).mockResolvedValue(true);
    vi.mocked(referralLib.copyReferralCode).mockResolvedValue(true);
    vi.mocked(referralLib.shareReferralLink).mockResolvedValue(true);
    vi.mocked(referralLib.generateReferralSummaryText).mockReturnValue('Mock summary text');
    vi.mocked(referralLib.copyToClipboardWithFeedback).mockResolvedValue(true);
  });

  it('should render referral link card with user data', () => {
    render(<ReferralLinkCard {...mockProps} />);

    expect(screen.getByText('Your Referral Link')).toBeInTheDocument();
    expect(screen.getByText('Code: 123456')).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockReferralLink.url)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockReferralLink.code)).toBeInTheDocument();
  });

  it('should generate referral link on mount', () => {
    render(<ReferralLinkCard {...mockProps} />);

    expect(referralLib.generateReferralLink).toHaveBeenCalledWith(mockProps.userAddress);
    expect(referralLib.validateReferralLink).toHaveBeenCalledWith(mockReferralLink);
  });

  it('should handle invalid referral link generation', () => {
    vi.mocked(referralLib.generateReferralLink).mockReturnValue(null);

    render(<ReferralLinkCard {...mockProps} />);

    expect(toast.error).toHaveBeenCalledWith('Failed to generate referral link');
  });

  it('should handle invalid referral link validation', () => {
    vi.mocked(referralLib.validateReferralLink).mockReturnValue(false);

    render(<ReferralLinkCard {...mockProps} />);

    expect(toast.error).toHaveBeenCalledWith('Failed to generate referral link');
  });

  it('should copy referral link when copy button is clicked', async () => {
    render(<ReferralLinkCard {...mockProps} />);

    // Find the copy button specifically for the referral link (first one)
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    const copyLinkButton = copyButtons[0]; // First copy button is for the link
    fireEvent.click(copyLinkButton);

    await waitFor(() => {
      expect(referralLib.copyReferralLink).toHaveBeenCalledWith(mockReferralLink);
    });

    // Should show "Copied!" text temporarily
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('should copy referral code when copy code button is clicked', async () => {
    render(<ReferralLinkCard {...mockProps} />);

    const copyCodeButtons = screen.getAllByRole('button', { name: /copy/i });
    const copyCodeButton = copyCodeButtons[1]; // Second copy button is for the code
    fireEvent.click(copyCodeButton);

    await waitFor(() => {
      expect(referralLib.copyReferralCode).toHaveBeenCalledWith(mockReferralLink.code);
    });
  });

  it('should share referral link when share button is clicked', async () => {
    render(<ReferralLinkCard {...mockProps} />);

    const shareButton = screen.getByRole('button', { name: /share link/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(referralLib.shareReferralLink).toHaveBeenCalledWith(mockReferralLink);
    });
  });

  it('should copy referral stats when share stats button is clicked', async () => {
    render(<ReferralLinkCard {...mockProps} />);

    const shareStatsButton = screen.getByRole('button', { name: /share stats/i });
    fireEvent.click(shareStatsButton);

    await waitFor(() => {
      expect(referralLib.generateReferralSummaryText).toHaveBeenCalledWith(
        '1000000000000000000.00',
        mockProps.referralCount,
        mockReferralLink
      );
      expect(referralLib.copyToClipboardWithFeedback).toHaveBeenCalledWith(
        'Mock summary text',
        'Referral stats copied to clipboard!',
        'Failed to copy referral stats'
      );
    });
  });

  it('should handle copy failures gracefully', async () => {
    vi.mocked(referralLib.copyReferralLink).mockResolvedValue(false);

    render(<ReferralLinkCard {...mockProps} />);

    // Find the copy button specifically for the referral link (first one)
    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    const copyLinkButton = copyButtons[0]; // First copy button is for the link
    fireEvent.click(copyLinkButton);

    await waitFor(() => {
      expect(referralLib.copyReferralLink).toHaveBeenCalledWith(mockReferralLink);
    });

    // Should not show "Copied!" text when copy fails
    expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
  });

  it('should not perform actions when referral link is null', async () => {
    vi.mocked(referralLib.generateReferralLink).mockReturnValue(null);

    render(<ReferralLinkCard {...mockProps} />);

    // Try to click copy button (should not call copy function)
    const copyButtons = screen.queryAllByRole('button', { name: /copy/i });
    if (copyButtons.length > 0) {
      fireEvent.click(copyButtons[0]);
      
      await waitFor(() => {
        expect(referralLib.copyReferralLink).not.toHaveBeenCalled();
      });
    }
  });

  it('should display how it works section', () => {
    render(<ReferralLinkCard {...mockProps} />);

    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('1. Share your referral link with friends')).toBeInTheDocument();
    expect(screen.getByText('2. They visit BlockCoop using your link')).toBeInTheDocument();
    expect(screen.getByText('3. When they purchase a package, you earn rewards')).toBeInTheDocument();
    expect(screen.getByText('4. Rewards are automatically sent to your wallet')).toBeInTheDocument();
  });

  it('should show QR code coming soon message', () => {
    render(<ReferralLinkCard {...mockProps} />);

    const qrButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(qrButton);

    expect(toast.info).toHaveBeenCalledWith('QR Code feature coming soon!');
  });

  it('should select text when input is clicked', () => {
    render(<ReferralLinkCard {...mockProps} />);

    const linkInput = screen.getByDisplayValue(mockReferralLink.url);
    const selectSpy = vi.spyOn(linkInput, 'select');
    
    fireEvent.click(linkInput);

    expect(selectSpy).toHaveBeenCalled();
  });
});
