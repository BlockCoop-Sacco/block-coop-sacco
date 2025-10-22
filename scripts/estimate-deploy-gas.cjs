const hre = require('hardhat');

async function main() {
  const { ethers } = hre;

  // Use env or defaults
  const USDT = (process.env.USDT || '0x55d398326f99059ff775485246999027b3197955').toLowerCase();
  const ROUTER = (process.env.ROUTER || '0x10ED43C718714eb63d5AA57B78B54704E256024E').toLowerCase();
  const FACTORY = (process.env.FACTORY || '0xCA143Ce32Fe78f1f7019d7d551a6402fC5350c73').toLowerCase();
  const ADMIN = (process.env.VITE_TREASURY_ADDRESS || (await ethers.getSigners())[0].address).toLowerCase();
  const TREASURY = (process.env.VITE_TREASURY_ADDRESS || ADMIN).toLowerCase();
  const FEE_RECIPIENT = (process.env.FEE_RECIPIENT || TREASURY).toLowerCase();
  const GLOBAL_TARGET_PRICE = ethers.parseUnits(process.env.GLOBAL_TARGET_PRICE || '1', 18);

  const provider = ethers.provider;
  const [deployer] = await ethers.getSigners();
  const fee = await provider.getFeeData();
  const gasPrice = fee.gasPrice ?? fee.maxFeePerGas ?? ethers.parseUnits('3', 'gwei');

  function fmt(g) { return g.toString(); }
  function toBNB(g) { return Number((g * gasPrice) / 10n**18n); }

  // Factories
  const SwapTaxManager = await ethers.getContractFactory('SwapTaxManager');
  const BLOCKS = await ethers.getContractFactory('BLOCKS');
  const BLOCKS_LP = await ethers.getContractFactory('BLOCKS_LP');
  const VestingVault = await ethers.getContractFactory('VestingVault');
  const PackageManager = await ethers.getContractFactory('PackageManagerV2_2');
  const SecondaryMarket = await ethers.getContractFactory('SecondaryMarket');
  const Staking = await ethers.getContractFactory('BLOCKSStakingV2');

  const results = [];
  let total = 0n;

  async function est(name, tx) {
    const gas = await provider.estimateGas({ from: deployer.address, data: tx.data, to: null, value: 0 });
    results.push([name, gas]);
    total += gas;
  }

  await est('SwapTaxManager', await SwapTaxManager.getDeployTransaction(ADMIN));
  await est('BLOCKS', await BLOCKS.getDeployTransaction('BLOCKS', 'BLOCKS', ADMIN, '0x0000000000000000000000000000000000000001'));
  await est('BLOCKS_LP', await BLOCKS_LP.getDeployTransaction('BLOCKS-LP', 'BLOCKS-LP', ADMIN));
  await est('VestingVault', await VestingVault.getDeployTransaction('0x0000000000000000000000000000000000000002', ADMIN));
  await est('PackageManagerV2_2', await PackageManager.getDeployTransaction(USDT, '0x0000000000000000000000000000000000000002', '0x0000000000000000000000000000000000000003', '0x0000000000000000000000000000000000000004', ROUTER, FACTORY, TREASURY, '0x0000000000000000000000000000000000000005', ADMIN, GLOBAL_TARGET_PRICE));
  await est('SecondaryMarket', await SecondaryMarket.getDeployTransaction(USDT, '0x0000000000000000000000000000000000000002', ROUTER, FACTORY, FEE_RECIPIENT, ADMIN, GLOBAL_TARGET_PRICE));
  await est('BLOCKSStakingV2', await Staking.getDeployTransaction('0x0000000000000000000000000000000000000002', USDT, ADMIN));

  // Setup extras
  const setupLow = 300_000n;
  const setupHigh = 800_000n;

  console.log('--- Gas Estimates (deploy-friendly build assumed) ---');
  for (const [name, gas] of results) {
    console.log(`${name}: ${fmt(gas)} gas`);
  }
  console.log(`TOTAL (deploy only): ${fmt(total)} gas`);
  console.log(`With setup low:  ${fmt(total + setupLow)} gas`);
  console.log(`With setup high: ${fmt(total + setupHigh)} gas`);
}

main().catch((e) => { console.error(e); process.exit(1); });
