import axios from 'axios';
import { mpesaConfig } from '../config/mpesa.js';
import logger from '../config/logger.js';

class MpesaService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Generate timestamp in the format required by M-Pesa
  generateTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  // Generate password for M-Pesa API
  generatePassword(timestamp) {
    const data = `${mpesaConfig.businessShortCode}${mpesaConfig.passkey}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  // Get access token from M-Pesa API
  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`).toString('base64');
      
      const response = await axios.get(mpesaConfig.authUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Token expires in 1 hour, set expiry to 55 minutes to be safe
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
        
        logger.info('M-Pesa access token generated successfully');
        return this.accessToken;
      } else {
        throw new Error('Failed to get access token from M-Pesa API');
      }
    } catch (error) {
      logger.error('Error generating M-Pesa access token:', error);
      throw new Error(`Failed to authenticate with M-Pesa: ${error.message}`);
    }
  }

  // Initiate STK Push
  async initiateSTKPush(phoneNumber, amount, accountReference, transactionDesc, callbackUrl) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const requestBody = {
        BusinessShortCode: mpesaConfig.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: mpesaConfig.transactionType,
        Amount: Math.round(amount), // M-Pesa requires integer amounts
        PartyA: phoneNumber,
        PartyB: mpesaConfig.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      };

      logger.info('Initiating STK Push', {
        phoneNumber,
        amount,
        accountReference,
        businessShortCode: mpesaConfig.businessShortCode
      });

      const response = await axios.post(mpesaConfig.stkPushUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.ResponseCode === '0') {
        logger.info('STK Push initiated successfully', {
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID
        });
        
        return {
          success: true,
          checkoutRequestId: response.data.CheckoutRequestID,
          merchantRequestId: response.data.MerchantRequestID,
          responseDescription: response.data.ResponseDescription
        };
      } else {
        logger.error('STK Push failed', response.data);
        return {
          success: false,
          error: response.data.ResponseDescription || 'STK Push failed',
          errorCode: response.data.ResponseCode
        };
      }
    } catch (error) {
      logger.error('Error initiating STK Push:', error);
      return {
        success: false,
        error: error.response?.data?.ResponseDescription || error.message || 'Failed to initiate payment'
      };
    }
  }

  // Query STK Push status
  async querySTKPush(checkoutRequestId) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const requestBody = {
        BusinessShortCode: mpesaConfig.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(mpesaConfig.stkQueryUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      logger.info('STK Push query response', {
        checkoutRequestId,
        responseCode: response.data.ResponseCode,
        resultCode: response.data.ResultCode
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('Error querying STK Push status:', error);
      return {
        success: false,
        error: error.response?.data?.ResponseDescription || error.message || 'Failed to query payment status'
      };
    }
  }

  // Parse M-Pesa callback data
  parseCallbackData(callbackBody) {
    try {
      const stkCallback = callbackBody.Body?.stkCallback;
      
      if (!stkCallback) {
        throw new Error('Invalid callback data structure');
      }

      const result = {
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc
      };

      // If payment was successful, extract metadata
      if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
        const metadata = stkCallback.CallbackMetadata.Item || [];

        // Handle both array and object formats
        const items = Array.isArray(metadata) ? metadata : Object.values(metadata);

        items.forEach(item => {
          switch (item.Name) {
            case 'Amount':
              result.amount = item.Value;
              break;
            case 'MpesaReceiptNumber':
              result.mpesaReceiptNumber = item.Value;
              break;
            case 'TransactionDate':
              result.transactionDate = item.Value;
              break;
            case 'PhoneNumber':
              result.phoneNumber = item.Value;
              break;
          }
        });
      }

      return result;
    } catch (error) {
      logger.error('Error parsing callback data:', error);
      throw new Error('Failed to parse M-Pesa callback data');
    }
  }
}

export default new MpesaService();
