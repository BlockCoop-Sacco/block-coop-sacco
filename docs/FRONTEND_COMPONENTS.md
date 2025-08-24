# Frontend M-Pesa Components Documentation

## Overview

This document describes the React components and hooks for M-Pesa payment integration in the BlockCoop Sacco frontend application.

## Components

### PaymentMethodSelector

A component that allows users to choose between different payment methods (Crypto Wallet vs M-Pesa).

**Location**: `src/components/payments/PaymentMethodSelector.tsx`

**Props**:
```typescript
interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod; // 'wallet' | 'mpesa'
  onMethodChange: (method: PaymentMethod) => void;
  packageAmount: number; // USD amount
  disabled?: boolean;
}
```

**Usage**:
```tsx
import { PaymentMethodSelector } from '../components/payments/PaymentMethodSelector';

function PurchaseModal() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
  
  return (
    <PaymentMethodSelector
      selectedMethod={paymentMethod}
      onMethodChange={setPaymentMethod}
      packageAmount={100}
      disabled={loading}
    />
  );
}
```

**Features**:
- Displays both payment options with icons and descriptions
- Shows amount in both USD and KES for M-Pesa
- Highlights recommended payment method
- Responsive design with hover effects
- Accessibility support

### MpesaPaymentForm

The main component for handling M-Pesa payments with phone number input, payment initiation, and status tracking.

**Location**: `src/components/payments/MpesaPaymentForm.tsx`

**Props**:
```typescript
interface MpesaPaymentFormProps {
  walletAddress: string;
  packageId: number;
  amount: number; // USD amount
  referrerAddress?: string;
  onSuccess: (transactionId: string) => void;
  onCancel: () => void;
}
```

**Usage**:
```tsx
import { MpesaPaymentForm } from '../components/payments/MpesaPaymentForm';

function PaymentModal() {
  const { account } = useWeb3();
  
  const handleSuccess = (transactionId: string) => {
    console.log('Payment successful:', transactionId);
    // Handle success (close modal, show confirmation, etc.)
  };
  
  return (
    <MpesaPaymentForm
      walletAddress={account}
      packageId={1}
      amount={100}
      onSuccess={handleSuccess}
      onCancel={() => setShowPayment(false)}
    />
  );
}
```

**Features**:
- Phone number input with format validation
- Real-time phone number formatting (0712345678 → 254712345678)
- Payment amount display in USD and KES
- Multi-step payment flow (input → processing → waiting → completed/failed)
- Integration with PaymentStatusTracker for real-time updates
- Error handling with retry functionality
- Loading states and user feedback

**Payment Flow States**:
1. **Input**: User enters phone number
2. **Processing**: Initiating payment request
3. **Waiting**: STK push sent, waiting for user to enter PIN
4. **Completed**: Payment successful
5. **Failed**: Payment failed with retry option

### PaymentStatusTracker

A component that displays real-time payment status with automatic refresh capabilities.

**Location**: `src/components/payments/PaymentStatusTracker.tsx`

**Props**:
```typescript
interface PaymentStatusTrackerProps {
  transactionId?: string;
  checkoutRequestId?: string;
  onStatusChange?: (status: PaymentStatus) => void;
  autoRefresh?: boolean;
  refreshInterval?: number; // in seconds
}
```

**Usage**:
```tsx
import { PaymentStatusTracker } from '../components/payments/PaymentStatusTracker';

function PaymentMonitor() {
  return (
    <PaymentStatusTracker
      checkoutRequestId="ws_CO_123456789"
      onStatusChange={(status) => {
        if (status === 'completed') {
          // Handle completion
        }
      }}
      autoRefresh={true}
      refreshInterval={5}
    />
  );
}
```

**Features**:
- Real-time status updates with configurable refresh intervals
- Visual status indicators with icons and colors
- Transaction details display (amount, phone number, receipt)
- M-Pesa receipt information for completed payments
- User-friendly status messages and instructions
- Manual refresh capability
- Error handling and retry functionality

### TransactionHistory

A component that displays M-Pesa transaction history with statistics and pagination.

**Location**: `src/components/payments/TransactionHistory.tsx`

**Props**:
```typescript
interface TransactionHistoryProps {
  limit?: number;
  showStats?: boolean;
  autoRefresh?: boolean;
}
```

**Usage**:
```tsx
import { TransactionHistory } from '../components/payments/TransactionHistory';

function PaymentDashboard() {
  return (
    <TransactionHistory
      limit={20}
      showStats={true}
      autoRefresh={false}
    />
  );
}
```

**Features**:
- Paginated transaction list with load more functionality
- Transaction statistics (total, completed, failed, amounts)
- Status indicators for each transaction
- M-Pesa receipt numbers for completed payments
- Responsive design for mobile and desktop
- Auto-refresh capability for real-time updates
- Empty state handling

## Hooks

### useMpesaPayment

A custom hook that manages M-Pesa payment state and operations.

**Location**: `src/hooks/useMpesaPayment.ts`

