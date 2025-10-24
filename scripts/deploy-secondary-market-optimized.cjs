const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying SecondaryMarket contract (OPTIMIZED)");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Check current balance
  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceInBNB = ethers.formatEther(balance);
  console.log("Current Balance:", balanceInBNB, "BNB");

  // Load existing deployment addresses
  let existingDeployment;
  try {
    if (network.name === "bscmainnet") {
      existingDeployment = JSON.parse(fs.readFileSync("deployments/deployments-mainnet-v2_2.json", "utf8"));
    }
  } catch (error) {
    console.error("❌ Failed to load existing deployment. Please deploy core contracts first.");
    process.exit(1);
  }

  // Constants from existing deployment
  const ROUTER_ADDRESS = existingDeployment.router;
  const FACTORY_ADDRESS = existingDeployment.factory;
  const USDT_ADDRESS = existingDeployment.usdt;
  const BLOCKS_TOKEN_ADDRESS = existingDeployment.blocks;
  const TREASURY_ADDRESS = existingDeployment.treasury || deployer.address;

  // Initial target price: 2 USDT per BLOCKS (18 decimals)
  const INITIAL_TARGET_PRICE = ethers.parseUnits("2.0", 18);

  console.log("\nDeployment Configuration:");
  console.log("- Router:", ROUTER_ADDRESS);
  console.log("- Factory:", FACTORY_ADDRESS);
  console.log("- USDT:", USDT_ADDRESS);
  console.log("- BLOCKS Token:", BLOCKS_TOKEN_ADDRESS);
  console.log("- Treasury:", TREASURY_ADDRESS);
  console.log("- Initial Target Price:", ethers.formatUnits(INITIAL_TARGET_PRICE, 18), "USDT per BLOCKS");

  // Get current gas price and optimize
  const currentGasPrice = await ethers.provider.getFeeData();
  const optimizedGasPrice = currentGasPrice.gasPrice * BigInt(80) / BigInt(100); // 20% below current
  
  console.log("\n⛽ Gas Optimization:");
  console.log("- Current Gas Price:", ethers.formatUnits(currentGasPrice.gasPrice, "gwei"), "gwei");
  console.log("- Optimized Gas Price:", ethers.formatUnits(optimizedGasPrice, "gwei"), "gwei");
  
  // Estimate deployment cost with optimized gas
  const estimatedGas = BigInt(2500000); // Reduced from 3M to 2.5M
  const estimatedCost = estimatedGas * optimizedGasPrice;
  const estimatedCostInBNB = ethers.formatEther(estimatedCost);
  
  console.log("- Estimated Gas:", estimatedGas.toLocaleString());
  console.log("- Estimated Cost:", estimatedCostInBNB, "BNB");
  
  if (balance < estimatedCost) {
    const shortfall = estimatedCost - balance;
    const shortfallInBNB = ethers.formatEther(shortfall);
    console.log("\n❌ Insufficient Balance:");
    console.log("Shortfall:", shortfallInBNB, "BNB");
    console.log("You need at least", shortfallInBNB, "more BNB to deploy");
    process.exit(1);
  }
  
  console.log("✅ Sufficient balance for deployment");

  // Deploy SecondaryMarket with optimized gas
  console.log("\n1️⃣ Deploying SecondaryMarket...");
  const SecondaryMarket = await ethers.getContractFactory("SecondaryMarket");
  
  // Use optimized gas settings
  const deploymentOptions = {
    gasLimit: estimatedGas,
    gasPrice: optimizedGasPrice
  };
  
  const secondaryMarket = await SecondaryMarket.deploy(
    USDT_ADDRESS,           // USDT token address
    BLOCKS_TOKEN_ADDRESS,   // BLOCKS token address
    ROUTER_ADDRESS,         // PancakeSwap router
    FACTORY_ADDRESS,        // PancakeSwap factory
    TREASURY_ADDRESS,       // Fee recipient
    deployer.address,       // Admin
    INITIAL_TARGET_PRICE,   // Initial target price
    deploymentOptions
  );

  console.log("⏳ Waiting for deployment confirmation...");
  await secondaryMarket.waitForDeployment();
  const secondaryMarketAddr = await secondaryMarket.getAddress();
  console.log("✅ SecondaryMarket deployed at:", secondaryMarketAddr);

  // Get actual gas used
  const deploymentReceipt = await secondaryMarket.deploymentTransaction().wait();
  const actualGasUsed = deploymentReceipt.gasUsed;
  const actualCost = actualGasUsed * deploymentReceipt.gasPrice;
  const actualCostInBNB = ethers.formatEther(actualCost);
  
  console.log("\n📊 Actual Deployment Costs:");
  console.log("- Gas Used:", actualGasUsed.toLocaleString());
  console.log("- Gas Price:", ethers.formatUnits(deploymentReceipt.gasPrice, "gwei"), "gwei");
  console.log("- Actual Cost:", actualCostInBNB, "BNB");
  console.log("- Gas Saved:", ethers.formatEther(estimatedCost - actualCost), "BNB");

  // Verify contract deployment
  console.log("\n2️⃣ Verifying contract deployment...");
  const targetPrice = await secondaryMarket.targetPrice();
  const swapFee = await secondaryMarket.swapFee();
  const isPaused = await secondaryMarket.paused();
  
  console.log("✅ Contract verification:");
  console.log("   - Target Price:", ethers.formatUnits(targetPrice, 18), "USDT per BLOCKS");
  console.log("   - Swap Fee:", Number(swapFee) / 100, "%");
  console.log("   - Paused:", isPaused);

  // Update deployment file
  const deploymentPath = `deployments/deployments-mainnet-v2_2.json`;
  
  const updatedDeployment = {
    ...existingDeployment,
    secondaryMarket: secondaryMarketAddr,
    lastUpdated: Date.now()
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(updatedDeployment, null, 2));
  console.log(`\n📝 Updated deployment file: ${deploymentPath}`);

  // Generate environment variables
  console.log("\n3️⃣ Environment variables to add:");
  console.log(`VITE_SECONDARY_MARKET_ADDRESS=${secondaryMarketAddr}`);
  
  // Generate frontend configuration
  console.log("\n4️⃣ Frontend Configuration:");
  console.log("Add this to your .env file:");
  console.log(`VITE_SECONDARY_MARKET_ADDRESS=${secondaryMarketAddr}`);

  console.log("\n🎉 SecondaryMarket deployment completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Add VITE_SECONDARY_MARKET_ADDRESS to your .env file");
  console.log("2. Restart your frontend application");
  console.log("3. Test trading functionality");
  console.log("4. Configure target price and fees via admin functions if needed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


