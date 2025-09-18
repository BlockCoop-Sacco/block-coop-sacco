/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}
const { ethers, upgrades } = require('hardhat');

async function main() {
  const proxyAddress = process.env.PACKAGE_MANAGER_PROXY;
  if (!proxyAddress) throw new Error('Missing PACKAGE_MANAGER_PROXY');

  const PM = await ethers.getContractFactory('PackageManagerUpgradeable');
  const upgraded = await upgrades.upgradeProxy(proxyAddress, PM);
  await upgraded.waitForDeployment();

  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('Upgraded PackageManager proxy at:', proxyAddress);
  console.log('New implementation at:', implAddress);
}

main().catch((e) => { console.error(e); process.exit(1); });



