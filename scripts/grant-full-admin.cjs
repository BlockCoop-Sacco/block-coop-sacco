/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function grantIfMissing(contract, role, target, label) {
  const has = await contract.hasRole(role, target);
  if (has) {
    console.log(`   ✅ ${label}: already granted`);
    return true;
  }
  const gwei = (process.env.GAS_PRICE_GWEI || '').trim();
  const overrides = gwei ? { gasPrice: (await contract.runner.provider).parseUnits ? undefined : undefined } : {};
  let tx;
  try {
    tx = await contract.grantRole(role, target, gwei ? { gasPrice: require('hardhat').ethers.parseUnits(gwei, 'gwei') } : {});
  } catch (e) {
    console.log(`   ❌ ${label}: grant send failed: ${e.message || e}`);
    return false;
  }
  console.log(`   🔗 ${label}: grant tx ${tx.hash}`);
  const receipt = await tx.wait();
  if (receipt && receipt.status === 0) {
    console.log(`   ❌ ${label}: tx reverted`);
    return false;
  }
  const ok = await contract.hasRole(role, target);
  console.log(`   ${ok ? '✅' : '❌'} ${label}: grant ${ok ? 'confirmed' : 'failed'}`);
  return ok;
}

async function main() {
  const target = (process.env.ADMIN_TO_GRANT || '').trim();
  if (!target || !ethers.isAddress(target)) {
    throw new Error('Set ADMIN_TO_GRANT to a valid address');
  }

  console.log('🔐 Granting full admin privileges');
  console.log('Network:', network.name);
  console.log('Target wallet:', target);
  const signer = (await ethers.getSigners())[0].address;
  console.log('Using signer:', signer);

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);
  const blocks = await ethers.getContractAt('BLOCKS', d.blocks);
  const blocksLP = await ethers.getContractAt('BLOCKS_LP', d.blocksLP);
  const vault = await ethers.getContractAt('VestingVault', d.vestingVault);
  const taxMgr = await ethers.getContractAt('SwapTaxManager', d.taxManager);
  const sec = await ethers.getContractAt('SecondaryMarket', d.secondaryMarket);

  const DEFAULT_ADMIN_ROLE = await pm.DEFAULT_ADMIN_ROLE();
  const SERVER_ROLE = await pm.SERVER_ROLE();
  console.log('\n🔎 Signer current roles on PackageManager:');
  console.log('   has DEFAULT_ADMIN?', await pm.hasRole(DEFAULT_ADMIN_ROLE, signer));
  console.log('   has SERVER?', await pm.hasRole(SERVER_ROLE, signer));
  const TAX_MANAGER_ROLE = await blocks.TAX_MANAGER_ROLE ? await blocks.TAX_MANAGER_ROLE() : null;
  const MANAGER_ROLE = await taxMgr.MANAGER_ROLE();

  console.log('\n📦 PackageManagerV2_2:', d.packageManager);
  await grantIfMissing(pm, DEFAULT_ADMIN_ROLE, target, 'PackageManager DEFAULT_ADMIN_ROLE');
  await grantIfMissing(pm, SERVER_ROLE, target, 'PackageManager SERVER_ROLE');

  console.log('\n🪙 BLOCKS:', d.blocks);
  await grantIfMissing(blocks, DEFAULT_ADMIN_ROLE, target, 'BLOCKS DEFAULT_ADMIN_ROLE');
  if (TAX_MANAGER_ROLE) {
    await grantIfMissing(blocks, TAX_MANAGER_ROLE, target, 'BLOCKS TAX_MANAGER_ROLE');
  }

  console.log('\n🪙 BLOCKS_LP:', d.blocksLP);
  await grantIfMissing(blocksLP, DEFAULT_ADMIN_ROLE, target, 'BLOCKS_LP DEFAULT_ADMIN_ROLE');

  console.log('\n🏦 VestingVault:', d.vestingVault);
  await grantIfMissing(vault, DEFAULT_ADMIN_ROLE, target, 'VestingVault DEFAULT_ADMIN_ROLE');

  console.log('\n🧾 SwapTaxManager:', d.taxManager);
  await grantIfMissing(taxMgr, DEFAULT_ADMIN_ROLE, target, 'SwapTaxManager DEFAULT_ADMIN_ROLE');
  await grantIfMissing(taxMgr, MANAGER_ROLE, target, 'SwapTaxManager MANAGER_ROLE');

  console.log('\n📈 SecondaryMarket:', d.secondaryMarket);
  await grantIfMissing(sec, DEFAULT_ADMIN_ROLE, target, 'SecondaryMarket DEFAULT_ADMIN_ROLE');

  console.log('\n✅ Done. Wallet now has admin roles across core contracts.');
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });


