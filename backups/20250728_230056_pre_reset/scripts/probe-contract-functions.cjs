const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Probing Contract Functions");
  console.log("=============================");

  const contractAddress = "0x37981E1F3d6CaC76432DBC50Df5fE4C6092b139c";
  const testAccount = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";
  
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`👤 Test Account: ${testAccount}`);

  try {
    const provider = new hre.ethers.JsonRpcProvider("https://bsc-testnet.public.blastapi.io");
    
    // Check if contract exists
    const code = await provider.getCode(contractAddress);
    if (code === '0x') {
      console.log("❌ No contract found at this address!");
      return;
    }
    console.log("✅ Contract exists at address");

    // Try different function signatures that might exist
    const functionsToTest = [
      {
        name: "getUserStats",
        signature: "getUserStats(address)",
        selector: "0x" + hre.ethers.id("getUserStats(address)").slice(2, 10)
      },
      {
        name: "getUserPurchases", 
        signature: "getUserPurchases(address)",
        selector: "0x" + hre.ethers.id("getUserPurchases(address)").slice(2, 10)
      },
      {
        name: "getPackageCount",
        signature: "getPackageCount()",
        selector: "0x" + hre.ethers.id("getPackageCount()").slice(2, 10)
      },
      {
        name: "getPackage",
        signature: "getPackage(uint256)",
        selector: "0x" + hre.ethers.id("getPackage(uint256)").slice(2, 10)
      },
      {
        name: "userStats",
        signature: "userStats(address)",
        selector: "0x" + hre.ethers.id("userStats(address)").slice(2, 10)
      },
      {
        name: "userPurchases",
        signature: "userPurchases(address,uint256)",
        selector: "0x" + hre.ethers.id("userPurchases(address,uint256)").slice(2, 10)
      }
    ];

    console.log("\n🧪 Testing Function Signatures:");
    console.log("================================");

    for (const func of functionsToTest) {
      try {
        console.log(`\n🔍 Testing ${func.name}:`);
        console.log(`   Signature: ${func.signature}`);
        console.log(`   Selector: ${func.selector}`);
        
        // Try to call the function with raw call
        let callData;
        if (func.name === "getPackageCount") {
          callData = func.selector;
        } else if (func.name === "getPackage") {
          // Call getPackage(0)
          const paddedIndex = hre.ethers.zeroPadValue("0x00", 32);
          callData = func.selector + paddedIndex.slice(2);
        } else {
          // Functions that take an address parameter
          const paddedAddress = hre.ethers.zeroPadValue(testAccount, 32);
          callData = func.selector + paddedAddress.slice(2);
        }
        
        const result = await provider.call({
          to: contractAddress,
          data: callData
        });
        
        if (result && result !== "0x") {
          console.log(`   ✅ SUCCESS: ${result.slice(0, 20)}...`);
          console.log(`   📏 Result length: ${result.length} characters`);
        } else {
          console.log(`   ❌ FAILED: Empty result`);
        }
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message.split('\n')[0]}`);
      }
    }

    // Try to get basic contract info
    console.log("\n📊 Basic Contract Info:");
    console.log("========================");
    
    try {
      // Try getPackageCount
      const packageCountCall = "0x" + hre.ethers.id("getPackageCount()").slice(2, 10);
      const packageCountResult = await provider.call({
        to: contractAddress,
        data: packageCountCall
      });
      
      if (packageCountResult && packageCountResult !== "0x") {
        const packageCount = parseInt(packageCountResult, 16);
        console.log(`📦 Package Count: ${packageCount}`);
      }
    } catch (error) {
      console.log(`❌ Could not get package count: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Error probing contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
