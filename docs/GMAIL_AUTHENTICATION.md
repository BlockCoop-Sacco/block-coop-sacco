# Gmail Authentication Integration

## Overview

The BlockCoop Sacco project now supports Gmail authentication alongside traditional wallet connections through AppKit (formerly Web3Modal). This allows users to sign in using their Google/Gmail accounts without needing a crypto wallet.

## Features

- **Email Authentication**: Users can sign in with any email address
- **Google/Gmail Social Login**: Direct sign-in with Google accounts
- **Seamless Integration**: Works alongside existing wallet options
- **Secure Authentication**: Handled by WalletConnect's infrastructure
- **Mobile Responsive**: Works across all devices

## Implementation

### Configuration

The Gmail authentication is enabled through AppKit configuration in `src/lib/appkit.ts`:

```typescript
features: {
  analytics: true,
  email: true, // Enable email login
  socials: ['google'], // Enable Google/Gmail social login
  emailShowWallets: true,
},
```

### Required Environment Variables

The Gmail authentication uses the existing WalletConnect project configuration:

```env
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

No additional environment variables are required for Gmail authentication.

## User Experience

### Wallet Connection Modal

When users click "Connect Wallet", they will see:

1. **Traditional Wallet Options**:
   - MetaMask
   - WalletConnect
   - Coinbase Wallet
   - Other injected wallets

2. **Email/Social Options**:
   - "Continue with Email" - for any email address
   - "Continue with Google" - for Gmail/Google accounts

### Authentication Flow

1. **Email Authentication**:
   - User enters email address
   - Receives verification email
   - Clicks verification link
   - Gets connected with a wallet address

2. **Google Authentication**:
   - User clicks "Continue with Google"
   - Redirected to Google OAuth
   - Authorizes the application
   - Returns with authenticated session

## Integration with Existing Code

### Web3Provider

The Gmail authentication integrates seamlessly with the existing `Web3Provider`:

```typescript
const { isConnected, account, connectWallet } = useWeb3();
```

- `isConnected`: Returns `true` for both wallet and Gmail connections
- `account`: Returns the wallet address (generated for Gmail users)
- `connectWallet()`: Opens the modal with all connection options

### Usage in Components

No changes are required in existing components. The authentication works transparently:

```typescript
// Header component - no changes needed
<button onClick={() => connectWallet()}>
  {isConnected ? 'Connected' : 'Connect Wallet'}
</button>

// Purchase modal - works with Gmail auth
if (!isConnected) {
  return <div>Please connect your wallet</div>;
}
```

## Security Considerations

1. **OAuth Security**: Google OAuth 2.0 provides secure authentication
2. **Wallet Generation**: AppKit generates a secure wallet for email users
3. **Session Management**: Handled by WalletConnect infrastructure
4. **No Private Keys**: Email users don't need to manage private keys

## Testing

### Running Tests

```bash
npm test gmail-authentication.test.tsx
```

### Test Coverage

- AppKit configuration validation
- Wallet connection flow
- Authentication state management
- Integration with Web3Provider

## Troubleshooting

### Common Issues

1. **Gmail Login Not Appearing**:
   - Verify `email: true` and `socials: ['google']` in AppKit config
   - Check WalletConnect project ID is valid

2. **Authentication Fails**:
   - Ensure WalletConnect project has social login enabled
   - Check browser console for OAuth errors

3. **Mobile Issues**:
   - Gmail authentication works in mobile browsers
   - May require popup handling for OAuth flow

### Debug Information

Enable debug logging in development:

```typescript
console.log('AppKit state:', appKit.getState());
```

## Browser Compatibility

- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Chrome Mobile, Samsung Internet
- **Requirements**: Modern browser with popup support

## Future Enhancements

Potential improvements for Gmail authentication:

1. **Additional Social Providers**: Facebook, Twitter, Apple
2. **Profile Integration**: Display user's Google profile information
3. **Enhanced Security**: Multi-factor authentication options
4. **Wallet Recovery**: Email-based wallet recovery options

## Support

For issues with Gmail authentication:

1. Check the browser console for errors
2. Verify WalletConnect project configuration
3. Test with different browsers/devices
4. Review AppKit documentation for updates

## References

- [AppKit Documentation](https://docs.reown.com/appkit)
- [WalletConnect Social Login](https://docs.reown.com/appkit/vue/core/socials)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
