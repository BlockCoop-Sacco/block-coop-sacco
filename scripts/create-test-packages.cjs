const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
    console.log('📦 Creating Test Packages for Frontend Testing');
    console.log('=' .repeat(50));

    const [deployer] = await ethers.getSigners();
    console.log('📍 Creating packages with account:', deployer.address);

    // Get PackageManager contract
    const PackageManager = await ethers.getContractFactory('PackageManagerV2_Fixed');
    const packageManager = PackageManager.attach(process.env.VITE_PACKAGE_MANAGER_ADDRESS);

    console.log('📋 PackageManager:', process.env.VITE_PACKAGE_MANAGER_ADDRESS);

    // Test packages to create
    const testPackages = [
        {
            name: "Starter Package",
            entryUSDT: ethers.parseEther("100"), // 100 USDT
            exchangeRate: ethers.parseEther("1.5"), // 1.5 USDT per BLOCKS
            vestBps: 5000, // 50% vesting
            vestCliff: 30 * 24 * 60 * 60, // 30 days
            vestDuration: 180 * 24 * 60 * 60, // 180 days
            referralBps: 500 // 5% referral
        },
        {
            name: "Growth Package",
            entryUSDT: ethers.parseEther("500"), // 500 USDT
            exchangeRate: ethers.parseEther("1.4"), // 1.4 USDT per BLOCKS (better rate)
            vestBps: 6000, // 60% vesting
            vestCliff: 30 * 24 * 60 * 60, // 30 days
            vestDuration: 150 * 24 * 60 * 60, // 150 days
            referralBps: 750 // 7.5% referral
        },
        {
            name: "Premium Package",
            entryUSDT: ethers.parseEther("1000"), // 1000 USDT
            exchangeRate: ethers.parseEther("1.3"), // 1.3 USDT per BLOCKS (best rate)
            vestBps: 7000, // 70% vesting
            vestCliff: 30 * 24 * 60 * 60, // 30 days
            vestDuration: 120 * 24 * 60 * 60, // 120 days
            referralBps: 1000 // 10% referral
        }
    ];

    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < testPackages.length; i++) {
        const pkg = testPackages[i];
        
        try {
            console.log(`\n📦 Creating Package ${i}: ${pkg.name}`);
            console.log(`   Entry: ${ethers.formatEther(pkg.entryUSDT)} USDT`);
            console.log(`   Rate: ${ethers.formatEther(pkg.exchangeRate)} USDT per BLOCKS`);
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

            console.log(`   Transaction: ${tx.hash}`);
            
            const receipt = await tx.wait();
            console.log(`   ✅ Package ${i} created successfully (Block: ${receipt.blockNumber})`);
            
            successCount++;

        } catch (error) {
            console.log(`   ❌ Failed to create Package ${i}: ${error.message}`);
            failureCount++;
        }

        // Add delay between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n📊 Package Creation Summary:');
    console.log(`✅ Successfully created: ${successCount} packages`);
    console.log(`❌ Failed to create: ${failureCount} packages`);

    // Verify packages were created
    try {
        const packageCount = await packageManager.nextPackageId();
        console.log(`\n📋 Total packages in system: ${packageCount}`);

        for (let i = 0; i < packageCount; i++) {
            try {
                const pkg = await packageManager.getPackage(i);
                console.log(`   Package ${i}: ${pkg.name} - ${ethers.formatEther(pkg.entryUSDT)} USDT`);
            } catch (error) {
                console.log(`   Package ${i}: Error reading package`);
            }
        }

    } catch (error) {
        console.log(`❌ Error verifying packages: ${error.message}`);
    }

    // Test getUserStats to ensure portfolio will work
    try {
        console.log('\n🧪 Testing Portfolio Functions...');
        const userStats = await packageManager.getUserStats(deployer.address);
        console.log('✅ getUserStats works - Portfolio should load correctly');
        console.log(`   Total Invested: ${ethers.formatEther(userStats.totalInvested)} USDT`);
        console.log(`   Total Tokens: ${ethers.formatEther(userStats.totalTokensReceived)} BLOCKS`);
        console.log(`   Purchase Count: ${userStats.purchaseCount}`);
    } catch (error) {
        console.log(`❌ getUserStats failed: ${error.message}`);
    }

    console.log('\n🎉 Test Package Creation Complete!');
    console.log('🚀 Frontend should now have packages to display and test with');
    
    return { successCount, failureCount };
}

if (require.main === module) {
    main()
        .then((result) => {
            if (result.successCount > 0) {
                console.log('\n✅ Ready for frontend testing with test packages!');
                process.exit(0);
            } else {
                console.log('\n❌ No packages created - check permissions');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('❌ Package creation failed:', error);
            process.exit(1);
        });
}

module.exports = main;
