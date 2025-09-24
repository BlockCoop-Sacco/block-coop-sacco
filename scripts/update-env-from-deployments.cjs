/* eslint-disable no-console */
// Usage:
//   node scripts/update-env-from-deployments.cjs [envPath=.env] [--prune] [--remove-zero]
// - Updates or inserts required VITE_* keys from deployments/deployments-mainnet-v2_2.json
// - Preserves all non-target keys and comments
// - --prune: ensures only one occurrence per target key (removes duplicates)
// - --remove-zero: drops target keys whose value is the zero address

const fs = require('fs');
const path = require('path');

const deploymentsPath = path.resolve('deployments/deployments-mainnet-v2_2.json');

function loadDeployments() {
  const raw = fs.readFileSync(deploymentsPath, 'utf8');
  const d = JSON.parse(raw);
  return d;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { envPath: '.env', prune: false, removeZero: false };
  for (const a of args) {
    if (a === '--prune') opts.prune = true;
    else if (a === '--remove-zero') opts.removeZero = true;
    else if (!a.startsWith('--')) opts.envPath = a;
  }
  return opts;
}

function loadEnvLines(envPath) {
  if (!fs.existsSync(envPath)) return [];
  return fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
}

function isZeroAddress(v) {
  return /^0x0{40}$/i.test((v || '').trim());
}

function buildTargetMap(d) {
  return {
    VITE_CHAIN_ID: '56',
    VITE_RPC_URL: process.env.BSC_MAINNET_RPC || 'https://bsc-dataseed1.binance.org/',
    VITE_USDT_ADDRESS: d.usdt,
    VITE_SHARE_ADDRESS: d.blocks,
    VITE_LP_ADDRESS: d.blocksLP,
    VITE_VAULT_ADDRESS: d.vestingVault,
    VITE_TAX_ADDRESS: d.taxManager,
    VITE_ROUTER_ADDRESS: d.router,
    VITE_FACTORY_ADDRESS: d.factory,
    VITE_PACKAGE_MANAGER_ADDRESS: d.packageManager,
    VITE_SECONDARY_MARKET_ADDRESS: d.secondaryMarket,
    VITE_FORWARDER_ADDRESS: d.forwarder,
  };
}

function writeEnv(envPath, lines) {
  fs.writeFileSync(envPath, lines.join('\n'));
}

function upsertEnv(envLines, targetMap, options) {
  const keys = Object.keys(targetMap);
  const keyRegex = new RegExp('^(' + keys.map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')=');

  // If prune, remove all existing target lines first
  let result = options.prune ? envLines.filter(line => !keyRegex.test(line)) : [...envLines];

  // Track which keys are already present (post-prune)
  const present = new Set();
  for (const line of result) {
    const m = line.match(/^(\w+)=/);
    if (m && keys.includes(m[1])) present.add(m[1]);
  }

  // Insert/update target keys at the end (ensures a single occurrence)
  for (const key of keys) {
    const value = String(targetMap[key] || '').trim();
    if (options.removeZero && isZeroAddress(value)) {
      // Skip writing zero address keys
      continue;
    }
    result.push(`${key}=${value}`);
  }

  // Deduplicate (keep last occurrence)
  const seen = new Set();
  result = result
    .reverse()
    .filter(line => {
      const m = line.match(/^(\w+)=/);
      if (!m) return true; // comment/blank
      const k = m[1];
      if (!keys.includes(k)) return true; // not a target key
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .reverse();

  return result;
}

function main() {
  const opts = parseArgs();
  const d = loadDeployments();
  const targetMap = buildTargetMap(d);
  const envLines = loadEnvLines(opts.envPath);
  const updated = upsertEnv(envLines, targetMap, { prune: opts.prune, removeZero: opts.removeZero });
  writeEnv(opts.envPath, updated);
  console.log(`✅ Updated ${opts.envPath} with latest deployed addresses.`);
}

main();


