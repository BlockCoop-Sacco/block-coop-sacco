/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers } = require('hardhat');

async function main() {
  const adapterAddress = (process.env.ADAPTER_ADDRESS || '0x244C89ED408d6b5D8f798908451d4477c18Ca650').trim();
  const buyer = (process.env.TEST_BUYER || '0xff81cba6da71c50cc3123b277e612c95895abc67').trim();
  const packageId = parseInt(process.env.PACKAGE_ID || '2', 10);
  const referrer = (process.env.REFERRER || ethers.ZeroAddress).trim();

  const abi = [ 'function purchaseUsingTreasury(address,uint256,address) external' ];
  const [signer] = await ethers.getSigners();
  const adapter = new ethers.Contract(adapterAddress, abi, signer);

  try {
    await adapter.purchaseUsingTreasury.staticCall(buyer, packageId, referrer);
    console.log('staticCall: would succeed');
  } catch (e) {
    console.error('staticCall revert:', e.reason || e.shortMessage || e.message || e);
    if (e.data) console.error('data:', e.data);
  }
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






