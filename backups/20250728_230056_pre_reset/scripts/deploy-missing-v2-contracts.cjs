const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Missing BlockCoop V2 Contracts (DividendDistributor & SecondaryMarket)");
  console.log("=" .repeat(80));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("⛽ Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Load existing deployment data
  const existingDeployFile = path.resolve(__dirname, "../deployments/deployments-v3-blocks.json");
  
  if (!fs.existsSync(existingDeployFile)) {
    console.error("❌ Existing deployment file not found:", existingDeployFile);
    console.log("Please run the main deployment script first.");
    process.exit(1);
  }

  const existingDeployment = JSON.parse(fs.readFileSync(existingDeployFile));
  console.log("📋 Loaded existing deployment from:", existingDeployFile);
  console.log("⏰ Original deployment:", existingDeployment.timestamp);

  const contracts = existingDeployment.contracts;
  const admins = existingDeployment.admins;
  const external = existingDeployment.externalContracts;

  // Configuration
  const ADMIN_ADDRESS = deployer.address;
  const ADDITIONAL_ADMIN = admins.additional;
  const TREASURY_ADDRESS = deployer.address;
  
  // Global target price for LP operations (2.0 USDT per BLOCKS)
  const GLOBAL_TARGET_PRICE = ethers.parseUnits("2.0", 18);

  console.log("\n📋 Using Existing Contracts:");
  console.log("USDT:", external.USDT);
  console.log("BLOCKS:", contracts.BLOCKS);
  console.log("BLOCKS-LP:", contracts["BLOCKS-LP"]);
  console.log("VestingVault:", contracts.VestingVault);
  console.log("SwapTaxManager:", contracts.SwapTaxManager);
  console.log("PackageManagerV2_1:", contracts.PackageManagerV2_1);

  // Step 1: Deploy DividendDistributor
  console.log("\n📦 Step 1: Deploying DividendDistributor...");
  const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
  const dividendDistributor = await DividendDistributor.deploy(
    contracts.BLOCKS,       // _blocksToken
    external.USDT,          // _dividendToken (USDT for dividends)
    ADMIN_ADDRESS           // admin
  );
  await dividendDistributor.waitForDeployment();
  const dividendDistributorAddress = await dividendDistributor.getAddress();
  console.log("✅ DividendDistributor deployed to:", dividendDistributorAddress);

  // Step 2: Deploy SecondaryMarket
  console.log("\n📦 Step 2: Deploying SecondaryMarket...");
  const SecondaryMarket = await ethers.getContractFactory("SecondaryMarket");
  const secondaryMarket = await SecondaryMarket.deploy(
    external.USDT,              // _usdtToken
    contracts.BLOCKS,           // _blocksToken
    external.PancakeRouter,     // _router
    external.PancakeFactory,    // _factory
    TREASURY_ADDRESS,           // _feeRecipient
    ADMIN_ADDRESS,              // admin
    GLOBAL_TARGET_PRICE         // _targetPrice
  );
  await secondaryMarket.waitForDeployment();
  const secondaryMarketAddress = await secondaryMarket.getAddress();
  console.log("✅ SecondaryMarket deployed to:", secondaryMarketAddress);

  console.log("\n🔧 Setting up roles and permissions...");
  
  // Grant additional admin role to new contracts
  await dividendDistributor.grantRole(await dividendDistributor.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  await secondaryMarket.grantRole(await secondaryMarket.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  
  console.log("✅ Roles and permissions configured");

  // Update deployment data
  const updatedDeployment = {
    ...existingDeployment,
    timestamp: new Date().toISOString(),
    version: "v2-complete-modular",
    features: [
      ...existingDeployment.features || [],
      "DividendDistributor for USDT dividend distribution to BLOCKS holders",
      "SecondaryMarket for bidirectional USDT↔BLOCKS swapping",
      "Complete 8-contract modular architecture"
    ],
    contracts: {
      USDTTestToken: external.USDT,
      BLOCKS: contracts.BLOCKS,
      "BLOCKS-LP": contracts["BLOCKS-LP"],
      VestingVault: contracts.VestingVault,
      SwapTaxManager: contracts.SwapTaxManager,
      PackageManagerV2_1: contracts.PackageManagerV2_1,
      DividendDistributor: dividendDistributorAddress,
      SecondaryMarket: secondaryMarketAddress
    },
    contractCount: {
      total: 8,
      deployed: 8,
      verified: 6, // Will need manual verification for new contracts
      missing: 0
    },
    admins: {
      primary: ADMIN_ADDRESS,
      additional: ADDITIONAL_ADMIN
    },
    externalContracts: external,
    configuration: {
      globalTargetPrice: ethers.formatUnits(GLOBAL_TARGET_PRICE, 18),
      treasury: TREASURY_ADDRESS
    }
  };

  const deployFile = path.resolve(__dirname, "../deployments/deployments-v2-complete-modular.json");
  fs.writeFileSync(deployFile, JSON.stringify(updatedDeployment, null, 2));
  console.log("✅ Updated deployment data saved to:", deployFile);

  console.log("\n🎉 Missing contracts deployment completed successfully!");
  console.log("\n📋 Complete Contract Summary (8/8 contracts):");
  console.log("1. USDTTestToken (18 decimals):", external.USDT);
  console.log("2. BLOCKS:", contracts.BLOCKS);
  console.log("3. BLOCKS-LP:", contracts["BLOCKS-LP"]);
  console.log("4. VestingVault:", contracts.VestingVault);
  console.log("5. SwapTaxManager:", contracts.SwapTaxManager);
  console.log("6. PackageManagerV2_1:", contracts.PackageManagerV2_1);
  console.log("7. DividendDistributor:", dividendDistributorAddress);
  console.log("8. SecondaryMarket:", secondaryMarketAddress);
  
  console.log("\n👥 Admin Addresses:");
  console.log("Primary Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);
  console.log("Treasury:", TREASURY_ADDRESS);

  console.log("\n🔄 Next Steps:");
  console.log("1. Verify new contracts on BSCScan using: npx hardhat run scripts/verify-missing-v2-contracts.cjs --network bsctestnet");
  console.log("2. Update frontend .env file with new contract addresses");
  console.log("3. Update frontend ABIs using: npx hardhat run scripts/update-frontend-abi-v2-complete.cjs --network bsctestnet");
  console.log("4. Test the complete system integration");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
