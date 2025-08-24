import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { MpesaPaymentForm } from '../../components/payments/MpesaPaymentForm';
import toast from 'react-hot-toast';

// Mock react-hot-toast
jest.mock('react-hot-toast');

// Create MSW server for API mocking
const server = setupServer();

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('M-Pesa Payment Flow E2E Tests', () => {
  const defaultProps = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    packageId: 1,
    amount: 100,
    onSuccess: jest.fn(),
    onCancel: jest.fn()
  };

  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe('Successful Payment Flow', () => {
    it('should complete full payment flow from initiation to success', async () => {
      // Mock successful payment initiation
      server.use(
        http.post('/api/mpesa/initiate-payment', () => {
          return HttpResponse.json({
            success: true,
            transactionId: 'test-transaction-123',
            checkoutRequestId: 'ws_CO_123456789',
            message: 'Payment request sent to your phone',
            amount: {
              usd: 100,
              kes: 14925
            }
          });
        }),

        // Mock status polling - first pending, then completed
        http.get('/api/mpesa/status/:checkoutRequestId', ({ params }) => {
          const { checkoutRequestId } = params;
          
          // Simulate status progression
          if (checkoutRequestId === 'ws_CO_123456789') {
            return HttpResponse.json({
              success: true,
              transaction: {
                id: 'test-transaction-123',
                status: 'completed',
                amount: { usd: 100, kes: 14925 },
                phoneNumber: '254712345678',
                createdAt: new Date().toISOString()
              },
              mpesaStatus: {
                resultCode: '0',
                resultDesc: 'Success'
              }
            });
          }
          
          return HttpResponse.json({ success: false, error: 'Transaction not found' });
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      // Step 1: Enter phone number
      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      // Step 2: Submit payment
      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      // Step 3: Wait for payment initiation
      await waitFor(() => {
        expect(screen.getByText(/Initiating Payment/i)).toBeInTheDocument();
      });

      // Step 4: Wait for pending state
      await waitFor(() => {
        expect(screen.getByText(/Check your phone/i)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Step 5: Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/Payment Successful/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      // Verify success callback was called
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('test-transaction-123');
    });

    it('should handle payment with referrer address', async () => {
      const propsWithReferrer = {
        ...defaultProps,
        referrerAddress: '0xabcdef1234567890abcdef1234567890abcdef12'
      };

      server.use(
        http.post('/api/mpesa/initiate-payment', async ({ request }) => {
          const body = await request.json() as any;
          
          // Verify referrer address is included
          expect(body.referrerAddress).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
          
          return HttpResponse.json({
            success: true,
            transactionId: 'test-transaction-456',
            checkoutRequestId: 'ws_CO_987654321',
            message: 'Payment request sent to your phone',
            amount: { usd: 100, kes: 14925 }
          });
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...propsWithReferrer} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Initiating Payment/i)).toBeInTheDocument();
      });
    });
  });

  describe('Failed Payment Flow', () => {
    it('should handle payment initiation failure', async () => {
      server.use(
        http.post('/api/mpesa/initiate-payment', () => {
          return HttpResponse.json({
            success: false,
            error: 'Insufficient funds in M-Pesa account'
          }, { status: 400 });
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText('Insufficient funds in M-Pesa account')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle M-Pesa payment rejection', async () => {
      server.use(
        http.post('/api/mpesa/initiate-payment', () => {
          return HttpResponse.json({
            success: true,
            transactionId: 'test-transaction-789',
            checkoutRequestId: 'ws_CO_111222333',
            message: 'Payment request sent to your phone',
            amount: { usd: 100, kes: 14925 }
          });
        }),

        http.get('/api/mpesa/status/:checkoutRequestId', () => {
          return HttpResponse.json({
            success: true,
            transaction: {
              id: 'test-transaction-789',
              status: 'failed',
              amount: { usd: 100, kes: 14925 },
              phoneNumber: '254712345678',
              createdAt: new Date().toISOString()
            },
            mpesaStatus: {
              resultCode: '1032',
              resultDesc: 'Request cancelled by user'
            }
          });
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Check your phone/i)).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(screen.getByText('Request cancelled by user')).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.post('/api/mpesa/initiate-payment', () => {
          return HttpResponse.error();
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow payment cancellation during pending state', async () => {
      server.use(
        http.post('/api/mpesa/initiate-payment', () => {
          return HttpResponse.json({
            success: true,
            transactionId: 'test-transaction-cancel',
            checkoutRequestId: 'ws_CO_cancel123',
            message: 'Payment request sent to your phone',
            amount: { usd: 100, kes: 14925 }
          });
        }),

        http.get('/api/mpesa/status/:checkoutRequestId', () => {
          // Keep returning pending to test cancellation
          return HttpResponse.json({
            success: true,
            transaction: {
              id: 'test-transaction-cancel',
              status: 'pending',
              amount: { usd: 100, kes: 14925 },
              phoneNumber: '254712345678',
              createdAt: new Date().toISOString()
            },
            mpesaStatus: null
          });
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Check your phone/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel Payment');
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should allow retry after failure', async () => {
      let attemptCount = 0;

      server.use(
        http.post('/api/mpesa/initiate-payment', () => {
          attemptCount++;
          
          if (attemptCount === 1) {
            // First attempt fails
            return HttpResponse.json({
              success: false,
              error: 'Temporary service unavailable'
            }, { status: 503 });
          } else {
            // Second attempt succeeds
            return HttpResponse.json({
              success: true,
              transactionId: 'test-transaction-retry',
              checkoutRequestId: 'ws_CO_retry123',
              message: 'Payment request sent to your phone',
              amount: { usd: 100, kes: 14925 }
            });
          }
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      // Wait for first failure
      await waitFor(() => {
        expect(screen.getByText(/Payment Failed/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Should return to input form
      expect(screen.getByLabelText(/M-Pesa Phone Number/i)).toBeInTheDocument();

      // Try again
      fireEvent.click(screen.getByText('Send Payment Request'));

      // Should succeed this time
      await waitFor(() => {
        expect(screen.getByText(/Initiating Payment/i)).toBeInTheDocument();
      });

      expect(attemptCount).toBe(2);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText(/M-Pesa Phone Number/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByRole('button', { name: /Send Payment Request/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', async () => {
      server.use(
        http.post('/api/mpesa/initiate-payment', () => {
          return HttpResponse.json({
            success: true,
            transactionId: 'test-transaction-a11y',
            checkoutRequestId: 'ws_CO_a11y123',
            message: 'Payment request sent to your phone',
            amount: { usd: 100, kes: 14925 }
          });
        })
      );

      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText(/M-Pesa Phone Number/i);
      fireEvent.change(phoneInput, { target: { value: '254712345678' } });

      const submitButton = screen.getByText('Send Payment Request');
      fireEvent.click(submitButton);

      await waitFor(() => {
        const statusElement = screen.getByText(/Initiating Payment/i);
        expect(statusElement).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});
