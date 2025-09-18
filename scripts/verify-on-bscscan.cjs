const { ethers, network } = require("hardhat");

async function main() {
  console.log("🔍 Verifying BLOCKSStakingV2 on BSCScan");
  console.log("Network:", network.name);

  const contractAddress = '0xf30c5bc030C31e28a56ea18F74c78718783d7e6e';
  console.log("Contract Address:", contractAddress);

  try {
    // Run the verification command
    console.log("\n📋 Verification Command:");
    console.log("npx hardhat verify --network bscmainnet", contractAddress, 
                "0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31", // BLOCKS token
                "0x55d398326f99059fF775485246999027B3197955", // USDT token
                "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4"); // Admin address

    console.log("\n🚀 Running verification...");
    
    // Execute the verification
    const { exec } = require('child_process');
    const command = `npx hardhat verify --network bscmainnet ${contractAddress} 0x292E1B8CBE91623E71D6532e6BE6B881Cc0a9c31 0x55d398326f99059fF775485246999027B3197955 0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Verification failed:", error.message);
        return;
      }
      if (stderr) {
        console.error("⚠️ Verification warning:", stderr);
      }
      console.log("✅ Verification output:", stdout);
    });

  } catch (error) {
    console.error("❌ Error during verification:", error.message);
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});