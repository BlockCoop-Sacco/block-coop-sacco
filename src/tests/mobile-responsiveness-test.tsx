import { render, screen, fireEvent } from '@testing-library/react';
import { PurchaseModal } from '../components/packages/PurchaseModal';
import { MpesaPaymentForm } from '../components/payments/MpesaPaymentForm';
import { PaymentMethodSelector } from '../components/payments/PaymentMethodSelector';

// Mock the Web3 context
jest.mock('../contexts/Web3Context', () => ({
  useWeb3: () => ({
    account: '0x1234567890123456789012345678901234567890',
    signer: {},
    isConnected: true,
    isCorrectNetwork: true,
    contracts: {
      usdtToken: { target: '0xusdt' },
      packageManager: { target: '0xpm' }
    }
  })
}));

// Mock the M-Pesa payment hook
jest.mock('../hooks/useMpesaPayment', () => ({
  useMpesaPayment: () => ({
    paymentState: {
      status: 'idle',
      loading: false,
      transactionId: null,
      checkoutRequestId: null,
      error: null,
      amount: null
    },
    initiatePayment: jest.fn(),
    resetPayment: jest.fn()
  })
}));

describe('Mobile Responsiveness Tests', () => {
  const mockPackage = {
    id: 1,
    name: 'Starter Package',
    entryUSDT: BigInt(100000000), // 100 USDT in 6 decimals
    description: 'Test package',
    active: true
  };

  // Helper function to set viewport size
  const setViewport = (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    window.dispatchEvent(new Event('resize'));
  };

  describe('PurchaseModal Mobile Responsiveness', () => {
    beforeEach(() => {
      // Reset to desktop size
      setViewport(1024);
    });

    it('should render properly on mobile (320px)', () => {
      setViewport(320);
      
      render(
        <PurchaseModal
          package={mockPackage}
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      // Modal should be visible
      expect(screen.getByText('Purchase Starter Package')).toBeInTheDocument();
      
      // Check that modal doesn't overflow
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-sm');
    });

    it('should render properly on iPhone 12 mini (375px)', () => {
      setViewport(375);
      
      render(
        <PurchaseModal
          package={mockPackage}
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      expect(screen.getByText('Purchase Starter Package')).toBeInTheDocument();
    });

    it('should render properly on iPhone 12 Pro Max (414px)', () => {
      setViewport(414);
      
      render(
        <PurchaseModal
          package={mockPackage}
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      expect(screen.getByText('Purchase Starter Package')).toBeInTheDocument();
    });

    it('should stack buttons vertically on mobile', () => {
      setViewport(320);
      
      render(
        <PurchaseModal
          package={mockPackage}
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      // Check that button container has mobile-friendly classes
      const buttonContainer = screen.getByText('Purchase Package').closest('div');
      expect(buttonContainer).toHaveClass('flex-col');
    });
  });

  describe('PaymentMethodSelector Mobile Responsiveness', () => {
    it('should render payment methods properly on mobile', () => {
      setViewport(320);
      
      render(
        <PaymentMethodSelector
          selectedMethod="wallet"
          onMethodChange={jest.fn()}
          packageAmount={100}
        />
      );

      expect(screen.getByText('Crypto Wallet')).toBeInTheDocument();
      expect(screen.getByText('M-Pesa')).toBeInTheDocument();
    });

    it('should show M-Pesa info when selected on mobile', () => {
      setViewport(320);
      
      render(
        <PaymentMethodSelector
          selectedMethod="mpesa"
          onMethodChange={jest.fn()}
          packageAmount={100}
        />
      );

      expect(screen.getByText('M-Pesa Payment Process:')).toBeInTheDocument();
      expect(screen.getByText('Enter your M-Pesa phone number')).toBeInTheDocument();
    });

    it('should handle method selection on mobile', () => {
      setViewport(320);
      const onMethodChange = jest.fn();
      
      render(
        <PaymentMethodSelector
          selectedMethod="wallet"
          onMethodChange={onMethodChange}
          packageAmount={100}
        />
      );

      // Click on M-Pesa option
      fireEvent.click(screen.getByText('M-Pesa'));
      expect(onMethodChange).toHaveBeenCalledWith('mpesa');
    });
  });

  describe('MpesaPaymentForm Mobile Responsiveness', () => {
    it('should render properly on mobile', () => {
      setViewport(320);
      
      render(
        <MpesaPaymentForm
          walletAddress="0x1234567890123456789012345678901234567890"
          packageId={1}
          amount={100}
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      expect(screen.getByText('M-Pesa Payment')).toBeInTheDocument();
      expect(screen.getByLabelText(/M-Pesa Phone Number/i)).toBeInTheDocument();
    });

    it('should stack buttons vertically on mobile', () => {
      setViewport(320);
      
      render(
        <MpesaPaymentForm
          walletAddress="0x1234567890123456789012345678901234567890"
          packageId={1}
          amount={100}
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Check that button container has mobile-friendly classes
      const buttonContainer = screen.getByText('Send Request').closest('div');
      expect(buttonContainer).toHaveClass('flex-col');
    });

    it('should handle phone number input on mobile', () => {
      setViewport(320);
      
      render(
        <MpesaPaymentForm
          walletAddress="0x1234567890123456789012345678901234567890"
          packageId={1}
          amount={100}
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });
      
      expect(phoneInput).toHaveValue('254712345678');
    });

    it('should show proper button text on mobile vs desktop', () => {
      // Mobile view
      setViewport(320);
      
      const { rerender } = render(
        <MpesaPaymentForm
          walletAddress="0x1234567890123456789012345678901234567890"
          packageId={1}
          amount={100}
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should show shortened text on mobile
      expect(screen.getByText('Send Request')).toBeInTheDocument();

      // Desktop view
      setViewport(1024);
      
      rerender(
        <MpesaPaymentForm
          walletAddress="0x1234567890123456789012345678901234567890"
          packageId={1}
          amount={100}
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Should show full text on desktop
      expect(screen.getByText('Send Payment Request')).toBeInTheDocument();
    });
  });

  describe('Touch Target Accessibility', () => {
    it('should have proper touch targets on mobile', () => {
      setViewport(320);
      
      render(
        <MpesaPaymentForm
          walletAddress="0x1234567890123456789012345678901234567890"
          packageId={1}
          amount={100}
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      // Buttons should have minimum 44px height for touch targets
      const sendButton = screen.getByText('Send Request');
      const cancelButton = screen.getByText('Cancel');
      
      expect(sendButton).toHaveClass('min-h-[48px]'); // lg size
      expect(cancelButton).toHaveClass('min-h-[48px]'); // lg size
    });

    it('should have accessible input fields on mobile', () => {
      setViewport(320);
      
      render(
        <MpesaPaymentForm
          walletAddress="0x1234567890123456789012345678901234567890"
          packageId={1}
          amount={100}
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
        />
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      
      // Input should have minimum height for mobile
      expect(phoneInput).toHaveClass('min-h-[44px]');
    });
  });

  describe('Content Overflow Prevention', () => {
    it('should not cause horizontal overflow on small screens', () => {
      setViewport(320);
      
      render(
        <PurchaseModal
          package={mockPackage}
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      // Modal should have proper max-width for mobile
      const modalPanel = screen.getByRole('dialog');
      expect(modalPanel).toHaveClass('max-w-sm');
    });

    it('should handle long package names gracefully', () => {
      const longNamePackage = {
        ...mockPackage,
        name: 'Very Long Package Name That Might Cause Overflow Issues'
      };

      setViewport(320);
      
      render(
        <PurchaseModal
          package={longNamePackage}
          isOpen={true}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      );

      // Title should be truncated or wrapped properly
      expect(screen.getByText(/Very Long Package Name/)).toBeInTheDocument();
    });
  });
});
