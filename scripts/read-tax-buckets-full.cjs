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
  const onchainPMTaxManager = await pm.taxManager();

  const blocksAbi = ['function swapTaxManager() view returns (address)'];
  const blocks = new ethers.Contract(d.blocks, blocksAbi, signer);
  const tokenTaxManager = await blocks.swapTaxManager();

  const taxAbi = ['function buckets(bytes32) view returns (uint16,address)'];
  const pmTax = new ethers.Contract(onchainPMTaxManager, taxAbi, signer);
  const tknTax = new ethers.Contract(tokenTaxManager, taxAbi, signer);

  const K = (s) => ethers.keccak256(ethers.toUtf8Bytes(s));
  const keys = ['PURCHASE','BUY','SELL'];

  console.log('Network:', network.name);
  console.log('PackageManager:', d.packageManager);
  console.log('PM TaxManager:', onchainPMTaxManager);
  console.log('BLOCKS token:', d.blocks);
  console.log('Token TaxManager:', tokenTaxManager);

  for (const name of keys) {
    const key = K(name);
    const [pmBps, pmRec] = await pmTax.buckets(key).catch(() => [null, null]);
    const [tkBps, tkRec] = await tknTax.buckets(key).catch(() => [null, null]);
    console.log(name + ' => PM:', { rateBps: pmBps, recipient: pmRec }, ' | TOKEN:', { rateBps: tkBps, recipient: tkRec });
  }
}

main().catch((e)=>{ console.error('❌ Error:', e.message || e); process.exit(1); });




