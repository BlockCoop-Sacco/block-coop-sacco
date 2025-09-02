const { run } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🔍 Verifying Fixed PackageManagerV2_2 Contract on BSCScan Mainnet');
  console.log('=' .repeat(65));

  // Load the most recent fixed deployment
  const fs = require('fs');
  const deploymentsDir = 'deployments';
  
  let deploymentFile;
  try {
    const files = fs.readdirSync(deploymentsDir)
      .filter(file => file.includes('deployments-mainnet-v2_2-fixed'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      throw new Error('No fixed deployment files found');
    }
    
    deploymentFile = files[0]; // Most recent
    console.log('📋 Using deployment file:', deploymentFile);
  } catch (error) {
    console.error('❌ Could not find fixed deployment file. Please run redeployment first.');
    process.exit(1);
  }

  // Load deployment data
  const deployment = JSON.parse(fs.readFileSync(`${deploymentsDir}/${deploymentFile}`, 'utf8'));
  
  // Contract details
  const contractAddress = deployment.packageManager;
  const contractName = 'PackageManagerV2_2';
  
  // Constructor arguments from deployment
  const constructorArgs = [
    deployment.usdt,                    // usdt_
    deployment.blocks,                   // share_
    deployment.blocksLP,                 // lp_
    deployment.vestingVault,             // vault_
    deployment.router,                   // router_
    deployment.factory,                  // factory_
    deployment.treasury,                 // treasury_
    deployment.taxManager,               // tax_
    deployment.treasury,                 // admin (same as treasury)
    '2000000000000000000'               // initialGlobalTargetPrice_ (2.0 USDT per BLOCKS)
  ];

  console.log('📋 Verification Details:');
  console.log('Contract Address:', contractAddress);
  console.log('Contract Name:', contractName);
  console.log('Network: BSC Mainnet');
  console.log('Deployment File:', deploymentFile);
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

  console.log('\n🔧 Fixes Applied in This Contract:');
  console.log('   ✅ 1:1 BLOCKS to BLOCKS-LP token ratio enforced');
  console.log('   ✅ Referral rewards only tracked for referrers, not buyers');
  console.log('   ✅ Proper separation of referral tracking');

  try {
    console.log('\n🚀 Starting verification process...');
    
    await run('verify:verify', {
      address: contractAddress,
      constructorArguments: constructorArgs,
      contract: `contracts/${contractName}.sol:${contractName}`
    });

    console.log('\n✅ Contract verification completed successfully!');
    console.log('🔗 BSCScan URL:', `https://bscscan.com/address/${contractAddress}#code`);
    console.log('📋 Source code and ABI are now publicly available');
    
    // Update the main deployment file with verification status
    deployment.verified = true;
    deployment.verificationTimestamp = Date.now();
    deployment.verificationUrl = `https://bscscan.com/address/${contractAddress}#code`;
    
    fs.writeFileSync(`${deploymentsDir}/${deploymentFile}`, JSON.stringify(deployment, null, 2));
    console.log('\n📝 Updated deployment file with verification status');
    
  } catch (error) {
    if (error.message.includes('Already Verified')) {
      console.log('\n✅ Contract is already verified on BSCScan!');
      console.log('🔗 BSCScan URL:', `https://bscscan.com/address/${contractAddress}#code`);
    } else {
      console.error('\n❌ Verification failed:', error.message);
      
      // Provide manual verification instructions
      console.log('\n📝 Manual Verification Instructions:');
      console.log('1. Go to:', `https://bscscan.com/address/${contractAddress}#code`);
      console.log('2. Click "Verify and Publish"');
      console.log('3. Select "Solidity (Single file)"');
      console.log('4. Compiler version: v0.8.20');
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
      
      console.log('\n📋 Alternative: Use Hardhat Flatten');
      console.log('Run: npx hardhat flatten contracts/PackageManagerV2_2.sol > flattened.sol');
      console.log('Then upload the flattened.sol file to BSCScan');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
