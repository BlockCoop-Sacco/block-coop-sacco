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
  const blocksAbi = [
    'function isAMM(address) view returns (bool)'
  ];
  const blocks = new ethers.Contract(d.blocks, blocksAbi, signer);

  const status = await blocks.isAMM(PAIR);
  console.log('Network:', network.name);
  console.log('BLOCKS:', d.blocks);
  console.log('Pair:', PAIR);
  console.log('isAMM:', status);
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });


