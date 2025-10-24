/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const NEW_TREASURY = (process.env.NEW_TREASURY || '').trim();
  if (!NEW_TREASURY || !ethers.isAddress(NEW_TREASURY)) {
    throw new Error('Set NEW_TREASURY to a valid address');
  }

  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);
  const currentTreasury = await pm.treasury();

  console.log('Network:', network.name);
  console.log('PackageManager:', d.packageManager);
  console.log('Current treasury:', currentTreasury);
  console.log('New treasury:', NEW_TREASURY);

  if (currentTreasury.toLowerCase() === NEW_TREASURY.toLowerCase()) {
    console.log('✅ Treasury already set to target');
    return;
  }

  const tx = await pm.setTreasury(NEW_TREASURY);
  console.log('🔗 setTreasury tx:', tx.hash);
  const rc = await tx.wait();
  if (rc && rc.status === 0) throw new Error('setTreasury reverted');
  const after = await pm.treasury();
  console.log('✅ Treasury updated:', after);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });

