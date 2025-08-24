#!/usr/bin/env bash
# Usage: SOLC_RUNS=80 npx hardhat run scripts/deploy-v2_2-mainnet.cjs --network bscmainnet

export SOLC_RUNS=${SOLC_RUNS:-80}

echo "Using SOLC_RUNS=$SOLC_RUNS for deployment"

