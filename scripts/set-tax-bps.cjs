/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const SAFE = (process.env.SAFE_ADDRESS || '').trim();
  const BPS = parseInt(process.env.TAX_BPS || '200', 10);
  if (!ethers.isAddress(SAFE)) throw new Error('SAFE_ADDRESS missing/invalid');
  if (!(BPS >= 0 && BPS <= 10000)) throw new Error('TAX_BPS must be between 0 and 10000');

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const [signer] = await ethers.getSigners();
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager, signer);
  const taxManagerAddr = await pm.taxManager();

  const taxAbi = [
    'function MANAGER_ROLE() view returns (bytes32)',
    'function hasRole(bytes32,address) view returns (bool)',
    'function buckets(bytes32) view returns (uint16,address)',
    'function setBucket(bytes32,uint16,address)'
  ];
  const tax = new ethers.Contract(taxManagerAddr, taxAbi, signer);

  const K = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
  const keys = ['PURCHASE','BUY','SELL'];

  console.log('Network:', network.name);
  console.log('TaxManager:', taxManagerAddr);
  console.log('Setting all buckets to', BPS, 'bps and recipient', SAFE);

  const MANAGER_ROLE = await tax.MANAGER_ROLE();
  const hasManager = await tax.hasRole(MANAGER_ROLE, await signer.getAddress());
  if (!hasManager) throw new Error('Caller lacks MANAGER_ROLE on SwapTaxManager');

  for (const name of keys) {
    const key = K(name);
    const [prevBps, prevRecipient] = await tax.buckets(key);
    console.log(name, 'before =>', { rateBps: prevBps, recipient: prevRecipient });

    const tx = await tax.setBucket(key, BPS, SAFE);
    console.log(name, 'tx:', tx.hash);
    const r = await tx.wait();
    if (r && r.status === 0) throw new Error(name + ' setBucket reverted');

    const [afterBps, afterRecipient] = await tax.buckets(key);
    console.log(name, 'after  =>', { rateBps: afterBps, recipient: afterRecipient });
  }
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });




