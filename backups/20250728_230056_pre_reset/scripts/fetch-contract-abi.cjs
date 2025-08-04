const hre = require("hardhat");
const axios = require('axios');

async function main() {
  console.log("🔍 Fetching Contract ABI from BSCScan...\n");

  const contractAddress = "0xB0E52DBE2a980815d5622624130199BF511C34B6";
  const apiKey = process.env.ETHERSCAN_API_KEY;
  
  try {
    // Fetch ABI from BSCScan
    const url = `https://api-testnet.bscscan.com/api?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;
    console.log(`📡 Fetching ABI from BSCScan...`);
    
    const response = await axios.get(url);
    
    if (response.data.status === "1") {
      const abi = JSON.parse(response.data.result);
      console.log(`✅ ABI fetched successfully`);
      console.log(`📊 ABI has ${abi.length} functions/events`);
      
      // Look for getPackageCount function
      const getPackageCountFunc = abi.find(item => item.name === 'getPackageCount');
      if (getPackageCountFunc) {
        console.log(`✅ Found getPackageCount function in ABI`);
        console.log(`   Type: ${getPackageCountFunc.type}`);
        console.log(`   Inputs: ${getPackageCountFunc.inputs?.length || 0}`);
        console.log(`   Outputs: ${getPackageCountFunc.outputs?.length || 0}`);
      } else {
        console.log(`❌ getPackageCount function not found in ABI`);
      }
      
      // Try to call the contract with the fetched ABI
      console.log(`\n🔗 Testing contract with fetched ABI...`);
      
      const provider = new hre.ethers.JsonRpcProvider("https://bsc-testnet.public.blastapi.io");
      const contract = new hre.ethers.Contract(contractAddress, abi, provider);
      
      try {
        const packageCount = await contract.getPackageCount();
        console.log(`✅ Package count: ${packageCount}`);
        
        // If we have packages, get package 0
        if (packageCount > 0) {
          const pkg = await contract.getPackage(0);
          console.log(`\n📦 Package #0: ${pkg.name}`);
          console.log(`   Entry USDT: ${hre.ethers.formatUnits(pkg.entryUSDT, 6)} USDT`);
          console.log(`   Exchange Rate: ${pkg.exchangeRate} (raw value)`);
          
          // Check if exchange rate is in the expected format
          const exchangeRateNumber = Number(pkg.exchangeRate);
          console.log(`   Exchange Rate (number): ${exchangeRateNumber}`);
          
          if (exchangeRateNumber > 1e18) {
            console.log(`   Exchange Rate (as 18-decimal): ${exchangeRateNumber / 1e18} USDT per BLOCKS`);
          } else if (exchangeRateNumber > 1e6) {
            console.log(`   Exchange Rate (as 6-decimal): ${exchangeRateNumber / 1e6} USDT per BLOCKS`);
          } else {
            console.log(`   Exchange Rate (direct): ${exchangeRateNumber} USDT per BLOCKS`);
          }
          
          console.log(`   Vest BPS: ${pkg.vestBps} (${pkg.vestBps / 100}%)`);
          console.log(`   Active: ${pkg.active}`);
          
          // Calculate expected tokens for 100 USDT using the contract's logic
          const usdtAmount = hre.ethers.parseUnits("100", 6); // 100 USDT
          const exchangeRate = pkg.exchangeRate;
          
          // Smart contract calculation logic
          const scale = 10n ** (18n - 6n); // Scale factor from USDT to 18 decimals
          const netUSDT18 = usdtAmount * scale;
          const totalUserTokens = (netUSDT18 * 10n ** 18n) / exchangeRate;
          
          console.log(`\n🧮 Token Calculation for 100 USDT:`);
          console.log(`   USDT Amount: ${hre.ethers.formatUnits(usdtAmount, 6)} USDT`);
          console.log(`   Scale Factor: ${scale}`);
          console.log(`   USDT in 18 decimals: ${netUSDT18}`);
          console.log(`   Exchange Rate: ${exchangeRate}`);
          console.log(`   Total User Tokens: ${hre.ethers.formatUnits(totalUserTokens, 18)} BLOCKS`);
          
          // Check if this is reasonable
          const tokensNumber = Number(hre.ethers.formatUnits(totalUserTokens, 18));
          const ratio = tokensNumber / 100; // tokens per USDT
          
          console.log(`   Tokens per USDT: ${ratio.toFixed(6)}`);
          
          if (ratio > 1000000) {
            console.log(`   🚨 CRITICAL: Extremely high token ratio - exchange rate is likely wrong!`);
            console.log(`   💡 Expected: ~0.5-2 tokens per USDT, Got: ${ratio.toFixed(0)} tokens per USDT`);
          } else if (ratio > 1000) {
            console.log(`   ⚠️  WARNING: Very high token ratio - likely exchange rate issue!`);
          } else if (ratio > 100) {
            console.log(`   ⚠️  WARNING: High token ratio - check exchange rate`);
          } else {
            console.log(`   ✅ Reasonable token ratio`);
          }
        }
        
      } catch (contractError) {
        console.log(`❌ Error calling contract: ${contractError.message}`);
      }
      
    } else {
      console.log(`❌ Failed to fetch ABI: ${response.data.message}`);
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
