/* eslint-disable no-console */
const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const target = (process.env.TARGET_WALLET || '').trim();
  if (!target || !ethers.isAddress(target)) {
    throw new Error('Set TARGET_WALLET to the wallet to verify');
  }

  console.log('🔎 Verifying roles and treasury');
  console.log('Network:', network.name);
  console.log('Target wallet:', target);

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);

  const DEFAULT_ADMIN_ROLE = await pm.DEFAULT_ADMIN_ROLE();
  const SERVER_ROLE = await pm.SERVER_ROLE();

  const hasAdmin = await pm.hasRole(DEFAULT_ADMIN_ROLE, target);
  const hasServer = await pm.hasRole(SERVER_ROLE, target);
  const treasury = await pm.treasury();

  console.log('\n📦 PackageManager:', d.packageManager);
  console.log('   DEFAULT_ADMIN_ROLE:', DEFAULT_ADMIN_ROLE);
  console.log('   SERVER_ROLE:', SERVER_ROLE);
  console.log('   Target has DEFAULT_ADMIN_ROLE:', hasAdmin);
  console.log('   Target has SERVER_ROLE:', hasServer);
  console.log('   Current Treasury:', treasury);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });



