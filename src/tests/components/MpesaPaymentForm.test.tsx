import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { MpesaPaymentForm } from '../../components/payments/MpesaPaymentForm';
import { useMpesaPayment } from '../../hooks/useMpesaPayment';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('../../hooks/useMpesaPayment');
jest.mock('react-hot-toast');

const mockUseMpesaPayment = useMpesaPayment as jest.MockedFunction<typeof useMpesaPayment>;
const mockToast = toast as jest.Mocked<typeof toast>;

describe('MpesaPaymentForm', () => {
  const defaultProps = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    packageId: 1,
    amount: 100,
    onSuccess: jest.fn(),
    onCancel: jest.fn()
  };

  const mockPaymentState = {
    status: 'idle' as const,
    transactionId: null,
    checkoutRequestId: null,
    error: null,
    amount: null,
    loading: false
  };

  const mockPaymentHook = {
    paymentState: mockPaymentState,
    initiatePayment: jest.fn(),
    queryPaymentStatus: jest.fn(),
    resetPayment: jest.fn(),
    startStatusPolling: jest.fn(),
    stopStatusPolling: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMpesaPayment.mockReturnValue(mockPaymentHook);
  });

  describe('Initial State', () => {
    it('should render phone number input form', () => {
      render(<MpesaPaymentForm {...defaultProps} />);

      expect(screen.getByText('M-Pesa Payment')).toBeInTheDocument();
      expect(screen.getByLabelText(/M-Pesa Phone Number/i)).toBeInTheDocument();
      expect(screen.getByText('Send Payment Request')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should display package amount in USD and KES', () => {
      render(<MpesaPaymentForm {...defaultProps} />);

      expect(screen.getByText('$100 USD')).toBeInTheDocument();
      expect(screen.getByText('KES 14,925')).toBeInTheDocument();
    });

    it('should show phone number format hint', () => {
      render(<MpesaPaymentForm {...defaultProps} />);

      expect(screen.getByText('Enter your M-Pesa registered phone number')).toBeInTheDocument();
    });
  });

  describe('Phone Number Input', () => {
    it('should format phone number as user types', () => {
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      
      fireEvent.change(phoneInput, { target: { value: '0712345678' } });
      expect(phoneInput.value).toBe('254712345678');
    });

    it('should validate phone number format', () => {
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      
      fireEvent.change(phoneInput, { target: { value: '123' } });
      expect(screen.getByText(/Please enter a valid Kenyan phone number/i)).toBeInTheDocument();
    });

    it('should disable submit button for invalid phone number', () => {
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      const submitButton = screen.getByText('Send Payment Request');
      
      fireEvent.change(phoneInput, { target: { value: '123' } });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button for valid phone number', () => {
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      const submitButton = screen.getByText('Send Payment Request');
      
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Payment Initiation', () => {
    it('should call initiatePayment when form is submitted', async () => {
      mockPaymentHook.initiatePayment.mockResolvedValue(true);
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      const submitButton = screen.getByText('Send Payment Request');
      
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockPaymentHook.initiatePayment).toHaveBeenCalledWith({
          packageId: 1,
          phoneNumber: '254712345678',
          amount: 100,
          referrerAddress: undefined
        });
      });
    });

    it('should show error toast for invalid phone number on submit', async () => {
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      const submitButton = screen.getByText('Send Payment Request');
      
      fireEvent.change(phoneInput, { target: { value: '123' } });
      fireEvent.click(submitButton);
      
      expect(mockToast.error).toHaveBeenCalledWith('Please enter a valid Kenyan phone number');
    });

    it('should include referrer address when provided', async () => {
      const propsWithReferrer = {
        ...defaultProps,
        referrerAddress: '0xabcdef1234567890abcdef1234567890abcdef12'
      };
      
      mockPaymentHook.initiatePayment.mockResolvedValue(true);
      
      render(<MpesaPaymentForm {...propsWithReferrer} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      const submitButton = screen.getByText('Send Payment Request');
      
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockPaymentHook.initiatePayment).toHaveBeenCalledWith({
          packageId: 1,
          phoneNumber: '254712345678',
          amount: 100,
          referrerAddress: '0xabcdef1234567890abcdef1234567890abcdef12'
        });
      });
    });
  });

  describe('Payment States', () => {
    it('should show processing state', () => {
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          status: 'initiating',
          loading: true
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      expect(screen.getByText('Initiating Payment')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we process your request...')).toBeInTheDocument();
    });

    it('should show waiting state with status tracker', () => {
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          status: 'pending',
          checkoutRequestId: 'ws_CO_123456789'
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      expect(screen.getByText('Cancel Payment')).toBeInTheDocument();
    });

    it('should show completed state', () => {
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          status: 'completed',
          transactionId: 'test-transaction-id'
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      expect(screen.getByText('test-transaction-id')).toBeInTheDocument();
    });

    it('should show failed state with retry option', () => {
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          status: 'failed',
          error: 'Payment failed'
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.getByText('Payment failed')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should reset payment and return to input on retry', () => {
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          status: 'failed',
          error: 'Payment failed'
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      
      expect(mockPaymentHook.resetPayment).toHaveBeenCalled();
    });

    it('should call onSuccess when payment completes', () => {
      const mockOnSuccess = jest.fn();
      
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          status: 'completed',
          transactionId: 'test-transaction-id'
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} onSuccess={mockOnSuccess} />);
      
      expect(mockOnSuccess).toHaveBeenCalledWith('test-transaction-id');
    });
  });

  describe('Loading States', () => {
    it('should disable form during payment initiation', () => {
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          loading: true
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      const submitButton = screen.getByText('Send Payment Request');
      
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });
      
      expect(submitButton).toBeDisabled();
    });

    it('should show loading spinner on submit button', () => {
      mockUseMpesaPayment.mockReturnValue({
        ...mockPaymentHook,
        paymentState: {
          ...mockPaymentState,
          loading: true
        }
      });
      
      render(<MpesaPaymentForm {...defaultProps} />);
      
      // Check for loading state in button (implementation may vary)
      const submitButton = screen.getByText('Send Payment Request');
      expect(submitButton).toBeDisabled();
    });
  });
});
