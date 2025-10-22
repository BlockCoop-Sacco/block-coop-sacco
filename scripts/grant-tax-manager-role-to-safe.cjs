/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const SAFE = (process.env.SAFE_ADDRESS || '').trim();
  if (!ethers.isAddress(SAFE)) throw new Error('SAFE_ADDRESS missing/invalid');

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const [signer] = await ethers.getSigners();
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager, signer);
  const taxManagerAddr = await pm.taxManager();

  const taxAbi = [
    'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    'function MANAGER_ROLE() view returns (bytes32)',
    'function hasRole(bytes32,address) view returns (bool)',
    'function grantRole(bytes32,address)'
  ];
  const tax = new ethers.Contract(taxManagerAddr, taxAbi, signer);

  console.log('Network:', network.name);
  console.log('TaxManager:', taxManagerAddr);

  const MANAGER_ROLE = await tax.MANAGER_ROLE();
  const hasManager = await tax.hasRole(MANAGER_ROLE, SAFE);
  console.log('Safe has MANAGER_ROLE:', hasManager);
  if (!hasManager) {
    const tx = await tax.grantRole(MANAGER_ROLE, SAFE);
    console.log('grantRole tx:', tx.hash);
    const r = await tx.wait();
    if (r && r.status === 0) throw new Error('grantRole reverted');
  }
  const after = await tax.hasRole(MANAGER_ROLE, SAFE);
  console.log('Safe MANAGER_ROLE after:', after);
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });




