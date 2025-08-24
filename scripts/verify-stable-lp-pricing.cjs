const { run } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying Stable LP Pricing PackageManagerV2_1 on BSCScan...");

  // Load deployment data
  const data = JSON.parse(fs.readFileSync("deployments/deployments-stable-lp.json", "utf8"));
  const packageManagerAddress = data.contracts.PackageManagerV2_1;

  console.log("📍 Contract address:", packageManagerAddress);

  // Constructor arguments for verification
  const constructorArgs = [
    data.externalContracts.USDT,     // usdt_
    data.contracts.BLOCKS,           // share_ (BLOCKS token)
    data.contracts["BLOCKS-LP"],     // lp_ (BLOCKS-LP token)
    data.contracts.VestingVault,     // vault_
    data.externalContracts.PancakeRouter,  // router_
    data.externalContracts.PancakeFactory, // factory_
    data.contracts.Treasury,         // treasury_
    data.contracts.SwapTaxManager,   // tax_
    data.admins.primary              // admin
  ];

  console.log("\n📝 Constructor arguments:");
  console.log("USDT:", constructorArgs[0]);
  console.log("BLOCKS:", constructorArgs[1]);
  console.log("BLOCKS-LP:", constructorArgs[2]);
  console.log("VestingVault:", constructorArgs[3]);
  console.log("PancakeRouter:", constructorArgs[4]);
  console.log("PancakeFactory:", constructorArgs[5]);
  console.log("Treasury:", constructorArgs[6]);
  console.log("SwapTaxManager:", constructorArgs[7]);
  console.log("Admin:", constructorArgs[8]);

  try {
    console.log("\n🚀 Starting verification...");
    await run("verify:verify", {
      address: packageManagerAddress,
      constructorArguments: constructorArgs,
      contract: "contracts/PackageManagerV2_1.sol:PackageManagerV2_1"
    });
    
    console.log("✅ Contract verified successfully on BSCScan!");
    console.log(`🔗 View on BSCScan: https://bscscan.com/address/${packageManagerAddress}#code`);
    
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified on BSCScan!");
      console.log(`🔗 View on BSCScan: https://bscscan.com/address/${packageManagerAddress}#code`);
    } else {
      console.error("❌ Verification failed:", error.message);
      
      // Save verification data for manual verification
      const verificationData = {
        address: packageManagerAddress,
        constructorArguments: constructorArgs,
        contract: "contracts/PackageManagerV2_1.sol:PackageManagerV2_1",
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(
        "deployments/verification-stable-lp.json",
        JSON.stringify(verificationData, null, 2)
      );
      
      console.log("📄 Verification data saved to deployments/verification-stable-lp.json");
      console.log("You can use this data for manual verification on BSCScan");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
