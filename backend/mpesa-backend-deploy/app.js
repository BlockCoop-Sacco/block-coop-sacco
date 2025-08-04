// cPanel Node.js Entry Point
// This file is required by cPanel Node.js applications

console.log('🚀 Starting BlockCoop M-Pesa Backend...');

// Use dynamic import for ES modules
(async () => {
  try {
    console.log('📦 Loading server module...');
    await import('./src/server.js');
    console.log('✅ BlockCoop M-Pesa Backend started successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
