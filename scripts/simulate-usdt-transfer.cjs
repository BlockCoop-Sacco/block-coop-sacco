/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');

async function main() {
  const USDT = (process.env.USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955').trim();
  const SAFE = (process.env.SAFE_ADDRESS || '0xD04edC3225cEF6e82e50Dc559d38733180743b94').trim();
  const ADAPTER = (process.env.ADAPTER_ADDRESS || '0x244C89ED408d6b5D8f798908451d4477c18Ca650').trim();

  const amount = ethers.parseUnits('1', 18);
  const iface = new ethers.Interface(['function transferFrom(address,address,uint256) returns (bool)']);
  const data = iface.encodeFunctionData('transferFrom', [SAFE, ADAPTER, amount]);

  console.log('Network:', network.name);
  console.log('Simulating transferFrom(SAFE -> ADAPTER, 1 USDT) with msg.sender=ADAPTER');
  try {
    const ret = await ethers.provider.call({ to: USDT, data, from: ADAPTER });
    const [ok] = iface.decodeFunctionResult('transferFrom', ret);
    console.log('call success, return:', ok);
  } catch (e) {
    console.error('call reverted:', e.reason || e.shortMessage || e.message || e);
    if (e.data) console.error('data:', e.data);
  }
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






