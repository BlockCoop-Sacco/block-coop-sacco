import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GlobalTargetPriceManager } from '../../components/admin/GlobalTargetPriceManager'
import { Web3Provider } from '../../providers/Web3Provider'
import { ethers } from 'ethers'

// Mock the Web3Provider
const mockWeb3Context = {
  isConnected: true,
  account: '0x1234567890123456789012345678901234567890',
  signer: {
    getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
    provider: {
      getBalance: vi.fn().mockResolvedValue(ethers.parseEther('1.0')),
      getGasPrice: vi.fn().mockResolvedValue(ethers.parseUnits('20', 'gwei')),
      getNetwork: vi.fn().mockResolvedValue({ chainId: 97n })
    }
  },
  chainId: 97,
  contracts: {
    packageManager: {
      globalTargetPrice: vi.fn().mockResolvedValue(ethers.parseUnits('2.0', 18)), // 2.0 USDT per BLOCKS with 18 decimals
      setGlobalTargetPrice: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ status: 1 })
      })
    }
  },
  refreshConnection: vi.fn()
}

// Mock the useWeb3 hook
vi.mock('../../providers/Web3Provider', () => ({
  Web3Provider: ({ children }: { children: React.ReactNode }) => children,
  useWeb3: () => mockWeb3Context
}))

// Mock the wallet refresh hook
vi.mock('../../lib/walletRefresh', () => ({
  useWalletRefresh: () => ({
    refreshWallet: vi.fn().mockResolvedValue(true)
  }),
  shouldAttemptWalletRefresh: vi.fn().mockReturnValue(false)
}))

// Mock the contracts
vi.mock('../../lib/contracts', () => ({
  getContracts: () => ({
    packageManager: mockWeb3Context.contracts.packageManager
  })
}))

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  }
}))

describe('GlobalTargetPriceManager', () => {
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the component', () => {
    render(<GlobalTargetPriceManager onSuccess={mockOnSuccess} />)
    
    expect(screen.getByText('Global Target Price Management')).toBeInTheDocument()
    expect(screen.getByText('Current Global Target Price')).toBeInTheDocument()
  })

  it('should load and display current global target price with correct decimal precision', async () => {
    render(<GlobalTargetPriceManager onSuccess={mockOnSuccess} />)
    
    // Wait for the component to load the current price
    await waitFor(() => {
      expect(mockWeb3Context.contracts.packageManager.globalTargetPrice).toHaveBeenCalled()
    })

    // Should display 2.0 USDT (converted from 18-decimal precision)
    await waitFor(() => {
      expect(screen.getByText('2.0 USDT per 1 BLOCKS')).toBeInTheDocument()
    })
  })

  it('should handle wallet validation correctly', async () => {
    render(<GlobalTargetPriceManager onSuccess={mockOnSuccess} />)
    
    // Find and fill the input field
    const input = screen.getByLabelText('New Global Target Price (USDT per 1 BLOCKS)')
    fireEvent.change(input, { target: { value: '2.5' } })
    
    // Find and click the update button
    const updateButton = screen.getByText('Update Global Target Price')
    fireEvent.click(updateButton)
    
    // Should call the contract with correct 18-decimal precision
    await waitFor(() => {
      expect(mockWeb3Context.contracts.packageManager.setGlobalTargetPrice).toHaveBeenCalledWith(
        ethers.parseUnits('2.5', 18) // Should use 18 decimals, not 6
      )
    })
  })

  it('should show error when wallet is not connected', async () => {
    // Mock disconnected wallet
    const disconnectedContext = {
      ...mockWeb3Context,
      isConnected: false,
      account: null,
      signer: null
    }
    
    vi.mocked(require('../../providers/Web3Provider').useWeb3).mockReturnValue(disconnectedContext)
    
    render(<GlobalTargetPriceManager onSuccess={mockOnSuccess} />)
    
    const input = screen.getByLabelText('New Global Target Price (USDT per 1 BLOCKS)')
    fireEvent.change(input, { target: { value: '2.5' } })
    
    const updateButton = screen.getByText('Update Global Target Price')
    fireEvent.click(updateButton)
    
    // Should not call the contract when wallet is not connected
    expect(mockWeb3Context.contracts.packageManager.setGlobalTargetPrice).not.toHaveBeenCalled()
  })

  it('should validate input values correctly', async () => {
    render(<GlobalTargetPriceManager onSuccess={mockOnSuccess} />)
    
    // Test with invalid input (negative value)
    const input = screen.getByLabelText('New Global Target Price (USDT per 1 BLOCKS)')
    fireEvent.change(input, { target: { value: '-1' } })
    
    const updateButton = screen.getByText('Update Global Target Price')
    fireEvent.click(updateButton)
    
    // Should not call the contract with invalid input
    expect(mockWeb3Context.contracts.packageManager.setGlobalTargetPrice).not.toHaveBeenCalled()
  })

  it('should handle contract errors gracefully', async () => {
    // Mock contract error
    mockWeb3Context.contracts.packageManager.setGlobalTargetPrice.mockRejectedValue(
      new Error('Transaction failed')
    )
    
    render(<GlobalTargetPriceManager onSuccess={mockOnSuccess} />)
    
    const input = screen.getByLabelText('New Global Target Price (USDT per 1 BLOCKS)')
    fireEvent.change(input, { target: { value: '2.5' } })
    
    const updateButton = screen.getByText('Update Global Target Price')
    fireEvent.click(updateButton)
    
    await waitFor(() => {
      expect(mockWeb3Context.contracts.packageManager.setGlobalTargetPrice).toHaveBeenCalled()
    })
    
    // Should handle the error without crashing
    expect(screen.getByText('Update Global Target Price')).toBeInTheDocument()
  })
})
