const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Debugging Contract Connection with Local ABI...\n");

  const packageManagerAddress = "0x37981E1F3d6CaC76432DBC50Df5fE4C6092b139c"; // Latest deployment (5 days ago)
  console.log(`📍 Contract Address: ${packageManagerAddress}`);

  try {
    // Use a reliable BSC Testnet RPC endpoint
    const provider = new hre.ethers.JsonRpcProvider("https://bsc-testnet.public.blastapi.io");
    console.log(`🌐 Provider: https://bsc-testnet.public.blastapi.io`);

    // Load ABI from local artifacts
    const artifactPath = path.join(__dirname, "../artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abi = artifact.abi;
    console.log(`📋 Loaded ABI with ${abi.length} functions/events`);
    
    // Check if contract exists at address
    const code = await provider.getCode(packageManagerAddress);
    console.log(`📝 Contract code length: ${code.length} characters`);
    
    if (code === '0x') {
      console.log("❌ No contract found at this address!");
      return;
    }
    
    console.log("✅ Contract exists at address");
    
    // Create contract instance with local ABI
    const packageManager = new hre.ethers.Contract(packageManagerAddress, abi, provider);
    
    console.log("📋 Attempting contract calls...");
    
    // Try basic calls
    try {
      const packageCount = await packageManager.getPackageCount();
      console.log(`✅ Package count: ${packageCount}`);
      
      // If we have packages, get package 0
      if (packageCount > 0) {
        const pkg = await packageManager.getPackage(0);
        console.log(`\n📦 Package #0: ${pkg.name}`);
        console.log(`   Entry USDT: ${hre.ethers.formatUnits(pkg.entryUSDT, 6)} USDT`);
        console.log(`   Exchange Rate: ${pkg.exchangeRate} (raw value)`);
        console.log(`   Exchange Rate: ${Number(pkg.exchangeRate) / 1e6} USDT per BLOCKS`);
        console.log(`   Vest BPS: ${pkg.vestBps} (${Number(pkg.vestBps) / 100}%)`);
        console.log(`   Active: ${pkg.active}`);
        
        // Calculate expected tokens for 100 USDT
        const usdtAmount = hre.ethers.parseUnits("100", 6); // 100 USDT
        const exchangeRate = BigInt(pkg.exchangeRate); // Convert to BigInt

        // Smart contract calculation logic (current buggy version)
        const scale = 10n ** (18n - 6n); // Scale factor from USDT to 18 decimals
        const netUSDT18 = BigInt(usdtAmount) * scale;
        const totalUserTokens = (netUSDT18 * 10n ** 18n) / exchangeRate;

        console.log(`\n🧮 CURRENT (BUGGY) Token Calculation for 100 USDT:`);
        console.log(`   USDT Amount: ${hre.ethers.formatUnits(usdtAmount, 6)} USDT`);
        console.log(`   Scale Factor: ${scale}`);
        console.log(`   USDT in 18 decimals: ${netUSDT18}`);
        console.log(`   Exchange Rate: ${exchangeRate}`);
        console.log(`   Formula: (${netUSDT18} * 10^18) / ${exchangeRate}`);
        console.log(`   Total User Tokens (wei): ${totalUserTokens}`);
        console.log(`   Total User Tokens: ${hre.ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);

        // Check if this is reasonable
        const tokensNumber = Number(hre.ethers.formatUnits(totalUserTokens, 18));
        const ratio = tokensNumber / 100; // tokens per USDT

        console.log(`   Tokens per USDT: ${ratio.toFixed(6)}`);
        console.log(`   🚨 RESULT: ${tokensNumber.toExponential(2)} BLOCKS (MASSIVELY INFLATED!)`);

        // Show what the CORRECT calculation should be
        console.log(`\n✅ CORRECT Token Calculation:`);

        // The exchange rate 500000 means 0.5 USDT per BLOCKS
        // So 1 BLOCKS costs 0.5 USDT
        // Therefore 100 USDT should buy 100/0.5 = 200 BLOCKS
        const exchangeRateFormatted = Number(exchangeRate) / 1e6; // 0.5 USDT per BLOCKS
        const expectedTokens = 100 / exchangeRateFormatted; // 100 USDT / 0.5 USDT per BLOCKS = 200 BLOCKS

        console.log(`   Exchange Rate: ${exchangeRateFormatted} USDT per BLOCKS`);
        console.log(`   Expected Tokens: 100 USDT / ${exchangeRateFormatted} USDT per BLOCKS = ${expectedTokens} BLOCKS`);

        // The correct smart contract calculation should be:
        // totalUserTokens = netUSDT18 / exchangeRate (remove the extra * 10^18)
        const correctTokens = netUSDT18 / exchangeRate;
        console.log(`   Correct Contract Calculation: ${netUSDT18} / ${exchangeRate} = ${hre.ethers.formatUnits(correctTokens, 18)} BLOCKS`);

        // Show the inflation factor
        const inflationFactor = tokensNumber / expectedTokens;
        console.log(`\n📊 ANALYSIS:`);
        console.log(`   Expected: ${expectedTokens} BLOCKS`);
        console.log(`   Current (buggy): ${tokensNumber.toExponential(2)} BLOCKS`);
        console.log(`   Inflation Factor: ${inflationFactor.toExponential(2)}x`);
        console.log(`   Frontend Correction: Divides by 1,000,000 (band-aid fix)`);
        console.log(`   After Frontend Correction: ${(tokensNumber / 1000000).toFixed(2)} BLOCKS`);
      }
      
    } catch (error) {
      console.log(`❌ Error calling contract methods: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      console.log(`   Error data: ${error.data}`);
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
