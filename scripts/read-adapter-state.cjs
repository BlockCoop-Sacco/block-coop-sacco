/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');

async function main() {
  const adapter = (process.env.ADAPTER_ADDRESS || '0x244C89ED408d6b5D8f798908451d4477c18Ca650').trim();
  const abi = [
    'function usdt() view returns (address)',
    'function packageManager() view returns (address)',
    'function treasury() view returns (address)',
    'function backendEOA() view returns (address)'
  ];

  console.log('Network:', network.name);
  console.log('Adapter:', adapter);

  const c = new ethers.Contract(adapter, abi, (await ethers.getSigners())[0]);
  const [usdt, pm, treasury, backend] = await Promise.all([
    c.usdt(), c.packageManager(), c.treasury(), c.backendEOA()
  ]);

  console.log(JSON.stringify({ usdt, packageManager: pm, treasury, backendEOA: backend }, null, 2));
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






