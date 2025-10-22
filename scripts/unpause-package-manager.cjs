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
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);

  console.log('Network:', network.name);
  console.log('PackageManager:', d.packageManager);

  const isPaused = await pm.paused();
  if (!isPaused) {
    console.log('✅ Already unpaused');
    return;
  }

  const tx = await pm.unpause();
  console.log('🔗 unpause tx:', tx.hash);
  const rc = await tx.wait();
  if (rc && rc.status === 0) throw new Error('unpause reverted');
  console.log('✅ Unpaused');
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });
