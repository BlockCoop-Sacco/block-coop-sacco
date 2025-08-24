const fs = require("fs");
const path = require("path");
const { run } = require("hardhat");

/**
 * Verify BlockCoop V3 contracts on BSCScan
 */

async function main() {
  console.log("🔍 Verifying BlockCoop V3 contracts on BSCScan...");
  
  const deployFile = path.resolve(__dirname, "../deployments/deployments-v3-blocks.json");
  
  if (!fs.existsSync(deployFile)) {
    throw new Error("V3 deployment file not found. Please deploy contracts first.");
  }
  
  const data = JSON.parse(fs.readFileSync(deployFile));
  console.log("📍 Using V3 deployment from:", data.timestamp);

  const contracts = [
    {
      name: "BLOCKS",
      address: data.contracts.BLOCKS,
      constructorArguments: [
        "BlockCoop Sacco Share Token", // name
        "BLOCKS",                      // symbol
        data.admins.primary            // admin
      ]
    },
    {
      name: "BLOCKS_LP",
      address: data.contracts["BLOCKS-LP"],
      constructorArguments: [
        "BlockCoop Sacco LP Token", // name
        "BLOCKS-LP",                // symbol
        data.admins.primary         // admin
      ]
    },
    {
      name: "VestingVault",
      address: data.contracts.VestingVault,
      constructorArguments: [
        data.contracts.BLOCKS,  // shareToken (now BLOCKS)
        data.admins.primary     // admin
      ]
    },
    {
      name: "SwapTaxManager",
      address: data.contracts.SwapTaxManager,
      constructorArguments: [
        data.admins.primary // admin
      ]
    },
    {
      name: "PackageManagerV2_1",
      address: data.contracts.PackageManagerV2_1,
      constructorArguments: [
        data.externalContracts.USDT,           // usdt_
        data.contracts.BLOCKS,                 // share_ (now BLOCKS)
        data.contracts["BLOCKS-LP"],           // lp_ (now BLOCKS-LP)
        data.contracts.VestingVault,           // vault_
        data.externalContracts.PancakeRouter,  // router_
        data.externalContracts.PancakeFactory, // factory_
        data.contracts.Treasury,               // treasury_
        data.contracts.SwapTaxManager,         // tax_
        data.admins.primary                    // admin
      ]
    }
  ];

  const verificationResults = [];

  for (const contract of contracts) {
    console.log(`\n🔍 Verifying ${contract.name} at ${contract.address}...`);
    
    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
      });
      
      console.log(`✅ ${contract.name} verified successfully`);
      verificationResults.push({
        name: contract.name,
        address: contract.address,
        status: "verified",
        bscscanUrl: `https://testnet.bscscan.com/address/${contract.address}#code`
      });
      
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`✅ ${contract.name} already verified`);
        verificationResults.push({
          name: contract.name,
          address: contract.address,
          status: "already_verified",
          bscscanUrl: `https://testnet.bscscan.com/address/${contract.address}#code`
        });
      } else {
        console.log(`❌ ${contract.name} verification failed: ${error.message}`);
        verificationResults.push({
          name: contract.name,
          address: contract.address,
          status: "failed",
          error: error.message,
          bscscanUrl: `https://testnet.bscscan.com/address/${contract.address}`
        });
      }
    }
    
    // Wait a bit between verifications to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n📋 Verification Summary:");
  console.log("=" .repeat(80));
  
  for (const result of verificationResults) {
    const status = result.status === "verified" || result.status === "already_verified" ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
    console.log(`   Address: ${result.address}`);
    console.log(`   BSCScan: ${result.bscscanUrl}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log("");
  }

  // Save verification results
  const verificationFile = path.resolve(__dirname, "../deployments/verification-results-v3.json");
  fs.writeFileSync(verificationFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    network: "bsctestnet",
    results: verificationResults
  }, null, 2));
  
  console.log(`💾 Verification results saved to: ${verificationFile}`);

  const successCount = verificationResults.filter(r => 
    r.status === "verified" || r.status === "already_verified"
  ).length;
  
  console.log(`\n🎯 Verification completed: ${successCount}/${verificationResults.length} contracts verified`);
  
  if (successCount === verificationResults.length) {
    console.log("🎉 All contracts verified successfully!");
  } else {
    console.log("⚠️  Some contracts failed verification. Check the errors above.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
