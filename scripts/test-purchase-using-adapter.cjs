/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers } = require('hardhat');

async function main() {
  const adapterAddress = (process.env.ADAPTER_ADDRESS || '0x244C89ED408d6b5D8f798908451d4477c18Ca650').trim();
  const buyer = (process.env.TEST_BUYER || '0xff81cba6da71c50cc3123b277e612c95895abc67').trim();
  const packageId = parseInt(process.env.PACKAGE_ID || '2', 10);
  const referrer = (process.env.REFERRER || ethers.ZeroAddress).trim();

  const abi = [
    'function purchaseUsingTreasury(address buyer,uint256 packageId,address referrer) external'
  ];

  const [signer] = await ethers.getSigners();
  console.log('Network:', (await ethers.provider.getNetwork()).name);
  console.log('Signer:', await signer.getAddress());
  console.log('Adapter:', adapterAddress);
  console.log('Buyer:', buyer);
  console.log('PackageId:', packageId);
  console.log('Referrer:', referrer);

  const adapter = new ethers.Contract(adapterAddress, abi, signer);
  try {
    const gasLimit = 500000n; // fallback gas limit
    const tx = await adapter.purchaseUsingTreasury(buyer, packageId, referrer, { gasLimit });
    console.log('tx sent:', tx.hash);
    const rcpt = await tx.wait();
    console.log('tx mined in block:', rcpt.blockNumber);
  } catch (e) {
    console.error('❌ Send failed:', e.reason || e.shortMessage || e.message || e);
    if (e.data) console.error('data:', e.data);
    if (e.code) console.error('code:', e.code);
  }
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






