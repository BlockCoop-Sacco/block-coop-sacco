const { run } = require('hardhat');
require('dotenv').config();

async function main() {
    console.log('🔍 Verifying BlockCoop V2 Fixed Contracts on BSCScan');
    console.log('=' .repeat(50));

    // Contract addresses from deployment (with correct USDT)
    const contracts = {
        'SwapTaxManager': {
            address: '0x8188E20075Fd048b7850436eDf624b7169c53237',
            constructorArguments: [
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4' // admin
            ]
        },
        'BLOCKS': {
            address: '0x1d1669EF234081330a78Da546F1aE744e85b551F',
            constructorArguments: [
                'BlockCoop Sacco Share Token',
                'BLOCKS',
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // admin
                '0x8188E20075Fd048b7850436eDf624b7169c53237'  // taxManager
            ]
        },
        'BLOCKS_LP': {
            address: '0x9D08A478B90F84f0dF6867E0B210547E9311724F',
            constructorArguments: [
                'BlockCoop Sacco LP Token',
                'BLOCKS-LP',
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4' // admin
            ]
        },
        'VestingVault': {
            address: '0x21CE67C04b799183c1A88342947AD6D3b4f32430',
            constructorArguments: [
                '0x1d1669EF234081330a78Da546F1aE744e85b551F', // BLOCKS token
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4'  // admin
            ]
        },
        'PackageManagerV2_Fixed': {
            address: '0xF7075036dBd8d393B4DcF63071C3eF4abD8f31b9',
            constructorArguments: [
                '0x52f8BE86c4157eF5F11f3d73135ec4a568B02b90', // USDT (CORRECT)
                '0x1d1669EF234081330a78Da546F1aE744e85b551F', // BLOCKS
                '0x9D08A478B90F84f0dF6867E0B210547E9311724F', // BLOCKS-LP
                '0x21CE67C04b799183c1A88342947AD6D3b4f32430', // VestingVault
                '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // Router
                '0x6725F303b657a9451d8BA641348b6761A6CC7a17', // Factory
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // Treasury
                '0x8188E20075Fd048b7850436eDf624b7169c53237', // TaxManager
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // Admin
                '2000000000000000000' // 2.0 USDT initial global target price
            ]
        },
        'DividendDistributor': {
            address: '0x19C41131bE15234b6D6e8eaB2786Fc52389a142b',
            constructorArguments: [
                '0x1d1669EF234081330a78Da546F1aE744e85b551F', // BLOCKS
                '0x52f8BE86c4157eF5F11f3d73135ec4a568B02b90', // USDT (CORRECT)
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4'  // admin
            ]
        },
        'SecondaryMarket': {
            address: '0x04a107adDD22a92Cdbd1B3D783Cc57bAb45242f4',
            constructorArguments: [
                '0x52f8BE86c4157eF5F11f3d73135ec4a568B02b90', // USDT (CORRECT)
                '0x1d1669EF234081330a78Da546F1aE744e85b551F', // BLOCKS
                '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // Router
                '0x6725F303b657a9451d8BA641348b6761A6CC7a17', // Factory
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // Fee recipient (treasury)
                '0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4', // Admin
                '2000000000000000000' // 2.0 USDT target price
            ]
        }
    };

    const verificationResults = {};
    let successCount = 0;
    let failureCount = 0;

    for (const [contractName, config] of Object.entries(contracts)) {
        try {
            console.log(`\n🔍 Verifying ${contractName} at ${config.address}...`);
            
            await run('verify:verify', {
                address: config.address,
                constructorArguments: config.constructorArguments,
                contract: getContractPath(contractName)
            });

            console.log(`✅ ${contractName} verified successfully`);
            verificationResults[contractName] = {
                status: 'success',
                address: config.address,
                verified: true
            };
            successCount++;

        } catch (error) {
            console.log(`❌ ${contractName} verification failed: ${error.message}`);
            verificationResults[contractName] = {
                status: 'failed',
                address: config.address,
                verified: false,
                error: error.message
            };
            failureCount++;
        }

        // Add delay between verifications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 Verification Summary:');
    console.log('=' .repeat(50));
    console.log(`✅ Successfully verified: ${successCount} contracts`);
    console.log(`❌ Failed to verify: ${failureCount} contracts`);

    console.log('\n📋 Detailed Results:');
    for (const [contractName, result] of Object.entries(verificationResults)) {
        const status = result.verified ? '✅' : '❌';
        console.log(`${status} ${contractName}: ${result.address}`);
        if (!result.verified && result.error) {
            console.log(`   Error: ${result.error}`);
        }
    }

    // Save verification results
    const fs = require('fs');
    const path = require('path');
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const verificationFile = path.join(deploymentsDir, 'verification-v2-fixed.json');
    fs.writeFileSync(verificationFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        network: 'BSC Testnet',
        totalContracts: Object.keys(contracts).length,
        successCount,
        failureCount,
        results: verificationResults
    }, null, 2));

    console.log(`\n💾 Verification results saved to: ${verificationFile}`);
    
    return verificationResults;
}

function getContractPath(contractName) {
    const contractPaths = {
        'SwapTaxManager': 'contracts/BlockCoopV2.sol:SwapTaxManager',
        'BLOCKS': 'contracts/BlockCoopV2.sol:BLOCKS',
        'BLOCKS_LP': 'contracts/BlockCoopV2.sol:BLOCKS_LP',
        'VestingVault': 'contracts/BlockCoopV2.sol:VestingVault',
        'PackageManagerV2_Fixed': 'contracts/PackageManagerV2_Fixed.sol:PackageManagerV2_Fixed',
        'DividendDistributor': 'contracts/DividendDistributor.sol:DividendDistributor',
        'SecondaryMarket': 'contracts/SecondaryMarket.sol:SecondaryMarket'
    };
    
    return contractPaths[contractName] || contractName;
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        });
}

module.exports = main;
