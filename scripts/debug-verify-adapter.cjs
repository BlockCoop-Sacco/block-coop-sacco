/* eslint-disable no-console */
require('dotenv').config();
try { require('dotenv').config({ path: '.env.production', override: false }); } catch (e) {}

const { ethers, artifacts, network } = require('hardhat');

async function main() {
  const addr = (process.env.ADDRESS || '0x81303BDCAce02771a924D6CA7512A03Ceabb9043').trim();
  console.log('Network:', network.name);
  console.log('Address:', addr);

  const onchain = await ethers.provider.getCode(addr);
  console.log('On-chain runtime bytecode length:', onchain.length);
  console.log('On-chain runtime bytecode prefix:', onchain.slice(0, 66));

  const artifact = await artifacts.readArtifact('MpesaTreasuryAdapter');
  const local = artifact.deployedBytecode.startsWith('0x') ? artifact.deployedBytecode : ('0x' + artifact.deployedBytecode);
  console.log('Local runtime bytecode length:', local.length);
  console.log('Local runtime bytecode prefix:', local.slice(0, 66));

  console.log('Equal?', onchain.toLowerCase() === local.toLowerCase());
}

main().catch((e) => { console.error('❌ Error:', e.message || e); process.exit(1); });


