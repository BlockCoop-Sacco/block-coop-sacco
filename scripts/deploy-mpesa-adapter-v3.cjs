/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  console.log('🚀 Deploying MpesaTreasuryAdapterV3');
  console.log('Network:', network.name);

  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error('Missing deployments file: ' + deploymentsPath);
  }
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const usdt = process.env.USDT_ADDRESS || d.usdt;
  const pm = process.env.PACKAGE_MANAGER_ADDRESS || d.packageManager;
  const treasury = process.env.TREASURY_ADDRESS || process.env.SAFE_ADDRESS || d.treasury;
  const [signer] = await ethers.getSigners();
  const backend = (process.env.BACKEND_EXECUTOR_ADDRESS || signer.address).trim();

  console.log('USDT:', usdt);
  console.log('PackageManager:', pm);
  console.log('Treasury (Safe):', treasury);
  console.log('Backend EOA:', backend);

  const Adapter = await ethers.getContractFactory('MpesaTreasuryAdapterV3');
  const adapter = await Adapter.deploy(usdt, pm, treasury, backend);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log('✅ Deployed MpesaTreasuryAdapterV3 at:', adapterAddress);

  d.mpesaAdapterV3 = adapterAddress;
  d.timestamp = Date.now();
  fs.writeFileSync(deploymentsPath, JSON.stringify(d, null, 2));
  console.log('📝 Updated', deploymentsPath, 'with mpesaAdapterV3');
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });





