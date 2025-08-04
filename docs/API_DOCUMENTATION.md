# M-Pesa Payment Integration API Documentation

## Overview

The M-Pesa Payment Integration API provides endpoints for processing mobile money payments through Safaricom's M-Pesa service. This API bridges M-Pesa payments with blockchain USDT package purchases for the BlockCoop Sacco project.

## Base URL

- **Development**: `http://localhost:3001/api`
- **Production**: `https://your-domain.com/api`

## Authentication

Most endpoints require API key authentication for administrative operations:

```http
x-api-key: your_api_key_here
```

## Rate Limiting

- **General endpoints**: 100 requests per 15 minutes
- **Payment initiation**: 3 requests per minute per IP
- **Status queries**: 10 requests per 30 seconds per IP
- **Transaction history**: 5 requests per minute per IP

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message",
  "errorType": "ERROR_TYPE",
  "recoverable": true,
  "retryAfter": 60
}
```

### Error Types

- `NETWORK_ERROR`: Network connectivity issues
- `TIMEOUT_ERROR`: Request timeout
- `VALIDATION_ERROR`: Invalid input data
- `MPESA_API_ERROR`: M-Pesa service error
- `BLOCKCHAIN_ERROR`: Blockchain transaction error
- `INSUFFICIENT_FUNDS`: Insufficient M-Pesa balance
- `USER_CANCELLED`: Payment cancelled by user
- `SYSTEM_ERROR`: Internal server error

## Endpoints

### 1. Initiate M-Pesa Payment

Initiates an M-Pesa STK Push payment request.

**Endpoint**: `POST /mpesa/initiate-payment`

**Request Body**:
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "packageId": 1,
  "phoneNumber": "254712345678",
  "amount": 100.00,
  "referrerAddress": "0xabcdef..." // Optional
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": "uuid-transaction-id",
  "checkoutRequestId": "ws_CO_123456789",
  "message": "Payment request sent to your phone. Please enter your M-Pesa PIN to complete the transaction.",
  "amount": {
    "usd": 100.00,
    "kes": 14925
  }
}
```

**Validation Rules**:
- `walletAddress`: Valid Ethereum address (0x + 40 hex characters)
- `packageId`: Positive integer
- `phoneNumber`: Kenyan format (254XXXXXXXXX)
- `amount`: Positive number, minimum KES 1 equivalent

### 2. Query Payment Status

Queries the current status of an M-Pesa payment.

**Endpoint**: `GET /mpesa/status/:checkoutRequestId`

**Response**:
```json
{
  "success": true,
  "transaction": {
    "id": "uuid-transaction-id",
    "status": "completed",
    "amount": {
      "usd": 100.00,
      "kes": 14925
    },
    "phoneNumber": "254712345678",
    "createdAt": "2023-12-01T12:00:00Z"
  },
  "mpesaStatus": {
    "resultCode": "0",
    "resultDesc": "The service request is processed successfully."
  }
}
```

**Transaction Status Values**:
- `pending`: Payment request sent, awaiting user action
- `completed`: Payment successful
- `failed`: Payment failed
- `cancelled`: Payment cancelled by user
- `timeout`: Payment request timed out

### 3. Get Transaction History

Retrieves M-Pesa transaction history for a wallet address.

**Endpoint**: `GET /mpesa/transactions/:walletAddress`

**Query Parameters**:
- `limit`: Number of transactions to return (default: 50, max: 100)
- `offset`: Number of transactions to skip (default: 0)

**Response**:
```json
{
  "success": true,
  "transactions": [
    {
      "id": "uuid-transaction-id",
      "packageId": 1,
      "amount": {
        "usd": 100.00,
        "kes": 14925
      },
      "phoneNumber": "254712345678",
      "status": "completed",
      "mpesaReceiptNumber": "NLJ7RT61SV",
      "transactionDate": "2023-12-01T12:00:00Z",
      "createdAt": "2023-12-01T11:55:00Z"
    }
  ],
  "stats": {
    "totalTransactions": 10,
    "completedTransactions": 8,
    "failedTransactions": 1,
    "pendingTransactions": 1,
    "totalAmountUsd": 1000.00,
    "totalAmountKes": 149250
  }
}
```

### 4. M-Pesa Callback (Internal)

Handles M-Pesa payment callbacks. This endpoint is called by Safaricom's servers.

**Endpoint**: `POST /mpesa/callback/:transactionId`

**Request Body** (from M-Pesa):
```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "merchant_123456789",
      "CheckoutRequestID": "ws_CO_123456789",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          {"Name": "Amount", "Value": 1000},
          {"Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV"},
          {"Name": "TransactionDate", "Value": 20231201120000},
          {"Name": "PhoneNumber", "Value": 254712345678}
        ]
      }
    }
  }
}
```

**Response**:
```json
{
  "ResultCode": 0,
  "ResultDesc": "Success"
}
```

### 5. Complete Purchase (Bridge)

Completes the blockchain transaction after successful M-Pesa payment.

**Endpoint**: `POST /bridge/complete-purchase`

**Request Body**:
```json
{
  "transactionId": "uuid-transaction-id"
}
```

**Response**:
```json
{
  "success": true,
  "transactionId": "uuid-transaction-id",
  "txHash": "0xabcdef1234567890...",
  "gasUsed": "21000",
  "blockNumber": 12345
}
```

### 6. Get Bridge Status

Gets the status of both M-Pesa payment and blockchain transaction.

**Endpoint**: `GET /bridge/status/:transactionId`

**Response**:
```json
{
  "success": true,
  "mpesaStatus": "completed",
  "blockchainStatus": "completed",
  "blockchainTxHash": "0xabcdef1234567890...",
  "createdAt": "2023-12-01T11:55:00Z",
  "updatedAt": "2023-12-01T12:05:00Z"
}
```

## Recovery Endpoints (Admin Only)

### 7. Manual Recovery

Manually recover a stuck transaction.

**Endpoint**: `POST /recovery/manual/:transactionId`

**Headers**: `x-api-key: your_api_key`

**Request Body**:
```json
{
  "action": "retry_mpesa_query"
}
```

**Available Actions**:
- `retry_mpesa_query`: Query M-Pesa for current status
- `retry_blockchain`: Retry blockchain transaction
- `mark_failed`: Mark transaction as failed
- `force_complete`: Force mark as completed

### 8. Recovery Statistics

Get recovery queue statistics.

**Endpoint**: `GET /recovery/stats`

**Headers**: `x-api-key: your_api_key`

**Response**:
```json
{
  "success": true,
  "stats": {
    "queueSize": 5,
    "isProcessing": false,
    "queueItems": [
      {
        "transactionId": "uuid-transaction-id",
        "priority": "high",
        "attempts": 2,
        "addedAt": "2023-12-01T12:00:00Z"
      }
    ]
  }
}
```

## Webhook Configuration

For production deployment, configure the following webhook URLs in your M-Pesa app:

- **Callback URL**: `https://your-domain.com/api/mpesa/callback/{TransactionID}`
- **Timeout URL**: `https://your-domain.com/api/mpesa/timeout/{TransactionID}`

Replace `{TransactionID}` with the actual transaction ID for each payment request.

## Currency Conversion

The API automatically converts between USD and KES using configurable exchange rates:

- **Default USD to KES**: 149.25
- **Default KES to USD**: 0.0067

These rates should be updated regularly or fetched from a live exchange rate API.

## Security Considerations

1. **IP Whitelisting**: M-Pesa callbacks should only be accepted from Safaricom's IP addresses
2. **HTTPS Only**: All production endpoints must use HTTPS
3. **API Key Protection**: Store API keys securely and rotate regularly
4. **Input Validation**: All inputs are validated and sanitized
5. **Rate Limiting**: Prevents abuse and ensures service availability
6. **Fraud Detection**: Built-in fraud detection for suspicious patterns

## Testing

Use the M-Pesa sandbox environment for testing:

- **Sandbox Base URL**: `https://sandbox.safaricom.co.ke`
- **Test Phone Number**: `254708374149`
- **Test Amounts**: Use small amounts (1-1000 KES) for testing

See the testing documentation for detailed testing procedures.
