const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration (BSC Mainnet)
const RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed2.binance.org';

// Load ABIs
const packageManagerAbi = require(path.join(__dirname, '..', 'src', 'abi', 'PackageManager.json'));
const pancakeFactoryAbi = [{
  "inputs": [
    { "internalType": "address", "name": "tokenA", "type": "address" },
    { "internalType": "address", "name": "tokenB", "type": "address" }
  ],
  "name": "getPair",
  "outputs": [{ "internalType": "address", "name": "pair", "type": "address" }],
  "stateMutability": "view",
  "type": "function"
}];
const pancakePairAbi = [
  { "inputs": [], "name": "token0", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "token1", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "getReserves", "outputs": [
      { "internalType": "uint112", "name": "reserve0", "type": "uint112" },
      { "internalType": "uint112", "name": "reserve1", "type": "uint112" },
      { "internalType": "uint32", "name": "blockTimestampLast", "type": "uint32" }
    ], "stateMutability": "view", "type": "function" }
];

// Deployment addresses (from deployments JSON)
const deploymentsFixed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments', 'deployments-mainnet-v2_2-fixed-1756833373.json'), 'utf8'));
const deploymentsLegacy = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'deployments', 'deployments-mainnet-v2_2.json'), 'utf8'));

const USDT = deploymentsFixed.usdt; // same in both files (BSC USDT)
const FACTORY = deploymentsFixed.factory;

// Map PackageManager address to corresponding BLOCKS token address
const PM_BLOCKS_MAP = {
  [deploymentsFixed.packageManager.toLowerCase()]: deploymentsFixed.blocks,
  [deploymentsLegacy.packageManager.toLowerCase()]: deploymentsLegacy.blocks,
};

const PM_ADDRESSES = [deploymentsFixed.packageManager, deploymentsLegacy.packageManager];

function fmt(n, dec = 18) {
  try { return ethers.formatUnits(n, dec); } catch { return n.toString(); }
}

async function getLatestPurchase(provider, pmAddr, fromBlock, toBlock) {
  const pm = new ethers.Contract(pmAddr, packageManagerAbi, provider);
  const events = await pm.queryFilter(pm.filters.Purchased(), fromBlock, toBlock);
  if (!events || events.length === 0) return null;
  // Return the most recent by block number and logIndex
  events.sort((a, b) => (a.blockNumber - b.blockNumber) || (a.logIndex - b.logIndex));
  return events[events.length - 1];
}

async function getReservesAt(pair, blockTag) {
  const [token0, token1] = await Promise.all([
    pair.token0({ blockTag }),
    pair.token1({ blockTag }),
  ]);
  const [reserves] = await Promise.all([
    pair.getReserves({ blockTag })
  ]);
  return { token0, token1, reserve0: reserves[0], reserve1: reserves[1] };
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL, { chainId: 56, name: 'BSC Mainnet' });
  const latest = await provider.getBlockNumber();

  // Try recent ranges progressively
  const ranges = [100_000, 300_000, 1_000_000];
  let chosen = null;
  let chosenPmAddr = null;

  for (const span of ranges) {
    const fromBlock = Math.max(1, latest - span);
    const toBlock = latest;
    for (const pmAddr of PM_ADDRESSES) {
      try {
        const ev = await getLatestPurchase(provider, pmAddr, fromBlock, toBlock);
        if (ev) {
          chosen = ev;
          chosenPmAddr = pmAddr;
        }
      } catch (e) {
        // continue trying other ranges/addresses
      }
    }
    if (chosen) break;
  }

  if (!chosen) {
    console.log('No Purchased events found in the scanned ranges. Please provide a specific transaction hash.');
    return;
  }

  const pmAddrLower = chosenPmAddr.toLowerCase();
  const blocksAddr = PM_BLOCKS_MAP[pmAddrLower];
  if (!blocksAddr) {
    console.log('Could not resolve BLOCKS address for PackageManager:', chosenPmAddr);
    return;
  }

  // Resolve pair address
  const factory = new ethers.Contract(FACTORY, pancakeFactoryAbi, provider);
  const pairAddress = await factory.getPair(blocksAddr, USDT);
  if (pairAddress === ethers.ZeroAddress) {
    console.log('No pair found for BLOCKS/USDT');
    return;
  }

  const pair = new ethers.Contract(pairAddress, pancakePairAbi, provider);

  const txHash = chosen.transactionHash;
  const blockNumber = chosen.blockNumber;
  const beforeBlock = Math.max(1, blockNumber - 1);

  // Read reserves before and after
  const [before, after] = await Promise.all([
    getReservesAt(pair, beforeBlock),
    getReservesAt(pair, blockNumber),
  ]);

  // Identify which reserve is USDT vs BLOCKS
  const usdtIsToken0 = before.token0.toLowerCase() === USDT.toLowerCase();
  const reserveUSDT_before = usdtIsToken0 ? before.reserve0 : before.reserve1;
  const reserveBLOCKS_before = usdtIsToken0 ? before.reserve1 : before.reserve0;
  const reserveUSDT_after = usdtIsToken0 ? after.reserve0 : after.reserve1;
  const reserveBLOCKS_after = usdtIsToken0 ? after.reserve1 : after.reserve0;

  const deltaUSDT = reserveUSDT_after - reserveUSDT_before;
  const deltaBLOCKS = reserveBLOCKS_after - reserveBLOCKS_before;

  // Parse LiquidityAdded from the receipt
  const receipt = await provider.getTransactionReceipt(txHash);
  const iface = new ethers.Interface(packageManagerAbi);
  let liqEvent = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== chosenPmAddr.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === 'LiquidityAdded') {
        liqEvent = parsed.args;
      }
    } catch (_) {}
  }

  console.log('--- Verification Result ---');
  console.log('Transaction:', txHash);
  console.log('PackageManager:', chosenPmAddr);
  console.log('Block:', blockNumber);
  console.log('Pair:', pairAddress);
  console.log('USDT Address:', USDT);
  console.log('BLOCKS Address:', blocksAddr);
  console.log('Reserves BEFORE  (USDT, BLOCKS):', fmt(reserveUSDT_before, 18), fmt(reserveBLOCKS_before, 18));
  console.log('Reserves AFTER   (USDT, BLOCKS):', fmt(reserveUSDT_after, 18), fmt(reserveBLOCKS_after, 18));
  console.log('Delta            (USDT, BLOCKS):', fmt(deltaUSDT, 18), fmt(deltaBLOCKS, 18));

  if (liqEvent) {
    // args: user, packageId, shareTokenAmount, usdtAmount, liquidityTokens, actualShareToken, actualUSDT
    const actualShare = liqEvent.actualShareToken;
    const actualUsdt = liqEvent.actualUSDT;
    console.log('LiquidityAdded.actualUSDT     :', fmt(actualUsdt, 18));
    console.log('LiquidityAdded.actualShareToken:', fmt(actualShare, 18));
    const usdtMatch = (deltaUSDT === actualUsdt);
    const shareMatch = (deltaBLOCKS === actualShare);
    console.log('Match USDT  ?', usdtMatch);
    console.log('Match BLOCKS?', shareMatch);
  } else {
    console.log('LiquidityAdded event not found in receipt.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});




