/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const pm = d.packageManager;
  const adapter = (process.env.ADAPTER_ADDRESS || d.mpesaAdapterV2).trim();

  const buyer = (process.env.TEST_BUYER || '0xff81cba6da71c50cc3123b277e612c95895abc67').trim();
  const packageId = parseInt(process.env.PACKAGE_ID || '2', 10);
  const referrer = (process.env.REFERRER || ethers.ZeroAddress).trim();

  const iface = new ethers.Interface(['function purchaseFor(address,uint256,address)']);
  const data = iface.encodeFunctionData('purchaseFor', [buyer, packageId, referrer]);

  console.log('Network:', network.name);
  console.log('From (simulated):', adapter);
  console.log('PM:', pm);

  try {
    await ethers.provider.call({ to: pm, data, from: adapter });
    console.log('staticcall: would succeed');
  } catch (e) {
    console.error('staticcall revert:', e.reason || e.shortMessage || e.message || e);
    if (e.data) console.error('data:', e.data);
  }
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






