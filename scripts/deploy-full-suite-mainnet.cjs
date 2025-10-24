/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network, run } = require('hardhat');
const fs = require('fs');

async function verifyContract(address, constructorArgs = []) {
  try {
    await run('verify:verify', { address, constructorArguments: constructorArgs });
    console.log(`✅ Verified: ${address}`);
  } catch (err) {
    const msg = (err && (err.message || err.toString())) || 'unknown error';
    if (msg.includes('Reason: Already Verified') || msg.includes('Contract source code already verified')) {
      console.log(`ℹ️ Already verified: ${address}`);
    } else {
      console.log(`⚠️ Verification failed for ${address}: ${msg}`);
    }
  }
}

async function main() {
  if (network.name !== 'bscmainnet') {
    console.log(`⚠️ You are deploying to '${network.name}'. This script is intended for 'bscmainnet'.`);
  }

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  // Core external addresses (Pancake & USDT)
  const ROUTER_ADDRESS = (process.env.ROUTER_ADDRESS || '0x10ed43c718714eb63d5aa57b78b54704e256024e').toLowerCase();
  const FACTORY_ADDRESS = (process.env.FACTORY_ADDRESS || '0xca143ce32fe78f1f7019d7d551a6402fc5350c73').toLowerCase();
  const USDT_ADDRESS = (process.env.MAINNET_USDT || process.env.USDT_ADDRESS || '0x55d398326f99059ff775485246999027b3197955').toLowerCase();
  const TREASURY_ADDRESS = (process.env.TREASURY_ADDRESS || deployer.address).toLowerCase();

  const INITIAL_TARGET_PRICE = ethers.parseUnits(process.env.INITIAL_GLOBAL_TARGET_PRICE || '2.0', 18);

  console.log('Config:', { ROUTER_ADDRESS, FACTORY_ADDRESS, USDT_ADDRESS, TREASURY_ADDRESS, INITIAL_TARGET_PRICE: INITIAL_TARGET_PRICE.toString() });

  // 1) Deploy SwapTaxManager
  console.log('\n1️⃣ Deploying SwapTaxManager...');
  const TaxMgr = await ethers.getContractFactory('SwapTaxManager');
  const taxMgr = await TaxMgr.deploy(deployer.address);
  await taxMgr.waitForDeployment();
  const taxMgrAddr = await taxMgr.getAddress();
  console.log('✅ SwapTaxManager:', taxMgrAddr);

  // 2) Deploy BLOCKS token
  console.log('\n2️⃣ Deploying BLOCKS...');
  const Blocks = await ethers.getContractFactory('BLOCKS');
  const blocks = await Blocks.deploy('BlockCoop Sacco Share Token', 'BLOCKS', deployer.address, taxMgrAddr);
  await blocks.waitForDeployment();
  const blocksAddr = await blocks.getAddress();
  console.log('✅ BLOCKS:', blocksAddr);

  // 3) Deploy BLOCKS_LP token
  console.log('\n3️⃣ Deploying BLOCKS_LP...');
  const BlocksLP = await ethers.getContractFactory('BLOCKS_LP');
  const blocksLP = await BlocksLP.deploy('BlockCoop LP Token', 'BLOCKS-LP', deployer.address);
  await blocksLP.waitForDeployment();
  const blocksLPAddr = await blocksLP.getAddress();
  console.log('✅ BLOCKS_LP:', blocksLPAddr);

  // 4) Deploy VestingVault
  console.log('\n4️⃣ Deploying VestingVault...');
  const VestingVault = await ethers.getContractFactory('VestingVault');
  const vault = await VestingVault.deploy(blocksAddr, deployer.address);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log('✅ VestingVault:', vaultAddr);

  // 5) Deploy PackageManagerV2_2 (fresh addresses wired)
  console.log('\n5️⃣ Deploying PackageManagerV2_2...');
  const PM = await ethers.getContractFactory('PackageManagerV2_2');
  const pm = await PM.deploy(
    USDT_ADDRESS,
    blocksAddr,
    blocksLPAddr,
    vaultAddr,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    taxMgrAddr,
    deployer.address,
    INITIAL_TARGET_PRICE
  );
  await pm.waitForDeployment();
  const pmAddr = await pm.getAddress();
  console.log('✅ PackageManagerV2_2:', pmAddr);

  // 6) Grant roles to PM
  console.log('\n6️⃣ Granting roles to PackageManager...');
  await (await blocks.grantRole(await blocks.MINTER_ROLE(), pmAddr)).wait();
  await (await blocksLP.grantRole(await blocksLP.MINTER_ROLE(), pmAddr)).wait();
  await (await blocksLP.grantRole(await blocksLP.BURNER_ROLE(), pmAddr)).wait();
  await (await vault.grantRole(await vault.LOCKER_ROLE(), pmAddr)).wait();
  console.log('✅ Roles granted');

  // 7) Initialize router allowances
  console.log('\n7️⃣ Initializing router allowances...');
  await (await pm.initRouterAllowances()).wait();
  console.log('✅ Router allowances initialized');

  // Optional: configure purchase tax bucket
  if (process.env.PURCHASE_TAX_BPS) {
    console.log('\n8️⃣ Configuring purchase tax...');
    const managerRole = await taxMgr.MANAGER_ROLE();
    if (!(await taxMgr.hasRole(managerRole, deployer.address))) {
      await (await taxMgr.grantRole(managerRole, deployer.address)).wait();
    }
    const purchaseKey = await pm.PURCHASE_TAX_KEY();
    await (await taxMgr.setBucket(purchaseKey, parseInt(process.env.PURCHASE_TAX_BPS), TREASURY_ADDRESS)).wait();
    console.log('✅ Purchase tax configured');
  }

  // 9) Deploy SecondaryMarket (wired to fresh tokens)
  console.log('\n9️⃣ Deploying SecondaryMarket...');
  const SecondaryMarket = await ethers.getContractFactory('SecondaryMarket');
  const secondaryMarket = await SecondaryMarket.deploy(
    USDT_ADDRESS,
    blocksAddr,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    deployer.address,
    INITIAL_TARGET_PRICE
  );
  await secondaryMarket.waitForDeployment();
  const secondaryMarketAddr = await secondaryMarket.getAddress();
  console.log('✅ SecondaryMarket:', secondaryMarketAddr);

  // 10) Deploy MinimalForwarder
  console.log('\n🔟 Deploying MinimalForwarder...');
  const MinimalForwarder = await ethers.getContractFactory('MinimalForwarder');
  const forwarder = await MinimalForwarder.deploy();
  await forwarder.waitForDeployment();
  const forwarderAddr = await forwarder.getAddress();
  console.log('✅ MinimalForwarder:', forwarderAddr);

  // 11) Verify contracts on BscScan (best-effort)
  console.log('\n🧾 Verifying on BscScan (best-effort)...');
  await verifyContract(taxMgrAddr, [deployer.address]);
  await verifyContract(blocksAddr, ['BlockCoop Sacco Share Token', 'BLOCKS', deployer.address, taxMgrAddr]);
  await verifyContract(blocksLPAddr, ['BlockCoop LP Token', 'BLOCKS-LP', deployer.address]);
  await verifyContract(vaultAddr, [blocksAddr, deployer.address]);
  await verifyContract(pmAddr, [
    USDT_ADDRESS,
    blocksAddr,
    blocksLPAddr,
    vaultAddr,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    taxMgrAddr,
    deployer.address,
    INITIAL_TARGET_PRICE
  ]);
  await verifyContract(secondaryMarketAddr, [
    USDT_ADDRESS,
    blocksAddr,
    ROUTER_ADDRESS,
    FACTORY_ADDRESS,
    TREASURY_ADDRESS,
    deployer.address,
    INITIAL_TARGET_PRICE
  ]);
  await verifyContract(forwarderAddr, []);

  // 12) Persist deployments
  const deployments = {
    network: network.name,
    router: ROUTER_ADDRESS,
    factory: FACTORY_ADDRESS,
    usdt: USDT_ADDRESS,
    taxManager: taxMgrAddr,
    blocks: blocksAddr,
    blocksLP: blocksLPAddr,
    vestingVault: vaultAddr,
    packageManager: pmAddr,
    secondaryMarket: secondaryMarketAddr,
    forwarder: forwarderAddr,
    treasury: TREASURY_ADDRESS,
    timestamp: Date.now(),
  };
  fs.mkdirSync('deployments', { recursive: true });
  fs.writeFileSync('deployments/deployments-mainnet-v2_2.json', JSON.stringify(deployments, null, 2));
  console.log('\n💾 Saved deployments to deployments/deployments-mainnet-v2_2.json');

  // 13) Emit frontend .env lines
  console.log('\n🔧 Frontend env (copy to your .env):');
  console.log(`VITE_CHAIN_ID=56`);
  console.log(`VITE_RPC_URL=${process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org/'}`);
  console.log(`VITE_USDT_ADDRESS=${USDT_ADDRESS}`);
  console.log(`VITE_SHARE_ADDRESS=${blocksAddr}`);
  console.log(`VITE_LP_ADDRESS=${blocksLPAddr}`);
  console.log(`VITE_VAULT_ADDRESS=${vaultAddr}`);
  console.log(`VITE_TAX_ADDRESS=${taxMgrAddr}`);
  console.log(`VITE_ROUTER_ADDRESS=${ROUTER_ADDRESS}`);
  console.log(`VITE_FACTORY_ADDRESS=${FACTORY_ADDRESS}`);
  console.log(`VITE_PACKAGE_MANAGER_ADDRESS=${pmAddr}`);
  console.log(`VITE_SECONDARY_MARKET_ADDRESS=${secondaryMarketAddr}`);
  console.log(`VITE_FORWARDER_ADDRESS=${forwarderAddr}`);

  console.log('\n🎉 Full suite deployed successfully.');
}

main().catch((e) => { console.error(e); process.exit(1); });


