import axios from 'axios';
import { logger } from '../utils/logger.js';
import { MpesaTransaction } from '../models/MpesaTransaction.js';

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.baseUrl = process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.CALLBACK_BASE_URL}/api/mpesa/callback`;
    this.timeoutUrl = process.env.MPESA_TIMEOUT_URL || `${process.env.CALLBACK_BASE_URL}/api/mpesa/timeout`;

    // Exchange rate (configurable)
    this.usdToKesRate = parseFloat(process.env.USD_TO_KES_RATE || '149.25');
  }

  // Get OAuth token from M-Pesa
  async getAccessToken() {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.access_token;
    } catch (error) {
      logger.error('Failed to get M-Pesa access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa API');
    }
  }

  // Generate timestamp for M-Pesa API
  generateTimestamp() {
    const now = new Date();
    return now.getFullYear() +
           String(now.getMonth() + 1).padStart(2, '0') +
           String(now.getDate()).padStart(2, '0') +
           String(now.getHours()).padStart(2, '0') +
           String(now.getMinutes()).padStart(2, '0') +
           String(now.getSeconds()).padStart(2, '0');
  }

  // Generate password for STK Push
  generatePassword(timestamp) {
    const data = this.businessShortCode + this.passkey + timestamp;
    return Buffer.from(data).toString('base64');
  }

  // Convert USD to KES
  convertUsdToKes(usdAmount) {
    return Math.round(usdAmount * this.usdToKesRate);
  }

  // Initiate STK Push payment
  async initiateSTKPush(paymentData) {
    const { walletAddress, packageId, phoneNumber, amount, referrerAddress } = paymentData;
    
    try {
      // Convert amount to KES
      const kesAmount = this.convertUsdToKes(amount);
      
      // Validate minimum amount (KES 1)
      if (kesAmount < 1) {
        throw new Error('Amount too small for M-Pesa transaction');
      }

      // Get access token
      const accessToken = await this.getAccessToken();
      
      // Generate timestamp and password
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // Create transaction record
      const transaction = await MpesaTransaction.create({
        walletAddress,
        packageId,
        phoneNumber,
        amountUsd: amount,
        amountKes: kesAmount,
        referrerAddress,
        status: 'pending'
      });

      // Prepare STK Push request
      const stkPushData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: kesAmount,
        PartyA: phoneNumber,
        PartyB: this.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: this.callbackUrl,
        AccountReference: `PKG${packageId}-${transaction.id}`,
        TransactionDesc: `BlockCoop Package ${packageId} Purchase`
      };

      logger.info('Initiating STK Push:', {
        transactionId: transaction.id,
        amount: kesAmount,
        phoneNumber: phoneNumber.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1***$4')
      });

      // Send STK Push request
      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, stkPushData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Update transaction with checkout request ID
      await transaction.update({
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID
      });

      logger.info('STK Push initiated successfully:', {
        transactionId: transaction.id,
        checkoutRequestId: response.data.CheckoutRequestID
      });

      return {
        success: true,
        transactionId: transaction.id,
        checkoutRequestId: response.data.CheckoutRequestID,
        message: 'Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.',
        amount: {
          usd: amount,
          kes: kesAmount
        }
      };

    } catch (error) {
      logger.error('STK Push failed:', error.response?.data || error.message);
      
      // Return appropriate error message
      if (error.response?.data?.errorMessage) {
        throw new Error(error.response.data.errorMessage);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to initiate M-Pesa payment');
      }
    }
  }

  // Query STK Push status
  async querySTKPushStatus(checkoutRequestId) {
    try {
      const transaction = await MpesaTransaction.findOne({
        where: { checkoutRequestId }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get access token
      const accessToken = await this.getAccessToken();
      
      // Generate timestamp and password
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      // Prepare query request
      const queryData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      // Send query request
      const response = await axios.post(`${this.baseUrl}/mpesa/stkpushquery/v1/query`, queryData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Update transaction status based on response
      let status = 'pending';
      if (response.data.ResultCode === '0') {
        status = 'completed';
      } else if (response.data.ResultCode !== '1032') { // 1032 means still pending
        status = 'failed';
      }

      await transaction.update({
        status,
        mpesaReceiptNumber: response.data.MpesaReceiptNumber || null,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc
      });

      return {
        success: true,
        transaction: {
          id: transaction.id,
          status: transaction.status,
          amount: {
            usd: transaction.amountUsd,
            kes: transaction.amountKes
          },
          phoneNumber: transaction.phoneNumber,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber,
          createdAt: transaction.createdAt
        },
        mpesaStatus: {
          resultCode: response.data.ResultCode,
          resultDesc: response.data.ResultDesc
        }
      };

    } catch (error) {
      logger.error('STK Push query failed:', error.response?.data || error.message);
      throw new Error('Failed to query payment status');
    }
  }
}

export default new MpesaService();
