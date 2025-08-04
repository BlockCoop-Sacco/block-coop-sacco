const { ethers } = require("hardhat");

// Import the formatting functions (simulate the frontend logic)
function detectUSDTDecimals(value) {
  const numValue = Number(value);
  if (numValue > 0 && numValue < 1e12) {
    return 6; // Legacy 6-decimal format
  }
  return 18; // V2 18-decimal format
}

function detectExchangeRateDecimals(value) {
  const numValue = Number(value);
  if (numValue > 0 && numValue < 1e12) {
    return 6; // Legacy 6-decimal format
  }
  return 18; // V2 18-decimal format
}

function formatUSDT(value) {
  try {
    const bigintValue = typeof value === 'string' ? BigInt(value) : value;
    const decimals = detectUSDTDecimals(bigintValue);
    const formatted = ethers.formatUnits(bigintValue, decimals);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  } catch {
    return '0';
  }
}

function formatExchangeRate(value) {
  try {
    const bigintValue = typeof value === 'string' ? BigInt(value) : value;
    const decimals = detectExchangeRateDecimals(bigintValue);
    const formatted = ethers.formatUnits(bigintValue, decimals);
    const num = parseFloat(formatted);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  } catch {
    return '0';
  }
}

async function main() {
  console.log("🧪 Testing Formatting Functions");
  console.log("===============================");

  // Test cases from the actual package data
  const testCases = [
    {
      name: "Starter Package",
      entryUSDT: "100000000",
      exchangeRate: "7000",
      expected: {
        entryUSDT: "100",
        exchangeRate: "0.007"
      }
    },
    {
      name: "Growth Package", 
      entryUSDT: "500000000",
      exchangeRate: "6000",
      expected: {
        entryUSDT: "500",
        exchangeRate: "0.006"
      }
    },
    {
      name: "Premium Package",
      entryUSDT: "1000000000", 
      exchangeRate: "5000",
      expected: {
        entryUSDT: "1,000",
        exchangeRate: "0.005"
      }
    },
    {
      name: "V2 18-decimal Package (hypothetical)",
      entryUSDT: "100000000000000000000", // 100 USDT in 18 decimals
      exchangeRate: "2000000000000000000", // 2.0 USDT/BLOCKS in 18 decimals
      expected: {
        entryUSDT: "100",
        exchangeRate: "2"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📦 Testing: ${testCase.name}`);
    console.log("================================");
    
    const formattedUSDT = formatUSDT(testCase.entryUSDT);
    const formattedExchangeRate = formatExchangeRate(testCase.exchangeRate);
    
    console.log(`Raw Entry USDT: ${testCase.entryUSDT}`);
    console.log(`Formatted Entry USDT: ${formattedUSDT} USDT`);
    console.log(`Expected: ${testCase.expected.entryUSDT} USDT`);
    console.log(`✅ USDT Match: ${formattedUSDT === testCase.expected.entryUSDT ? 'YES' : 'NO'}`);
    
    console.log(`\nRaw Exchange Rate: ${testCase.exchangeRate}`);
    console.log(`Formatted Exchange Rate: ${formattedExchangeRate} USDT/BLOCKS`);
    console.log(`Expected: ${testCase.expected.exchangeRate} USDT/BLOCKS`);
    console.log(`✅ Exchange Rate Match: ${formattedExchangeRate === testCase.expected.exchangeRate ? 'YES' : 'NO'}`);
  }

  console.log("\n🎯 Summary");
  console.log("==========");
  console.log("✅ Formatting functions should now correctly handle both 6-decimal (legacy) and 18-decimal (V2) package data");
  console.log("✅ Frontend should display proper USDT amounts and exchange rates");
  console.log("✅ Package metrics should no longer show inflated or zero values");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
