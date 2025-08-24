const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchContractABI() {
  const contractAddress = "0x37981E1F3d6CaC76432DBC50Df5fE4C6092b139c";
  console.log(`🔍 Fetching ABI for contract: ${contractAddress}`);

  try {
    // Try BSCScan API without API key (public endpoint)
    const bscScanUrl = `https://api-testnet.bscscan.com/api?module=contract&action=getabi&address=${contractAddress}`;
    
    console.log("📡 Attempting to fetch from BSCScan API...");
    const response = await axios.get(bscScanUrl);
    
    if (response.data && response.data.status === "1" && response.data.result) {
      console.log("✅ Successfully fetched ABI from BSCScan");
      
      // Parse the ABI
      const abi = JSON.parse(response.data.result);
      console.log(`📋 ABI contains ${abi.length} functions/events`);
      
      // Check if getUserStats function exists
      const getUserStatsFunction = abi.find(item => 
        item.type === 'function' && item.name === 'getUserStats'
      );
      
      if (getUserStatsFunction) {
        console.log("✅ getUserStats function found in ABI");
        console.log("📝 Function signature:", getUserStatsFunction);
      } else {
        console.log("❌ getUserStats function NOT found in ABI");
        console.log("📋 Available functions:");
        abi.filter(item => item.type === 'function')
           .slice(0, 10) // Show first 10 functions
           .forEach(func => console.log(`   - ${func.name}`));
      }
      
      // Save the ABI to a file
      const abiData = {
        contractName: "PackageManagerV2_1",
        abi: abi,
        address: contractAddress,
        deploymentTimestamp: new Date().toISOString(),
        network: "bsctestnet",
        source: "BSCScan Explorer"
      };
      
      const outputPath = path.join(__dirname, "../src/abi/PackageManager_Explorer.json");
      fs.writeFileSync(outputPath, JSON.stringify(abiData, null, 2));
      console.log(`💾 ABI saved to: ${outputPath}`);
      
      return abi;
    } else {
      console.log("❌ Failed to fetch ABI from BSCScan");
      console.log("Response:", response.data);
      return null;
    }
  } catch (error) {
    console.error("❌ Error fetching ABI:", error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 Fetching Contract ABI from Explorer");
  console.log("=====================================");
  
  const abi = await fetchContractABI();
  
  if (abi) {
    console.log("\n✅ ABI fetch completed successfully");
  } else {
    console.log("\n❌ Failed to fetch ABI");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
