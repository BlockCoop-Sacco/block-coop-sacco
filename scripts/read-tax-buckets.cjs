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

  const [signer] = await ethers.getSigners();
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager, signer);
  const onchainTaxManager = await pm.taxManager();
  const taxAbi = ['function buckets(bytes32) view returns (uint16,address)'];
  const tax = new ethers.Contract(onchainTaxManager, taxAbi, signer);

  const K = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
  const names = ['PURCHASE','BUY','SELL'];

  console.log('Network:', network.name);
  console.log('PackageManager:', d.packageManager);
  console.log('TaxManager (on-chain):', onchainTaxManager);

  for (const name of names) {
    const [rateBps, recipient] = await tax.buckets(K(name));
    console.log(name + ' =>', { rateBps, recipient });
  }
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });


