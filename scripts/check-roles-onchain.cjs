/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const NEW_ADMIN = (process.env.ADMIN_TO_CHECK || '').trim() || '0x34225ec84f8b5f6991dcd0ec555b1d04f70a74ee';
  const OLD_ADMIN = (process.env.OLD_ADMIN || '').trim() || (d.treasury || '').trim();
  if (!ethers.isAddress(NEW_ADMIN)) throw new Error('ADMIN_TO_CHECK invalid');
  if (!ethers.isAddress(OLD_ADMIN)) throw new Error('OLD_ADMIN invalid');

  const signer = (await ethers.getSigners())[0];
  console.log('Network:', network.name);
  console.log('Signer:', signer ? signer.address : '(none)');
  console.log('New admin:', NEW_ADMIN);
  console.log('Old admin:', OLD_ADMIN);

  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);
  const blocks = await ethers.getContractAt('BLOCKS', d.blocks);
  const blocksLP = await ethers.getContractAt('BLOCKS_LP', d.blocksLP);
  const vault = await ethers.getContractAt('VestingVault', d.vestingVault);
  const taxMgr = await ethers.getContractAt('SwapTaxManager', d.taxManager);
  const sec = await ethers.getContractAt('SecondaryMarket', d.secondaryMarket);

  const DEFAULT_ADMIN_ROLE = await pm.DEFAULT_ADMIN_ROLE();
  const SERVER_ROLE = await pm.SERVER_ROLE();
  const TAX_MANAGER_ROLE = blocks.TAX_MANAGER_ROLE ? await blocks.TAX_MANAGER_ROLE() : null;
  const MANAGER_ROLE = await taxMgr.MANAGER_ROLE();

  async function logRoles(label, contract, roles) {
    console.log(`\n${label}: ${contract.target}`);
    for (const [name, role] of roles) {
      const newHas = await contract.hasRole(role, NEW_ADMIN);
      const oldHas = await contract.hasRole(role, OLD_ADMIN);
      console.log(`  ${name} → new:${newHas} old:${oldHas}`);
    }
  }

  await logRoles('PackageManager', pm, [
    ['DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_ROLE],
    ['SERVER_ROLE', SERVER_ROLE],
  ]);

  const rolesBlocks = [['DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_ROLE]];
  if (TAX_MANAGER_ROLE) rolesBlocks.push(['TAX_MANAGER_ROLE', TAX_MANAGER_ROLE]);
  await logRoles('BLOCKS', blocks, rolesBlocks);

  await logRoles('BLOCKS_LP', blocksLP, [['DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_ROLE]]);
  await logRoles('VestingVault', vault, [['DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_ROLE]]);
  await logRoles('SwapTaxManager', taxMgr, [
    ['DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_ROLE],
    ['MANAGER_ROLE', MANAGER_ROLE],
  ]);
  await logRoles('SecondaryMarket', sec, [['DEFAULT_ADMIN_ROLE', DEFAULT_ADMIN_ROLE]]);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });


