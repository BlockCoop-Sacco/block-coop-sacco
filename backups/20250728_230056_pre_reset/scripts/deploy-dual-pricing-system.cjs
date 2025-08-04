const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Complete BlockCoop System with Dual Pricing...");
  console.log("📋 Features: Per-package exchange rates + Global target price for liquidity");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // External contract addresses
  const USDT_ADDRESS = process.env.VITE_USDT_ADDRESS;
  const ROUTER_ADDRESS = process.env.VITE_ROUTER_ADDRESS;
  const FACTORY_ADDRESS = process.env.VITE_FACTORY_ADDRESS;

  // Treasury address (deployer for now)
  const TREASURY_ADDRESS = deployer.address;
  
  // Initial global target price: 2.0 USDT per BLOCKS (in 6-decimal precision)
  const INITIAL_GLOBAL_TARGET_PRICE = hre.ethers.parseUnits("2.0", 6);

  console.log("Using external contract addresses:");
  console.log("USDT:", USDT_ADDRESS);
  console.log("PancakeRouter:", ROUTER_ADDRESS);
  console.log("PancakeFactory:", FACTORY_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  console.log("Initial Global Target Price:", hre.ethers.formatUnits(INITIAL_GLOBAL_TARGET_PRICE, 6), "USDT per BLOCKS");

  // Deploy all BlockCoop contracts fresh
  console.log("\n📦 Step 1: Deploying SwapTaxManager...");
  const SwapTaxManager = await hre.ethers.getContractFactory("SwapTaxManager");
  const swapTaxManager = await SwapTaxManager.deploy(deployer.address);
  await swapTaxManager.waitForDeployment();
  const taxAddress = await swapTaxManager.getAddress();
  console.log("✅ SwapTaxManager deployed to:", taxAddress);

  console.log("\n📦 Step 2: Deploying BLOCKS token...");
  const BLOCKS = await hre.ethers.getContractFactory("BLOCKS");
  const shareToken = await BLOCKS.deploy("BLOCKS", "BLOCKS", deployer.address, taxAddress);
  await shareToken.waitForDeployment();
  const shareAddress = await shareToken.getAddress();
  console.log("✅ BLOCKS token deployed to:", shareAddress);

  console.log("\n📦 Step 3: Deploying BLOCKS-LP token...");
  const BLOCKS_LP = await hre.ethers.getContractFactory("BLOCKS_LP");
  const lpToken = await BLOCKS_LP.deploy("BLOCKS-LP", "BLOCKS-LP", deployer.address);
  await lpToken.waitForDeployment();
  const lpAddress = await lpToken.getAddress();
  console.log("✅ BLOCKS-LP token deployed to:", lpAddress);

  console.log("\n📦 Step 4: Deploying VestingVault...");
  const VestingVault = await hre.ethers.getContractFactory("VestingVault");
  const vestingVault = await VestingVault.deploy(shareAddress, deployer.address);
  await vestingVault.waitForDeployment();
  const vaultAddress = await vestingVault.getAddress();
  console.log("✅ VestingVault deployed to:", vaultAddress);

  console.log("\n📦 Step 5: Deploying PackageManagerV2_1 with Dual Pricing System...");
  const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    USDT_ADDRESS,                    // usdt_
    shareAddress,                    // share_ (BLOCKS token)
    lpAddress,                       // lp_ (BLOCKS-LP token)
    vaultAddress,                    // vault_
    ROUTER_ADDRESS,                  // router_
    FACTORY_ADDRESS,                 // factory_
    TREASURY_ADDRESS,                // treasury_
    taxAddress,                      // tax_
    deployer.address,                // admin
    INITIAL_GLOBAL_TARGET_PRICE      // initialGlobalTargetPrice_
  );

  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ PackageManagerV2_1 deployed to:", packageManagerAddress);

  // Verify dual pricing system is working
  console.log("\n🔍 Verifying dual pricing system...");
  const globalTargetPrice = await packageManager.globalTargetPrice();
  console.log("✅ Global target price set to:", hre.ethers.formatUnits(globalTargetPrice, 6), "USDT per BLOCKS");

  // Grant roles
  console.log("\n🔐 Step 6: Granting roles...");
  
  // Grant MINTER_ROLE to PackageManager for BLOCKS token
  const MINTER_ROLE = await shareToken.MINTER_ROLE();
  await shareToken.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ Granted MINTER_ROLE to PackageManager for BLOCKS token");

  // Grant MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP token
  await lpToken.grantRole(MINTER_ROLE, packageManagerAddress);
  const BURNER_ROLE = await lpToken.BURNER_ROLE();
  await lpToken.grantRole(BURNER_ROLE, packageManagerAddress);
  console.log("✅ Granted MINTER_ROLE and BURNER_ROLE to PackageManager for BLOCKS-LP token");

  // Grant LOCKER_ROLE to PackageManager for VestingVault
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ Granted LOCKER_ROLE to PackageManager for VestingVault");

  console.log("\n📝 Step 7: Creating test packages with different exchange rates...");
  
  // Test packages with different exchange rates to demonstrate dual pricing
  const testPackages = [
    {
      name: "Starter Package",
      entryUSDT: hre.ethers.parseUnits("100", 6),    // 100 USDT
      exchangeRate: hre.ethers.parseUnits("1.5", 6), // 1.5 USDT per BLOCKS (better rate)
      vestBps: 7000,                                  // 70% vesting
      cliff: 0,                                       // No cliff
      duration: 86400 * 30,                          // 30 days
      referralBps: 250                                // 2.5% referral
    },
    {
      name: "Growth Package",
      entryUSDT: hre.ethers.parseUnits("500", 6),    // 500 USDT
      exchangeRate: hre.ethers.parseUnits("1.8", 6), // 1.8 USDT per BLOCKS (standard rate)
      vestBps: 7000,                                  // 70% vesting
      cliff: 86400 * 7,                              // 7 day cliff
      duration: 86400 * 90,                          // 90 days
      referralBps: 500                                // 5% referral
    },
    {
      name: "Premium Package",
      entryUSDT: hre.ethers.parseUnits("1000", 6),   // 1000 USDT
      exchangeRate: hre.ethers.parseUnits("2.2", 6), // 2.2 USDT per BLOCKS (premium rate)
      vestBps: 7000,                                  // 70% vesting
      cliff: 86400 * 14,                             // 14 day cliff
      duration: 86400 * 180,                         // 180 days
      referralBps: 500                                // 5% referral
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
      console.log(`✅ ${pkg.name} added with exchange rate: ${hre.ethers.formatUnits(pkg.exchangeRate, 6)} USDT per BLOCKS`);
    } catch (error) {
      console.log(`❌ Failed to add ${pkg.name}: ${error.message}`);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    network: hre.network.name,
    deployer: deployer.address,
    version: "dual-pricing-system",
    features: [
      "Per-package exchange rates for user token allocation",
      "Global target price for liquidity pool operations",
      "Dual pricing system separates user-facing rates from LP pricing",
      "Enhanced admin controls for both pricing mechanisms"
    ],
    contracts: {
      PackageManagerV2_1: packageManagerAddress,
      BLOCKS: shareAddress,
      BLOCKS_LP: lpAddress,
      VestingVault: vaultAddress,
      SwapTaxManager: taxAddress,
      USDT: USDT_ADDRESS,
      PancakeRouter: ROUTER_ADDRESS,
      Treasury: TREASURY_ADDRESS
    },
    pricing: {
      globalTargetPrice: hre.ethers.formatUnits(INITIAL_GLOBAL_TARGET_PRICE, 6),
      testPackages: testPackages.map(pkg => ({
        name: pkg.name,
        exchangeRate: hre.ethers.formatUnits(pkg.exchangeRate, 6)
      }))
    },
    gasUsed: {
      BLOCKS: (await shareToken.deploymentTransaction().wait()).gasUsed.toString(),
      BLOCKS_LP: (await lpToken.deploymentTransaction().wait()).gasUsed.toString(),
      VestingVault: (await vestingVault.deploymentTransaction().wait()).gasUsed.toString(),
      SwapTaxManager: (await swapTaxManager.deploymentTransaction().wait()).gasUsed.toString(),
      PackageManagerV2_1: (await packageManager.deploymentTransaction().wait()).gasUsed.toString()
    }
  };

  // Write deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, "deployments-dual-pricing.json");
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log("📄 Deployment info saved to:", deploymentFile);

  console.log("\n🎉 Complete BlockCoop System with Dual Pricing deployed successfully!");
  console.log("📋 Summary:");
  console.log("- BLOCKS:", shareAddress);
  console.log("- BLOCKS-LP:", lpAddress);
  console.log("- VestingVault:", vaultAddress);
  console.log("- SwapTaxManager:", taxAddress);
  console.log("- PackageManagerV2_1:", packageManagerAddress);
  console.log("- Global Target Price:", hre.ethers.formatUnits(globalTargetPrice, 6), "USDT per BLOCKS");
  console.log("- Test packages created with different exchange rates");
  console.log("- All roles granted successfully");
  console.log("- Ready for verification and frontend integration");
  
  console.log("\n🔄 Next steps:");
  console.log("1. Update .env file with new contract addresses");
  console.log("2. Update frontend ABIs");
  console.log("3. Test dual pricing system functionality");
  console.log("4. Verify contracts on BSCScan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
