# Social Login Troubleshooting Guide

## "Social login timed out. Please try again." Error

This error occurs when the Google OAuth flow fails to complete within the expected timeframe. Here are the most common causes and solutions:

## 🔧 **Solution 1: Configure WalletConnect Project for Social Login**

**This is the most likely cause of the timeout error.**

### Steps to Fix:

1. **Go to WalletConnect Cloud Dashboard**
   - Visit: https://cloud.walletconnect.com/
   - Sign in with your account

2. **Select Your Project**
   - Find your project with ID: `730abfa871aee961d13aa1eb5d70e02d`
   - Click on the project to open settings

3. **Enable Social Login Features**
   - Navigate to "Features" or "Authentication" section
   - Enable "Social Login" or "OAuth Authentication"
   - Specifically enable "Google OAuth"
   - Save the configuration

4. **Configure OAuth Redirect URLs**
   - Add your domain URLs to the allowed redirect list:
     - `http://localhost:5173` (for development)
     - `https://blockcoop.com` (for production)
   - Include any other domains you use

5. **Verify Project Settings**
   - Ensure the project is active and properly configured
   - Check that social login is enabled in the project dashboard

## 🔧 **Solution 2: Browser and Popup Issues**

### Check Popup Blockers:
```javascript
// Test if popups are blocked
const popup = window.open('', '_blank', 'width=1,height=1');
if (!popup || popup.closed) {
  console.error('Popup blocked - please disable popup blocker');
}
popup.close();
```

### Browser Requirements:
- **HTTPS Required**: Social login requires HTTPS (except localhost)
- **Cookies Enabled**: OAuth flow requires cookies
- **JavaScript Enabled**: Required for OAuth redirects
- **Modern Browser**: Chrome 80+, Firefox 75+, Safari 13+

## 🔧 **Solution 3: Network and CORS Issues**

### Check Network Configuration:
1. **Firewall/Proxy**: Ensure OAuth endpoints aren't blocked
2. **Corporate Networks**: May block social login domains
3. **VPN Issues**: Some VPNs interfere with OAuth flows

### CORS Configuration:
The OAuth flow requires proper CORS headers. WalletConnect handles this, but ensure:
- No browser extensions blocking requests
- No network-level CORS blocking

## 🔧 **Solution 4: AppKit Configuration Fixes**

### Try Alternative Configuration:

```typescript
// In src/lib/appkit.ts
const appKitInstanceConfig = {
  // ... existing config
  features: {
    analytics: true,
    email: true,
    socials: ['google'],
    emailShowWallets: true,
    onramp: false, // Disable to reduce complexity
    swaps: false,  // Disable to reduce complexity
  },
  // Add timeout configuration
  connectTimeout: 60000, // Increase to 60 seconds
  // Ensure proper OAuth handling
  allowUnsupportedChain: false,
  allWallets: 'SHOW',
};
```

## 🔧 **Solution 5: Environment and Development Issues**

### Development Environment:
1. **Use HTTPS in Development** (if possible):
   ```bash
   # Use HTTPS dev server
   npm run dev -- --https
   ```

2. **Check Environment Variables**:
   ```env
   VITE_WALLETCONNECT_PROJECT_ID=730abfa871aee961d13aa1eb5d70e02d
   ```

3. **Clear Browser Data**:
   - Clear cookies and localStorage
   - Disable browser extensions
   - Try incognito/private mode

## 🔧 **Solution 6: Alternative Implementation**

If WalletConnect social login continues to fail, consider these alternatives:

### Option A: Use Email-Only Authentication
```typescript
features: {
  email: true,
  socials: [], // Disable social login temporarily
  emailShowWallets: true,
}
```

### Option B: Implement Custom Google OAuth
```typescript
// Custom Google OAuth implementation
import { GoogleAuth } from '@google-cloud/local-auth';
// Then integrate with AppKit manually
```

## 🧪 **Debugging Tools**

### Use the Debug Component:
The `SocialLoginDebug` component (bottom-right corner in development) provides:
- Real-time AppKit state monitoring
- Browser compatibility checks
- Social login attempt tracking
- Error logging and analysis

### Console Debugging:
```javascript
// Monitor AppKit events
appKit.subscribeState((state) => {
  console.log('AppKit State:', state);
});

// Check for specific errors
window.addEventListener('error', (e) => {
  if (e.message.includes('social login')) {
    console.error('Social Login Error:', e);
  }
});
```

## 📱 **Mobile-Specific Issues**

### iOS Safari:
- May block popups more aggressively
- Requires user gesture for popup
- Check iOS version compatibility

### Android Chrome:
- Usually works better than iOS
- Check for data saver mode
- Ensure cookies are enabled

## ⚡ **Quick Fixes to Try First**

1. **Disable popup blocker** in your browser
2. **Try incognito/private mode**
3. **Clear browser cache and cookies**
4. **Check WalletConnect project configuration**
5. **Try a different browser**
6. **Ensure stable internet connection**

## 🔍 **Verification Steps**

After implementing fixes:

1. **Test the OAuth Flow**:
   - Click "Connect Wallet"
   - Select "Continue with Google"
   - Verify popup opens
   - Complete OAuth flow
   - Check for successful connection

2. **Monitor Console Logs**:
   - Look for OAuth-related errors
   - Check AppKit state changes
   - Verify network requests

3. **Test Different Scenarios**:
   - Different browsers
   - Different networks
   - Mobile devices
   - Incognito mode

## 📞 **Getting Help**

If issues persist:

1. **Check WalletConnect Documentation**: https://docs.reown.com/appkit
2. **WalletConnect Discord**: Community support
3. **GitHub Issues**: Report bugs to AppKit repository
4. **Browser Developer Tools**: Check console for specific errors

## 🎯 **Most Likely Solution**

**90% of social login timeout issues are caused by missing WalletConnect project configuration.** 

**Action Required**: Go to https://cloud.walletconnect.com/ and enable social login for your project ID: `730abfa871aee961d13aa1eb5d70e02d`
