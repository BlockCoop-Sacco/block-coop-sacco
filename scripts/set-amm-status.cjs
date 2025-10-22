/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const PAIR = (process.env.PAIR_ADDRESS || '').trim();
  const ENABLE = ((process.env.ENABLE_AMM || 'true').trim().toLowerCase() !== 'false');
  if (!ethers.isAddress(PAIR)) throw new Error('PAIR_ADDRESS missing/invalid');

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const [signer] = await ethers.getSigners();
  const blocksAbi = [
    'function TAX_MANAGER_ROLE() view returns (bytes32)',
    'function hasRole(bytes32,address) view returns (bool)',
    'function isAMM(address) view returns (bool)',
    'function setAMMStatus(address,bool)'
  ];
  const blocks = new ethers.Contract(d.blocks, blocksAbi, signer);

  const role = await blocks.TAX_MANAGER_ROLE();
  const hasRole = await blocks.hasRole(role, await signer.getAddress());
  if (!hasRole) throw new Error('Caller lacks TAX_MANAGER_ROLE on BLOCKS');

  const before = await blocks.isAMM(PAIR);
  if (before === ENABLE) {
    console.log('Network:', network.name);
    console.log('BLOCKS:', d.blocks);
    console.log('Pair:', PAIR);
    console.log('Already', ENABLE ? 'enabled' : 'disabled');
    return;
  }

  const tx = await blocks.setAMMStatus(PAIR, ENABLE);
  console.log('tx:', tx.hash);
  const r = await tx.wait();
  if (r && r.status === 0) throw new Error('setAMMStatus reverted');

  const after = await blocks.isAMM(PAIR);
  console.log('Network:', network.name);
  console.log('BLOCKS:', d.blocks);
  console.log('Pair:', PAIR);
  console.log('isAMM after:', after);
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });


