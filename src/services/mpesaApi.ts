import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_MPESA_API_URL || 'https://api.blockcoopsacco.com/api';

// Types for M-Pesa API
export interface MpesaPaymentRequest {
  walletAddress: string;
  packageId: number;
  phoneNumber: string;
  amount: number;
  referrerAddress?: string;
}

export interface MpesaPaymentResponse {
  success: boolean;
  transactionId?: string;
  checkoutRequestId?: string;
  message?: string;
  amount?: {
    usd: number;
    kes: number;
  };
  error?: string;
}

export interface MpesaTransactionStatus {
  success: boolean;
  transaction?: {
    id: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'timeout';
    amount: {
      usd: number;
      kes: number;
    };
    phoneNumber: string;
    createdAt: string;
  };
  mpesaStatus?: {
    resultCode: string;
    resultDesc: string;
  };
  error?: string;
}

export interface MpesaTransactionHistory {
  success: boolean;
  transactions?: Array<{
    id: string;
    packageId: number;
    amount: {
      usd: number;
      kes: number;
    };
    phoneNumber: string;
    status: string;
    mpesaReceiptNumber?: string;
    transactionDate?: string;
    createdAt: string;
  }>;
  stats?: {
    totalTransactions: number;
    completedTransactions: number;
    failedTransactions: number;
    pendingTransactions: number;
    totalAmountUsd: number;
    totalAmountKes: number;
  };
  error?: string;
}

class MpesaApiService {
  private apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add request interceptor for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        console.log('M-Pesa API Request:', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        console.error('M-Pesa API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.apiClient.interceptors.response.use(
      (response) => {
        console.log('M-Pesa API Response:', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      (error) => {
        console.error('M-Pesa API Response Error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  // Initiate M-Pesa payment
  async initiatePayment(paymentData: MpesaPaymentRequest): Promise<MpesaPaymentResponse> {
    try {
      console.log('🚀 Sending M-Pesa payment request:', {
        url: `${API_BASE_URL}/mpesa/initiate-payment`,
        data: paymentData,
        dataTypes: {
          walletAddress: typeof paymentData.walletAddress,
          packageId: typeof paymentData.packageId,
          phoneNumber: typeof paymentData.phoneNumber,
          amount: typeof paymentData.amount,
          referrerAddress: typeof paymentData.referrerAddress
        }
      });

      const response = await this.apiClient.post('/mpesa/initiate-payment', paymentData);
      console.log('✅ M-Pesa payment response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error initiating M-Pesa payment:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      // Handle specific error types
      let errorMessage = 'Failed to initiate payment';

      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Unable to connect to M-Pesa service. Please check your internet connection and try again.';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'M-Pesa service is currently unavailable. Please try again later.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid payment details. Please check your information and try again.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many payment requests. Please wait a moment and try again.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'M-Pesa service is temporarily unavailable. Please try again in a few minutes.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Query payment status
  async queryPaymentStatus(checkoutRequestId: string): Promise<MpesaTransactionStatus> {
    try {
      const response = await this.apiClient.get(`/mpesa/status/${checkoutRequestId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error querying payment status:', error);

      // Handle specific error types
      let errorMessage = 'Failed to query payment status';

      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        errorMessage = 'Unable to connect to M-Pesa service. Please check your internet connection.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Payment transaction not found. Please check the transaction ID.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'M-Pesa service is temporarily unavailable. Please try again later.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Get transaction history
  async getTransactionHistory(
    walletAddress: string,
    limit = 50,
    offset = 0
  ): Promise<MpesaTransactionHistory> {
    try {
      const response = await this.apiClient.get(
        `/mpesa/transactions/${walletAddress}?limit=${limit}&offset=${offset}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error getting transaction history:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get transaction history',
      };
    }
  }

  // Validate phone number format
  validatePhoneNumber(phoneNumber: string): boolean {
    // Kenyan phone number format: 254XXXXXXXXX
    const phoneRegex = /^254[0-9]{9}$/;
    return phoneRegex.test(phoneNumber);
  }

  // Format phone number to M-Pesa format
  formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different input formats
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  // Convert USD to KES (approximate)
  convertUsdToKes(usdAmount: number): number {
    const USD_TO_KES_RATE = 149.25; // This should be fetched from an exchange rate API
    return Math.round(usdAmount * USD_TO_KES_RATE);
  }

  // Convert KES to USD (approximate)
  convertKesToUsd(kesAmount: number): number {
    const KES_TO_USD_RATE = 0.0067; // This should be fetched from an exchange rate API
    return parseFloat((kesAmount * KES_TO_USD_RATE).toFixed(4));
  }
}

export const mpesaApi = new MpesaApiService();
export default mpesaApi;
