// scripts/grantMinterRole.cjs
require('dotenv').config();

const { ethers } = require('ethers');
const ShareTokenJSON = require('../src/abi/ShareToken.json');
const LPTokenJSON    = require('../src/abi/LPToken.json');

async function main() {
  const rpcUrl   = process.env.VITE_RPC_URL;
  const adminKey = process.env.ADMIN_PRIVATE_KEY;
  const shareAddr= process.env.VITE_SHARE_ADDRESS;
  const lpAddr   = process.env.VITE_LP_ADDRESS;
  const pkgMgr   = process.env.VITE_PACKAGE_MANAGER_ADDRESS;

  if (!rpcUrl || !adminKey || !shareAddr || !lpAddr || !pkgMgr) {
    console.error('❌ Missing one of required env vars: VITE_RPC_URL, ADMIN_PRIVATE_KEY, VITE_SHARE_ADDRESS, VITE_LP_ADDRESS, VITE_PACKAGE_MANAGER_ADDRESS');
    process.exit(1);
  }

  // In ethers v6, use ethers.JsonRpcProvider directly
  const provider    = new ethers.JsonRpcProvider(rpcUrl);
  const adminSigner = new ethers.Wallet(adminKey, provider);

  const share = new ethers.Contract(shareAddr, ShareTokenJSON.abi, adminSigner);
  const lp    = new ethers.Contract(lpAddr,    LPTokenJSON.abi,    adminSigner);

  // Compute MINTER_ROLE
  const MINTER_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes('MINTER_ROLE')
  );

  console.log('Granting MINTER_ROLE on ShareToken...');
  await (await share.grantRole(MINTER_ROLE, pkgMgr)).wait();
  console.log('✅ ShareToken minter role granted to', pkgMgr);

  console.log('Granting MINTER_ROLE on LPToken...');
  await (await lp.grantRole(MINTER_ROLE, pkgMgr)).wait();
  console.log('✅ LPToken minter role granted to', pkgMgr);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error in grantMinterRole script:', err);
    process.exit(1);
  });
