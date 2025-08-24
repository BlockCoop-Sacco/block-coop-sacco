import dotenv from 'dotenv';

dotenv.config();

export const mpesaConfig = {
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '174379',
  passkey: process.env.MPESA_PASSKEY,
  initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
  
  // API URLs
  baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
  authUrl: process.env.MPESA_AUTH_URL || 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
  stkPushUrl: process.env.MPESA_STK_PUSH_URL || 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
  stkQueryUrl: process.env.MPESA_STK_QUERY_URL || 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
  
  // Callback URLs
  callbackBaseUrl: process.env.CALLBACK_BASE_URL,
  callbackUrl: process.env.MPESA_CALLBACK_URL,
  timeoutUrl: process.env.MPESA_TIMEOUT_URL,
  
  // Transaction settings
  transactionType: 'CustomerPayBillOnline',
  accountReference: 'BlockCoop USDT Package',
  transactionDesc: 'USDT Package Purchase'
};

// Validation
const requiredFields = [
  'consumerKey',
  'consumerSecret',
  'passkey'
];

const missingFields = requiredFields.filter(field => !mpesaConfig[field]);

if (missingFields.length > 0) {
  throw new Error(`Missing required M-Pesa configuration: ${missingFields.join(', ')}`);
}

export default mpesaConfig;
