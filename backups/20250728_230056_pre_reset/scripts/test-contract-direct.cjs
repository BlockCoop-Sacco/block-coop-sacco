const { ethers } = require('ethers');
require('dotenv').config();

const PACKAGE_MANAGER_ADDRESS = process.env.VITE_PACKAGE_MANAGER_ADDRESS;
const BSC_TESTNET_RPC = process.env.VITE_BSC_TESTNET_RPC;

// Simple ABI for testing
const SIMPLE_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getUserStats",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "totalInvested", "type": "uint256"},
          {"internalType": "uint256", "name": "totalTokensReceived", "type": "uint256"},
          {"internalType": "uint256", "name": "totalVestTokens", "type": "uint256"},
          {"internalType": "uint256", "name": "totalPoolTokens", "type": "uint256"},
          {"internalType": "uint256", "name": "totalLPTokens", "type": "uint256"},
          {"internalType": "uint256", "name": "totalReferralRewards", "type": "uint256"},
          {"internalType": "uint256", "name": "purchaseCount", "type": "uint256"}
        ],
        "internalType": "struct PackageManager.UserStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "userStats",
    "outputs": [
      {"internalType": "uint256", "name": "totalInvested", "type": "uint256"},
      {"internalType": "uint256", "name": "totalTokensReceived", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVestTokens", "type": "uint256"},
      {"internalType": "uint256", "name": "totalPoolTokens", "type": "uint256"},
      {"internalType": "uint256", "name": "totalLPTokens", "type": "uint256"},
      {"internalType": "uint256", "name": "totalReferralRewards", "type": "uint256"},
      {"internalType": "uint256", "name": "purchaseCount", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function testContract() {
  console.log('🔍 Testing PackageManager Contract Direct Calls');
  console.log('='.repeat(50));
  console.log(`📍 Contract Address: ${PACKAGE_MANAGER_ADDRESS}`);
  console.log(`🌐 RPC URL: ${BSC_TESTNET_RPC}`);
  console.log('');

  try {
    // Setup provider and contract
    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
    const contract = new ethers.Contract(PACKAGE_MANAGER_ADDRESS, SIMPLE_ABI, provider);

    const testAddress = '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4';

    console.log('1️⃣ Testing getUserStats function:');
    try {
      const result = await contract.getUserStats(testAddress);
      console.log('✅ getUserStats SUCCESS:', result);
      console.log('   - totalInvested:', result.totalInvested.toString());
      console.log('   - totalTokensReceived:', result.totalTokensReceived.toString());
      console.log('   - purchaseCount:', result.purchaseCount.toString());
    } catch (error) {
      console.log('❌ getUserStats ERROR:', error.message);
    }

    console.log('');
    console.log('2️⃣ Testing userStats function:');
    try {
      const result = await contract.userStats(testAddress);
      console.log('✅ userStats SUCCESS:', result);
      console.log('   - totalInvested:', result[0].toString());
      console.log('   - totalTokensReceived:', result[1].toString());
      console.log('   - purchaseCount:', result[6].toString());
    } catch (error) {
      console.log('❌ userStats ERROR:', error.message);
    }

    console.log('');
    console.log('3️⃣ Testing contract basic info:');
    try {
      // Test if contract exists
      const code = await provider.getCode(PACKAGE_MANAGER_ADDRESS);
      console.log('📄 Contract code length:', code.length);
      
      if (code === '0x') {
        console.log('❌ Contract not deployed at this address!');
      } else {
        console.log('✅ Contract exists');
      }
    } catch (error) {
      console.log('❌ Contract check ERROR:', error.message);
    }

  } catch (error) {
    console.log('❌ Setup ERROR:', error.message);
  }
}

testContract().catch(console.error);
