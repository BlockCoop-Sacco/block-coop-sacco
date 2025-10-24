/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers } = require('hardhat');

async function main() {
  const USDT = (process.env.USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955').trim();
  const ADAPTER = (process.env.ADAPTER_ADDRESS || '0x244C89ED408d6b5D8f798908451d4477c18Ca650').trim();
  const PACKAGE_MANAGER = (process.env.PACKAGE_MANAGER_ADDRESS || '0xc3e986a4FBBEd9f25F74b3dceA942384a654214a').trim();

  if (!ethers.isAddress(USDT) || !ethers.isAddress(ADAPTER) || !ethers.isAddress(PACKAGE_MANAGER)) {
    throw new Error('Invalid address in env');
  }

  const erc20Abi = ['function allowance(address,address) view returns (uint256)'];
  const usdt = new ethers.Contract(USDT, erc20Abi, (await ethers.getSigners())[0]);
  const allowance = await usdt.allowance(ADAPTER, PACKAGE_MANAGER);

  console.log('Adapter→PackageManager allowance:', allowance.toString());
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






