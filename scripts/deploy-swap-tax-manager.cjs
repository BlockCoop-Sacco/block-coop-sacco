/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🚀 Deploying SwapTaxManager replacement and wiring BLOCKS');
  console.log('Network:', network.name);

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const [signer] = await ethers.getSigners();
  const adminAddr = await signer.getAddress();
  console.log('Deployer/Admin:', adminAddr);

  const oldTaxMgr = d.taxManager;
  const blocksAddr = d.blocks;
  console.log('Old TaxManager:', oldTaxMgr);
  console.log('BLOCKS:', blocksAddr);

  // 1) Deploy new SwapTaxManager with new admin
  const SwapTaxManager = await ethers.getContractFactory('SwapTaxManager');
  const taxNew = await SwapTaxManager.deploy(adminAddr);
  await taxNew.waitForDeployment();
  const newTaxAddr = await taxNew.getAddress();
  console.log('✅ New SwapTaxManager:', newTaxAddr);

  // 2) Grant MANAGER_ROLE to admin on new manager
  const MANAGER_ROLE = await taxNew.MANAGER_ROLE();
  let tx = await taxNew.grantRole(MANAGER_ROLE, adminAddr);
  console.log('🔗 grant MANAGER_ROLE tx:', tx.hash);
  await tx.wait();

  // 3) Read buckets from old manager and set into new
  const taxAbi = [
    'function buckets(bytes32) view returns (uint16,address)'
  ];
  const old = new ethers.Contract(oldTaxMgr, taxAbi, signer);
  const keyOf = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
  const names = ['PURCHASE','BUY','SELL'];
  for (const n of names) {
    const key = keyOf(n);
    const [bps, recipient] = await old.buckets(key);
    console.log(`Cloning ${n}:`, bps, recipient);
    tx = await taxNew.setBucket(key, bps, recipient);
    console.log(`   ${n} set tx:`, tx.hash);
    await tx.wait();
  }

  // 4) Point BLOCKS to new tax manager
  const blocks = await ethers.getContractAt('BLOCKS', blocksAddr);
  tx = await blocks.setSwapTaxManager(newTaxAddr);
  console.log('🔗 BLOCKS.setSwapTaxManager tx:', tx.hash);
  await tx.wait();
  console.log('✅ BLOCKS now points to new tax manager');

  // 5) Update deployments file
  d.taxManager = newTaxAddr;
  d.lastUpdated = Date.now();
  fs.writeFileSync(deploymentsPath, JSON.stringify(d, null, 2));
  console.log('📝 Updated', deploymentsPath);
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });


