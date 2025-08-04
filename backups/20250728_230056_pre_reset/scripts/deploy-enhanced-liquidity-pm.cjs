const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Enhanced PackageManagerV2_1 with Improved Liquidity Addition...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Use existing contract addresses from current deployment
  const existingContracts = {
    BLOCKS: "0x739D13ac638974DcDc92233cf7B1aa08ffF7728f",
    BLOCKS_LP: "0xaC05CA16038a21c8e6a20E6428B3E30B7FdD9436",
    VestingVault: "0x084c34dc7eBC1c4c10D4B116e222D02A4c1286DA",
    SwapTaxManager: "0xbCE77b95a011e114a8b003e7f211ddf9c3eF381f",
    USDT: "0x350eBe9e8030B5C2e70f831b82b92E44569736fF",
    PancakeRouter: "0xD99D1c33F9fC3444f8101754aBC46c52416550D1",
    PancakeFactory: "0x6725F303b657a9451d8BA641348b6761A6CC7a17",
    Treasury: deployer.address
  };

  console.log("📋 Using existing contract addresses:");
  Object.entries(existingContracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });

  // Deploy enhanced PackageManagerV2_1
  console.log("\n📦 Deploying Enhanced PackageManagerV2_1...");
  const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
  
  // Constructor parameters
  const constructorArgs = [
    existingContracts.USDT,           // usdt_
    existingContracts.BLOCKS,         // share_
    existingContracts.BLOCKS_LP,      // lp_
    existingContracts.VestingVault,   // vault_
    existingContracts.PancakeRouter,  // router_
    existingContracts.PancakeFactory, // factory_
    existingContracts.Treasury,       // treasury_
    existingContracts.SwapTaxManager, // tax_
    deployer.address,                 // admin
    hre.ethers.parseEther("2.0")      // initialGlobalTargetPrice_ (2.0 USDT per BLOCKS)
  ];

  console.log("🔧 Constructor arguments:");
  console.log("   USDT:", constructorArgs[0]);
  console.log("   BLOCKS:", constructorArgs[1]);
  console.log("   BLOCKS-LP:", constructorArgs[2]);
  console.log("   VestingVault:", constructorArgs[3]);
  console.log("   PancakeRouter:", constructorArgs[4]);
  console.log("   PancakeFactory:", constructorArgs[5]);
  console.log("   Treasury:", constructorArgs[6]);
  console.log("   SwapTaxManager:", constructorArgs[7]);
  console.log("   Admin:", constructorArgs[8]);
  console.log("   GlobalTargetPrice:", hre.ethers.formatEther(constructorArgs[9]), "USDT per BLOCKS");

  // Try deployment with lower gas settings
  console.log("🔧 Estimating gas for deployment...");
  const deploymentTx = await PackageManagerV2_1.getDeployTransaction(...constructorArgs);
  const estimatedGas = await deployer.estimateGas(deploymentTx);
  console.log("   Estimated gas:", estimatedGas.toString());

  // Calculate required BNB
  const gasPrice = hre.ethers.parseUnits("3", "gwei");  // Very low gas price
  const totalGas = estimatedGas + BigInt(100000);
  const requiredBNB = totalGas * gasPrice;
  const currentBalance = await deployer.provider.getBalance(deployer.address);

  console.log("💰 Cost Analysis:");
  console.log("   Gas needed:", totalGas.toString());
  console.log("   Gas price:", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");
  console.log("   Required BNB:", hre.ethers.formatEther(requiredBNB));
  console.log("   Current balance:", hre.ethers.formatEther(currentBalance));
  console.log("   Sufficient funds:", currentBalance >= requiredBNB ? "✅ Yes" : "❌ No");

  if (currentBalance < requiredBNB) {
    console.log("\n⚠️  Insufficient funds for deployment!");
    console.log("📝 Options:");
    console.log("   1. Get more testnet BNB from: https://testnet.bnbchain.org/faucet-smart");
    console.log("   2. Wait for network congestion to reduce");
    console.log("   3. Use a different deployment strategy");
    process.exit(1);
  }

  const packageManager = await PackageManagerV2_1.deploy(...constructorArgs, {
    gasLimit: totalGas,
    gasPrice: gasPrice
  });

  console.log("⏳ Waiting for deployment confirmation...");
  await packageManager.waitForDeployment();
  
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ Enhanced PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Grant necessary roles to the new PackageManager
  console.log("\n🔐 Granting roles to Enhanced PackageManager...");
  
  try {
    // Get contract instances
    const blocks = await hre.ethers.getContractAt("BLOCKS", existingContracts.BLOCKS);
    const blocksLP = await hre.ethers.getContractAt("BLOCKS_LP", existingContracts.BLOCKS_LP);
    const vestingVault = await hre.ethers.getContractAt("VestingVault", existingContracts.VestingVault);

    // Grant MINTER_ROLE to PackageManager for BLOCKS
    console.log("   Granting MINTER_ROLE to PackageManager for BLOCKS...");
    const minterRole = await blocks.MINTER_ROLE();
    if (!(await blocks.hasRole(minterRole, packageManagerAddress))) {
      const tx1 = await blocks.grantRole(minterRole, packageManagerAddress);
      await tx1.wait();
      console.log("   ✅ MINTER_ROLE granted for BLOCKS");
    } else {
      console.log("   ℹ️  MINTER_ROLE already granted for BLOCKS");
    }

    // Grant MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP
    console.log("   Granting MINTER_ROLE to PackageManager for BLOCKS-LP...");
    const lpMinterRole = await blocksLP.MINTER_ROLE();
    if (!(await blocksLP.hasRole(lpMinterRole, packageManagerAddress))) {
      const tx2 = await blocksLP.grantRole(lpMinterRole, packageManagerAddress);
      await tx2.wait();
      console.log("   ✅ MINTER_ROLE granted for BLOCKS-LP");
    } else {
      console.log("   ℹ️  MINTER_ROLE already granted for BLOCKS-LP");
    }

    console.log("   Granting BURNER_ROLE to PackageManager for BLOCKS-LP...");
    const lpBurnerRole = await blocksLP.BURNER_ROLE();
    if (!(await blocksLP.hasRole(lpBurnerRole, packageManagerAddress))) {
      const tx3 = await blocksLP.grantRole(lpBurnerRole, packageManagerAddress);
      await tx3.wait();
      console.log("   ✅ BURNER_ROLE granted for BLOCKS-LP");
    } else {
      console.log("   ℹ️  BURNER_ROLE already granted for BLOCKS-LP");
    }

    // Grant LOCKER_ROLE to PackageManager for VestingVault
    console.log("   Granting LOCKER_ROLE to PackageManager for VestingVault...");
    const lockerRole = await vestingVault.LOCKER_ROLE();
    if (!(await vestingVault.hasRole(lockerRole, packageManagerAddress))) {
      const tx4 = await vestingVault.grantRole(lockerRole, packageManagerAddress);
      await tx4.wait();
      console.log("   ✅ LOCKER_ROLE granted for VestingVault");
    } else {
      console.log("   ℹ️  LOCKER_ROLE already granted for VestingVault");
    }

    console.log("✅ All roles granted successfully!");

  } catch (error) {
    console.error("❌ Role granting failed:", error.message);
    console.log("⚠️  You may need to grant roles manually");
  }

  // Test the enhanced features
  console.log("\n🧪 Testing Enhanced Features...");
  
  try {
    // Test slippage tolerance
    const slippageTolerance = await packageManager.slippageTolerance();
    console.log("   Default slippage tolerance:", slippageTolerance.toString(), "basis points (", (Number(slippageTolerance) / 100).toString(), "%)");
    
    // Test global target price
    const globalTargetPrice = await packageManager.globalTargetPrice();
    console.log("   Global target price:", hre.ethers.formatEther(globalTargetPrice), "USDT per BLOCKS");
    
    console.log("✅ Enhanced features verified!");
  } catch (error) {
    console.error("❌ Feature testing failed:", error.message);
  }

  // Save deployment information
  console.log("\n💾 Saving deployment information...");

  const deploymentData = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: "enhanced-liquidity-addition",
    features: [
      "Enhanced automatic liquidity addition with slippage protection",
      "Comprehensive error handling with try-catch blocks",
      "New events for liquidity addition transparency",
      "Fallback mechanism for failed liquidity additions",
      "Configurable slippage tolerance (default 5%)",
      "Liquidity verification checks"
    ],
    contracts: {
      ...existingContracts,
      PackageManagerV2_1: packageManagerAddress,
      PackageManagerV2_1_Previous: "0xb1995f8C4Cf5409814d191e444e6433f5B6c712b" // Previous version
    },
    admins: {
      primary: deployer.address,
      additional: "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987"
    },
    constructorArgs: constructorArgs.map(arg => 
      typeof arg === 'bigint' ? arg.toString() : arg
    )
  };

  // Save to deployments directory
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.resolve(deploymentsDir, "deployments-enhanced-liquidity.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log("📁 Deployment data saved to:", deploymentFile);

  // Create summary for frontend team
  const frontendSummary = {
    timestamp: new Date().toISOString(),
    enhancement: "Enhanced automatic liquidity addition with comprehensive error handling",
    newContractAddress: packageManagerAddress,
    previousContractAddress: "0xb1995f8C4Cf5409814d191e444e6433f5B6c712b",
    newFeatures: [
      "Slippage protection (5% default tolerance)",
      "Comprehensive error handling with fallback mechanisms",
      "New events: LiquidityAdded, LiquidityAdditionFailed, SlippageProtectionTriggered",
      "Admin function to configure slippage tolerance",
      "Automatic fallback to treasury if liquidity addition fails"
    ],
    testingRequired: [
      "Test package purchase with various amounts",
      "Verify liquidity addition events are emitted",
      "Test under high network congestion",
      "Verify fallback mechanism works when DEX is unavailable",
      "Check slippage protection triggers correctly"
    ],
    backwardCompatibility: "Fully backward compatible - no breaking changes to existing functionality"
  };

  fs.writeFileSync(
    path.resolve(__dirname, "../ENHANCED_LIQUIDITY_SUMMARY.json"),
    JSON.stringify(frontendSummary, null, 2)
  );

  console.log("\n🎉 Enhanced PackageManagerV2_1 deployment completed!");
  console.log("📋 Summary:");
  console.log("   Contract Address:", packageManagerAddress);
  console.log("   Network:", hre.network.name);
  console.log("   Deployer:", deployer.address);
  console.log("   Features: Enhanced liquidity addition with comprehensive error handling");
  console.log("\n📝 Next Steps:");
  console.log("   1. Verify contract on BSCScan");
  console.log("   2. Update frontend configuration with new contract address");
  console.log("   3. Test package purchases to verify enhanced liquidity addition");
  console.log("   4. Monitor liquidity addition events for transparency");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
