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

  const newRecipient = (process.env.SEC_FEE_RECIPIENT || '').trim();
  if (!ethers.isAddress(newRecipient)) {
    throw new Error('Set SEC_FEE_RECIPIENT to a valid address');
  }

  console.log('Network:', network.name);
  console.log('SecondaryMarket:', d.secondaryMarket);
  console.log('New fee recipient:', newRecipient);

  const secAbi = [
    'function feeRecipient() view returns (address)',
    'function updateFeeRecipient(address)'
  ];

  const sec = new ethers.Contract(d.secondaryMarket, secAbi, (await ethers.getSigners())[0]);
  const before = await sec.feeRecipient();
  console.log('Current fee recipient:', before);
  if (before.toLowerCase() === newRecipient.toLowerCase()) {
    console.log('✅ Already set');
    return;
  }
  const tx = await sec.updateFeeRecipient(newRecipient);
  console.log('🔗 updateFeeRecipient tx:', tx.hash);
  const rc = await tx.wait();
  if (rc && rc.status === 0) throw new Error('updateFeeRecipient reverted');
  const after = await sec.feeRecipient();
  console.log('✅ Updated fee recipient:', after);
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });


