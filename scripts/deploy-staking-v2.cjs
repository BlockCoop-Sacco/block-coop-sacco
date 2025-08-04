const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying BLOCKSStakingV2 Contract...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

  // Contract addresses from July 28th deployment (deployments-v2-complete-modular.json)
  const BLOCKS_TOKEN = "0x715b2A06Ac3AB8506f8fF44Fa67C3D2ec3425706";  // July 28th BLOCKS token
  const USDT_TOKEN = "0x52f8BE86c4157eF5F11f3d73135ec4a568B02b90";   // Working USDT token
  const ADMIN_ADDRESS = "0x842d803eB7d05D6Aa2DdB8c3Eb912e6d97ce31C4";  // Primary admin
  const ADDITIONAL_ADMIN = "0x6F6782148F208F9547f68e2354B1d7d2d4BeF987"; // Additional admin

  console.log("\n📋 Configuration:");
  console.log("BLOCKS Token:", BLOCKS_TOKEN);
  console.log("USDT Token:", USDT_TOKEN);
  console.log("Primary Admin:", ADMIN_ADDRESS);
  console.log("Additional Admin:", ADDITIONAL_ADMIN);

  // Deploy BLOCKSStakingV2
  console.log("\n📦 Deploying BLOCKSStakingV2...");
  const BLOCKSStakingV2 = await ethers.getContractFactory("BLOCKSStakingV2");
  const stakingContract = await BLOCKSStakingV2.deploy(
    BLOCKS_TOKEN,
    USDT_TOKEN,
    ADMIN_ADDRESS
  );

  await stakingContract.waitForDeployment();
  const stakingAddress = await stakingContract.getAddress();
  console.log("✅ BLOCKSStakingV2 deployed to:", stakingAddress);

  // Grant additional admin role
  console.log("\n🔐 Setting up roles...");
  try {
    const DEFAULT_ADMIN_ROLE = await stakingContract.DEFAULT_ADMIN_ROLE();
    const POOL_MANAGER_ROLE = await stakingContract.POOL_MANAGER_ROLE();
    const REWARD_DISTRIBUTOR_ROLE = await stakingContract.REWARD_DISTRIBUTOR_ROLE();
    const EMERGENCY_ROLE = await stakingContract.EMERGENCY_ROLE();

    // Grant roles to additional admin
    await stakingContract.grantRole(DEFAULT_ADMIN_ROLE, ADDITIONAL_ADMIN);
    await stakingContract.grantRole(POOL_MANAGER_ROLE, ADDITIONAL_ADMIN);
    await stakingContract.grantRole(REWARD_DISTRIBUTOR_ROLE, ADDITIONAL_ADMIN);
    await stakingContract.grantRole(EMERGENCY_ROLE, ADDITIONAL_ADMIN);

    console.log("✅ Roles granted to additional admin");
  } catch (error) {
    console.log("⚠️ Role setup error:", error.message);
  }

  // Verify default pools were created
  console.log("\n📊 Verifying default pools...");
  try {
    const poolCount = await stakingContract.poolCount();
    console.log("Pool count:", poolCount.toString());

    for (let i = 0; i < poolCount; i++) {
      const pool = await stakingContract.stakingPools(i);
      console.log(`Pool ${i}: ${pool.name} - ${pool.apyBasisPoints / 100}% APY - ${pool.lockPeriod / 86400} days lock`);
    }
  } catch (error) {
    console.log("⚠️ Pool verification error:", error.message);
  }

  // Test contract stats
  console.log("\n📈 Contract Statistics:");
  try {
    const stats = await stakingContract.getContractStats();
    console.log("Total Staked:", ethers.formatEther(stats._totalStaked), "BLOCKS");
    console.log("Total Rewards Distributed:", ethers.formatEther(stats._totalRewardsDistributed), "USDT");
    console.log("Pool Count:", stats._poolCount.toString());
    console.log("Reward Token Balance:", ethers.formatEther(stats._rewardTokenBalance), "USDT");
  } catch (error) {
    console.log("⚠️ Stats error:", error.message);
  }

  // Save deployment info
  const deploymentInfo = {
    network: "bsctestnet",
    chainId: 97,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    version: "staking-v2",
    contracts: {
      BLOCKSStakingV2: stakingAddress
    },
    dependencies: {
      BLOCKS: BLOCKS_TOKEN,
      USDT: USDT_TOKEN
    },
    admins: {
      primary: ADMIN_ADDRESS,
      additional: ADDITIONAL_ADMIN
    },
    features: [
      "Multiple staking pools with different lock periods",
      "Flexible staking (0 lock) and locked staking (30d, 90d, 1y)",
      "USDT reward distribution",
      "Emergency unstaking with penalties",
      "Role-based access control",
      "Pausable functionality"
    ],
    defaultPools: [
      { id: 0, name: "Flexible Staking", lockPeriod: "0 days", apy: "8%", penalty: "0%" },
      { id: 1, name: "30-Day Lock", lockPeriod: "30 days", apy: "12%", penalty: "5%" },
      { id: 2, name: "90-Day Lock", lockPeriod: "90 days", apy: "18%", penalty: "10%" },
      { id: 3, name: "1-Year Lock", lockPeriod: "365 days", apy: "25%", penalty: "20%" }
    ]
  };

  // Write deployment info to file
  const fs = require('fs');
  const deploymentPath = `deployments/deployment-staking-v2.json`;
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n💾 Deployment info saved to: ${deploymentPath}`);

  console.log("\n🎉 BLOCKSStakingV2 deployment completed successfully!");
  console.log("\n📝 Next Steps:");
  console.log("1. Add VITE_STAKING_ADDRESS=" + stakingAddress + " to .env file");
  console.log("2. Set VITE_STAKING_ENABLED=true in .env file");
  console.log("3. Update contract configuration in appkit.ts");
  console.log("4. Fund the staking contract with USDT for rewards");
  console.log("5. Verify the contract on BSCScan");

  console.log("\n🔗 Contract Address:", stakingAddress);
  console.log("🌐 BSCScan:", `https://testnet.bscscan.com/address/${stakingAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
