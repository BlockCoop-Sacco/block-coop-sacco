# WalletConnect Project Setup for Social Login

## 🚨 **Current Issue**

Your WalletConnect project ID `730abfa871aee961d13aa1eb5d70e02d` is returning a **400 Bad Request** error, which means:

- The project ID is invalid or expired
- The project is not configured for social login
- The project doesn't have proper permissions

## 🔧 **Step-by-Step Fix**

### **Step 1: Access WalletConnect Cloud**

1. **Go to**: https://cloud.walletconnect.com/
2. **Sign in** with your account
3. **Find your project** with ID: `730abfa871aee961d13aa1eb5d70e02d`
   - OR create a new project if this one is invalid

### **Step 2: Configure Project for Social Login**

#### **Project Settings:**
1. **Project Type**: Ensure it's set to "App" (not "Wallet")
2. **Project Name**: "BlockCoop Sacco" or similar
3. **Description**: Add a clear description of your dApp

#### **Enable Social Login:**
1. **Navigate to**: "Features" or "Authentication" section
2. **Enable**: "Social Login" or "OAuth Authentication"
3. **Select Providers**: Enable "Google" specifically
4. **Save** the configuration

#### **Domain Configuration:**
1. **Add Allowed Domains**:
   - `http://localhost:5173` (for development)
   - `https://blockcoop.com` (for production)
   - Any other domains you use

2. **Redirect URLs** (if required):
   - `http://localhost:5173/callback`
   - `https://blockcoop.com/callback`

### **Step 3: Update Your Environment**

Once you have a working project ID:

```env
# In your .env file
VITE_WALLETCONNECT_PROJECT_ID=your_new_project_id_here
```

### **Step 4: Verify Project Configuration**

#### **Test the Project ID:**
```bash
# Test if the project ID works
curl "https://api.web3modal.org/getWallets?projectId=YOUR_PROJECT_ID&st=appkit&sv=html-ethers-1.7.12&page=1&entries=10"
```

**Expected Response**: Should return wallet data (not 400 error)

#### **Check Project Status:**
- Project should be "Active"
- Social login should be "Enabled"
- Domains should be properly configured

## 🆘 **Alternative Solutions**

### **Option 1: Create New Project**

If your current project can't be fixed:

1. **Create a new project** in WalletConnect Cloud
2. **Configure it properly** for social login
3. **Update your `.env`** with the new project ID

### **Option 2: Temporary Test Project**

I've added a fallback test project ID in the code:

```typescript
// In src/lib/appkit.ts
walletConnectProjectId: getEnvVar('VITE_WALLETCONNECT_PROJECT_ID', true) || 'c4f79cc821944d9680842e34466bfbd'
```

This will use a test project if your environment variable fails.

### **Option 3: Disable Social Login Temporarily**

If you need to test other features:

```typescript
// In src/lib/appkit.ts
features: {
  email: false, // Disable email login
  socials: [], // Disable social login
  emailShowWallets: false,
}
```

## 🔍 **Debugging Steps**

### **1. Check Browser Console**
Look for these specific errors:
- `400 (Bad Request)` from `api.web3modal.org`
- `HTTP status code: 400`
- AppKit initialization errors

### **2. Test Project ID**
```javascript
// In browser console
fetch('https://api.web3modal.org/getWallets?projectId=730abfa871aee961d13aa1eb5d70e02d&st=appkit&sv=html-ethers-1.7.12&page=1&entries=1')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### **3. Verify Environment Variables**
```javascript
// In browser console
console.log('Project ID:', import.meta.env.VITE_WALLETCONNECT_PROJECT_ID)
```

## ✅ **Success Indicators**

When properly configured, you should see:

1. **No 400 errors** in browser console
2. **AppKit initializes** without errors
3. **Wallet modal opens** with social login options
4. **"Continue with Google"** button appears
5. **OAuth flow completes** successfully

## 📞 **Getting Help**

### **WalletConnect Support:**
- **Documentation**: https://docs.reown.com/appkit
- **Discord**: WalletConnect community
- **GitHub**: Report issues to AppKit repository

### **Common Issues:**
1. **Project not found**: Create a new project
2. **Social login disabled**: Enable in project settings
3. **Domain not allowed**: Add your domain to allowed list
4. **Expired project**: Projects may expire if unused

## 🎯 **Next Steps**

1. **Fix your WalletConnect project** configuration
2. **Test the social login** functionality
3. **Monitor browser console** for errors
4. **Verify OAuth flow** completes successfully

**The social login timeout issue will be resolved once the WalletConnect project is properly configured.**
