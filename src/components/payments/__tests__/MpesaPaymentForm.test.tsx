import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import MpesaPaymentForm from '../MpesaPaymentForm'
import { Web3Provider } from '../../../providers/Web3Provider'

// Mock the Web3Provider
const mockWeb3Context = {
  address: '0x1234567890123456789012345678901234567890',
  isConnected: true,
  chainId: 56,
  provider: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchNetwork: vi.fn()
}

const MockWeb3Provider = ({ children }: { children: React.ReactNode }) => (
  <Web3Provider value={mockWeb3Context}>
    {children}
  </Web3Provider>
)

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MockWeb3Provider>
        {children}
        <Toaster />
      </MockWeb3Provider>
    </QueryClientProvider>
  )
}

describe('MpesaPaymentForm', () => {
  const defaultProps = {
    packageId: 1,
    amount: 100,
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
    referrerAddress: '0x2345678901234567890123456789012345678901'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Render', () => {
    it('should render payment form with correct package details', () => {
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('M-Pesa Payment')).toBeInTheDocument()
      expect(screen.getByText('Package ID: 1')).toBeInTheDocument()
      expect(screen.getByText('Amount: $100 USD')).toBeInTheDocument()
      expect(screen.getByText('≈ KES 14,925')).toBeInTheDocument()
    })

    it('should show phone number input field', () => {
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      expect(phoneInput).toBeInTheDocument()
      expect(phoneInput).toHaveAttribute('placeholder', '254XXXXXXXXX')
    })

    it('should show wallet address from Web3 context', () => {
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByDisplayValue('0x1234567890123456789012345678901234567890')).toBeInTheDocument()
    })

    it('should show pay button initially disabled', () => {
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      expect(payButton).toBeDisabled()
    })
  })

  describe('Phone Number Validation', () => {
    it('should validate Kenyan phone number format', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      
      // Test invalid format
      await user.type(phoneInput, '123456789')
      await user.tab() // Trigger blur event
      
      expect(screen.getByText(/please enter a valid kenyan phone number/i)).toBeInTheDocument()
      
      // Test valid format
      await user.clear(phoneInput)
      await user.type(phoneInput, '254708374149')
      await user.tab()
      
      expect(screen.queryByText(/please enter a valid kenyan phone number/i)).not.toBeInTheDocument()
    })

    it('should enable pay button when valid phone number is entered', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      await user.type(phoneInput, '254708374149')
      
      expect(payButton).toBeEnabled()
    })

    it('should format phone number automatically', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      
      // Test with leading zero
      await user.type(phoneInput, '0708374149')
      expect(phoneInput).toHaveValue('254708374149')
      
      // Test with +254
      await user.clear(phoneInput)
      await user.type(phoneInput, '+254708374149')
      expect(phoneInput).toHaveValue('254708374149')
    })
  })

  describe('Payment Flow', () => {
    it('should initiate payment successfully', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      await user.type(phoneInput, '254708374149')
      await user.click(payButton)
      
      // Should show loading state
      expect(screen.getByText(/initiating payment/i)).toBeInTheDocument()
      
      // Wait for success state
      await waitFor(() => {
        expect(screen.getByText(/payment request sent/i)).toBeInTheDocument()
      })
    })

    it('should handle payment failure', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      // Use test phone number that triggers failure
      await user.type(phoneInput, '254708374150')
      await user.click(payButton)
      
      await waitFor(() => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument()
      })
    })

    it('should show timeout message for timeout scenario', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      // Use test phone number that triggers timeout
      await user.type(phoneInput, '254708374152')
      await user.click(payButton)
      
      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument()
      }, { timeout: 10000 })
    })
  })

  describe('Payment Status Polling', () => {
    it('should poll for payment status after successful initiation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      await user.type(phoneInput, '254708374149')
      await user.click(payButton)
      
      // Wait for payment initiation
      await waitFor(() => {
        expect(screen.getByText(/waiting for payment confirmation/i)).toBeInTheDocument()
      })
      
      // Should show polling status
      expect(screen.getByText(/checking payment status/i)).toBeInTheDocument()
    })

    it('should stop polling when payment is completed', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      await user.type(phoneInput, '254708374149')
      await user.click(payButton)
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/payment completed successfully/i)).toBeInTheDocument()
      }, { timeout: 15000 })
      
      expect(defaultProps.onSuccess).toHaveBeenCalled()
    })
  })

  describe('User Interactions', () => {
    it('should handle cancel button click', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      expect(defaultProps.onCancel).toHaveBeenCalled()
    })

    it('should allow retry after failure', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      let payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      // Trigger failure
      await user.type(phoneInput, '254708374150')
      await user.click(payButton)
      
      await waitFor(() => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument()
      })
      
      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /try again/i })
      expect(retryButton).toBeInTheDocument()
      
      await user.click(retryButton)
      
      // Should return to initial state
      expect(screen.getByText('M-Pesa Payment')).toBeInTheDocument()
    })

    it('should show different steps in payment flow', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      // Step 1: Initial form
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
      
      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      await user.type(phoneInput, '254708374149')
      await user.click(payButton)
      
      // Step 2: Payment initiated
      await waitFor(() => {
        expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
      })
      
      // Step 3: Waiting for confirmation
      await waitFor(() => {
        expect(screen.getByText('Step 3 of 3')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/wallet address/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /pay with m-pesa/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MpesaPaymentForm {...defaultProps} />
        </TestWrapper>
      )

      const phoneInput = screen.getByLabelText(/phone number/i)
      const payButton = screen.getByRole('button', { name: /pay with m-pesa/i })
      
      // Tab navigation
      await user.tab()
      expect(phoneInput).toHaveFocus()
      
      await user.tab()
      expect(payButton).toHaveFocus()
    })
  })
})
