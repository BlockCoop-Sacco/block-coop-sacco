/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}
const { ethers } = require('hardhat');

const MINTER_ROLE = ethers.id('MINTER_ROLE');
const LOCKER_ROLE = ethers.id('LOCKER_ROLE');
const SERVER_ROLE = ethers.id('SERVER_ROLE');

async function main() {
  const pmAddress = process.env.PACKAGE_MANAGER_PROXY;
  const shareAddress = process.env.SHARE_ADDRESS || process.env.VITE_SHARE_ADDRESS;
  const lpAddress = process.env.LP_ADDRESS || process.env.VITE_LP_ADDRESS;
  const vaultAddress = process.env.VAULT_ADDRESS || process.env.VITE_VAULT_ADDRESS;
  const backendServer = process.env.BACKEND_SERVER || process.env.TREASURY_ADDRESS || process.env.VITE_TREASURY_ADDRESS;

  if (!pmAddress || !shareAddress || !lpAddress || !vaultAddress) {
    throw new Error('Missing env vars: PACKAGE_MANAGER_PROXY, SHARE_ADDRESS, LP_ADDRESS, VAULT_ADDRESS');
  }

  const pm = await ethers.getContractAt('PackageManagerUpgradeable', pmAddress);
  const share = await ethers.getContractAt('BLOCKS', shareAddress);
  const lp = await ethers.getContractAt('BLOCKS_LP', lpAddress);
  const vault = await ethers.getContractAt('VestingVault', vaultAddress);

  console.log('Granting roles to PackageManager proxy:', pmAddress);
  const tx1 = await share.grantRole(MINTER_ROLE, pmAddress); await tx1.wait();
  const tx2 = await lp.grantRole(MINTER_ROLE, pmAddress); await tx2.wait();
  const tx3 = await vault.grantRole(LOCKER_ROLE, pmAddress); await tx3.wait();

  if (backendServer) {
    console.log('Granting SERVER_ROLE to backend signer:', backendServer);
    const tx4 = await pm.grantRole(SERVER_ROLE, backendServer); await tx4.wait();
  }

  console.log('Initializing router allowances...');
  const tx5 = await pm.initRouterAllowances(); await tx5.wait();

  console.log('Done.');
}

main().catch((e) => { console.error(e); process.exit(1); });



