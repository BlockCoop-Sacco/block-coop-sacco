const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
    console.log('🚀 Deploying BlockCoop V2 Fixed System');
    console.log('=' .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    console.log('💰 Account balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'BNB');

    const deployedContracts = {};
    const adminAddress = deployer.address;
    const treasuryAddress = process.env.VITE_TREASURY_ADDRESS || deployer.address;

    // Use existing USDT token
    const usdtAddress = process.env.VITE_USDT_ADDRESS;
    if (!usdtAddress) {
        throw new Error('VITE_USDT_ADDRESS not found in .env file');
    }
    console.log('📄 Using existing USDT token:', usdtAddress);
    deployedContracts.usdt = usdtAddress;

    // PancakeSwap addresses for BSC Testnet
    const routerAddress = process.env.VITE_ROUTER_ADDRESS || '0xD99D1c33F9fC3444f8101754aBC46c52416550D1';
    const factoryAddress = process.env.VITE_FACTORY_ADDRESS || '0x6725F303b657a9451d8BA641348b6761A6CC7a17';
    deployedContracts.router = routerAddress;
    deployedContracts.factory = factoryAddress;

    try {
        // 1. Deploy SwapTaxManager
        console.log('\n1️⃣ Deploying SwapTaxManager...');
        const SwapTaxManager = await ethers.getContractFactory('SwapTaxManager');
        const taxManager = await SwapTaxManager.deploy(adminAddress);
        await taxManager.waitForDeployment();
        deployedContracts.taxManager = await taxManager.getAddress();
        console.log('✅ SwapTaxManager deployed:', deployedContracts.taxManager);

        // 2. Deploy BLOCKS Token
        console.log('\n2️⃣ Deploying BLOCKS Token...');
        const BLOCKS = await ethers.getContractFactory('BLOCKS');
        const blocksToken = await BLOCKS.deploy(
            'BlockCoop Sacco Share Token',
            'BLOCKS',
            adminAddress,
            deployedContracts.taxManager
        );
        await blocksToken.waitForDeployment();
        deployedContracts.blocks = await blocksToken.getAddress();
        console.log('✅ BLOCKS Token deployed:', deployedContracts.blocks);

        // 3. Deploy BLOCKS-LP Token
        console.log('\n3️⃣ Deploying BLOCKS-LP Token...');
        const BLOCKS_LP = await ethers.getContractFactory('BLOCKS_LP');
        const lpToken = await BLOCKS_LP.deploy(
            'BlockCoop Sacco LP Token',
            'BLOCKS-LP',
            adminAddress
        );
        await lpToken.waitForDeployment();
        deployedContracts.lpToken = await lpToken.getAddress();
        console.log('✅ BLOCKS-LP Token deployed:', deployedContracts.lpToken);

        // 4. Deploy VestingVault
        console.log('\n4️⃣ Deploying VestingVault...');
        const VestingVault = await ethers.getContractFactory('VestingVault');
        const vestingVault = await VestingVault.deploy(
            deployedContracts.blocks,
            adminAddress
        );
        await vestingVault.waitForDeployment();
        deployedContracts.vestingVault = await vestingVault.getAddress();
        console.log('✅ VestingVault deployed:', deployedContracts.vestingVault);

        // 5. Deploy PackageManagerV2_Fixed
        console.log('\n5️⃣ Deploying PackageManagerV2_Fixed...');
        const PackageManager = await ethers.getContractFactory('PackageManagerV2_Fixed');
        const initialGlobalTargetPrice = ethers.parseEther('2.0'); // 2.0 USDT per BLOCKS
        
        const packageManager = await PackageManager.deploy(
            deployedContracts.usdt,
            deployedContracts.blocks,
            deployedContracts.lpToken,
            deployedContracts.vestingVault,
            deployedContracts.router,
            deployedContracts.factory,
            treasuryAddress,
            deployedContracts.taxManager,
            adminAddress,
            initialGlobalTargetPrice
        );
        await packageManager.waitForDeployment();
        deployedContracts.packageManager = await packageManager.getAddress();
        console.log('✅ PackageManagerV2_Fixed deployed:', deployedContracts.packageManager);

        // 6. Deploy DividendDistributor
        console.log('\n6️⃣ Deploying DividendDistributor...');
        const DividendDistributor = await ethers.getContractFactory('DividendDistributor');
        const dividendDistributor = await DividendDistributor.deploy(
            deployedContracts.blocks,
            deployedContracts.usdt,
            adminAddress
        );
        await dividendDistributor.waitForDeployment();
        deployedContracts.dividendDistributor = await dividendDistributor.getAddress();
        console.log('✅ DividendDistributor deployed:', deployedContracts.dividendDistributor);

        // 7. Deploy SecondaryMarket
        console.log('\n7️⃣ Deploying SecondaryMarket...');
        const SecondaryMarket = await ethers.getContractFactory('SecondaryMarket');
        const secondaryMarket = await SecondaryMarket.deploy(
            deployedContracts.usdt,
            deployedContracts.blocks,
            deployedContracts.router,
            deployedContracts.factory,
            treasuryAddress, // fee recipient
            adminAddress,
            initialGlobalTargetPrice // target price
        );
        await secondaryMarket.waitForDeployment();
        deployedContracts.secondaryMarket = await secondaryMarket.getAddress();
        console.log('✅ SecondaryMarket deployed:', deployedContracts.secondaryMarket);

        // Setup roles and permissions
        console.log('\n🔐 Setting up roles and permissions...');
        
        // Grant MINTER_ROLE to PackageManager for BLOCKS token
        await blocksToken.grantRole(await blocksToken.MINTER_ROLE(), deployedContracts.packageManager);
        console.log('✅ Granted MINTER_ROLE to PackageManager for BLOCKS');

        // Grant MINTER_ROLE to PackageManager for BLOCKS-LP token
        await lpToken.grantRole(await lpToken.MINTER_ROLE(), deployedContracts.packageManager);
        console.log('✅ Granted MINTER_ROLE to PackageManager for BLOCKS-LP');

        // Grant LOCKER_ROLE to PackageManager for VestingVault
        await vestingVault.grantRole(await vestingVault.LOCKER_ROLE(), deployedContracts.packageManager);
        console.log('✅ Granted LOCKER_ROLE to PackageManager for VestingVault');

        // Grant PACKAGE_MANAGER_ROLE to admin
        await packageManager.grantRole(await packageManager.PACKAGE_MANAGER_ROLE(), adminAddress);
        console.log('✅ Granted PACKAGE_MANAGER_ROLE to admin');

        console.log('\n🎉 BlockCoop V2 Fixed System Deployment Complete!');
        console.log('=' .repeat(50));
        console.log('📋 Contract Addresses:');
        console.log('USDT Token:', deployedContracts.usdt);
        console.log('BLOCKS Token:', deployedContracts.blocks);
        console.log('BLOCKS-LP Token:', deployedContracts.lpToken);
        console.log('VestingVault:', deployedContracts.vestingVault);
        console.log('SwapTaxManager:', deployedContracts.taxManager);
        console.log('PackageManager:', deployedContracts.packageManager);
        console.log('DividendDistributor:', deployedContracts.dividendDistributor);
        console.log('SecondaryMarket:', deployedContracts.secondaryMarket);
        console.log('PancakeSwap Router:', deployedContracts.router);
        console.log('PancakeSwap Factory:', deployedContracts.factory);

        // Generate .env update
        console.log('\n📝 Environment Variables for .env:');
        console.log(`VITE_SHARE_ADDRESS=${deployedContracts.blocks}`);
        console.log(`VITE_LP_ADDRESS=${deployedContracts.lpToken}`);
        console.log(`VITE_VAULT_ADDRESS=${deployedContracts.vestingVault}`);
        console.log(`VITE_TAX_ADDRESS=${deployedContracts.taxManager}`);
        console.log(`VITE_PACKAGE_MANAGER_ADDRESS=${deployedContracts.packageManager}`);
        console.log(`VITE_DIVIDEND_DISTRIBUTOR_ADDRESS=${deployedContracts.dividendDistributor}`);
        console.log(`VITE_SECONDARY_MARKET_ADDRESS=${deployedContracts.secondaryMarket}`);

        return deployedContracts;

    } catch (error) {
        console.error('❌ Deployment failed:', error);
        throw error;
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;
