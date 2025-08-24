const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔧 Deploying PackageManagerV2_1 with Referral Calculation Fix...");
  console.log("================================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Load existing deployment data
  const deploymentFile = path.resolve(__dirname, "../deployments/deployments-enhanced-liquidity.json");
  
  if (!fs.existsSync(deploymentFile)) {
    console.error("❌ Enhanced liquidity deployment file not found. Please deploy the base system first.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(deploymentFile));
  console.log("📋 Using existing contract addresses from enhanced liquidity deployment");

  // Deploy new PackageManagerV2_1 with referral fix
  console.log("\n📦 Step 1: Deploying PackageManagerV2_1 with referral calculation fix...");
  const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    data.contracts.USDT,           // usdt_
    data.contracts.BLOCKS,         // share_ (BLOCKS token)
    data.contracts.BLOCKS_LP,      // lp_ (BLOCKS-LP token)
    data.contracts.VestingVault,   // vault_
    data.contracts.PancakeRouter,  // router_
    data.contracts.PancakeFactory, // factory_
    data.contracts.Treasury,       // treasury_
    data.contracts.SwapTaxManager, // tax_
    data.admins.primary,           // admin
    hre.ethers.parseUnits("2.0", 18) // globalTargetPrice (2.0 USDT per BLOCKS)
  );

  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Grant necessary roles
  console.log("\n🔐 Step 2: Granting roles...");
  
  // Grant MINTER_ROLE to PackageManager for BLOCKS token
  const blocks = await hre.ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  await blocks.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ Granted MINTER_ROLE to PackageManager for BLOCKS token");

  // Grant MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP token
  const blocksLP = await hre.ethers.getContractAt("BLOCKS_LP", data.contracts.BLOCKS_LP);
  const LP_MINTER_ROLE = await blocksLP.MINTER_ROLE();
  const LP_BURNER_ROLE = await blocksLP.BURNER_ROLE();
  await blocksLP.grantRole(LP_MINTER_ROLE, packageManagerAddress);
  await blocksLP.grantRole(LP_BURNER_ROLE, packageManagerAddress);
  console.log("✅ Granted MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP token");

  // Grant LOCKER_ROLE to PackageManager for VestingVault
  const vestingVault = await hre.ethers.getContractAt("VestingVault", data.contracts.VestingVault);
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ Granted LOCKER_ROLE to PackageManager for VestingVault");

  // Verify roles
  console.log("\n🔍 Step 3: Verifying roles...");
  const hasBlocksMinter = await blocks.hasRole(MINTER_ROLE, packageManagerAddress);
  const hasLPMinter = await blocksLP.hasRole(LP_MINTER_ROLE, packageManagerAddress);
  const hasLPBurner = await blocksLP.hasRole(LP_BURNER_ROLE, packageManagerAddress);
  const hasVaultLocker = await vestingVault.hasRole(LOCKER_ROLE, packageManagerAddress);

  console.log(`BLOCKS MINTER_ROLE: ${hasBlocksMinter ? '✅' : '❌'}`);
  console.log(`BLOCKS-LP MINTER_ROLE: ${hasLPMinter ? '✅' : '❌'}`);
  console.log(`BLOCKS-LP BURNER_ROLE: ${hasLPBurner ? '✅' : '❌'}`);
  console.log(`VestingVault LOCKER_ROLE: ${hasVaultLocker ? '✅' : '❌'}`);

  if (!hasBlocksMinter || !hasLPMinter || !hasLPBurner || !hasVaultLocker) {
    throw new Error("❌ Role verification failed - not all roles were granted correctly");
  }

  // Update deployment data
  console.log("\n📝 Step 4: Updating deployment data...");
  const updatedData = {
    ...data,
    timestamp: new Date().toISOString(),
    version: "referral-calculation-fix",
    features: [
      ...data.features,
      "Fixed referral calculation bug (5% instead of 5.26%)",
      "Referral rewards calculated on totalUserTokens instead of totalTokens"
    ],
    contracts: {
      ...data.contracts,
      PackageManagerV2_1_Previous: data.contracts.PackageManagerV2_1,
      PackageManagerV2_1: packageManagerAddress
    },
    constructorArgs: [
      data.contracts.USDT,
      data.contracts.BLOCKS,
      data.contracts.BLOCKS_LP,
      data.contracts.VestingVault,
      data.contracts.PancakeRouter,
      data.contracts.PancakeFactory,
      data.contracts.Treasury,
      data.contracts.SwapTaxManager,
      data.admins.primary,
      "2000000000000000000" // globalTargetPrice
    ],
    referralFix: {
      timestamp: new Date().toISOString(),
      issue: "Referral calculation was using totalTokens (including 5% treasury) instead of totalUserTokens",
      fix: "Changed line 621: referralReward = (totalUserTokens * pkg.referralBps) / 10_000",
      expectedBehavior: "5% referral rate now calculates exactly 5% instead of 5.26%"
    }
  };

  // Save updated deployment data
  const outputFile = path.resolve(__dirname, "../deployments/deployments-referral-fix.json");
  fs.writeFileSync(outputFile, JSON.stringify(updatedData, null, 2));
  console.log("✅ Deployment data saved to:", outputFile);

  console.log("\n🎉 Deployment Summary:");
  console.log("======================");
  console.log("New PackageManagerV2_1:", packageManagerAddress);
  console.log("Previous PackageManagerV2_1:", data.contracts.PackageManagerV2_1);
  console.log("Network: BSC Testnet");
  console.log("Fix: Referral calculation now uses totalUserTokens instead of totalTokens");
  console.log("Expected: 5% referral rate instead of 5.26%");

  console.log("\n📋 Next Steps:");
  console.log("1. Verify contract on BSCScan");
  console.log("2. Update frontend .env with new contract address");
  console.log("3. Test referral system with small purchase");
  console.log("4. Configure packages and tax buckets");

  console.log("\n🔗 Verification Command:");
  console.log(`npx hardhat run scripts/verify-referral-fix.cjs --network bsctestnet`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
