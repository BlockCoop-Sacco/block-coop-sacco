/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);
  const usdt = await ethers.getContractAt('ERC20', d.usdt);
  const adapter = (process.env.ADAPTER_ADDRESS || d.mpesaAdapter).trim();
  const safe = (process.env.SAFE_ADDRESS || d.treasury).trim();

  const serverRole = await pm.SERVER_ROLE();
  const hasRole = await pm.hasRole(serverRole, adapter);
  const entryUSDT = (await pm.getPackage(2)).entryUSDT;
  const balSafe = await usdt.balanceOf(safe);
  const allowSafeToAdapter = await usdt.allowance(safe, adapter);
  const balAdapter = await usdt.balanceOf(adapter);
  const allowAdapterToPM = await usdt.allowance(adapter, d.packageManager);

  console.log(JSON.stringify({
    network: network.name,
    adapter,
    serverRole: hasRole,
    entryUSDT: entryUSDT.toString(),
    safeBalance: balSafe.toString(),
    safeToAdapterAllowance: allowSafeToAdapter.toString(),
    adapterBalance: balAdapter.toString(),
    adapterToPmAllowance: allowAdapterToPM.toString()
  }, null, 2));
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });





