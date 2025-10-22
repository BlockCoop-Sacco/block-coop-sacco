/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);

  const id = parseInt(process.env.PACKAGE_ID || '2');
  const pkg = await pm.getPackage(id);
  const paused = await pm.paused();

  console.log('Network:', network.name);
  console.log('Package ID:', id);
  console.log('paused:', paused);
  console.log('exists:', pkg.exists);
  console.log('active:', pkg.active);
  console.log('entryUSDT:', pkg.entryUSDT.toString());
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






