import { ethers } from 'ethers';
import clsx, { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatEther(value: bigint | string, decimals = 4): string {
  try {
    const formatted = ethers.formatEther(value);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  } catch {
    return '0';
  }
}

// Get USDT decimals from environment configuration
function getUSDTDecimals(): number {
  // Check environment variable first
  const envDecimals = import.meta.env?.VITE_USDT_DECIMALS;
  if (envDecimals) {
    const decimals = parseInt(envDecimals);
    if (!isNaN(decimals) && decimals > 0) {
      return decimals;
    }
  }

  // Default to 18 decimals for V2 architecture
  return 18;
}

export function formatUSDT(value: bigint | string): string {
  try {
    const bigintValue = typeof value === 'string' ? BigInt(value) : value;

    // Use consistent USDT decimals from environment configuration
    const decimals = getUSDTDecimals();

    const formatted = ethers.formatUnits(bigintValue, decimals);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return '0';
  }
}

function getExchangeRateDecimals(): number {
  // Exchange rate is stored as USDT per BLOCKS in 18 decimals
  // For example: 2.0 USDT per BLOCKS = 2000000000000000000 (18 decimals)
  const envDecimals = import.meta.env?.VITE_EXCHANGE_RATE_DECIMALS;
  if (envDecimals) {
    const d = parseInt(envDecimals);
    if (!isNaN(d)) return d;
  }
  return 18; // Default to 18 decimals for V2 architecture
}

export function formatExchangeRate(value: bigint | string): string {
  try {
    const bigintValue = typeof value === 'string' ? BigInt(value) : value;
    
    // Simple approach: divide by 10^18 and format
    const decimalValue = Number(bigintValue) / 1e18;
    
    return decimalValue.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    console.error('formatExchangeRate error:', error);
    return '0';
  }
}


export function formatBLOCKS(value: bigint | string): string {
  try {
    const bigintValue = typeof value === 'string' ? BigInt(value) : value;
    // BLOCKS tokens always use 18 decimals
    const formatted = ethers.formatUnits(bigintValue, 18);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    });
  } catch {
    return '0';
  }
}

export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDuration(seconds: number): string {
  const years = Math.floor(seconds / (365 * 24 * 3600));
  const months = Math.floor((seconds % (365 * 24 * 3600)) / (30 * 24 * 3600));
  
  if (years > 0) {
    return months > 0 ? `${years}y ${months}m` : `${years}y`;
  }
  return months > 0 ? `${months}m` : '< 1m';
}

export function formatPercentage(bps: number): string {
  return `${(bps / 10000 * 100).toFixed(1)}%`;
}

export function parseEther(value: string): bigint {
  try {
    return ethers.parseEther(value || '0');
  } catch {
    return 0n;
  }
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Additional numeric formatters for UI metrics
export function formatPercentValue(value: number, decimals = 2): string {
  if (!isFinite(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

export function formatCurrencyNumber(value: number, decimals = 2): string {
  if (!isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}