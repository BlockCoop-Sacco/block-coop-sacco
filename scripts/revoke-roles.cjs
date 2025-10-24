/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function revokeIfHas(contract, role, target, label) {
  const has = await contract.hasRole(role, target);
  if (!has) {
    console.log(`   ✅ ${label}: not present`);
    return true;
  }
  let tx;
  try {
    tx = await contract.revokeRole(role, target);
  } catch (e) {
    console.log(`   ❌ ${label}: revoke send failed: ${e.message || e}`);
    return false;
  }
  console.log(`   🔗 ${label}: revoke tx ${tx.hash}`);
  const receipt = await tx.wait();
  if (receipt && receipt.status === 0) {
    console.log(`   ❌ ${label}: tx reverted`);
    return false;
  }
  const ok = !(await contract.hasRole(role, target));
  console.log(`   ${ok ? '✅' : '❌'} ${label}: revoke ${ok ? 'confirmed' : 'failed'}`);
  return ok;
}

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const OLD_ADMIN = (process.env.OLD_ADMIN || '').trim();
  if (!OLD_ADMIN || !ethers.isAddress(OLD_ADMIN)) {
    throw new Error('Set OLD_ADMIN to a valid address');
  }

  console.log('Network:', network.name);
  console.log('Old admin to revoke:', OLD_ADMIN);

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

  console.log('\n📦 PackageManagerV2_2:', d.packageManager);
  await revokeIfHas(pm, SERVER_ROLE, OLD_ADMIN, 'PackageManager SERVER_ROLE');
  await revokeIfHas(pm, DEFAULT_ADMIN_ROLE, OLD_ADMIN, 'PackageManager DEFAULT_ADMIN_ROLE');

  console.log('\n🪙 BLOCKS:', d.blocks);
  await revokeIfHas(blocks, DEFAULT_ADMIN_ROLE, OLD_ADMIN, 'BLOCKS DEFAULT_ADMIN_ROLE');
  if (TAX_MANAGER_ROLE) {
    await revokeIfHas(blocks, TAX_MANAGER_ROLE, OLD_ADMIN, 'BLOCKS TAX_MANAGER_ROLE');
  }

  console.log('\n🪙 BLOCKS_LP:', d.blocksLP);
  await revokeIfHas(blocksLP, DEFAULT_ADMIN_ROLE, OLD_ADMIN, 'BLOCKS_LP DEFAULT_ADMIN_ROLE');

  console.log('\n🏦 VestingVault:', d.vestingVault);
  await revokeIfHas(vault, DEFAULT_ADMIN_ROLE, OLD_ADMIN, 'VestingVault DEFAULT_ADMIN_ROLE');

  console.log('\n🧾 SwapTaxManager:', d.taxManager);
  await revokeIfHas(taxMgr, DEFAULT_ADMIN_ROLE, OLD_ADMIN, 'SwapTaxManager DEFAULT_ADMIN_ROLE');
  await revokeIfHas(taxMgr, MANAGER_ROLE, OLD_ADMIN, 'SwapTaxManager MANAGER_ROLE');

  console.log('\n📈 SecondaryMarket:', d.secondaryMarket);
  await revokeIfHas(sec, DEFAULT_ADMIN_ROLE, OLD_ADMIN, 'SecondaryMarket DEFAULT_ADMIN_ROLE');

  console.log('\n✅ Done. Old admin revoked where present.');
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });


