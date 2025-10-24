/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);

  const newBps = parseInt(process.env.NEW_LIQ_BPS || '0', 10);
  console.log('Network:', network.name);
  console.log('Setting liquidityBps to:', newBps);

  const tx = await pm.setLiquidityBps(newBps);
  console.log('tx sent:', tx.hash);
  const rcpt = await tx.wait();
  console.log('tx mined in block:', rcpt.blockNumber);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






