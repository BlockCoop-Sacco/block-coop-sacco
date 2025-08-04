// Simple test server for cPanel debugging
console.log('=== CPANEL DEBUG TEST ===');
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Current directory:', process.cwd());

// Check if basic modules work
try {
  console.log('Testing require...');
  const express = require('express');
  console.log('Express loaded successfully');
  
  const app = express();
  const PORT = process.env.PORT || 3001;
  
  // Simple health endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      message: 'Test server working',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    });
  });
  
  app.get('/', (req, res) => {
    res.json({
      message: 'BlockCoop Test Server',
      status: 'working'
    });
  });
  
  app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log('=== SERVER STARTED SUCCESSFULLY ===');
  });
  
} catch (error) {
  console.error('=== ERROR ===');
  console.error('Error loading modules:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
