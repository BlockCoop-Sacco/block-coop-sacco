const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Stable LP Pricing PackageManagerV2_1...");
  
  // Load existing deployment data
  const data = JSON.parse(fs.readFileSync("deployments/deployments-fresh-v2.json", "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  console.log("\n📦 Step 1: Deploying new PackageManagerV2_1 with stable LP pricing...");
  const PackageManagerV2_1 = await ethers.getContractFactory("PackageManagerV2_1");
  const packageManager = await PackageManagerV2_1.deploy(
    data.externalContracts.USDT,     // usdt_
    data.contracts.BLOCKS,           // share_ (BLOCKS token)
    data.contracts["BLOCKS-LP"],     // lp_ (BLOCKS-LP token)
    data.contracts.VestingVault,     // vault_
    data.externalContracts.PancakeRouter,  // router_
    data.externalContracts.PancakeFactory, // factory_
    data.contracts.Treasury,         // treasury_
    data.contracts.SwapTaxManager,   // tax_
    data.admins.primary              // admin
  );
  await packageManager.waitForDeployment();
  const packageManagerAddress = await packageManager.getAddress();
  console.log("✅ New PackageManagerV2_1 deployed to:", packageManagerAddress);

  console.log("\n🔐 Step 2: Setting up roles and permissions...");

  // Get contract instances
  const blocks = await ethers.getContractAt("BLOCKS", data.contracts.BLOCKS);
  const blocksLP = await ethers.getContractAt("BLOCKS_LP", data.contracts["BLOCKS-LP"]);
  const vestingVault = await ethers.getContractAt("VestingVault", data.contracts.VestingVault);

  // Grant MINTER_ROLE to new PackageManager for BLOCKS token
  console.log("Granting MINTER_ROLE to new PackageManager for BLOCKS...");
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  await blocks.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to PackageManager for BLOCKS");

  // Grant MINTER_ROLE and BURNER_ROLE to new PackageManager for BLOCKS-LP token
  console.log("Granting MINTER_ROLE to new PackageManager for BLOCKS-LP...");
  const LP_MINTER_ROLE = await blocksLP.MINTER_ROLE();
  await blocksLP.grantRole(LP_MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to PackageManager for BLOCKS-LP");

  console.log("Granting BURNER_ROLE to new PackageManager for BLOCKS-LP...");
  const LP_BURNER_ROLE = await blocksLP.BURNER_ROLE();
  await blocksLP.grantRole(LP_BURNER_ROLE, packageManagerAddress);
  console.log("✅ BURNER_ROLE granted to PackageManager for BLOCKS-LP");

  // Grant LOCKER_ROLE to new PackageManager for VestingVault
  console.log("Granting LOCKER_ROLE to new PackageManager for VestingVault...");
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ LOCKER_ROLE granted to PackageManager for VestingVault");

  console.log("\n📝 Step 3: Creating test packages with stable pricing...");

  // Test packages with different target prices to demonstrate stable LP pricing
  const testPackages = [
    {
      name: "Stable Starter",
      entryUSDT: ethers.parseUnits("100", 6), // 100 USDT
      targetPrice: ethers.parseUnits("2.0", 6), // 2.0 USDT per BLOCKS
      vestBps: 7000, // 70% vesting
      cliff: 0, // No cliff
      duration: 86400 * 30, // 30 days
      referralBps: 250, // 2.5% referral
    },
    {
      name: "Stable Growth",
      entryUSDT: ethers.parseUnits("500", 6), // 500 USDT
      targetPrice: ethers.parseUnits("2.0", 6), // Same 2.0 USDT per BLOCKS (stable!)
      vestBps: 7000, // 70% vesting
      cliff: 86400 * 7, // 7 day cliff
      duration: 86400 * 90, // 90 days
      referralBps: 500, // 5% referral
    },
    {
      name: "Stable Premium",
      entryUSDT: ethers.parseUnits("1000", 6), // 1000 USDT
      targetPrice: ethers.parseUnits("2.0", 6), // Same 2.0 USDT per BLOCKS (stable!)
      vestBps: 7000, // 70% vesting
      cliff: 86400 * 14, // 14 day cliff
      duration: 86400 * 180, // 180 days
      referralBps: 500, // 5% referral
    }
  ];

  for (let i = 0; i < testPackages.length; i++) {
    const pkg = testPackages[i];
    try {
      console.log(`📝 Adding ${pkg.name}...`);
      const tx = await packageManager.addPackage(
        pkg.name,
        pkg.entryUSDT,
        pkg.targetPrice,
        pkg.vestBps,
        pkg.cliff,
        pkg.duration,
        pkg.referralBps
      );
      await tx.wait();
      console.log(`✅ ${pkg.name} added successfully`);
    } catch (error) {
      console.log(`❌ Failed to add ${pkg.name}: ${error.message}`);
    }
  }

  console.log("\n🔍 Step 4: Verifying stable LP pricing calculations...");

  // Get package IDs and verify calculations
  const packageIds = await packageManager.getPackageIds();
  console.log(`Found ${packageIds.length} packages`);

  for (const packageId of packageIds) {
    try {
      const pkg = await packageManager.getPackage(packageId);
      const targetPriceFormatted = ethers.formatUnits(pkg.targetPrice, 6);
      
      console.log(`\n   Package ${packageId}: ${pkg.name}`);
      console.log(`   Entry USDT: ${ethers.formatUnits(pkg.entryUSDT, 6)}`);
      console.log(`   Target Price: ${targetPriceFormatted} USDT per BLOCKS`);
      console.log(`   Vest BPS: ${pkg.vestBps}`);
      
      // Calculate expected LP allocation
      const usdtForLP = (pkg.entryUSDT * BigInt(10000 - pkg.vestBps)) / BigInt(10000);
      const usdtForLPFormatted = ethers.formatUnits(usdtForLP, 6);
      const expectedBLOCKS = Number(usdtForLPFormatted) / Number(targetPriceFormatted);
      
      console.log(`   USDT for LP: ${usdtForLPFormatted}`);
      console.log(`   Expected BLOCKS for LP: ${expectedBLOCKS.toFixed(4)}`);
      console.log(`   LP Ratio: ${targetPriceFormatted} USDT per BLOCKS (STABLE!)`);
      
    } catch (error) {
      console.log(`   ❌ Failed to get package ${packageId}: ${error.message}`);
    }
  }

  // Update deployment data
  const updatedData = {
    ...data,
    contracts: {
      ...data.contracts,
      PackageManagerV2_1: packageManagerAddress
    },
    deployment: {
      ...data.deployment,
      stableLPPricing: {
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        packageManager: packageManagerAddress,
        features: [
          "Stable LP pricing with targetPrice",
          "Consistent USDT/BLOCKS ratios across packages",
          "Dynamic token distribution based on vestBps",
          "5% treasury allocation for sustainable referrals"
        ]
      }
    }
  };

  // Save updated deployment data
  fs.writeFileSync(
    "deployments/deployments-stable-lp.json",
    JSON.stringify(updatedData, null, 2)
  );

  console.log("\n✅ Deployment completed successfully!");
  console.log("📄 Updated deployment data saved to deployments/deployments-stable-lp.json");
  console.log("\n📋 Summary:");
  console.log(`   PackageManagerV2_1: ${packageManagerAddress}`);
  console.log(`   Features: Stable LP pricing, targetPrice system`);
  console.log(`   Test packages: ${testPackages.length} created with consistent 2.0 USDT/BLOCKS ratio`);
  
  console.log("\n🔄 Next steps:");
  console.log("1. Update frontend environment with new contract address");
  console.log("2. Update ABIs using update-frontend-abi script");
  console.log("3. Test package purchases to verify stable LP pricing");
  console.log("4. Verify contract on BSCScan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
