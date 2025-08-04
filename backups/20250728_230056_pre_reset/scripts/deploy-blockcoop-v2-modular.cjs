const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Complete BlockCoop V2 Modular Deployment (8 Contracts)");
  console.log("=" .repeat(70));
  
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("🌐 Network:", network.name);
  console.log("⛽ Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Configuration
  const ADMIN_ADDRESS = deployer.address;
  const ADDITIONAL_ADMIN = "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987";
  const TREASURY_ADDRESS = deployer.address;
  
  // External contract addresses (BSC Testnet)
  const ROUTER_ADDRESS = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  const FACTORY_ADDRESS = "0x6725F303b657a9451d8BA641348b6761A6CC7a17";
  
  // Global target price for LP operations (2.0 USDT per BLOCKS)
  const GLOBAL_TARGET_PRICE = ethers.parseUnits("2.0", 18);

  console.log("\n📋 Configuration:");
  console.log("Primary Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Global Target Price:", ethers.formatUnits(GLOBAL_TARGET_PRICE, 18), "USDT per BLOCKS");

  // Step 1: Deploy USDTTestToken (18 decimals)
  console.log("\n📦 Step 1: Deploying USDTTestToken (18 decimals)...");
  const USDTTestToken = await ethers.getContractFactory("USDTTestToken");
  const usdtToken = await USDTTestToken.deploy(
    "USDT Test Token (18 decimals)",
    "USDT",
    ADMIN_ADDRESS
  );
  await usdtToken.waitForDeployment();
  const usdtAddress = await usdtToken.getAddress();
  console.log("✅ USDTTestToken deployed to:", usdtAddress);

  // Step 2: Deploy SwapTaxManager
  console.log("\n📦 Step 2: Deploying SwapTaxManager...");
  const SwapTaxManager = await ethers.getContractFactory("SwapTaxManager");
  const swapTaxManager = await SwapTaxManager.deploy(ADMIN_ADDRESS);
  await swapTaxManager.waitForDeployment();
  const swapTaxManagerAddress = await swapTaxManager.getAddress();
  console.log("✅ SwapTaxManager deployed to:", swapTaxManagerAddress);

  // Step 3: Deploy BLOCKS token
  console.log("\n📦 Step 3: Deploying BLOCKS token...");
  const BLOCKS = await ethers.getContractFactory("BLOCKS");
  const blocks = await BLOCKS.deploy(
    "BlockCoop Sacco Token",
    "BLOCKS",
    ADMIN_ADDRESS,
    swapTaxManagerAddress
  );
  await blocks.waitForDeployment();
  const blocksAddress = await blocks.getAddress();
  console.log("✅ BLOCKS deployed to:", blocksAddress);

  // Step 4: Deploy BLOCKS-LP token
  console.log("\n📦 Step 4: Deploying BLOCKS-LP token...");
  const BLOCKS_LP = await ethers.getContractFactory("BLOCKS_LP");
  const blocksLP = await BLOCKS_LP.deploy(
    "BlockCoop Sacco LP Token", 
    "BLOCKS-LP", 
    ADMIN_ADDRESS
  );
  await blocksLP.waitForDeployment();
  const blocksLPAddress = await blocksLP.getAddress();
  console.log("✅ BLOCKS-LP deployed to:", blocksLPAddress);

  // Step 5: Deploy VestingVault
  console.log("\n📦 Step 5: Deploying VestingVault...");
  const VestingVault = await ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(blocksAddress, ADMIN_ADDRESS);
  await vestingVault.waitForDeployment();
  const vestingVaultAddress = await vestingVault.getAddress();
  console.log("✅ VestingVault deployed to:", vestingVaultAddress);

  // Step 6: Deploy PackageManagerV2_1
  console.log("\n📦 Step 6: Deploying PackageManagerV2_1...");
  const PackageManagerV2_1 = await ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    usdtAddress,            // usdt_
    blocksAddress,          // share_ (BLOCKS)
    blocksLPAddress,        // lp_ (BLOCKS-LP)
    vestingVaultAddress,    // vault_
    ROUTER_ADDRESS,         // router_
    FACTORY_ADDRESS,        // factory_
    TREASURY_ADDRESS,       // treasury_
    swapTaxManagerAddress,  // tax_
    ADMIN_ADDRESS,          // admin
    GLOBAL_TARGET_PRICE     // initialGlobalTargetPrice_
  );
  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Step 7: Deploy DividendDistributor
  console.log("\n📦 Step 7: Deploying DividendDistributor...");
  const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
  const dividendDistributor = await DividendDistributor.deploy(
    blocksAddress,          // _blocksToken
    usdtAddress,            // _dividendToken (USDT for dividends)
    ADMIN_ADDRESS           // admin
  );
  await dividendDistributor.waitForDeployment();
  const dividendDistributorAddress = await dividendDistributor.getAddress();
  console.log("✅ DividendDistributor deployed to:", dividendDistributorAddress);

  // Step 8: Deploy SecondaryMarket
  console.log("\n📦 Step 8: Deploying SecondaryMarket...");
  const SecondaryMarket = await ethers.getContractFactory("SecondaryMarket");
  const secondaryMarket = await SecondaryMarket.deploy(
    usdtAddress,            // _usdtToken
    blocksAddress,          // _blocksToken
    ROUTER_ADDRESS,         // _router
    FACTORY_ADDRESS,        // _factory
    TREASURY_ADDRESS,       // _feeRecipient
    ADMIN_ADDRESS,          // admin
    GLOBAL_TARGET_PRICE     // _targetPrice
  );
  await secondaryMarket.waitForDeployment();
  const secondaryMarketAddress = await secondaryMarket.getAddress();
  console.log("✅ SecondaryMarket deployed to:", secondaryMarketAddress);

  console.log("\n🔧 Setting up roles and permissions...");
  
  // Grant roles to PackageManager
  await blocks.grantRole(await blocks.MINTER_ROLE(), packageManagerAddress);
  await blocksLP.grantRole(await blocksLP.MINTER_ROLE(), packageManagerAddress);
  await vestingVault.grantRole(await vestingVault.LOCKER_ROLE(), packageManagerAddress);
  await swapTaxManager.grantRole(await swapTaxManager.MANAGER_ROLE(), packageManagerAddress);
  
  // Grant additional admin role
  await blocks.grantRole(await blocks.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  await blocksLP.grantRole(await blocksLP.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  await vestingVault.grantRole(await vestingVault.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  await swapTaxManager.grantRole(await swapTaxManager.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  await packageManager.grantRole(await packageManager.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  await dividendDistributor.grantRole(await dividendDistributor.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  await secondaryMarket.grantRole(await secondaryMarket.DEFAULT_ADMIN_ROLE(), ADDITIONAL_ADMIN);
  
  console.log("✅ Roles and permissions configured");

  // Save deployment data
  const deploymentData = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: "v2-complete-modular",
    features: [
      "18-decimal USDT test token for V2 architecture",
      "Complete 8-contract modular architecture",
      "Package management with 70/30 USDT split logic",
      "BLOCKS token calculations using global target price",
      "1:1 BLOCKS-LP token distribution",
      "Vesting mechanisms with cliff and duration",
      "Fixed referral system with direct minting",
      "Dividend distribution to BLOCKS holders",
      "Bidirectional USDT↔BLOCKS secondary market",
      "Comprehensive access control and security features"
    ],
    contracts: {
      USDTTestToken: usdtAddress,
      BLOCKS: blocksAddress,
      "BLOCKS-LP": blocksLPAddress,
      VestingVault: vestingVaultAddress,
      SwapTaxManager: swapTaxManagerAddress,
      PackageManagerV2_1: packageManagerAddress,
      DividendDistributor: dividendDistributorAddress,
      SecondaryMarket: secondaryMarketAddress
    },
    contractCount: {
      total: 8,
      deployed: 8,
      verified: 0, // Will be updated after verification
      missing: 0
    },
    admins: {
      primary: ADMIN_ADDRESS,
      additional: ADDITIONAL_ADMIN
    },
    externalContracts: {
      PancakeRouter: ROUTER_ADDRESS,
      PancakeFactory: FACTORY_ADDRESS
    },
    configuration: {
      globalTargetPrice: ethers.formatUnits(GLOBAL_TARGET_PRICE, 18),
      treasury: TREASURY_ADDRESS
    }
  };

  const deployFile = path.resolve(__dirname, "../deployments/deployments-v2-complete-modular.json");
  fs.writeFileSync(deployFile, JSON.stringify(deploymentData, null, 2));
  console.log("✅ Deployment data saved to:", deployFile);

  console.log("\n🎉 Complete BlockCoop V2 Modular deployment completed successfully!");
  console.log("\n📋 Contract Summary (8/8 contracts):");
  console.log("1. USDTTestToken (18 decimals):", usdtAddress);
  console.log("2. BLOCKS:", blocksAddress);
  console.log("3. BLOCKS-LP:", blocksLPAddress);
  console.log("4. VestingVault:", vestingVaultAddress);
  console.log("5. SwapTaxManager:", swapTaxManagerAddress);
  console.log("6. PackageManagerV2_1:", packageManagerAddress);
  console.log("7. DividendDistributor:", dividendDistributorAddress);
  console.log("8. SecondaryMarket:", secondaryMarketAddress);
  
  console.log("\n👥 Admin Addresses:");
  console.log("Primary Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);
  console.log("Treasury:", TREASURY_ADDRESS);

  console.log("\n🔄 Next Steps:");
  console.log("1. Verify contracts on BSCScan using: npx hardhat run scripts/verify-v2-complete-modular.cjs --network bsctestnet");
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
