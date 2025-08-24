import { jest } from '@jest/globals';

// Mock responses for different test scenarios
const MOCK_RESPONSES = {
  // Successful authentication
  auth_success: {
    access_token: 'mock_access_token_12345',
    expires_in: '3599'
  },

  // Successful STK Push
  stk_success: {
    MerchantRequestID: 'mock_merchant_123456789',
    CheckoutRequestID: 'ws_CO_mock_123456789',
    ResponseCode: '0',
    ResponseDescription: 'Success. Request accepted for processing',
    CustomerMessage: 'Success. Request accepted for processing'
  },

  // STK Push failure - insufficient funds
  stk_insufficient_funds: {
    MerchantRequestID: 'mock_merchant_123456789',
    CheckoutRequestID: 'ws_CO_mock_123456789',
    ResponseCode: '1',
    ResponseDescription: 'Insufficient funds',
    CustomerMessage: 'Insufficient funds'
  },

  // STK Push failure - invalid phone number
  stk_invalid_phone: {
    errorCode: '400.002.02',
    errorMessage: 'Bad Request - Invalid PhoneNumber'
  },

  // Successful callback - payment completed
  callback_success: {
    Body: {
      stkCallback: {
        MerchantRequestID: 'mock_merchant_123456789',
        CheckoutRequestID: 'ws_CO_mock_123456789',
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            {
              Name: 'Amount',
              Value: 14925
            },
            {
              Name: 'MpesaReceiptNumber',
              Value: 'QHX12345TEST'
            },
            {
              Name: 'TransactionDate',
              Value: 20241217120000
            },
            {
              Name: 'PhoneNumber',
              Value: 254708374149
            }
          ]
        }
      }
    }
  },

  // Failed callback - user cancelled
  callback_cancelled: {
    Body: {
      stkCallback: {
        MerchantRequestID: 'mock_merchant_123456789',
        CheckoutRequestID: 'ws_CO_mock_123456789',
        ResultCode: 1032,
        ResultDesc: 'Request cancelled by user'
      }
    }
  },

  // Failed callback - insufficient funds
  callback_insufficient_funds: {
    Body: {
      stkCallback: {
        MerchantRequestID: 'mock_merchant_123456789',
        CheckoutRequestID: 'ws_CO_mock_123456789',
        ResultCode: 1,
        ResultDesc: 'Insufficient funds in account'
      }
    }
  },

  // STK Query success
  query_success: {
    ResponseCode: '0',
    ResponseDescription: 'The service request has been accepted successfully',
    MerchantRequestID: 'mock_merchant_123456789',
    CheckoutRequestID: 'ws_CO_mock_123456789',
    ResultCode: '0',
    ResultDesc: 'The service request is processed successfully.'
  },

  // STK Query pending
  query_pending: {
    ResponseCode: '0',
    ResponseDescription: 'The service request has been accepted successfully',
    MerchantRequestID: 'mock_merchant_123456789',
    CheckoutRequestID: 'ws_CO_mock_123456789',
    ResultCode: '1037',
    ResultDesc: 'DS timeout user cannot be reached'
  }
};

class MpesaMockService {
  constructor() {
    this.mockAxios = null;
    this.setupMocks();
  }

  setupMocks() {
    // Mock axios for HTTP requests
    this.mockAxios = {
      post: jest.fn(),
      get: jest.fn(),
      defaults: {
        headers: {
          common: {}
        }
      }
    };
  }

  // Configure mock responses based on test scenario
  configureMockScenario(scenario, phoneNumber = null) {
    switch (scenario) {
      case 'success':
        this.mockSuccessScenario(phoneNumber);
        break;
      case 'insufficient_funds':
        this.mockInsufficientFundsScenario(phoneNumber);
        break;
      case 'invalid_phone':
        this.mockInvalidPhoneScenario();
        break;
      case 'timeout':
        this.mockTimeoutScenario();
        break;
      case 'user_cancelled':
        this.mockUserCancelledScenario();
        break;
      case 'network_error':
        this.mockNetworkErrorScenario();
        break;
      default:
        this.mockSuccessScenario(phoneNumber);
    }
  }

  mockSuccessScenario(phoneNumber) {
    this.mockAxios.post
      // Auth endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.auth_success })
      )
      // STK Push endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.stk_success })
      );
  }

  mockInsufficientFundsScenario(phoneNumber) {
    this.mockAxios.post
      // Auth endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.auth_success })
      )
      // STK Push endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.stk_insufficient_funds })
      );
  }

  mockInvalidPhoneScenario() {
    this.mockAxios.post
      // Auth endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.auth_success })
      )
      // STK Push endpoint
      .mockImplementationOnce(() => 
        Promise.reject({ 
          response: { 
            status: 400, 
            data: MOCK_RESPONSES.stk_invalid_phone 
          } 
        })
      );
  }

  mockTimeoutScenario() {
    this.mockAxios.post
      // Auth endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.auth_success })
      )
      // STK Push endpoint - simulate timeout
      .mockImplementationOnce(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 1000);
        })
      );
  }

  mockUserCancelledScenario() {
    this.mockAxios.post
      // Auth endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.auth_success })
      )
      // STK Push endpoint
      .mockImplementationOnce(() => 
        Promise.resolve({ data: MOCK_RESPONSES.stk_success })
      );
  }

  mockNetworkErrorScenario() {
    this.mockAxios.post
      // Auth endpoint - network error
      .mockImplementationOnce(() => 
        Promise.reject(new Error('Network Error'))
      );
  }

  // Generate mock callback data
  generateCallbackData(scenario, checkoutRequestId, merchantRequestId) {
    const baseCallback = {
      ...MOCK_RESPONSES[`callback_${scenario}`]
    };

    if (baseCallback.Body && baseCallback.Body.stkCallback) {
      baseCallback.Body.stkCallback.CheckoutRequestID = checkoutRequestId;
      baseCallback.Body.stkCallback.MerchantRequestID = merchantRequestId;
    }

    return baseCallback;
  }

  // Reset all mocks
  resetMocks() {
    if (this.mockAxios) {
      this.mockAxios.post.mockReset();
      this.mockAxios.get.mockReset();
    }
  }

  // Get mock axios instance
  getMockAxios() {
    return this.mockAxios;
  }

  // Simulate M-Pesa service delays
  addDelay(ms = 1000) {
    const originalPost = this.mockAxios.post;
    this.mockAxios.post = jest.fn((...args) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(originalPost(...args));
        }, ms);
      });
    });
  }

  // Get predefined responses for direct use
  getResponses() {
    return MOCK_RESPONSES;
  }
}

export default MpesaMockService;
