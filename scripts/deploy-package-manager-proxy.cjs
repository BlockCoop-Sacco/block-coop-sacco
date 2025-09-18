/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}
const { ethers, upgrades } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const args = {
    usdt: process.env.USDT_ADDRESS || process.env.VITE_USDT_ADDRESS,
    share: process.env.SHARE_ADDRESS || process.env.VITE_SHARE_ADDRESS,
    lp: process.env.LP_ADDRESS || process.env.VITE_LP_ADDRESS,
    vault: process.env.VAULT_ADDRESS || process.env.VITE_VAULT_ADDRESS,
    router: process.env.ROUTER_ADDRESS || process.env.VITE_ROUTER_ADDRESS,
    factory: process.env.FACTORY_ADDRESS || process.env.VITE_FACTORY_ADDRESS,
    treasury: process.env.TREASURY_ADDRESS || process.env.VITE_TREASURY_ADDRESS,
    tax: process.env.TAX_MANAGER_ADDRESS || process.env.VITE_TAX_ADDRESS,
    admin: process.env.ADMIN_ADDRESS || process.env.VITE_TREASURY_ADDRESS || deployer.address,
    globalTarget: process.env.GLOBAL_TARGET_PRICE || ethers.parseUnits('1', 18).toString(),
  };

  for (const [k, v] of Object.entries(args)) {
    if (!v || v === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Missing env var for ${k}`);
    }
  }

  console.log('Deploy args summary:', {
    usdt: args.usdt,
    share: args.share,
    lp: args.lp,
    vault: args.vault,
    router: args.router,
    factory: args.factory,
    treasury: args.treasury,
    tax: args.tax,
    admin: args.admin,
    globalTarget: args.globalTarget,
  });

  const PM = await ethers.getContractFactory('PackageManagerUpgradeable');
  const proxy = await upgrades.deployProxy(
    PM,
    [args.usdt, args.share, args.lp, args.vault, args.router, args.factory, args.treasury, args.tax, args.admin, args.globalTarget],
    { kind: 'transparent', initializer: 'initialize' }
  );
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log('PackageManager proxy deployed at:', proxyAddress);
  console.log('Implementation at:', implAddress);
  console.log('ProxyAdmin at:', adminAddress);
}

main().catch((e) => { console.error(e); process.exit(1); });



