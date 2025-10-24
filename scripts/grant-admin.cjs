/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}
const { ethers } = require('hardhat');

/**
 * Grant DEFAULT_ADMIN_ROLE to a target wallet on the PackageManager proxy
 *
 * Required env vars:
 * - PACKAGE_MANAGER_PROXY: address of the PackageManager proxy
 * - NEW_ADMIN: wallet address to grant DEFAULT_ADMIN_ROLE to
 *
 * Optional:
 * - NETWORK is controlled by hardhat --network flag
 */
async function main() {
  const pmAddress = process.env.PACKAGE_MANAGER_PROXY;
  const newAdmin = process.env.NEW_ADMIN;

  if (!pmAddress) throw new Error('Missing env var PACKAGE_MANAGER_PROXY');
  if (!newAdmin) throw new Error('Missing env var NEW_ADMIN');

  console.log('Granting DEFAULT_ADMIN_ROLE on PackageManager to:', newAdmin);
  console.log('PackageManager (proxy):', pmAddress);

  // Use the compiled contract name present in artifacts
  const pm = await ethers.getContractAt('PackageManagerV2_2', pmAddress);

  const DEFAULT_ADMIN_ROLE = await pm.DEFAULT_ADMIN_ROLE();

  const already = await pm.hasRole(DEFAULT_ADMIN_ROLE, newAdmin);
  if (already) {
    console.log('Address already has DEFAULT_ADMIN_ROLE. Skipping.');
    return;
  }

  const tx = await pm.grantRole(DEFAULT_ADMIN_ROLE, newAdmin);
  console.log('grantRole tx:', tx.hash);
  await tx.wait();

  const ok = await pm.hasRole(DEFAULT_ADMIN_ROLE, newAdmin);
  console.log('Grant successful?', ok);
}

main().catch((e) => { console.error(e); process.exit(1); });


