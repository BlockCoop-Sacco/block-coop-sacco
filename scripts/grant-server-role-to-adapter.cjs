/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🔐 Granting SERVER_ROLE to adapter');
  console.log('Network:', network.name);

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);
  const adapter = (process.env.MPESA_ADAPTER_ADDRESS || d.mpesaAdapter || '').trim();
  if (!adapter || !ethers.isAddress(adapter)) {
    throw new Error('Set MPESA_ADAPTER_ADDRESS or ensure deployments has mpesaAdapter');
  }

  const serverRole = await pm.SERVER_ROLE();
  const has = await pm.hasRole(serverRole, adapter);
  console.log('Adapter:', adapter);
  console.log('Already has SERVER_ROLE?', has);
  if (has) {
    console.log('✅ Adapter already has SERVER_ROLE');
    return;
  }

  const tx = await pm.grantRole(serverRole, adapter);
  console.log('🔗 grantRole tx:', tx.hash);
  const r = await tx.wait();
  if (r && r.status === 0) {
    throw new Error('grantRole reverted');
  }
  console.log('✅ SERVER_ROLE granted to adapter');
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });






