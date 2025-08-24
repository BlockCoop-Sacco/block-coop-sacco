// cPanel Node.js Entry Point (CommonJS version)
// Alternative entry point for cPanel compatibility

console.log('🚀 Starting BlockCoop M-Pesa Backend (CommonJS)...');

// Check Node.js version
console.log('📋 Node.js version:', process.version);
console.log('📋 Platform:', process.platform);
console.log('📋 Architecture:', process.arch);

// Load environment variables first
require('dotenv').config();

// Validate critical environment variables
const requiredVars = [
  'CORS_ORIGIN',
  'CALLBACK_BASE_URL',
  'MPESA_CONSUMER_KEY',
  'MPESA_CONSUMER_SECRET',
  'MPESA_PASSKEY'
];

console.log('🔍 Validating environment variables...');
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your .env file or cPanel environment configuration.');
  process.exit(1);
}

console.log('✅ Environment validation passed');
console.log('📊 Configuration status:');
console.log(`   - CORS Origin: ${process.env.CORS_ORIGIN}`);
console.log(`   - Callback Base URL: ${process.env.CALLBACK_BASE_URL}`);
console.log(`   - M-Pesa Environment: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);

// Try to load the ES module server
console.log('📦 Loading server module...');

(async () => {
  try {
    await import('./src/server.js');
    console.log('✅ BlockCoop M-Pesa Backend started successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error details:', error.message);
    
    // Provide helpful debugging information
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('🔧 Module not found. Checking file structure...');
      const fs = require('fs');
      const path = require('path');
      
      try {
        const srcExists = fs.existsSync(path.join(__dirname, 'src'));
        const serverExists = fs.existsSync(path.join(__dirname, 'src', 'server.js'));
        console.log(`   - src/ directory exists: ${srcExists}`);
        console.log(`   - src/server.js exists: ${serverExists}`);
        
        if (srcExists) {
          const srcContents = fs.readdirSync(path.join(__dirname, 'src'));
          console.log(`   - src/ contents:`, srcContents);
        }
      } catch (fsError) {
        console.error('   - Error checking file structure:', fsError.message);
      }
    }
    
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
