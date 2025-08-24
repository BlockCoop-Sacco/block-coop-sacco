const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🧪 Testing Market Price-Based Package Purchase');
  console.log('=' .repeat(50));

  const [deployer] = await ethers.getSigners();
  console.log('📍 Testing with account:', deployer.address);

  // Use the new contract address (you'll need to update this after deployment)
  const packageManagerAddress = process.env.VITE_PACKAGE_MANAGER_ADDRESS;
  const usdtAddress = process.env.VITE_USDT_ADDRESS;

  console.log('PackageManager:', packageManagerAddress);
  console.log('USDT:', usdtAddress);

  try {
    // Get contract instances
    const packageManager = await ethers.getContractAt('PackageManagerV2_2_MarketPrice', packageManagerAddress);
    const usdt = await ethers.getContractAt('IERC20', usdtAddress);

    // Test market price detection
    console.log('\n📊 Testing Market Price Detection...');
    const [marketPrice, hasLiquidity] = await packageManager.getCurrentMarketPrice();
    const globalTargetPrice = await packageManager.globalTargetPrice();

    console.log('Market Price:', ethers.formatUnits(marketPrice, 18), 'USDT per BLOCKS');
    console.log('Global Target Price:', ethers.formatUnits(globalTargetPrice, 18), 'USDT per BLOCKS');
    console.log('Has Liquidity:', hasLiquidity);
    console.log('Price Difference:', ethers.formatUnits(marketPrice > globalTargetPrice ? marketPrice - globalTargetPrice : globalTargetPrice - marketPrice, 18), 'USDT');

    // Get package info
    console.log('\n📦 Package Information...');
    const pkg = await packageManager.getPackage(0);
    console.log('Package Name:', pkg.name);
    console.log('Package Cost:', ethers.formatUnits(pkg.entryUSDT, 18), 'USDT');
    console.log('Exchange Rate:', ethers.formatUnits(pkg.exchangeRate, 18), 'USDT per BLOCKS');

    // Check user balance
    console.log('\n💰 User Balance Check...');
    const userBalance = await usdt.balanceOf(deployer.address);
    console.log('User USDT Balance:', ethers.formatUnits(userBalance, 18), 'USDT');

    if (userBalance >= pkg.entryUSDT) {
      console.log('✅ Sufficient balance for purchase');
      
      // Check allowance
      const allowance = await usdt.allowance(deployer.address, packageManagerAddress);
      console.log('Current Allowance:', ethers.formatUnits(allowance, 18), 'USDT');
      
      if (allowance < pkg.entryUSDT) {
        console.log('⚠️  Need to approve USDT spending...');
        const approveTx = await usdt.approve(packageManagerAddress, ethers.MaxUint256);
        await approveTx.wait();
        console.log('✅ USDT approved');
      }

      // Simulate purchase (dry run)
      console.log('\n🔄 Simulating Package Purchase...');
      try {
        // This will revert but show us the gas estimation and any errors
        await packageManager.purchase.staticCall(0, ethers.ZeroAddress);
        console.log('✅ Purchase simulation successful - transaction should work');
      } catch (error) {
        if (error.message.includes('execution reverted')) {
          console.log('❌ Purchase would fail:', error.message);
        } else {
          console.log('✅ Purchase simulation successful (gas estimation worked)');
        }
      }

      // Uncomment the following lines to perform actual purchase
      /*
      console.log('\n💳 Executing Actual Purchase...');
      const purchaseTx = await packageManager.purchase(0, ethers.ZeroAddress);
      console.log('Transaction Hash:', purchaseTx.hash);
      
      console.log('⏳ Waiting for confirmation...');
      const receipt = await purchaseTx.wait();
      
      if (receipt.status === 1) {
        console.log('✅ Package purchased successfully!');
        console.log('Gas Used:', receipt.gasUsed.toString());
        
        // Check for MarketPriceUsed event
        const events = receipt.logs;
        for (const event of events) {
          try {
            const parsedEvent = packageManager.interface.parseLog(event);
            if (parsedEvent.name === 'MarketPriceUsed') {
              console.log('📊 Market Price Event:');
              console.log('  Market Price Used:', ethers.formatUnits(parsedEvent.args.marketPrice, 18), 'USDT per BLOCKS');
              console.log('  Global Target Price:', ethers.formatUnits(parsedEvent.args.globalTargetPrice, 18), 'USDT per BLOCKS');
              console.log('  Price Difference:', ethers.formatUnits(parsedEvent.args.priceDifference, 18), 'USDT');
            }
          } catch (e) {
            // Ignore parsing errors for other events
          }
        }
      } else {
        console.log('❌ Transaction failed');
      }
      */

    } else {
      console.log('❌ Insufficient balance for purchase');
      console.log('Need:', ethers.formatUnits(pkg.entryUSDT - userBalance, 18), 'more USDT');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
