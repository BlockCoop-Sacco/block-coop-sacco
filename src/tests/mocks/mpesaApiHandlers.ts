import { http, HttpResponse } from 'msw';

// Mock data generators
export const createMockTransaction = (overrides: any = {}) => ({
  id: 'test-transaction-123',
  userWalletAddress: '0x1234567890123456789012345678901234567890',
  packageId: 1,
  phoneNumber: '254712345678',
  amount: 100,
  kesAmount: 14925,
  status: 'pending',
  checkoutRequestId: 'ws_CO_123456789',
  merchantRequestId: 'merchant_123456789',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

export const createMockMpesaResponse = (overrides: any = {}) => ({
  success: true,
  transactionId: 'test-transaction-123',
  checkoutRequestId: 'ws_CO_123456789',
  message: 'Payment request sent to your phone',
  amount: {
    usd: 100,
    kes: 14925
  },
  ...overrides
});

export const createMockStatusResponse = (status: string = 'pending', overrides: any = {}) => ({
  success: true,
  transaction: createMockTransaction({ status }),
  mpesaStatus: status === 'completed' ? {
    resultCode: '0',
    resultDesc: 'Success'
  } : status === 'failed' ? {
    resultCode: '1032',
    resultDesc: 'Request cancelled by user'
  } : null,
  ...overrides
});

// API handlers for different scenarios
export const mpesaApiHandlers = {
  // Successful payment flow
  successfulPayment: [
    http.post('/api/mpesa/initiate-payment', () => {
      return HttpResponse.json(createMockMpesaResponse());
    }),

    http.get('/api/mpesa/status/:checkoutRequestId', () => {
      return HttpResponse.json(createMockStatusResponse('completed'));
    }),

    http.get('/api/mpesa/transactions/:walletAddress', () => {
      return HttpResponse.json({
        success: true,
        transactions: [createMockTransaction({ status: 'completed' })],
        stats: {
          totalTransactions: 1,
          completedTransactions: 1,
          failedTransactions: 0,
          pendingTransactions: 0,
          totalAmountUsd: 100,
          totalAmountKes: 14925
        }
      });
    })
  ],

  // Failed payment initiation
  failedInitiation: [
    http.post('/api/mpesa/initiate-payment', () => {
      return HttpResponse.json({
        success: false,
        error: 'Insufficient funds in M-Pesa account'
      }, { status: 400 });
    })
  ],

  // Payment timeout scenario
  paymentTimeout: [
    http.post('/api/mpesa/initiate-payment', () => {
      return HttpResponse.json(createMockMpesaResponse());
    }),

    http.get('/api/mpesa/status/:checkoutRequestId', () => {
      return HttpResponse.json(createMockStatusResponse('failed', {
        mpesaStatus: {
          resultCode: '1037',
          resultDesc: 'DS timeout user cannot be reached'
        }
      }));
    })
  ],

  // User cancellation scenario
  userCancellation: [
    http.post('/api/mpesa/initiate-payment', () => {
      return HttpResponse.json(createMockMpesaResponse());
    }),

    http.get('/api/mpesa/status/:checkoutRequestId', () => {
      return HttpResponse.json(createMockStatusResponse('failed', {
        mpesaStatus: {
          resultCode: '1032',
          resultDesc: 'Request cancelled by user'
        }
      }));
    })
  ],

  // Network error scenario
  networkError: [
    http.post('/api/mpesa/initiate-payment', () => {
      return HttpResponse.error();
    }),

    http.get('/api/mpesa/status/:checkoutRequestId', () => {
      return HttpResponse.error();
    })
  ],

  // Progressive status updates (pending -> completed)
  progressiveStatus: (() => {
    let callCount = 0;
    
    return [
      http.post('/api/mpesa/initiate-payment', () => {
        callCount = 0; // Reset counter for new payment
        return HttpResponse.json(createMockMpesaResponse());
      }),

      http.get('/api/mpesa/status/:checkoutRequestId', () => {
        callCount++;
        
        if (callCount <= 3) {
          // First few calls return pending
          return HttpResponse.json(createMockStatusResponse('pending'));
        } else {
          // Later calls return completed
          return HttpResponse.json(createMockStatusResponse('completed'));
        }
      })
    ];
  })(),

  // Rate limiting scenario
  rateLimited: [
    http.post('/api/mpesa/initiate-payment', () => {
      return HttpResponse.json({
        success: false,
        error: 'Too many requests. Please try again later.'
      }, { status: 429 });
    })
  ],

  // Invalid input validation
  invalidInput: [
    http.post('/api/mpesa/initiate-payment', async ({ request }) => {
      const body = await request.json() as any;
      
      if (!body.phoneNumber || !body.phoneNumber.match(/^254[0-9]{9}$/)) {
        return HttpResponse.json({
          success: false,
          error: 'Invalid phone number format'
        }, { status: 400 });
      }
      
      if (!body.walletAddress || !body.walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return HttpResponse.json({
          success: false,
          error: 'Invalid wallet address format'
        }, { status: 400 });
      }
      
      if (!body.amount || body.amount <= 0) {
        return HttpResponse.json({
          success: false,
          error: 'Amount must be greater than 0'
        }, { status: 400 });
      }
      
      return HttpResponse.json(createMockMpesaResponse());
    })
  ],

  // Server error scenario
  serverError: [
    http.post('/api/mpesa/initiate-payment', () => {
      return HttpResponse.json({
        success: false,
        error: 'Internal server error'
      }, { status: 500 });
    })
  ],

  // Slow response scenario (for performance testing)
  slowResponse: [
    http.post('/api/mpesa/initiate-payment', async () => {
      // Simulate slow response
      await new Promise(resolve => setTimeout(resolve, 3000));
      return HttpResponse.json(createMockMpesaResponse());
    }),

    http.get('/api/mpesa/status/:checkoutRequestId', async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return HttpResponse.json(createMockStatusResponse('completed'));
    })
  ],

  // Transaction history with pagination
  transactionHistory: [
    http.get('/api/mpesa/transactions/:walletAddress', ({ request }) => {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      
      const allTransactions = Array.from({ length: 25 }, (_, i) => 
        createMockTransaction({
          id: `transaction-${i + 1}`,
          status: i % 3 === 0 ? 'failed' : 'completed',
          amount: (i + 1) * 10,
          kesAmount: (i + 1) * 10 * 149.25,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
        })
      );
      
      const paginatedTransactions = allTransactions.slice(offset, offset + limit);
      
      return HttpResponse.json({
        success: true,
        transactions: paginatedTransactions,
        stats: {
          totalTransactions: allTransactions.length,
          completedTransactions: allTransactions.filter(t => t.status === 'completed').length,
          failedTransactions: allTransactions.filter(t => t.status === 'failed').length,
          pendingTransactions: allTransactions.filter(t => t.status === 'pending').length,
          totalAmountUsd: allTransactions.reduce((sum, t) => sum + t.amount, 0),
          totalAmountKes: allTransactions.reduce((sum, t) => sum + t.kesAmount, 0)
        },
        pagination: {
          limit,
          offset,
          total: allTransactions.length,
          hasMore: offset + limit < allTransactions.length
        }
      });
    })
  ],

  // Health check endpoint
  healthCheck: [
    http.get('/api/health', () => {
      return HttpResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          mpesa: 'connected'
        }
      });
    })
  ]
};

// Default handlers for normal operation
export const defaultHandlers = [
  ...mpesaApiHandlers.successfulPayment,
  ...mpesaApiHandlers.transactionHistory,
  ...mpesaApiHandlers.healthCheck
];

// Export individual scenario handlers for specific tests
export const scenarioHandlers = {
  success: mpesaApiHandlers.successfulPayment,
  failedInitiation: mpesaApiHandlers.failedInitiation,
  timeout: mpesaApiHandlers.paymentTimeout,
  userCancel: mpesaApiHandlers.userCancellation,
  networkError: mpesaApiHandlers.networkError,
  progressive: mpesaApiHandlers.progressiveStatus,
  rateLimited: mpesaApiHandlers.rateLimited,
  invalidInput: mpesaApiHandlers.invalidInput,
  serverError: mpesaApiHandlers.serverError,
  slowResponse: mpesaApiHandlers.slowResponse
};
