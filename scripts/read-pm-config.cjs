/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);

  const PURCHASE_TAX_KEY = ethers.keccak256(ethers.toUtf8Bytes('PURCHASE'));
  const taxManagerAbi = ['function buckets(bytes32) view returns (uint16 rateBps, address recipient)'];
  const taxManager = new ethers.Contract(d.taxManager, taxManagerAbi, (await ethers.getSigners())[0]);

  const [paused, globalTargetPrice, slippageTolerance, liquidityBps, taxBucket] = await Promise.all([
    pm.paused(), pm.globalTargetPrice(), pm.slippageTolerance(), pm.liquidityBps(), taxManager.buckets(PURCHASE_TAX_KEY)
  ]);

  console.log('Network:', network.name);
  console.log('paused:', paused);
  console.log('globalTargetPrice:', globalTargetPrice.toString());
  console.log('slippageTolerance (bps):', slippageTolerance.toString());
  console.log('liquidityBps:', liquidityBps.toString());
  console.log('purchase tax:', { rateBps: taxBucket[0], recipient: taxBucket[1] });
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






