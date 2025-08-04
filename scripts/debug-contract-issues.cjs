const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔍 Debugging Contract Issues');
  console.log('=' .repeat(35));

  const [deployer] = await ethers.getSigners();
  console.log('📍 Using account:', deployer.address);

  const newContractAddress = '0x9a5AF2Ed5ffC55C3D22d35CB2D67E8B8E873e591';
  const oldContractAddress = '0xF7075036dBd8d393B4DcF63071C3eF4abD8f31b9';

  console.log('\n📋 Contract Addresses:');
  console.log('New Contract:', newContractAddress);
  console.log('Old Contract:', oldContractAddress);

  try {
    // Test 1: Check function signatures
    console.log('\n🔍 1. Function Signature Analysis');
    console.log('=' .repeat(35));

    const newContract = await ethers.getContractAt('PackageManagerV2_1', newContractAddress);
    const oldContract = await ethers.getContractAt('PackageManagerV2_1', oldContractAddress);

    // Check purchase function signature
    console.log('Purchase function signature: 0xae77c237');
    const purchaseFragment = newContract.interface.getFunction('purchase');
    console.log('Expected signature:', newContract.interface.getFunction('purchase').selector);
    console.log('Function name:', purchaseFragment.name);
    console.log('Function inputs:', purchaseFragment.inputs.map(input => `${input.type} ${input.name}`));

    // Check globalTargetPrice function signature  
    console.log('\nGlobal Target Price function signature: 0x175d1bcb');
    const globalTargetPriceFragment = newContract.interface.getFunction('globalTargetPrice');
    console.log('Expected signature:', globalTargetPriceFragment.selector);
    console.log('Function name:', globalTargetPriceFragment.name);
    console.log('Function outputs:', globalTargetPriceFragment.outputs.map(output => output.type));

    // Test 2: Check globalTargetPrice function
    console.log('\n🔍 2. Global Target Price Function Test');
    console.log('=' .repeat(40));

    try {
      const globalTargetPrice = await newContract.globalTargetPrice();
      console.log('✅ globalTargetPrice() works:', ethers.formatUnits(globalTargetPrice, 18), 'USDT per BLOCKS');
    } catch (error) {
      console.error('❌ globalTargetPrice() failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error data:', error.data);
    }

    // Test 3: Check contract state
    console.log('\n🔍 3. Contract State Verification');
    console.log('=' .repeat(35));

    try {
      const treasury = await newContract.treasury();
      console.log('✅ Treasury:', treasury);

      const slippageTolerance = await newContract.slippageTolerance();
      console.log('✅ Slippage Tolerance:', Number(slippageTolerance));

      const deadlineWindow = await newContract.deadlineWindow();
      console.log('✅ Deadline Window:', Number(deadlineWindow));

    } catch (stateError) {
      console.error('❌ Contract state error:', stateError.message);
    }

    // Test 4: Check package data
    console.log('\n🔍 4. Package Data Verification');
    console.log('=' .repeat(30));

    try {
      for (let i = 0; i < 3; i++) {
        const pkg = await newContract.getPackage(i);
        console.log(`Package ${i}: ${pkg.name} - ${ethers.formatUnits(pkg.entryUSDT, 18)} USDT`);
        console.log(`  Exchange Rate: ${ethers.formatUnits(pkg.exchangeRate, 18)} USDT per BLOCKS`);
        console.log(`  Active: ${pkg.active}`);
      }
    } catch (packageError) {
      console.error('❌ Package data error:', packageError.message);
    }

    // Test 5: Check market price function (new feature)
    console.log('\n🔍 5. Market Price Function Test');
    console.log('=' .repeat(35));

    try {
      const [marketPrice, hasLiquidity] = await newContract.getCurrentMarketPrice();
      console.log('✅ Market Price:', ethers.formatUnits(marketPrice, 18), 'USDT per BLOCKS');
      console.log('✅ Has Liquidity:', hasLiquidity);
    } catch (marketError) {
      console.error('❌ Market price error:', marketError.message);
    }

    // Test 6: Simulate purchase function call
    console.log('\n🔍 6. Purchase Function Simulation');
    console.log('=' .repeat(35));

    try {
      // Try to simulate the exact call that's failing
      console.log('Simulating purchase(2, 0x0000000000000000000000000000000000000000)...');
      
      // First check if user has enough USDT
      const pkg2 = await newContract.getPackage(2);
      console.log('Package 2 cost:', ethers.formatUnits(pkg2.entryUSDT, 18), 'USDT');
      
      const usdtAddress = process.env.VITE_USDT_ADDRESS;
      const usdtContract = await ethers.getContractAt('IERC20', usdtAddress);
      const userBalance = await usdtContract.balanceOf(deployer.address);
      console.log('User USDT balance:', ethers.formatUnits(userBalance, 18), 'USDT');
      
      if (userBalance >= pkg2.entryUSDT) {
        console.log('✅ User has sufficient balance');
        
        // Check allowance
        const allowance = await usdtContract.allowance(deployer.address, newContractAddress);
        console.log('Current allowance:', ethers.formatUnits(allowance, 18), 'USDT');
        
        if (allowance < pkg2.entryUSDT) {
          console.log('⚠️  Insufficient allowance, approving...');
          const approveTx = await usdtContract.approve(newContractAddress, ethers.MaxUint256);
          await approveTx.wait();
          console.log('✅ USDT approved');
        }
        
        // Try static call first
        try {
          await newContract.purchase.staticCall(2, ethers.ZeroAddress);
          console.log('✅ Purchase simulation successful');
        } catch (simError) {
          console.error('❌ Purchase simulation failed:', simError.message);
          console.error('Error reason:', simError.reason);
          console.error('Error code:', simError.code);
          
          // Try to decode the error
          if (simError.data) {
            console.error('Error data:', simError.data);
            try {
              const decodedError = newContract.interface.parseError(simError.data);
              console.error('Decoded error:', decodedError);
            } catch (decodeErr) {
              console.error('Could not decode error');
            }
          }
        }
      } else {
        console.log('❌ Insufficient USDT balance for purchase');
      }
      
    } catch (purchaseError) {
      console.error('❌ Purchase test error:', purchaseError.message);
    }

    // Test 7: Check permissions
    console.log('\n🔍 7. Permissions Verification');
    console.log('=' .repeat(30));

    try {
      const shareAddress = process.env.VITE_SHARE_ADDRESS;
      const lpAddress = process.env.VITE_LP_ADDRESS;

      const shareTokenAbi = [
        "function MINTER_ROLE() external view returns (bytes32)",
        "function hasRole(bytes32 role, address account) external view returns (bool)"
      ];

      const shareToken = new ethers.Contract(shareAddress, shareTokenAbi, deployer);
      const lpToken = new ethers.Contract(lpAddress, shareTokenAbi, deployer);

      const MINTER_ROLE = await shareToken.MINTER_ROLE();
      const hasShareMinterRole = await shareToken.hasRole(MINTER_ROLE, newContractAddress);
      const hasLpMinterRole = await lpToken.hasRole(MINTER_ROLE, newContractAddress);

      console.log('BLOCKS Token MINTER_ROLE:', hasShareMinterRole ? '✅ Granted' : '❌ Not Granted');
      console.log('BLOCKS-LP Token MINTER_ROLE:', hasLpMinterRole ? '✅ Granted' : '❌ Not Granted');

    } catch (permError) {
      console.error('❌ Permission check error:', permError.message);
    }

  } catch (error) {
    console.error('❌ Critical error during debugging:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
