/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const PAIR = (process.env.PAIR_ADDRESS || '').trim();
  if (!ethers.isAddress(PAIR)) throw new Error('PAIR_ADDRESS missing/invalid');

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const [signer] = await ethers.getSigners();
  const pairAbi = [
    'function token0() view returns (address)',
    'function token1() view returns (address)'
  ];
  const erc20Abi = ['function symbol() view returns (string)','function decimals() view returns (uint8)'];
  const pair = new ethers.Contract(PAIR, pairAbi, signer);

  const [t0, t1] = await Promise.all([pair.token0(), pair.token1()]);
  const t0c = new ethers.Contract(t0, erc20Abi, signer);
  const t1c = new ethers.Contract(t1, erc20Abi, signer);
  let t0sym = '?', t1sym = '?', t0dec = '?', t1dec = '?';
  try { t0sym = await t0c.symbol(); } catch {}
  try { t1sym = await t1c.symbol(); } catch {}
  try { t0dec = await t0c.decimals(); } catch {}
  try { t1dec = await t1c.decimals(); } catch {}

  console.log('Network:', network.name);
  console.log('Pair:', PAIR);
  console.log('token0:', t0, t0sym, t0dec);
  console.log('token1:', t1, t1sym, t1dec);
  console.log('BLOCKS:', d.blocks);
  console.log('USDT  :', d.usdt);
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });




