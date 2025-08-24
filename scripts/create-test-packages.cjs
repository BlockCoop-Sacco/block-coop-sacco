const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
    console.log('📦 Creating Low-Value Test Packages (<= 0.1 USDT)');
    console.log('='.repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log('📍 Using account:', deployer.address);

    // Get PackageManager contract
    const PackageManager = await ethers.getContractFactory('PackageManagerV2_2');
    const packageManager = PackageManager.attach(process.env.VITE_PACKAGE_MANAGER_ADDRESS);

    console.log('📋 PackageManager:', process.env.VITE_PACKAGE_MANAGER_ADDRESS);

    // Low-value test packages (0.01 – 0.05 – 0.1 USDT)
    const testPackages = [
        {
            name: "Starter Mini",
            entryUSDT: ethers.parseUnits("0.01", 18), // 0.01 USDT
            exchangeRate: ethers.parseUnits("1.5", 18), // 1.5 USDT per BLOCKS
            vestBps: 5000, // 50% vesting
            vestCliff: 7 * 24 * 60 * 60, // 7 days
            vestDuration: 30 * 24 * 60 * 60, // 30 days
            referralBps: 500 // 5%
        },
        {
            name: "Growth Mini",
            entryUSDT: ethers.parseUnits("0.05", 18), // 0.05 USDT
            exchangeRate: ethers.parseUnits("1.4", 18),
            vestBps: 6000, // 60%
            vestCliff: 14 * 24 * 60 * 60, // 14 days
            vestDuration: 60 * 24 * 60 * 60, // 60 days
            referralBps: 750 // 7.5%
        },
        {
            name: "Premium Mini",
            entryUSDT: ethers.parseUnits("0.1", 18), // 0.1 USDT
            exchangeRate: ethers.parseUnits("1.3", 18),
            vestBps: 7000, // 70%
            vestCliff: 30 * 24 * 60 * 60, // 30 days
            vestDuration: 90 * 24 * 60 * 60, // 90 days
            referralBps: 1000 // 10%
        }
    ];

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < testPackages.length; i++) {
        const pkg = testPackages[i];
        try {
            console.log(`\n📦 Creating Package ${i}: ${pkg.name}`);
            console.log(`   Entry: ${ethers.formatUnits(pkg.entryUSDT, 18)} USDT`);
            console.log(`   Rate: ${ethers.formatUnits(pkg.exchangeRate, 18)} USDT per BLOCKS`);
            console.log(`   Vesting: ${pkg.vestBps / 100}%`);
            console.log(`   Referral: ${pkg.referralBps / 100}%`);

            const tx = await packageManager.addPackage(
                pkg.name,
                pkg.entryUSDT,
                pkg.exchangeRate,
                pkg.vestBps,
                pkg.vestCliff,
                pkg.vestDuration,
                pkg.referralBps
            );

            console.log(`   ⏳ Tx: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`   ✅ Created successfully (Block: ${receipt.blockNumber})`);
            successCount++;
        } catch (error) {
            console.log(`   ❌ Failed to create Package ${i}: ${error.message}`);
            failureCount++;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Created: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);

    try {
        const packageCount = await packageManager.nextPackageId();
        console.log(`\n📋 Total packages in system: ${packageCount}`);
    } catch (error) {
        console.log(`❌ Could not verify packages: ${error.message}`);
    }

    console.log('\n🎉 Low-Value Packages Created for Frontend Testing!');
}

if (require.main === module) {
    main().then(() => process.exit(0)).catch((error) => {
        console.error('❌ Package creation failed:', error);
        process.exit(1);
    });
}

module.exports = main;