**Return Type**:
```typescript
interface MpesaPaymentHook {
  // State
  paymentState: MpesaPaymentState;
  
  // Actions
  initiatePayment: (paymentData: Omit<MpesaPaymentRequest, 'walletAddress'>) => Promise<boolean>;
  queryPaymentStatus: (checkoutRequestId: string) => Promise<MpesaTransactionStatus | null>;
  resetPayment: () => void;
  
  // Status tracking
  startStatusPolling: (checkoutRequestId: string) => void;
  stopStatusPolling: () => void;
}
```

**Usage**:
```tsx
import { useMpesaPayment } from '../hooks/useMpesaPayment';

function PaymentComponent() {
  const { paymentState, initiatePayment, resetPayment } = useMpesaPayment();
  
  const handlePayment = async () => {
    const success = await initiatePayment({
      packageId: 1,
      phoneNumber: '254712345678',
      amount: 100
    });
    
    if (success) {
      console.log('Payment initiated successfully');
    }
  };
  
  return (
    <div>
      <p>Status: {paymentState.status}</p>
      {paymentState.loading && <p>Processing...</p>}
      {paymentState.error && <p>Error: {paymentState.error}</p>}
      <button onClick={handlePayment}>Pay with M-Pesa</button>
    </div>
  );
}
```

**Features**:
- Automatic status polling with configurable intervals
- Payment state management (idle, initiating, pending, completed, failed)
- Error handling and recovery
- Cleanup on component unmount
- Integration with M-Pesa API service

## Services

### mpesaApi

A service class that handles all M-Pesa API communications.

**Location**: `src/services/mpesaApi.ts`

**Key Methods**:
```typescript
class MpesaApiService {
  // Initiate M-Pesa payment
  async initiatePayment(paymentData: MpesaPaymentRequest): Promise<MpesaPaymentResponse>;
  
  // Query payment status
  async queryPaymentStatus(checkoutRequestId: string): Promise<MpesaTransactionStatus>;
  
  // Get transaction history
  async getTransactionHistory(walletAddress: string, limit?: number, offset?: number): Promise<MpesaTransactionHistory>;
  
  // Utility methods
  validatePhoneNumber(phoneNumber: string): boolean;
  formatPhoneNumber(phoneNumber: string): string;
  convertUsdToKes(usdAmount: number): number;
  convertKesToUsd(kesAmount: number): number;
}
```

**Usage**:
```typescript
import mpesaApi from '../services/mpesaApi';

// Initiate payment
const result = await mpesaApi.initiatePayment({
  walletAddress: '0x...',
  packageId: 1,
  phoneNumber: '254712345678',
  amount: 100
});

// Validate phone number
const isValid = mpesaApi.validatePhoneNumber('254712345678'); // true

// Format phone number
const formatted = mpesaApi.formatPhoneNumber('0712345678'); // '254712345678'
```

## Integration with Existing Components

### PurchaseModal Updates

The existing `PurchaseModal` component has been enhanced to include M-Pesa payment option:

```tsx
// Added to PurchaseModal.tsx
const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');
const [showMpesaForm, setShowMpesaForm] = useState(false);

// Payment method selection
<PaymentMethodSelector
  selectedMethod={paymentMethod}
  onMethodChange={handlePaymentMethodChange}
  packageAmount={parseFloat(ethers.formatUnits(pkg.entryUSDT, usdtDecimals))}
  disabled={loading}
/>

// M-Pesa payment form
{showMpesaForm && (
  <MpesaPaymentForm
    walletAddress={address}
    packageId={pkg.id}
    amount={parseFloat(ethers.formatUnits(pkg.entryUSDT, usdtDecimals))}
    onSuccess={handleMpesaSuccess}
    onCancel={() => setShowMpesaForm(false)}
  />
)}
```

## Styling and Theming

All components use TailwindCSS classes and support both light and dark themes:

- **Primary Colors**: Blue (blue-600, blue-500)
- **Success Colors**: Green (green-600, green-500)
- **Error Colors**: Red (red-600, red-500)
- **Warning Colors**: Orange/Yellow (orange-600, yellow-600)
- **Neutral Colors**: Gray scale for text and backgrounds

**Dark Mode Support**:
```css
/* Example classes used */
.text-gray-900.dark:text-white
.bg-white.dark:bg-gray-800
.border-gray-200.dark:border-gray-700
```

## Error Handling

Components implement comprehensive error handling:

1. **Network Errors**: Automatic retry with exponential backoff
2. **Validation Errors**: Real-time input validation with user feedback
3. **Payment Errors**: User-friendly error messages with recovery options
4. **Timeout Errors**: Clear timeout indicators with retry functionality

## Accessibility

All components follow accessibility best practices:

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Proper ARIA labels and descriptions
- **Color Contrast**: WCAG AA compliant color combinations
- **Focus Management**: Logical focus flow and visible focus indicators
- **Error Announcements**: Screen reader announcements for errors and status changes

## Testing

Components are thoroughly tested with:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Component interaction and data flow
- **User Interaction Tests**: Simulated user actions and responses
- **Accessibility Tests**: Screen reader and keyboard navigation testing

Run tests with:
```bash
npm test src/tests/components/
```

## Performance Considerations

- **Lazy Loading**: Components are code-split for optimal loading
- **Memoization**: Expensive calculations are memoized
- **Debouncing**: Input validation is debounced to reduce API calls
- **Polling Optimization**: Status polling stops when payment completes
- **Memory Management**: Event listeners and intervals are properly cleaned up
