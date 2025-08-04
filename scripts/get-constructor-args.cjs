const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔍 Getting Exact Constructor Arguments');
  console.log('=' .repeat(40));

  const contractAddress = '0x9a5AF2Ed5ffC55C3D22d35CB2D67E8B8E873e591';
  
  try {
    // Get the contract instance
    const packageManager = await ethers.getContractAt('PackageManagerV2_1', contractAddress);
    
    console.log('📋 Reading Contract State Variables:');
    
    // Read all the constructor-set variables
    const usdt = await packageManager.usdt();
    const shareToken = await packageManager.shareToken();
    const lpToken = await packageManager.lpToken();
    const vestingVault = await packageManager.vestingVault();
    const router = await packageManager.router();
    const factory = await packageManager.factory();
    const treasury = await packageManager.treasury();
    const taxManager = await packageManager.taxManager();
    const globalTargetPrice = await packageManager.globalTargetPrice();
    
    console.log('USDT:', usdt);
    console.log('Share Token:', shareToken);
    console.log('LP Token:', lpToken);
    console.log('Vesting Vault:', vestingVault);
    console.log('Router:', router);
    console.log('Factory:', factory);
    console.log('Treasury:', treasury);
    console.log('Tax Manager:', taxManager);
    console.log('Global Target Price:', globalTargetPrice.toString());
    
    // Check admin role
    const DEFAULT_ADMIN_ROLE = await packageManager.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await packageManager.hasRole(DEFAULT_ADMIN_ROLE, '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4');
    console.log('Admin (0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4) has admin role:', hasAdminRole);
    
    console.log('\n🔧 Constructor Arguments for Verification:');
    console.log('1. USDT:', usdt);
    console.log('2. Share Token:', shareToken);
    console.log('3. LP Token:', lpToken);
    console.log('4. Vesting Vault:', vestingVault);
    console.log('5. Router:', router);
    console.log('6. Factory:', factory);
    console.log('7. Treasury:', treasury);
    console.log('8. Tax Manager:', taxManager);
    console.log('9. Admin:', '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4');
    console.log('10. Initial Global Target Price:', globalTargetPrice.toString());
    
    console.log('\n📝 Hardhat Verify Command:');
    console.log(`npx hardhat verify --network bsctestnet ${contractAddress} \\`);
    console.log(`  "${usdt}" \\`);
    console.log(`  "${shareToken}" \\`);
    console.log(`  "${lpToken}" \\`);
    console.log(`  "${vestingVault}" \\`);
    console.log(`  "${router}" \\`);
    console.log(`  "${factory}" \\`);
    console.log(`  "${treasury}" \\`);
    console.log(`  "${taxManager}" \\`);
    console.log(`  "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4" \\`);
    console.log(`  "${globalTargetPrice.toString()}"`);
    
    // Also encode the arguments for manual verification
    console.log('\n🔧 ABI-Encoded Constructor Arguments:');
    try {
      const abiCoder = new ethers.AbiCoder();
      const encodedArgs = abiCoder.encode(
        ['address', 'address', 'address', 'address', 'address', 'address', 'address', 'address', 'address', 'uint256'],
        [usdt, shareToken, lpToken, vestingVault, router, factory, treasury, taxManager, '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', globalTargetPrice]
      );
      console.log(encodedArgs);
    } catch (encodeError) {
      console.log('Could not encode arguments:', encodeError.message);
    }
    
  } catch (error) {
    console.error('❌ Error reading contract:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
