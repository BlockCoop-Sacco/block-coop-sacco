const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying Enhanced BLOCKS Token on BSCScan...\n");

  // Load deployment data
  const deployFile = "deployments/deployments-enhanced-blocks.json";
  if (!fs.existsSync(deployFile)) {
    throw new Error(`Enhanced BLOCKS deployment file not found: ${deployFile}`);
  }

  const data = JSON.parse(fs.readFileSync(deployFile));
  const blocksAddress = data.contracts.BLOCKS;
  
  console.log("📋 Contract to verify:", blocksAddress);
  console.log("🌐 Network:", process.env.HARDHAT_NETWORK || "bsctestnet");

  // Constructor arguments - MUST match deploy-blocks-with-dex-tax.cjs exactly
  const constructorArgs = [
    "BlockCoop Sacco Share Token", // name
    "BLOCKS",                      // symbol
    data.admins.primary,           // admin
    data.contracts.SwapTaxManager  // swapTaxManager
  ];

  console.log("\n🔧 Constructor arguments:");
  console.log("Name:", constructorArgs[0]);
  console.log("Symbol:", constructorArgs[1]);
  console.log("Admin:", constructorArgs[2]);
  console.log("SwapTaxManager:", constructorArgs[3]);

  try {
    console.log("\n⏳ Starting verification...");
    
    await hre.run("verify:verify", {
      address: blocksAddress,
      constructorArguments: constructorArgs,
      contract: "contracts/BlockCoopV2.sol:BLOCKS"
    });

    console.log("✅ Enhanced BLOCKS token verified successfully!");
    
    // Save verification result
    const verificationResult = {
      timestamp: new Date().toISOString(),
      network: process.env.HARDHAT_NETWORK || "bsctestnet",
      contract: {
        name: "Enhanced BLOCKS",
        address: blocksAddress,
        status: "verified",
        bscscanUrl: `https://testnet.bscscan.com/address/${blocksAddress}#code`
      },
      constructorArgs: constructorArgs
    };

    const outputFile = "deployments/verification-enhanced-blocks.json";
    fs.writeFileSync(outputFile, JSON.stringify(verificationResult, null, 2));
    console.log("📄 Verification result saved to:", outputFile);

    console.log("\n🔗 BSCScan URL:");
    console.log(`https://testnet.bscscan.com/address/${blocksAddress}#code`);

  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified on BSCScan");
      console.log(`🔗 https://testnet.bscscan.com/address/${blocksAddress}#code`);
    } else {
      console.error("❌ Verification failed:");
      console.error(error.message);
      
      console.log("\n🔧 Troubleshooting:");
      console.log("1. Check constructor arguments match deployment exactly");
      console.log("2. Ensure contract source code is identical");
      console.log("3. Verify network configuration");
      console.log("4. Check BSCScan API key in .env");
      
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("\n❌ Verification script failed:");
  console.error(error);
  process.exit(1);
});
