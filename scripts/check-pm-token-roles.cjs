/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const pmAddr = d.packageManager;

  const accessAbi = [
    'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
    'function MINTER_ROLE() view returns (bytes32)',
    'function BURNER_ROLE() view returns (bytes32)',
    'function LOCKER_ROLE() view returns (bytes32)',
    'function hasRole(bytes32,address) view returns (bool)'
  ];

  const blocks = new ethers.Contract(d.blocks, accessAbi, (await ethers.getSigners())[0]);
  const blocksLP = new ethers.Contract(d.blocksLP, accessAbi, (await ethers.getSigners())[0]);
  const vesting = new ethers.Contract(d.vestingVault, accessAbi, (await ethers.getSigners())[0]);

  const [minterRole, lpMinterRole, lockerRole] = await Promise.all([
    blocks.MINTER_ROLE(), blocksLP.MINTER_ROLE(), vesting.LOCKER_ROLE()
  ]);

  const [pmIsBlocksMinter, pmIsLPMinter, pmIsLocker] = await Promise.all([
    blocks.hasRole(minterRole, pmAddr), blocksLP.hasRole(lpMinterRole, pmAddr), vesting.hasRole(lockerRole, pmAddr)
  ]);

  console.log('Network:', network.name);
  console.log('PackageManager:', pmAddr);
  console.log('BLOCKS:', d.blocks, 'MINTER_ROLE:', pmIsBlocksMinter);
  console.log('BLOCKS_LP:', d.blocksLP, 'MINTER_ROLE:', pmIsLPMinter);
  console.log('VestingVault:', d.vestingVault, 'LOCKER_ROLE:', pmIsLocker);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






