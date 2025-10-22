/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, network } = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentsPath = 'deployments/deployments-mainnet-v2_2.json';
  const d = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));

  const buyer = (process.env.BUYER || '').trim();
  const packageId = parseInt(process.env.PACKAGE_ID || '2', 10);
  const referrer = (process.env.REFERRER || ethers.ZeroAddress).trim();
  if (!ethers.isAddress(buyer)) throw new Error('Set BUYER to target wallet address');

  const pm = await ethers.getContractAt('PackageManagerV2_2', d.packageManager);
  const usdt = await ethers.getContractAt('ERC20', d.usdt);
  const [signer] = await ethers.getSigners();

  console.log('Network:', network.name);
  console.log('Signer (backend EOA):', await signer.getAddress());
  console.log('Buyer:', buyer);
  console.log('PackageId:', packageId);
  console.log('Referrer:', referrer);
  console.log('PackageManager:', d.packageManager);
  console.log('USDT:', d.usdt);

  const pkg = await pm.getPackage(packageId);
  const entryUSDT = pkg.entryUSDT;
  console.log('entryUSDT:', entryUSDT.toString());

  const bal = await usdt.balanceOf(await signer.getAddress());
  console.log('Signer USDT balance:', bal.toString());
  if (bal < entryUSDT) throw new Error('Insufficient USDT balance on backend EOA');

  const currentAllowance = await usdt.allowance(await signer.getAddress(), d.packageManager);
  console.log('Current allowance to PM:', currentAllowance.toString());
  if (currentAllowance < entryUSDT) {
    console.log('Approving MaxUint256 to PackageManager...');
    const approveTx = await usdt.approve(d.packageManager, ethers.MaxUint256);
    console.log('approve tx:', approveTx.hash);
    await approveTx.wait();
  }

  console.log('Estimating gas for purchaseFor...');
  const gasEstimate = await pm.purchaseFor.estimateGas(buyer, packageId, referrer);
  const gasLimit = gasEstimate + (gasEstimate * 20n / 100n);
  console.log('Gas estimate:', gasEstimate.toString(), 'Gas limit:', gasLimit.toString());

  const tx = await pm.purchaseFor(buyer, packageId, referrer, { gasLimit });
  console.log('purchaseFor tx sent:', tx.hash);
  const rcpt = await tx.wait();
  console.log('purchaseFor mined. block:', rcpt.blockNumber, 'gasUsed:', rcpt.gasUsed.toString());
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });




