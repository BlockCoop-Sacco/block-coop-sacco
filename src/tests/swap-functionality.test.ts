import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSecondaryMarketSwap } from '../hooks/useSecondaryMarketSwap';
import { useWeb3 } from '../providers/Web3Provider';
import { useRefreshListener } from '../contexts/RefreshContext';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';

// Mock dependencies
vi.mock('../providers/Web3Provider');
vi.mock('../contexts/RefreshContext');
vi.mock('react-hot-toast');
vi.mock('../lib/appkit', () => ({
  appKitConfig: {
    contracts: {
      secondaryMarket: '0x1234567890123456789012345678901234567890',
      usdt: '0x2345678901234567890123456789012345678901',
      share: '0x3456789012345678901234567890123456789012'
    }
  }
}));

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    Contract: vi.fn(),
    formatUnits: vi.fn(),
    parseUnits: vi.fn()
  }
}));

describe('useSecondaryMarketSwap', () => {
  const mockSigner = {
    getAddress: vi.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
  };

  const mockSecondaryMarketContract = {
    getUSDTToBLOCKSQuote: vi.fn(),
    getBLOCKSToUSDTQuote: vi.fn(),
    targetPrice: vi.fn(),
    tradingFee: vi.fn(),
    slippageTolerance: vi.fn(),
    marketMakingEnabled: vi.fn(),
    liquidityPair: vi.fn(),
    swapUSDTForBLOCKS: vi.fn(),
    swapBLOCKSForUSDT: vi.fn()
  };

  const mockUSDTContract = {
    symbol: vi.fn().mockResolvedValue('USDT'),
    name: vi.fn().mockResolvedValue('Tether USD'),
    decimals: vi.fn().mockResolvedValue(18),
    balanceOf: vi.fn(),
    allowance: vi.fn(),
    approve: vi.fn()
  };

  const mockBLOCKSContract = {
    symbol: vi.fn().mockResolvedValue('BLOCKS'),
    name: vi.fn().mockResolvedValue('BLOCKS Token'),
    decimals: vi.fn().mockResolvedValue(18),
    balanceOf: vi.fn(),
    allowance: vi.fn(),
    approve: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useWeb3
    (useWeb3 as Mock).mockReturnValue({
      signer: mockSigner,
      account: '0x1234567890123456789012345678901234567890',
      isConnected: true,
      isCorrectNetwork: true
    });

    // Mock useRefreshListener
    (useRefreshListener as Mock).mockImplementation(() => {});

    // Mock ethers.Contract
    (ethers.Contract as Mock).mockImplementation((address, abi, signer) => {
      if (address === '0x1234567890123456789012345678901234567890') {
        return mockSecondaryMarketContract;
      } else if (address === '0x2345678901234567890123456789012345678901') {
        return mockUSDTContract;
      } else if (address === '0x3456789012345678901234567890123456789012') {
        return mockBLOCKSContract;
      }
      return {};
    });

    // Mock ethers utility functions
    (ethers.formatUnits as Mock).mockImplementation((value, decimals) => {
      return (Number(value) / Math.pow(10, decimals)).toString();
    });

    (ethers.parseUnits as Mock).mockImplementation((value, decimals) => {
      return BigInt(Math.floor(parseFloat(value) * Math.pow(10, decimals)));
    });
  });

  describe('Market Stats', () => {
    it('should fetch market statistics correctly', async () => {
      // Setup mock responses
      mockSecondaryMarketContract.targetPrice.mockResolvedValue(BigInt('1500000000000000000')); // 1.5 USDT
      mockSecondaryMarketContract.tradingFee.mockResolvedValue(BigInt('25')); // 0.25%
      mockSecondaryMarketContract.slippageTolerance.mockResolvedValue(BigInt('100')); // 1%
      mockSecondaryMarketContract.marketMakingEnabled.mockResolvedValue(true);
      mockSecondaryMarketContract.liquidityPair.mockResolvedValue('0x4567890123456789012345678901234567890123');

      const { result } = renderHook(() => useSecondaryMarketSwap());

      await act(async () => {
        await result.current.fetchMarketStats();
      });

      expect(result.current.marketStats).toEqual({
        targetPrice: BigInt('1500000000000000000'),
        tradingFee: 25,
        slippageTolerance: 100,
        marketMakingEnabled: true,
        liquidityPair: '0x4567890123456789012345678901234567890123'
      });
    });

    it('should handle market stats fetch errors', async () => {
      mockSecondaryMarketContract.targetPrice.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSecondaryMarketSwap());

      await act(async () => {
        await result.current.fetchMarketStats();
      });

      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Token Information', () => {
    it('should fetch token information and balances correctly', async () => {
      // Setup mock responses
      mockUSDTContract.balanceOf.mockResolvedValue(BigInt('1000000000000000000000')); // 1000 USDT
      mockUSDTContract.allowance.mockResolvedValue(BigInt('500000000000000000000')); // 500 USDT
      mockBLOCKSContract.balanceOf.mockResolvedValue(BigInt('2000000000000000000000')); // 2000 BLOCKS
      mockBLOCKSContract.allowance.mockResolvedValue(BigInt('1000000000000000000000')); // 1000 BLOCKS

      const { result } = renderHook(() => useSecondaryMarketSwap());

      await act(async () => {
        await result.current.fetchTokenInfo();
      });

      expect(result.current.usdtInfo).toEqual({
        address: '0x2345678901234567890123456789012345678901',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 18,
        balance: BigInt('1000000000000000000000'),
        allowance: BigInt('500000000000000000000')
      });

      expect(result.current.blocksInfo).toEqual({
        address: '0x3456789012345678901234567890123456789012',
        symbol: 'BLOCKS',
        name: 'BLOCKS Token',
        decimals: 18,
        balance: BigInt('2000000000000000000000'),
        allowance: BigInt('1000000000000000000000')
      });
    });
  });

  describe('Swap Quotes', () => {
    it('should get USDT to BLOCKS quote correctly', async () => {
      mockSecondaryMarketContract.getUSDTToBLOCKSQuote.mockResolvedValue(BigInt('666666666666666666')); // ~0.67 BLOCKS

      const { result } = renderHook(() => useSecondaryMarketSwap());

      // Setup market stats for fee calculation
      result.current.marketStats = {
        targetPrice: BigInt('1500000000000000000'),
        tradingFee: 25,
        slippageTolerance: 100,
        marketMakingEnabled: true,
        liquidityPair: '0x4567890123456789012345678901234567890123'
      };

      const inputAmount = BigInt('1000000000000000000'); // 1 USDT
      const quote = await result.current.getSwapQuote('USDT', inputAmount, 1);

      expect(quote).toBeDefined();
      expect(quote?.inputAmount).toBe(inputAmount);
      expect(quote?.outputAmount).toBe(BigInt('666666666666666666'));
      expect(mockSecondaryMarketContract.getUSDTToBLOCKSQuote).toHaveBeenCalledWith(inputAmount);
    });

    it('should get BLOCKS to USDT quote correctly', async () => {
      mockSecondaryMarketContract.getBLOCKSToUSDTQuote.mockResolvedValue(BigInt('1500000000000000000')); // 1.5 USDT

      const { result } = renderHook(() => useSecondaryMarketSwap());

      // Setup market stats for fee calculation
      result.current.marketStats = {
        targetPrice: BigInt('1500000000000000000'),
        tradingFee: 25,
        slippageTolerance: 100,
        marketMakingEnabled: true,
        liquidityPair: '0x4567890123456789012345678901234567890123'
      };

      const inputAmount = BigInt('1000000000000000000'); // 1 BLOCKS
      const quote = await result.current.getSwapQuote('BLOCKS', inputAmount, 1);

      expect(quote).toBeDefined();
      expect(quote?.inputAmount).toBe(inputAmount);
      expect(quote?.outputAmount).toBe(BigInt('1500000000000000000'));
      expect(mockSecondaryMarketContract.getBLOCKSToUSDTQuote).toHaveBeenCalledWith(inputAmount);
    });

    it('should calculate slippage correctly', async () => {
      mockSecondaryMarketContract.getUSDTToBLOCKSQuote.mockResolvedValue(BigInt('1000000000000000000')); // 1 BLOCKS

      const { result } = renderHook(() => useSecondaryMarketSwap());

      result.current.marketStats = {
        targetPrice: BigInt('1500000000000000000'),
        tradingFee: 25,
        slippageTolerance: 100,
        marketMakingEnabled: true,
        liquidityPair: '0x4567890123456789012345678901234567890123'
      };

      const inputAmount = BigInt('1000000000000000000'); // 1 USDT
      const quote = await result.current.getSwapQuote('USDT', inputAmount, 2); // 2% slippage

      expect(quote).toBeDefined();
      // With 2% slippage, minimum output should be 98% of expected output
      const expectedMinimum = (BigInt('1000000000000000000') * BigInt(9800)) / BigInt(10000);
      expect(quote?.minimumOutput).toBe(expectedMinimum);
    });
  });

  describe('Token Approval', () => {
    it('should approve USDT tokens successfully', async () => {
      const mockTx = { wait: vi.fn().mockResolvedValue({}) };
      mockUSDTContract.approve.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useSecondaryMarketSwap());

      const amount = BigInt('1000000000000000000'); // 1 USDT
      const success = await result.current.approveToken('USDT', amount);

      expect(success).toBe(true);
      expect(mockUSDTContract.approve).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        amount
      );
      expect(toast.success).toHaveBeenCalledWith('Token approved successfully');
    });

    it('should handle approval failures', async () => {
      mockUSDTContract.approve.mockRejectedValue(new Error('User rejected transaction'));

      const { result } = renderHook(() => useSecondaryMarketSwap());

      const amount = BigInt('1000000000000000000'); // 1 USDT
      const success = await result.current.approveToken('USDT', amount);

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('User rejected transaction');
    });
  });

  describe('Swap Execution', () => {
    it('should execute USDT to BLOCKS swap successfully', async () => {
      const mockTx = { wait: vi.fn().mockResolvedValue({}) };
      mockSecondaryMarketContract.swapUSDTForBLOCKS.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useSecondaryMarketSwap());

      const inputAmount = BigInt('1000000000000000000'); // 1 USDT
      const minimumOutput = BigInt('900000000000000000'); // 0.9 BLOCKS
      const success = await result.current.executeSwap('USDT', inputAmount, minimumOutput);

      expect(success).toBe(true);
      expect(mockSecondaryMarketContract.swapUSDTForBLOCKS).toHaveBeenCalledWith(
        inputAmount,
        minimumOutput,
        expect.any(Number) // deadline
      );
      expect(toast.success).toHaveBeenCalledWith('Swap completed successfully!');
    });

    it('should execute BLOCKS to USDT swap successfully', async () => {
      const mockTx = { wait: vi.fn().mockResolvedValue({}) };
      mockSecondaryMarketContract.swapBLOCKSForUSDT.mockResolvedValue(mockTx);

      const { result } = renderHook(() => useSecondaryMarketSwap());

      const inputAmount = BigInt('1000000000000000000'); // 1 BLOCKS
      const minimumOutput = BigInt('1400000000000000000'); // 1.4 USDT
      const success = await result.current.executeSwap('BLOCKS', inputAmount, minimumOutput);

      expect(success).toBe(true);
      expect(mockSecondaryMarketContract.swapBLOCKSForUSDT).toHaveBeenCalledWith(
        inputAmount,
        minimumOutput,
        expect.any(Number) // deadline
      );
      expect(toast.success).toHaveBeenCalledWith('Swap completed successfully!');
    });

    it('should handle swap execution failures', async () => {
      mockSecondaryMarketContract.swapUSDTForBLOCKS.mockRejectedValue(new Error('Insufficient liquidity'));

      const { result } = renderHook(() => useSecondaryMarketSwap());

      const inputAmount = BigInt('1000000000000000000'); // 1 USDT
      const minimumOutput = BigInt('900000000000000000'); // 0.9 BLOCKS
      const success = await result.current.executeSwap('USDT', inputAmount, minimumOutput);

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Insufficient liquidity');
    });
  });

  describe('Error Handling', () => {
    it('should clear errors correctly', () => {
      const { result } = renderHook(() => useSecondaryMarketSwap());

      // Set an error
      act(() => {
        result.current.error = 'Test error';
      });

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should manage loading state during operations', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockSecondaryMarketContract.targetPrice.mockReturnValue(promise);

      const { result } = renderHook(() => useSecondaryMarketSwap());

      // Start operation
      const fetchPromise = act(async () => {
        await result.current.fetchMarketStats();
      });

      // Should be loading
      expect(result.current.loading).toBe(true);

      // Resolve the promise
      resolvePromise!(BigInt('1500000000000000000'));
      await fetchPromise;

      // Should no longer be loading
      expect(result.current.loading).toBe(false);
    });
  });
});
