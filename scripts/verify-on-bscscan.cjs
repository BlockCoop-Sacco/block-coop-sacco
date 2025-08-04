const { run } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔍 Verifying Contract on BSCscan Testnet (Etherscan V2)');
  console.log('=' .repeat(55));

  // Contract details
  const contractAddress = '0x9a5AF2Ed5ffC55C3D22d35CB2D67E8B8E873e591';
  const contractName = 'PackageManagerV2_1';
  
  // Constructor arguments from deployment
  const constructorArgs = [
    process.env.VITE_USDT_ADDRESS,           // usdt_
    process.env.VITE_SHARE_ADDRESS,          // share_
    process.env.VITE_LP_ADDRESS,             // lp_
    process.env.VITE_VAULT_ADDRESS,          // vault_
    process.env.VITE_ROUTER_ADDRESS,         // router_
    process.env.VITE_FACTORY_ADDRESS,        // factory_
    process.env.VITE_TREASURY_ADDRESS,       // treasury_
    process.env.VITE_TAX_ADDRESS,            // tax_
    '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // admin (deployer)
    '2008541734513588148'                    // initialGlobalTargetPrice_ (current market price)
  ];

  console.log('📋 Verification Details:');
  console.log('Contract Address:', contractAddress);
  console.log('Contract Name:', contractName);
  console.log('Network: BSC Testnet');
  console.log('\n📝 Constructor Arguments:');
  console.log('USDT:', constructorArgs[0]);
  console.log('BLOCKS:', constructorArgs[1]);
  console.log('BLOCKS-LP:', constructorArgs[2]);
  console.log('Vault:', constructorArgs[3]);
  console.log('Router:', constructorArgs[4]);
  console.log('Factory:', constructorArgs[5]);
  console.log('Treasury:', constructorArgs[6]);
  console.log('Tax Manager:', constructorArgs[7]);
  console.log('Admin:', constructorArgs[8]);
  console.log('Initial Global Target Price:', constructorArgs[9]);

  try {
    console.log('\n🚀 Starting verification process...');
    
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: constructorArgs,
      contract: `contracts/${contractName}.sol:${contractName}`
    });

    console.log('\n✅ Contract verification completed successfully!');
    console.log('🔗 BSCscan URL:', `https://testnet.bscscan.com/address/${contractAddress}#code`);
    console.log('📋 Source code and ABI are now publicly available');
    
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('\n✅ Contract is already verified on BSCscan!');
      console.log('🔗 BSCscan URL:', `https://testnet.bscscan.com/address/${contractAddress}#code`);
    } else {
      console.error('\n❌ Verification failed:', error.message);
      
      // Provide manual verification instructions
      console.log('\n📝 Manual Verification Instructions:');
      console.log('1. Go to:', `https://testnet.bscscan.com/address/${contractAddress}#code`);
      console.log('2. Click "Verify and Publish"');
      console.log('3. Select "Solidity (Single file)"');
      console.log('4. Compiler version: v0.8.19+commit.7dd6d404');
      console.log('5. License: MIT');
      console.log('6. Upload the flattened contract source code');
      console.log('7. Enter constructor arguments (ABI-encoded)');
      
      console.log('\n🔧 Constructor Arguments (ABI-encoded):');
      try {
        const { ethers } = require('hardhat');
        const abiCoder = new ethers.AbiCoder();
        
        const encodedArgs = abiCoder.encode(
          ['address', 'address', 'address', 'address', 'address', 'address', 'address', 'address', 'address', 'uint256'],
          constructorArgs
        );
        
        console.log(encodedArgs);
      } catch (encodeError) {
        console.log('Could not encode arguments automatically');
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
