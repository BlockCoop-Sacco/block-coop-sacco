/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers } = require('hardhat');
const fs = require('fs');

async function main() {
  const SAFE = (process.env.SAFE_ADDRESS || '').trim();
  if (!ethers.isAddress(SAFE)) throw new Error('SAFE_ADDRESS missing/invalid');

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const taxAbi = [
    'function MANAGER_ROLE() view returns (bytes32)',
    'function hasRole(bytes32,address) view returns (bool)',
    'function buckets(bytes32) view returns (uint16,address)',
    'function setBucket(bytes32,uint16,address)'
  ];
  const [signer] = await ethers.getSigners();
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager, signer);
  const onchainTaxManager = await pm.taxManager();
  const tax = new ethers.Contract(onchainTaxManager, taxAbi, signer);

  const K = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
  const keys = ['PURCHASE','BUY','SELL'];

  // Sanity: ensure caller has MANAGER_ROLE
  const MANAGER_ROLE = await tax.MANAGER_ROLE();
  const hasManager = await tax.hasRole(MANAGER_ROLE, await signer.getAddress());
  if (!hasManager) {
    throw new Error('Caller lacks MANAGER_ROLE on SwapTaxManager; grant role first');
  }

  for (const name of keys) {
    const key = K(name);
    const [rateBps, curRecipient] = await tax.buckets(key);
    console.log(name, 'current:', { rateBps, curRecipient });

    const tx = await tax.setBucket(key, rateBps, SAFE);
    console.log(name, 'tx:', tx.hash);
    const r = await tx.wait();
    if (r && r.status === 0) throw new Error(name + ' setBucket reverted');

    const [afterRate, afterRecipient] = await tax.buckets(key);
    console.log(name, 'updated:', { afterRate, afterRecipient });
  }
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });


