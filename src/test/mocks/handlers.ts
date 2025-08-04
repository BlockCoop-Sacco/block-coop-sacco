import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3001/api'

export const handlers = [
  // M-Pesa payment initiation
  http.post(`${API_BASE_URL}/mpesa/initiate-payment`, async ({ request }) => {
    const body = await request.json() as any
    
    // Simulate different scenarios based on phone number
    const { phoneNumber, amount, walletAddress, packageId } = body
    
    // Validation errors
    if (!phoneNumber || !phoneNumber.match(/^254[0-9]{9}$/)) {
      return HttpResponse.json({
        success: false,
        error: 'Invalid phone number format'
      }, { status: 400 })
    }
    
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return HttpResponse.json({
        success: false,
        error: 'Invalid wallet address'
      }, { status: 400 })
    }
    
    if (!amount || amount < 1) {
      return HttpResponse.json({
        success: false,
        error: 'Invalid amount'
      }, { status: 400 })
    }
    
    // Test scenarios based on phone number
    switch (phoneNumber) {
      case '254708374150': // Insufficient funds
        return HttpResponse.json({
          success: false,
          error: 'Insufficient funds in M-Pesa account'
        }, { status: 400 })
        
      case '254708374151': // Invalid PIN
        return HttpResponse.json({
          success: false,
          error: 'Invalid M-Pesa PIN'
        }, { status: 400 })
        
      case '254708374152': // Timeout
        await new Promise(resolve => setTimeout(resolve, 6000))
        return HttpResponse.json({
          success: false,
          error: 'Request timeout'
        }, { status: 408 })
        
      case '254708374153': // User cancelled
        return HttpResponse.json({
          success: false,
          error: 'Transaction cancelled by user'
        }, { status: 400 })
        
      default: // Success case
        return HttpResponse.json({
          success: true,
          transactionId: `tx_${Date.now()}`,
          checkoutRequestId: `ws_CO_${Date.now()}`,
          message: 'Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.',
          amount: {
            usd: amount,
            kes: Math.round(amount * 149.25)
          }
        })
    }
  }),
  
  // Transaction status check
  http.get(`${API_BASE_URL}/mpesa/transaction/:transactionId/status`, ({ params }) => {
    const { transactionId } = params
    
    // Simulate different transaction statuses
    if (transactionId === 'tx_completed') {
      return HttpResponse.json({
        success: true,
        transaction: {
          id: transactionId,
          status: 'completed',
          amount: { usd: 100, kes: 14925 },
          phoneNumber: '254708374149',
          mpesaReceiptNumber: 'QHX12345TEST',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }
    
    if (transactionId === 'tx_failed') {
      return HttpResponse.json({
        success: true,
        transaction: {
          id: transactionId,
          status: 'failed',
          amount: { usd: 100, kes: 14925 },
          phoneNumber: '254708374149',
          errorMessage: 'Transaction failed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }
    
    // Default pending status
    return HttpResponse.json({
      success: true,
      transaction: {
        id: transactionId,
        status: 'pending',
        amount: { usd: 100, kes: 14925 },
        phoneNumber: '254708374149',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })
  }),
  
  // Transaction history
  http.get(`${API_BASE_URL}/mpesa/transactions`, ({ request }) => {
    const url = new URL(request.url)
    const walletAddress = url.searchParams.get('walletAddress')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    if (!walletAddress) {
      return HttpResponse.json({
        success: false,
        error: 'Wallet address is required'
      }, { status: 400 })
    }
    
    // Mock transaction history
    const mockTransactions = Array.from({ length: 5 }, (_, i) => ({
      id: `tx_${i + 1}`,
      status: i === 0 ? 'completed' : i === 1 ? 'pending' : 'completed',
      amount: { usd: 100 + (i * 50), kes: (100 + (i * 50)) * 149.25 },
      phoneNumber: '254708374149',
      packageId: (i % 3) + 1,
      mpesaReceiptNumber: i < 2 ? null : `QHX${12345 + i}`,
      createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      updatedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
    }))
    
    const paginatedTransactions = mockTransactions.slice(offset, offset + limit)
    
    return HttpResponse.json({
      success: true,
      transactions: paginatedTransactions,
      pagination: {
        total: mockTransactions.length,
        limit,
        offset,
        hasMore: offset + limit < mockTransactions.length
      }
    })
  }),
  
  // Package information
  http.get(`${API_BASE_URL}/packages`, () => {
    return HttpResponse.json({
      success: true,
      packages: [
        {
          id: 1,
          name: 'Starter Package',
          usdtAmount: 100,
          price: 100,
          description: 'Perfect for beginners',
          features: ['Feature 1', 'Feature 2'],
          isActive: true
        },
        {
          id: 2,
          name: 'Professional Package',
          usdtAmount: 500,
          price: 500,
          description: 'For serious investors',
          features: ['Feature 1', 'Feature 2', 'Feature 3'],
          isActive: true
        },
        {
          id: 3,
          name: 'Enterprise Package',
          usdtAmount: 1000,
          price: 1000,
          description: 'Maximum benefits',
          features: ['All features included'],
          isActive: true
        }
      ]
    })
  }),
  
  // Rate limiting test endpoint
  http.post(`${API_BASE_URL}/test/rate-limit`, () => {
    return HttpResponse.json({
      success: true,
      message: 'Rate limit test endpoint'
    })
  }),
  
  // Error simulation endpoint
  http.post(`${API_BASE_URL}/test/error`, () => {
    return HttpResponse.json({
      success: false,
      error: 'Simulated server error'
    }, { status: 500 })
  }),
  
  // Network error simulation
  http.post(`${API_BASE_URL}/test/network-error`, () => {
    return HttpResponse.error()
  })
]
