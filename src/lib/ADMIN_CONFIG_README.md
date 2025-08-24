# Admin Configuration

This document explains how the admin access control system works in the BlockCoop application.

## Overview

The admin access control system ensures that only authorized wallet addresses can access admin functionality, including:
- Admin Page navigation link visibility
- Admin dashboard access
- Package management features
- Tax bucket configuration
- System administration functions

## Configuration

### Authorized Admin Addresses

The authorized admin addresses are defined in `src/lib/adminConfig.ts`:

```typescript
export const AUTHORIZED_ADMIN_ADDRESSES = [
  '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // Primary Admin (Deployer)
  '0x6F6782148F208F9547f68e2354B1d7d2d4BeF987', // Additional Admin (Client Request)
];
```

### Functions

#### `isAuthorizedAdmin(address: string | null | undefined): boolean`
Checks if a wallet address is authorized as an admin.
- Performs case-insensitive comparison
- Returns `false` for null/undefined/empty addresses
- Returns `true` if the address matches any authorized admin address

#### `shouldShowAdminFeatures(address: string | null | undefined, isConnected: boolean): boolean`
Determines if admin features should be shown to the current user.
- Requires both a valid admin address AND active wallet connection
- Can be extended for additional checks (network validation, contract state, etc.)

#### `getAuthorizedAdminAddresses(): string[]`
Returns a copy of the authorized admin addresses array.

## Implementation

### Header Navigation

The admin navigation link is conditionally rendered in both desktop and mobile views:

```typescript
// In Header.tsx
import { shouldShowAdminFeatures } from '../../lib/adminConfig';

// Check if admin features should be shown
const showAdminFeatures = shouldShowAdminFeatures(account, isConnected);

// Conditional rendering
{showAdminFeatures && (
  <Link to="/admin">
    <Settings className="h-4 w-4" />
    <span>Admin</span>
  </Link>
)}
```

### Real-time Updates

The admin link visibility updates automatically when:
- Wallet connection status changes
- User switches to a different wallet address
- User disconnects their wallet

## Security Considerations

1. **Client-side Only**: This is a UI-level access control for user experience. Server-side/contract-level authorization is still required for actual admin operations.

2. **Address Validation**: All address comparisons are case-insensitive to handle different address formats.

3. **Connection Requirement**: Admin features are only shown when a wallet is actively connected.

## Adding New Admin Addresses

To add a new admin address:

1. Update the `AUTHORIZED_ADMIN_ADDRESSES` array in `src/lib/adminConfig.ts`
2. Ensure the address is also granted admin roles in the smart contracts
3. Test the implementation to verify access works correctly

## Testing

Run the admin configuration tests:

```bash
npm test src/lib/__tests__/adminConfig.test.ts
```

The tests verify:
- Authorized addresses are recognized correctly
- Case-insensitive comparison works
- Unauthorized addresses are rejected
- Connection requirements are enforced
- Edge cases (null/undefined addresses) are handled

## Troubleshooting

### Admin Link Not Showing
1. Verify the wallet address is in the `AUTHORIZED_ADMIN_ADDRESSES` array
2. Ensure the wallet is connected and the connection is active
3. Check browser console for any Web3 connection errors
4. Verify the address format matches exactly (case-insensitive)

### Admin Link Shows for Wrong User
1. Check if the address was accidentally added to the authorized list
2. Verify the wallet connection is showing the correct address
3. Clear browser cache and reconnect wallet if needed
