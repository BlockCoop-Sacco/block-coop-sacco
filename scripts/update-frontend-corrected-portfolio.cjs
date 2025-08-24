const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔄 Updating Frontend Configuration for Corrected Portfolio Metrics...");

  // Load deployment info
  const deploymentFile = path.join(__dirname, "..", "deployments", "deployments-corrected-portfolio-metrics.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Deployment file not found. Please run deploy-corrected-portfolio-metrics.cjs first.");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contracts = deploymentInfo.contracts;

  console.log("Updating frontend with new contract addresses:");
  console.log("PackageManagerV2_1:", contracts.PackageManagerV2_1);

  // Update environment variables (if .env file exists)
  const envFile = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envFile)) {
    let envContent = fs.readFileSync(envFile, "utf8");
    
    // Update PackageManager address
    if (envContent.includes("VITE_PACKAGE_MANAGER_ADDRESS=")) {
      envContent = envContent.replace(
        /VITE_PACKAGE_MANAGER_ADDRESS=.*/,
        `VITE_PACKAGE_MANAGER_ADDRESS=${contracts.PackageManagerV2_1}`
      );
    } else {
      envContent += `\nVITE_PACKAGE_MANAGER_ADDRESS=${contracts.PackageManagerV2_1}`;
    }

    fs.writeFileSync(envFile, envContent);
    console.log("✅ Updated .env file");
  }

  // Update appkit configuration
  const appkitConfigFile = path.join(__dirname, "..", "src", "lib", "appkit.ts");
  if (fs.existsSync(appkitConfigFile)) {
    let appkitContent = fs.readFileSync(appkitConfigFile, "utf8");
    
    // Update PackageManager address in appkit config
    appkitContent = appkitContent.replace(
      /packageManager:\s*['"`][^'"`]*['"`]/,
      `packageManager: '${contracts.PackageManagerV2_1}'`
    );

    fs.writeFileSync(appkitConfigFile, appkitContent);
    console.log("✅ Updated appkit configuration");
  }

  // Copy ABI files
  console.log("\n📋 Updating ABI files...");
  
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const abiDir = path.join(__dirname, "..", "src", "abi");

  // Ensure ABI directory exists
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  // Copy PackageManagerV2_1 ABI
  const packageManagerArtifact = path.join(artifactsDir, "PackageManagerV2_1.sol", "PackageManagerV2_1.json");
  const packageManagerABI = path.join(abiDir, "PackageManagerV2_1.json");
  
  if (fs.existsSync(packageManagerArtifact)) {
    const artifact = JSON.parse(fs.readFileSync(packageManagerArtifact, "utf8"));
    fs.writeFileSync(packageManagerABI, JSON.stringify(artifact.abi, null, 2));
    console.log("✅ Updated PackageManagerV2_1.json ABI");
  }

  // Update contract addresses in a configuration file
  const contractConfigFile = path.join(__dirname, "..", "src", "lib", "contracts.ts");
  if (fs.existsSync(contractConfigFile)) {
    let contractContent = fs.readFileSync(contractConfigFile, "utf8");
    
    // Look for contract address constants and update them
    const addressUpdates = [
      { pattern: /PACKAGE_MANAGER_ADDRESS\s*=\s*['"`][^'"`]*['"`]/, replacement: `PACKAGE_MANAGER_ADDRESS = '${contracts.PackageManagerV2_1}'` },
      { pattern: /packageManager:\s*['"`][^'"`]*['"`]/, replacement: `packageManager: '${contracts.PackageManagerV2_1}'` }
    ];

    addressUpdates.forEach(({ pattern, replacement }) => {
      if (pattern.test(contractContent)) {
        contractContent = contractContent.replace(pattern, replacement);
        console.log("✅ Updated contract address in contracts.ts");
      }
    });

    fs.writeFileSync(contractConfigFile, contractContent);
  }

  // Create a summary file for the frontend team
  const frontendUpdateSummary = {
    timestamp: new Date().toISOString(),
    fix: "Portfolio metrics inflation bug - treasury allocation excluded from user stats",
    changes: {
      packageManagerAddress: {
        old: "Previous address (check deployments-stable-lp-fresh.json)",
        new: contracts.PackageManagerV2_1
      },
      expectedBehavior: {
        before: "100 USDT purchase showed 70+ trillion tokens",
        after: "100 USDT purchase should show ~50 tokens"
      },
      testingRequired: [
        "Test package purchase with 100 USDT",
        "Verify portfolio displays reasonable values",
        "Check ROI calculation shows sensible percentage",
        "Confirm BLOCKS-LP tokens match total user tokens"
      ]
    },
    contracts: contracts,
    network: deploymentInfo.network
  };

  const summaryFile = path.join(__dirname, "..", "FRONTEND_UPDATE_SUMMARY.json");
  fs.writeFileSync(summaryFile, JSON.stringify(frontendUpdateSummary, null, 2));
  console.log(`\n📄 Frontend update summary saved to: ${summaryFile}`);

  console.log("\n✅ Frontend configuration updated successfully!");
  console.log("\n📋 Next steps for frontend team:");
  console.log("1. Restart the development server");
  console.log("2. Test package purchase functionality");
  console.log("3. Verify portfolio metrics show reasonable values");
  console.log("4. Check that ROI calculations are sensible");
  console.log("5. Confirm BLOCKS-LP balances match expected amounts");

  console.log("\n⚠️ Important notes:");
  console.log("- Existing users will still see inflated stats until they make new purchases");
  console.log("- The contract stores cumulative data, so old purchases remain inflated");
  console.log("- New purchases will show correct values");
  console.log("- Consider adding a notice to users about the fix");

  return frontendUpdateSummary;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
