import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../providers/Web3Provider';
import { getUserReferralHistory, getReferralStats } from '../lib/contracts';
import { formatBLOCKS } from '../lib/utils';

interface ReferralTransaction {
  referrer: string;
  buyer: string;
  reward: bigint;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

interface ReferralStats {
  totalRewards: bigint;
  referralCount: number;
  averageReward: bigint;
  lastReferralDate: number | null;
  topReferralReward: bigint;
}

interface FormattedReferralStats {
  totalRewards: string;
  referralCount: number;
  averageReward: string;
  lastReferralDate: number | null;
  topReferralReward: string;
}

interface UseReferralReturn {
  // Raw data
  referralHistory: ReferralTransaction[];
  referralStats: ReferralStats | null;
  
  // Formatted data
  formattedStats: FormattedReferralStats | null;
  
  // Loading states
  loading: boolean;
  historyLoading: boolean;
  statsLoading: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  refetch: () => Promise<void>;
  refetchHistory: () => Promise<void>;
  refetchStats: () => Promise<void>;
}

export function useReferral(): UseReferralReturn {
  const { account, isConnected } = useWeb3();
  
  // State
  const [referralHistory, setReferralHistory] = useState<ReferralTransaction[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch referral history
  const fetchReferralHistory = useCallback(async () => {
    if (!account || !isConnected) {
      setReferralHistory([]);
      return;
    }

    setHistoryLoading(true);
    setError(null);

    try {
      console.log('Fetching referral history for:', account);
      const history = await getUserReferralHistory(account);
      setReferralHistory(history);
      console.log('Referral history fetched:', history.length, 'transactions');
    } catch (err: any) {
      console.error('Error fetching referral history:', err);

      // Check if it's a rate limit error
      if (err?.code === -32005 || err?.message?.includes('rate limit') || err?.message?.includes('limit exceeded')) {
        setError('Loading referral data... Please wait, this may take a moment due to network limits.');
      } else {
        setError('Failed to load referral history. Please try refreshing the page.');
      }
      setReferralHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [account, isConnected]);

  // Fetch referral stats
  const fetchReferralStats = useCallback(async () => {
    if (!account || !isConnected) {
      setReferralStats(null);
      return;
    }

    setStatsLoading(true);
    setError(null);

    try {
      console.log('Fetching referral stats for:', account);
      const stats = await getReferralStats(account);
      setReferralStats(stats);
      console.log('Referral stats fetched:', stats);
    } catch (err: any) {
      console.error('Error fetching referral stats:', err);

      // Check if it's a rate limit error
      if (err?.code === -32005 || err?.message?.includes('rate limit') || err?.message?.includes('limit exceeded')) {
        setError('Loading referral statistics... Please wait, this may take a moment due to network limits.');
      } else {
        setError('Failed to load referral statistics. Please try refreshing the page.');
      }
      setReferralStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [account, isConnected]);

  // Fetch all referral data
  const fetchReferralData = useCallback(async () => {
    if (!account || !isConnected) {
      setReferralHistory([]);
      setReferralStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch sequentially with delays to avoid rate limits
      await fetchReferralHistory();

      // Add delay between different query types to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000));

      await fetchReferralStats();
    } catch (err) {
      console.error('Error fetching referral data:', err);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, [account, isConnected, fetchReferralHistory, fetchReferralStats]);

  // Format stats for display
  const formattedStats: FormattedReferralStats | null = referralStats ? {
    totalRewards: formatBLOCKS(referralStats.totalRewards),
    referralCount: referralStats.referralCount,
    averageReward: formatBLOCKS(referralStats.averageReward),
    lastReferralDate: referralStats.lastReferralDate,
    topReferralReward: formatBLOCKS(referralStats.topReferralReward),
  } : null;

  // Effect to fetch data when account changes
  useEffect(() => {
    if (isConnected && account) {
      fetchReferralData();
    } else {
      // Clear data when disconnected
      setReferralHistory([]);
      setReferralStats(null);
      setError(null);
    }
  }, [account, isConnected, fetchReferralData]);

  // Refetch functions
  const refetch = useCallback(async () => {
    await fetchReferralData();
  }, [fetchReferralData]);

  const refetchHistory = useCallback(async () => {
    await fetchReferralHistory();
  }, [fetchReferralHistory]);

  const refetchStats = useCallback(async () => {
    await fetchReferralStats();
  }, [fetchReferralStats]);

  return {
    // Raw data
    referralHistory,
    referralStats,
    
    // Formatted data
    formattedStats,
    
    // Loading states
    loading: loading || (historyLoading && statsLoading),
    historyLoading,
    statsLoading,
    
    // Error state
    error,
    
    // Actions
    refetch,
    refetchHistory,
    refetchStats,
  };
}

// Hook for getting referral data for a specific address (useful for admin views)
export function useReferralForAddress(address: string | null): UseReferralReturn {
  const [referralHistory, setReferralHistory] = useState<ReferralTransaction[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch functions for specific address
  const fetchReferralHistory = useCallback(async () => {
    if (!address) {
      setReferralHistory([]);
      return;
    }

    setHistoryLoading(true);
    setError(null);

    try {
      const history = await getUserReferralHistory(address);
      setReferralHistory(history);
    } catch (err) {
      console.error('Error fetching referral history for address:', err);
      setError('Failed to load referral history');
      setReferralHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [address]);

  const fetchReferralStats = useCallback(async () => {
    if (!address) {
      setReferralStats(null);
      return;
    }

    setStatsLoading(true);
    setError(null);

    try {
      const stats = await getReferralStats(address);
      setReferralStats(stats);
    } catch (err) {
      console.error('Error fetching referral stats for address:', err);
      setError('Failed to load referral statistics');
      setReferralStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [address]);

  const fetchReferralData = useCallback(async () => {
    if (!address) {
      setReferralHistory([]);
      setReferralStats(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchReferralHistory(),
        fetchReferralStats(),
      ]);
    } catch (err) {
      console.error('Error fetching referral data for address:', err);
      setError('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  }, [address, fetchReferralHistory, fetchReferralStats]);

  const formattedStats: FormattedReferralStats | null = referralStats ? {
    totalRewards: formatBLOCKS(referralStats.totalRewards),
    referralCount: referralStats.referralCount,
    averageReward: formatBLOCKS(referralStats.averageReward),
    lastReferralDate: referralStats.lastReferralDate,
    topReferralReward: formatBLOCKS(referralStats.topReferralReward),
  } : null;

  useEffect(() => {
    if (address) {
      fetchReferralData();
    } else {
      setReferralHistory([]);
      setReferralStats(null);
      setError(null);
    }
  }, [address, fetchReferralData]);

  const refetch = useCallback(async () => {
    await fetchReferralData();
  }, [fetchReferralData]);

  const refetchHistory = useCallback(async () => {
    await fetchReferralHistory();
  }, [fetchReferralHistory]);

  const refetchStats = useCallback(async () => {
    await fetchReferralStats();
  }, [fetchReferralStats]);

  return {
    referralHistory,
    referralStats,
    formattedStats,
    loading: loading || (historyLoading && statsLoading),
    historyLoading,
    statsLoading,
    error,
    refetch,
    refetchHistory,
    refetchStats,
  };
}
