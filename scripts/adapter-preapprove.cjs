/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers } = require('hardhat');

async function main() {
  const adapterAddress = (process.env.ADAPTER_ADDRESS || '0x244C89ED408d6b5D8f798908451d4477c18Ca650').trim();
  if (!ethers.isAddress(adapterAddress)) {
    throw new Error('Invalid ADAPTER_ADDRESS');
  }

  const abi = ['function preapprove() external'];
  const [signer] = await ethers.getSigners();

  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log('Signer:', await signer.getAddress());
  console.log('Adapter:', adapterAddress);

  const adapter = new ethers.Contract(adapterAddress, abi, signer);
  const tx = await adapter.preapprove();
  console.log('tx sent:', tx.hash);
  const rcpt = await tx.wait();
  console.log('tx mined in block:', rcpt.blockNumber);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });







