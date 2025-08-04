const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking Package Configuration...\n");

  // Get contract instance - try the user-specified address first
  let packageManagerAddress = "0xB0E52DBE2a980815d5622624130199BF511C34B6";
  const PackageManager = await hre.ethers.getContractFactory("PackageManagerV2_1");
  let packageManager = PackageManager.attach(packageManagerAddress);

  // Test if this address works, if not try the latest deployment
  try {
    await packageManager.getPackageCount();
    console.log(`✅ Using contract at: ${packageManagerAddress}`);
  } catch (error) {
    console.log(`❌ Contract at ${packageManagerAddress} not working, trying latest deployment...`);
    packageManagerAddress = "0x4F86B93C8f023f7c112A625153cbd718c3860760"; // From stable-lp-fresh
    packageManager = PackageManager.attach(packageManagerAddress);
    console.log(`🔄 Trying contract at: ${packageManagerAddress}`);
  }

  try {
    // Get package count
    const packageCount = await packageManager.getPackageCount();
    console.log(`📦 Total Packages: ${packageCount}`);

    // Check each package
    for (let i = 0; i < packageCount; i++) {
      try {
        const pkg = await packageManager.getPackage(i);
        
        console.log(`\n📋 Package #${i}: ${pkg.name}`);
        console.log(`   Entry USDT: ${hre.ethers.formatUnits(pkg.entryUSDT, 6)} USDT`);
        console.log(`   Exchange Rate: ${pkg.exchangeRate} (${Number(pkg.exchangeRate) / 1e6} USDT per BLOCKS)`);
        console.log(`   Vest BPS: ${pkg.vestBps} (${pkg.vestBps / 100}%)`);
        console.log(`   Active: ${pkg.active}`);
        
        // Test calculation with this package
        const usdtAmount = pkg.entryUSDT;
        const exchangeRate = pkg.exchangeRate;
        
        // Calculate what tokens would be received
        const scale = 10n ** (18n - 6n); // Scale factor
        const netUSDT18 = usdtAmount * scale;
        const totalUserTokens = (netUSDT18 * 10n ** 18n) / exchangeRate;
        
        console.log(`   📊 For ${hre.ethers.formatUnits(usdtAmount, 6)} USDT:`);
        console.log(`      Total User Tokens: ${hre.ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);
        
        // Check if this looks reasonable
        const tokensNumber = Number(hre.ethers.formatUnits(totalUserTokens, 18));
        const usdtNumber = Number(hre.ethers.formatUnits(usdtAmount, 6));
        const ratio = tokensNumber / usdtNumber;
        
        if (ratio > 1000) {
          console.log(`   ⚠️  WARNING: Token ratio is ${ratio.toFixed(2)} (very high - likely exchange rate issue)`);
        } else {
          console.log(`   ✅ Token ratio is ${ratio.toFixed(2)} (reasonable)`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error reading package ${i}:`, error.message);
      }
    }

    // Check global target price
    try {
      const globalTargetPrice = await packageManager.globalTargetPrice();
      console.log(`\n🎯 Global Target Price: ${globalTargetPrice} (${Number(globalTargetPrice) / 1e18} USDT per BLOCKS)`);
    } catch (error) {
      console.log(`\n❌ Error reading global target price:`, error.message);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
