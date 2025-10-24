/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🔎 Verifying BLOCKS allowance');
  console.log('Network:', network.name);

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const BLOCKS = await ethers.getContractAt('BLOCKS', d.blocks);
  const owner = (process.env.OWNER_TO_CHECK || '0xD04edC3225cEF6e82e50Dc559d38733180743b94').trim();
  const spender = d.packageManager;

  const allowance = await BLOCKS.allowance(owner, spender);
  console.log('Owner:', owner);
  console.log('Spender (PackageManager):', spender);
  console.log('Allowance:', allowance.toString());
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });



