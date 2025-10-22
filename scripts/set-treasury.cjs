/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const target = (process.env.TREASURY_TO_SET || '').trim();
  if (!target || !ethers.isAddress(target)) {
    throw new Error('Set TREASURY_TO_SET to a valid address');
  }

  console.log('🏦 Setting PackageManager treasury');
  console.log('Network:', network.name);
  console.log('New Treasury:', target);

  const signer = (await ethers.getSigners())[0].address;
  console.log('Using signer:', signer);

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);

  const current = await pm.treasury();
  console.log('Current Treasury:', current);
  if (current.toLowerCase() === target.toLowerCase()) {
    console.log('✅ Treasury already set to target');
    return;
  }

  let tx;
  try {
    const gwei = (process.env.GAS_PRICE_GWEI || '').trim();
    const overrides = gwei ? { gasPrice: ethers.parseUnits(gwei, 'gwei') } : {};
    tx = await pm.setTreasury(target, overrides);
  } catch (e) {
    console.error('❌ setTreasury send failed:', e.message || e);
    process.exit(1);
  }
  console.log('🔗 setTreasury tx:', tx.hash);
  const r = await tx.wait();
  if (r && r.status === 0) {
    console.error('❌ setTreasury reverted');
    process.exit(1);
  }
  const after = await pm.treasury();
  console.log('✅ New Treasury:', after);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });



