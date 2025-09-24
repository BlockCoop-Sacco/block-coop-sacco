/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}
const hre = require('hardhat');

/**
 * Estimate gas for redeploying core contracts (excluding PackageManager proxy upgrade)
 * and common setup calls. Uses current network gas price and a provided BNB price.
 *
 * Env:
 *   BNB_PRICE_USD (number) e.g. 979
 *   ROUTER, FACTORY, USDT, TREASURY, TAX_MANAGER (addresses) if needed
 */
async function main() {
  const ethers = hre.ethers;
  const provider = ethers.provider;
  const [deployer] = await ethers.getSigners();

  const bnbPrice = Number(process.env.BNB_PRICE_USD || '979');
  // ethers v6: getFeeData() returns { gasPrice?, maxFeePerGas?, maxPriorityFeePerGas? }
  const fee = await provider.getFeeData();
  const gasPrice = fee.gasPrice ?? fee.maxFeePerGas ?? ethers.parseUnits('5', 'gwei');

  function weiToBNB(wei) { return Number(wei) / 1e18; }
  function gwei(bn) { return Number(bn) / 1e9; }

  console.log('Network:', hre.network.name);
  console.log('Deployer:', deployer.address);
  console.log('Gas price (gwei):', gwei(gasPrice).toFixed(2));
  console.log('BNB price (USD):', bnbPrice);

  const results = [];
  let totalGas = 0n;

  async function estimateDeploy(name, factoryGetter, args = []) {
    const Factory = await factoryGetter();
    const deployTx = await Factory.getDeployTransaction(...args);
    // Normalize fields for estimateGas
    const tx = { from: deployer.address, data: deployTx.data, to: null, value: 0 };
    const est = await provider.estimateGas(tx);
    results.push({ name, gas: est });
    totalGas += est;
  }

  // NOTE: we only estimate; we do not send txs.
  // Factories (must exist in artifacts):
  // BLOCKS (token), BLOCKS_LP, VestingVault, SwapTaxManager, SecondaryMarket, MinimalForwarder

  // Addresses from deployments or env (router, factory, usdt, treasury)
  const deployments = require('../deployments/deployments-mainnet-v2_2-fixed-1756833373.json');
  const router = process.env.ROUTER || deployments.router;
  const factory = process.env.FACTORY || deployments.factory;
  const usdt = process.env.USDT || deployments.usdt;
  const treasury = process.env.TREASURY || deployments.treasury;
  const feeRecipient = treasury;
  const targetPrice = ethers.parseUnits('1.0', 18); // placeholder

  // BLOCKS
  await estimateDeploy(
    'BLOCKS (ERC20)',
    async () => await ethers.getContractFactory('BLOCKS'),
    [ 'BLOCKS', 'BLOCKS', deployer.address, (process.env.TAX_MANAGER || deployments.taxManager) ]
  );
  // BLOCKS_LP
  await estimateDeploy(
    'BLOCKS_LP (ERC20)',
    async () => await ethers.getContractFactory('BLOCKS_LP'),
    [ 'BLOCKS-LP', 'BLOCKS-LP', deployer.address ]
  );
  // VestingVault
  await estimateDeploy(
    'VestingVault',
    async () => await ethers.getContractFactory('VestingVault'),
    [ '0x0000000000000000000000000000000000000001', deployer.address ]
  );
  // SwapTaxManager
  await estimateDeploy('SwapTaxManager', async () => await ethers.getContractFactory('SwapTaxManager'), [ deployer.address ]);
  // SecondaryMarket(usdt, blocks, router, factory, feeRecipient, admin, targetPrice)
  await estimateDeploy('SecondaryMarket', async () => await ethers.getContractFactory('SecondaryMarket'), [ usdt, '0x0000000000000000000000000000000000000001', router, factory, feeRecipient, deployer.address, targetPrice ]);
  // MinimalForwarder
  await estimateDeploy('MinimalForwarder', async () => await ethers.getContractFactory('MinimalForwarder'), []);

  // Setup calls (rough estimates): we simulate simple role grants and a router allowance init on PackageManagerV2_2
  // For estimation, use a dummy contract with similar function signatures could be created; here we output typical ranges instead.

  console.log('\nPer-contract estimated gas:');
  for (const r of results) {
    const bnb = weiToBNB(r.gas * gasPrice);
    const usd = bnb * bnbPrice;
    console.log(`- ${r.name}: ${r.gas} gas ≈ ${bnb.toFixed(6)} BNB ≈ $${usd.toFixed(2)}`);
  }

  const totalBnb = weiToBNB(totalGas * gasPrice);
  const totalUsd = totalBnb * bnbPrice;

  console.log('\nTotal (deploy only):');
  console.log(`Gas: ${totalGas}  |  Cost: ${totalBnb.toFixed(6)} BNB  (~$${totalUsd.toFixed(2)})`);

  console.log('\nAdd setup overhead (roles/allowances): ~0.3M–0.8M gas');
  const low = totalGas + 300_000n;
  const high = totalGas + 800_000n;
  const lowBnb = weiToBNB(low * gasPrice);
  const highBnb = weiToBNB(high * gasPrice);
  console.log(`With setup low: ${low} gas ≈ ${lowBnb.toFixed(6)} BNB (~$${(lowBnb*bnbPrice).toFixed(2)})`);
  console.log(`With setup high: ${high} gas ≈ ${highBnb.toFixed(6)} BNB (~$${(highBnb*bnbPrice).toFixed(2)})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
