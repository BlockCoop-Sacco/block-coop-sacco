const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying Corrected Referral System PackageManagerV2_1...");
  
  // Load existing deployment data
  const data = JSON.parse(fs.readFileSync("deployments/deployments-fresh-v2.json", "utf8"));
  
  const [deployer] = await ethers.getSigners();
  console.log("📍 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

  // Contract addresses from existing deployment
  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955"; // BSC Mainnet USDT
  const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E"; // PancakeSwap V2 Router
  const FACTORY_ADDRESS = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73"; // PancakeSwap V2 Factory
  const TREASURY_ADDRESS = data.contracts.Treasury;
  const ADMIN_ADDRESS = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";
  const ADDITIONAL_ADMIN = "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987";

  console.log("\n📦 Step 1: Deploying new PackageManagerV2_1 with corrected referral system...");
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
  const taxManager = await ethers.getContractAt("SwapTaxManager", data.contracts.SwapTaxManager);

  // Grant MINTER_ROLE to new PackageManager for BLOCKS token
  console.log("Granting MINTER_ROLE to new PackageManager for BLOCKS...");
  const MINTER_ROLE = await blocks.MINTER_ROLE();
  await blocks.grantRole(MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to new PackageManager for BLOCKS");

  // Grant MINTER_ROLE and BURNER_ROLE to new PackageManager for BLOCKS-LP token
  console.log("Granting MINTER_ROLE to new PackageManager for BLOCKS-LP...");
  const LP_MINTER_ROLE = await blocksLP.MINTER_ROLE();
  await blocksLP.grantRole(LP_MINTER_ROLE, packageManagerAddress);
  console.log("✅ MINTER_ROLE granted to new PackageManager for BLOCKS-LP");

  console.log("Granting BURNER_ROLE to new PackageManager for BLOCKS-LP...");
  const BURNER_ROLE = await blocksLP.BURNER_ROLE();
  await blocksLP.grantRole(BURNER_ROLE, packageManagerAddress);
  console.log("✅ BURNER_ROLE granted to new PackageManager for BLOCKS-LP");

  // Grant LOCKER_ROLE to new PackageManager for VestingVault
  console.log("Granting LOCKER_ROLE to new PackageManager for VestingVault...");
  const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
  await vestingVault.grantRole(LOCKER_ROLE, packageManagerAddress);
  console.log("✅ LOCKER_ROLE granted to new PackageManager for VestingVault");

  console.log("\n⚙️ Step 3: Configuring tax buckets...");
  
  // Configure purchase tax bucket (2% to treasury)
  const purchaseTaxKey = await packageManager.PURCHASE_TAX_KEY();
  console.log("Setting purchase tax: 2% to treasury...");
  let tx = await taxManager.setBucket(
    purchaseTaxKey,
    200, // 2% in basis points
    data.contracts.Treasury
  );
  await tx.wait();
  console.log("✅ Purchase tax bucket configured");

  // Configure referral tax bucket (1% to treasury)
  const referralTaxKey = await packageManager.REFERRAL_TAX_KEY();
  console.log("Setting referral tax: 1% to treasury...");
  tx = await taxManager.setBucket(
    referralTaxKey,
    100, // 1% in basis points
    data.contracts.Treasury
  );
  await tx.wait();
  console.log("✅ Referral tax bucket configured");

  console.log("\n💰 Step 4: Treasury BLOCKS token setup...");
  
  // Check current treasury BLOCKS balance
  const treasuryBalance = await blocks.balanceOf(data.contracts.Treasury);
  console.log("📊 Current treasury BLOCKS balance:", ethers.formatEther(treasuryBalance));

  // Mint initial BLOCKS tokens to treasury for referral payments (if needed)
  const initialReferralPool = ethers.parseEther("10000"); // 10,000 BLOCKS for referrals
  if (treasuryBalance < initialReferralPool) {
    console.log("🏭 Minting initial BLOCKS to treasury for referral payments...");
    await blocks.mint(data.contracts.Treasury, initialReferralPool);
    console.log("✅ Minted", ethers.formatEther(initialReferralPool), "BLOCKS to treasury");
  }

  console.log("\n📋 Step 5: Adding sample packages with sustainable referral rates...");

  // Add sample packages with sustainable referral rates (≤5% for full sustainability)
  const packages = [
    {
      name: "Starter Package",
      entryUSDT: ethers.parseUnits("100", 6), // 100 USDT (6 decimals)
      exchangeRateBps: 5000, // 0.5 BLOCKS per USDT
      vestBps: 6500, // 65% vesting (changed from 70% due to 5% treasury allocation)
      cliff: 30 * 24 * 60 * 60, // 30 days
      duration: 365 * 24 * 60 * 60, // 1 year
      referralBps: 250 // 2.5% referral reward (sustainable - generates surplus)
    },
    {
      name: "Growth Package",
      entryUSDT: ethers.parseUnits("500", 6), // 500 USDT
      exchangeRateBps: 5000, // 0.5 BLOCKS per USDT
      vestBps: 6500, // 65% vesting (changed from 60% due to 5% treasury allocation)
      cliff: 60 * 24 * 60 * 60, // 60 days
      duration: 18 * 30 * 24 * 60 * 60, // 18 months
      referralBps: 500 // 5% referral reward (sustainable - break-even)
    },
    {
      name: "Premium Package",
      entryUSDT: ethers.parseUnits("1000", 6), // 1000 USDT
      exchangeRateBps: 5000, // 0.5 BLOCKS per USDT
      vestBps: 6500, // 65% vesting (changed from 50% due to 5% treasury allocation)
      cliff: 90 * 24 * 60 * 60, // 90 days
      duration: 24 * 30 * 24 * 60 * 60, // 24 months
      referralBps: 500 // 5% referral reward (sustainable - break-even)
    }
  ];

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    console.log(`Adding package: ${pkg.name}...`);
    
    tx = await packageManager.addPackage(
      pkg.name,
      pkg.entryUSDT,
      pkg.exchangeRateBps,
      pkg.vestBps,
      pkg.cliff,
      pkg.duration,
      pkg.referralBps
    );
    await tx.wait();
    console.log(`✅ ${pkg.name} added with ${pkg.referralBps/100}% referral rate`);
  }

  console.log("\n💾 Step 6: Saving deployment information...");
  
  // Update deployment data with new PackageManager
  data.contracts.PackageManagerV2_1_Sustainable = packageManagerAddress;
  data.sustainableTreasurySystem = {
    timestamp: new Date().toISOString(),
    packageManager: packageManagerAddress,
    treasuryBlocksBalance: ethers.formatEther(await blocks.balanceOf(data.contracts.Treasury)),
    tokenDistribution: {
      vesting: "65%",
      liquidity: "30%",
      treasury: "5%"
    },
    sustainability: {
      maxSustainableReferralRate: "5%",
      treasuryAllocationPerPurchase: "5% of total BLOCKS",
      lpTokenReduction: "5% (users receive 95% of calculated BLOCKS as LP tokens)"
    },
    changes: [
      "Added 5% treasury BLOCKS allocation for sustainability",
      "Reduced vesting allocation from 70% to 65%",
      "Fixed LP token calculation (95% instead of 100%)",
      "Removed broken referral tax logic",
      "Added TreasuryBlocksAllocated event",
      "Referral rewards paid from treasury balance",
      "System sustainable for referral rates up to 5%"
    ]
  };

  fs.writeFileSync("deployments/deployments-fresh-v2.json", JSON.stringify(data, null, 2));
  console.log("✅ Deployment data updated");

  console.log("\n🎉 Sustainable Treasury System Deployment Completed!");
  console.log("\n📋 Summary:");
  console.log("- New PackageManagerV2_1 (Sustainable):", packageManagerAddress);
  console.log("- Treasury BLOCKS Balance:", ethers.formatEther(await blocks.balanceOf(data.contracts.Treasury)));
  console.log("- Token Distribution: 65% vesting, 30% liquidity, 5% treasury");
  console.log("- Sample packages with sustainable referral rates: 2.5%, 5%, 5%");
  console.log("- LP Token Adjustment: Users receive 95% of calculated BLOCKS");
  console.log("\n✅ SUSTAINABILITY FEATURES:");
  console.log("1. Treasury receives 5% of BLOCKS from each purchase");
  console.log("2. System sustainable for referral rates up to 5%");
  console.log("3. Automatic treasury accumulation without manual intervention");
  console.log("4. Fixed LP token calculation for accurate user claims");
  console.log("\n⚠️  IMPORTANT NEXT STEPS:");
  console.log("1. Treasury wallet must approve PackageManager to spend BLOCKS tokens");
  console.log("2. Monitor treasury balance growth vs referral payments");
  console.log("3. Keep referral rates at or below 5% for full sustainability");
  console.log("4. Update frontend to use new PackageManager address");
  console.log("5. Communicate 5% reduction in user token allocation");
  console.log("6. Test purchase flow to verify treasury allocation works");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
