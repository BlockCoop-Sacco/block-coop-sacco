const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔄 Updating Frontend ABIs for Stable LP Pricing System...");

  // Define contract mappings
  const contracts = [
    {
      name: "BLOCKS",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS.json",
      outputPath: "src/abi/BLOCKS.json"
    },
    {
      name: "BLOCKS_LP",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/BLOCKS_LP.json",
      outputPath: "src/abi/BLOCKS_LP.json"
    },
    {
      name: "VestingVault",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/VestingVault.json",
      outputPath: "src/abi/VestingVault.json"
    },
    {
      name: "SwapTaxManager",
      artifactPath: "artifacts/contracts/BlockCoopV2.sol/SwapTaxManager.json",
      outputPath: "src/abi/SwapTaxManager.json"
    },
    {
      name: "PackageManagerV2_1",
      artifactPath: "artifacts/contracts/PackageManagerV2_1.sol/PackageManagerV2_1.json",
      outputPath: "src/abi/PackageManagerV2_1.json"
    }
  ];

  // Ensure ABI directory exists
  const abiDir = path.join(__dirname, "..", "src", "abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
    console.log("📁 Created ABI directory");
  }

  // Process each contract
  for (const contract of contracts) {
    try {
      console.log(`\n📄 Processing ${contract.name}...`);
      
      // Read the artifact file
      const artifactPath = path.join(__dirname, "..", contract.artifactPath);
      if (!fs.existsSync(artifactPath)) {
        console.error(`❌ Artifact not found: ${artifactPath}`);
        continue;
      }

      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      // Extract ABI
      const abi = artifact.abi;
      
      // Write ABI to frontend
      const outputPath = path.join(__dirname, "..", contract.outputPath);
      fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
      
      console.log(`✅ ${contract.name} ABI updated: ${contract.outputPath}`);
      console.log(`   Functions: ${abi.filter(item => item.type === 'function').length}`);
      console.log(`   Events: ${abi.filter(item => item.type === 'event').length}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${contract.name}:`, error.message);
    }
  }

  // Load deployment data for address verification
  try {
    const deploymentData = JSON.parse(fs.readFileSync("deployments/deployments-stable-lp-fresh.json", "utf8"));
    console.log("\n📋 Contract Addresses (for reference):");
    console.log("- BLOCKS:", deploymentData.contracts.BLOCKS);
    console.log("- BLOCKS-LP:", deploymentData.contracts.BLOCKS_LP);
    console.log("- VestingVault:", deploymentData.contracts.VestingVault);
    console.log("- SwapTaxManager:", deploymentData.contracts.SwapTaxManager);
    console.log("- PackageManagerV2_1:", deploymentData.contracts.PackageManagerV2_1);
  } catch (error) {
    console.error("⚠️ Could not load deployment data:", error.message);
  }

  console.log("\n🎉 Frontend ABI update completed!");
  console.log("📝 Next steps:");
  console.log("1. Restart your development server");
  console.log("2. Test contract interactions");
  console.log("3. Verify all functions work correctly");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
