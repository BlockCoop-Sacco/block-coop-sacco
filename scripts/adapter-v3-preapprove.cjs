/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers } = require('hardhat');

async function main() {
  const adapterAddress = (process.env.ADAPTER_ADDRESS || process.env.MPESA_ADAPTER_ADDRESS || '').trim();
  if (!adapterAddress) throw new Error('Set ADAPTER_ADDRESS or MPESA_ADAPTER_ADDRESS');
  const abi = ['function preapprove() external'];
  const [signer] = await ethers.getSigners();
  console.log('Adapter:', adapterAddress);
  console.log('Signer:', await signer.getAddress());
  const adapter = new ethers.Contract(adapterAddress, abi, signer);
  const tx = await adapter.preapprove();
  console.log('tx sent:', tx.hash);
  const rcpt = await tx.wait();
  console.log('tx mined in block:', rcpt.blockNumber);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });





