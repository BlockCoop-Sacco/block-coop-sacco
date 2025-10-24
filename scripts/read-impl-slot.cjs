/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}
const hre = require('hardhat');

async function main() {
  const proxy = process.env.PACKAGE_MANAGER_PROXY;
  if (!proxy) throw new Error('Missing PACKAGE_MANAGER_PROXY');
  const IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
  const provider = hre.ethers.provider;
  // ethers v6: getStorage(address, position)
  const raw = await provider.getStorage(proxy, IMPL_SLOT);
  // raw is 32-byte hex, address is right-most 20 bytes
  const impl = '0x' + raw.slice(raw.length - 40);
  console.log('Proxy:', proxy);
  console.log('Impl raw:', raw);
  console.log('Impl addr:', impl);
}

main().catch((e) => { console.error(e); process.exit(1); });
