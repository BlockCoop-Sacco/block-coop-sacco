// /root/block-coop-sacco/scripts/deploy-tether.cjs
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  // ✅ Fix: get balance via provider, not signer
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance:", hre.ethers.formatUnits(balance, 18), "BNB");

  // initial supply (tokens in human units), default 1,000,000
  const humanSupply = process.env.INITIAL_SUPPLY || "1000000";
  const initialSupply = hre.ethers.parseUnits(humanSupply, 18);

  // Gas tuning (adjust via env vars)
  const gasPriceGwei = process.env.GAS_PRICE_GWEI || "2";
  const gasPrice = hre.ethers.parseUnits(gasPriceGwei, "gwei");
  const gasLimit = Number(process.env.GAS_LIMIT || "800000");

  const Token = await hre.ethers.getContractFactory("BlockCoopMockUSDT");
  const deployTx = Token.getDeployTransaction(initialSupply);

  // Estimate gas units
  const estimatedGas = await hre.ethers.provider.estimateGas({
    ...deployTx,
    from: deployer.address
  });
  console.log("⛽ Estimated gas units:", estimatedGas.toString());

  const estimatedCost = estimatedGas * gasPrice;
  const buffer = hre.ethers.parseUnits("0.0002", 18);
  const estimatedCostWithBuffer = estimatedCost + buffer;

  console.log("⛽ Gas price (gwei):", gasPriceGwei);
  console.log("💸 Estimated tx cost:", hre.ethers.formatUnits(estimatedCost, 18), "BNB");
  console.log("💸 Estimated tx cost (with buffer):", hre.ethers.formatUnits(estimatedCostWithBuffer, 18), "BNB");

  if (balance < estimatedCostWithBuffer) {
    throw new Error(
      `Insufficient funds. Balance ${hre.ethers.formatUnits(balance, 18)} BNB < required ${hre.ethers.formatUnits(estimatedCostWithBuffer, 18)} BNB`
    );
  }

  console.log("🚀 Deploying BlockCoopMockUSDT with initial supply:", humanSupply, "tokens (18 decimals)");

  const token = await Token.deploy(initialSupply, {
    gasPrice: gasPrice,
    gasLimit: gasLimit
  });

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("✅ Deployed at:", address);
  console.log("🔗 Network:", hre.network.name);

  console.log("\n👉 Verify with:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${address} "${initialSupply.toString()}"`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
