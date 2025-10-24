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

  const usdt = await ethers.getContractAt('ERC20', d.usdt);
  const safe = (process.env.SAFE_ADDRESS || d.treasury).trim();
  const adapter = (process.env.ADAPTER_ADDRESS || d.mpesaAdapter || '').trim();

  if (!ethers.isAddress(safe) || !ethers.isAddress(adapter)) {
    throw new Error('Invalid SAFE_ADDRESS or ADAPTER_ADDRESS');
  }

  console.log('Network:', network.name);
  console.log('USDT:', d.usdt);
  console.log('Safe (owner):', safe);
  console.log('Adapter (spender):', adapter);

  const balance = await usdt.balanceOf(safe);
  const allowance = await usdt.allowance(safe, adapter);

  console.log('Safe USDT balance:', balance.toString());
  console.log('Allowance Safe->Adapter:', allowance.toString());
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });








