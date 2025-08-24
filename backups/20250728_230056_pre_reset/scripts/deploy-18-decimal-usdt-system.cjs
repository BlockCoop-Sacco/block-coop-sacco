const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying BlockCoop V2 System with 18-decimal USDT...");
  console.log("📋 Features: 18-decimal USDT test token + Updated decimal handling");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // External contract addresses (keep existing router/factory)
  const ROUTER_ADDRESS = process.env.VITE_ROUTER_ADDRESS;
  const FACTORY_ADDRESS = process.env.VITE_FACTORY_ADDRESS;

  // Treasury address (deployer for now)
  const TREASURY_ADDRESS = deployer.address;
  
  // Initial global target price: 2.0 USDT per BLOCKS (in 18-decimal precision for V2)
  const INITIAL_GLOBAL_TARGET_PRICE = hre.ethers.parseUnits("2.0", 18);

  console.log("Using external contract addresses:");
  console.log("PancakeRouter:", ROUTER_ADDRESS);
  console.log("PancakeFactory:", FACTORY_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Initial Global Target Price:", hre.ethers.formatUnits(INITIAL_GLOBAL_TARGET_PRICE, 18), "USDT per BLOCKS");

  // Deploy 18-decimal USDT test token first
  console.log("\n📦 Step 1: Deploying 18-decimal USDT Test Token...");
  const USDTTestToken = await hre.ethers.getContractFactory("USDTTestToken");
  const usdtToken = await USDTTestToken.deploy(
    "USDT Test Token (18 decimals)",
    "USDT",
    deployer.address
  );

  await usdtToken.waitForDeployment();
  const usdtAddress = await usdtToken.getAddress();
  console.log("✅ USDTTestToken deployed to:", usdtAddress);

  // Verify USDT decimals
  const usdtDecimals = await usdtToken.decimals();
  console.log("✅ USDT decimals confirmed:", usdtDecimals);
  if (Number(usdtDecimals) !== 18) {
    throw new Error("USDT token must have 18 decimals for V2 architecture");
  }

  // Deploy all BlockCoop contracts fresh
  console.log("\n📦 Step 2: Deploying SwapTaxManager...");
  const SwapTaxManager = await hre.ethers.getContractFactory("SwapTaxManager");
  const swapTaxManager = await SwapTaxManager.deploy(deployer.address);

  await swapTaxManager.waitForDeployment();
  const taxAddress = await swapTaxManager.getAddress();
  console.log("✅ SwapTaxManager deployed to:", taxAddress);

  console.log("\n📦 Step 3: Deploying BLOCKS token...");
  const BLOCKS = await hre.ethers.getContractFactory("BLOCKS");
  const shareToken = await BLOCKS.deploy(
    "BlockCoop Sacco Share Token",
    "BLOCKS",
    deployer.address,
    taxAddress
  );

  await shareToken.waitForDeployment();
  const shareAddress = await shareToken.getAddress();
  console.log("✅ BLOCKS deployed to:", shareAddress);

  console.log("\n📦 Step 4: Deploying BLOCKS-LP token...");
  const BLOCKS_LP = await hre.ethers.getContractFactory("BLOCKS_LP");
  const lpToken = await BLOCKS_LP.deploy(
    "BlockCoop Sacco LP Token",
    "BLOCKS-LP",
    deployer.address
  );

  await lpToken.waitForDeployment();
  const lpAddress = await lpToken.getAddress();
  console.log("✅ BLOCKS-LP deployed to:", lpAddress);

  console.log("\n📦 Step 5: Deploying VestingVault...");
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(shareAddress, deployer.address);

  await vestingVault.waitForDeployment();
  const vaultAddress = await vestingVault.getAddress();
  console.log("✅ VestingVault deployed to:", vaultAddress);

  console.log("\n📦 Step 6: Deploying PackageManagerV2_1 with 18-decimal USDT support...");
  const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    usdtAddress,                     // usdt_ (18-decimal test token)
    shareAddress,                    // share_ (BLOCKS token)
    lpAddress,                       // lp_ (BLOCKS-LP token)
    vaultAddress,                    // vault_
    ROUTER_ADDRESS,                  // router_
    FACTORY_ADDRESS,                 // factory_
    TREASURY_ADDRESS,                // treasury_
    taxAddress,                      // tax_
    deployer.address,                // admin
    INITIAL_GLOBAL_TARGET_PRICE      // initialGlobalTargetPrice_ (18 decimals)
  );

  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Verify 18-decimal system is working
  console.log("\n🔍 Verifying 18-decimal system...");
  const globalTargetPrice = await packageManager.globalTargetPrice();
  console.log("✅ Global target price set to:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");

  // Grant roles
  console.log("\n🔐 Step 7: Granting roles...");
  
  // Grant MINTER_ROLE to PackageManager for BLOCKS token
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  await shareToken.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ Granted MINTER_ROLE to PackageManager for BLOCKS token");

  // Grant BURNER_ROLE to PackageManager for BLOCKS-LP token
  const BURNER_ROLE = await lpToken.BURNER_ROLE();
  await lpToken.grantRole(BURNER_ROLE, packageManagerAddress);
  console.log("✅ Granted BURNER_ROLE to PackageManager for BLOCKS-LP token");

  // Grant LOCKER_ROLE to PackageManager for VestingVault
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ Granted LOCKER_ROLE to PackageManager for VestingVault");

  console.log("\n📝 Step 8: Creating test packages with 18-decimal values...");
  
  // Test packages with 18-decimal USDT amounts and exchange rates
  const testPackages = [
    {
      name: "Starter Package",
      entryUSDT: hre.ethers.parseUnits("100", 18),    // 100 USDT (18 decimals)
      exchangeRate: hre.ethers.parseUnits("1.5", 18), // 1.5 USDT per BLOCKS (18 decimals)
      vestBps: 7000,                                   // 70% vesting
      cliff: 0,                                        // No cliff
      duration: 86400 * 30,                           // 30 days
      referralBps: 250                                 // 2.5% referral
    },
    {
      name: "Growth Package",
      entryUSDT: hre.ethers.parseUnits("500", 18),    // 500 USDT (18 decimals)
      exchangeRate: hre.ethers.parseUnits("1.8", 18), // 1.8 USDT per BLOCKS (18 decimals)
      vestBps: 7000,                                   // 70% vesting
      cliff: 86400 * 7,                               // 7 day cliff
      duration: 86400 * 90,                           // 90 days
      referralBps: 500                                 // 5% referral
    },
    {
      name: "Premium Package",
      entryUSDT: hre.ethers.parseUnits("1000", 18),   // 1000 USDT (18 decimals)
      exchangeRate: hre.ethers.parseUnits("2.2", 18), // 2.2 USDT per BLOCKS (18 decimals)
      vestBps: 7000,                                   // 70% vesting
      cliff: 86400 * 14,                              // 14 day cliff
      duration: 86400 * 180,                          // 180 days
      referralBps: 500                                 // 5% referral
    }
  ];

  for (let i = 0; i < testPackages.length; i++) {
    const pkg = testPackages[i];
    try {
      console.log(`📝 Adding ${pkg.name}...`);
      const tx = await packageManager.addPackage(
        pkg.name,
        pkg.entryUSDT,
        pkg.exchangeRate,
        pkg.vestBps,
        pkg.cliff,
        pkg.duration,
        pkg.referralBps
      );
      await tx.wait();
      console.log(`✅ ${pkg.name} added with exchange rate: ${hre.ethers.formatUnits(pkg.exchangeRate, 18)} USDT per BLOCKS`);
    } catch (error) {
      console.log(`❌ Failed to add ${pkg.name}: ${error.message}`);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    deployer: deployer.address,
    version: "v2-18-decimal-usdt",
    features: [
      "18-decimal USDT test token for V2 architecture",
      "Updated decimal handling in PackageManager",
      "Consistent 18-decimal precision across all tokens",
      "Enhanced compatibility with V2 modular architecture"
    ],
    contracts: {
      USDTTestToken: usdtAddress,
      PackageManagerV2_1: packageManagerAddress,
      BLOCKS: shareAddress,
      BLOCKS_LP: lpAddress,
      VestingVault: vaultAddress,
      SwapTaxManager: taxAddress,
      PancakeRouter: ROUTER_ADDRESS,
      Treasury: TREASURY_ADDRESS
    },
    pricing: {
      globalTargetPrice: hre.ethers.formatUnits(INITIAL_GLOBAL_TARGET_PRICE, 18),
      testPackages: testPackages.map(pkg => ({
        name: pkg.name,
        exchangeRate: hre.ethers.formatUnits(pkg.exchangeRate, 18)
      }))
    },
    gasUsed: {
      USDTTestToken: (await usdtToken.deploymentTransaction().wait()).gasUsed.toString(),
      BLOCKS: (await shareToken.deploymentTransaction().wait()).gasUsed.toString(),
      BLOCKS_LP: (await lpToken.deploymentTransaction().wait()).gasUsed.toString(),
      VestingVault: (await vestingVault.deploymentTransaction().wait()).gasUsed.toString(),
      SwapTaxManager: (await swapTaxManager.deploymentTransaction().wait()).gasUsed.toString(),
      PackageManagerV2_1: (await packageManager.deploymentTransaction().wait()).gasUsed.toString()
    }
  };

  // Save to file
  const deploymentFile = `deployments/deployments-v2-18-decimal.json`;
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentFile}`);

  console.log("\n🎉 BlockCoop V2 18-decimal USDT system deployment completed!");
  console.log("📋 Summary:");
  console.log("- USDTTestToken (18 decimals):", usdtAddress);
  console.log("- BLOCKS:", shareAddress);
  console.log("- BLOCKS-LP:", lpAddress);
  console.log("- VestingVault:", vaultAddress);
  console.log("- SwapTaxManager:", taxAddress);
  console.log("- PackageManagerV2_1:", packageManagerAddress);
  console.log("- Global Target Price:", hre.ethers.formatUnits(globalTargetPrice, 18), "USDT per BLOCKS");
  console.log("- Test packages created with 18-decimal precision");
  console.log("- All roles granted successfully");
  console.log("- Ready for V2 architecture integration");
  
  console.log("\n🔄 Next steps:");
  console.log("1. Update frontend configuration to use new USDT address");
  console.log("2. Test package purchases with 18-decimal USDT");
  console.log("3. Verify decimal handling in all calculations");
  console.log("4. Deploy missing DividendDistributor and SecondaryMarket contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
