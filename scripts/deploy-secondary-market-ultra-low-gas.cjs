const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying SecondaryMarket contract (ULTRA-LOW GAS)");
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

  // Try multiple gas strategies
  const gasStrategies = [
    { name: "Ultra-Low (0.5 gwei)", gasPrice: ethers.parseUnits("0.5", "gwei"), gasLimit: BigInt(2000000) },
    { name: "Very Low (1 gwei)", gasPrice: ethers.parseUnits("1", "gwei"), gasLimit: BigInt(2200000) },
    { name: "Low (2 gwei)", gasPrice: ethers.parseUnits("2", "gwei"), gasLimit: BigInt(2400000) },
    { name: "Medium (3 gwei)", gasPrice: ethers.parseUnits("3", "gwei"), gasLimit: BigInt(2600000) }
  ];

  let selectedStrategy = null;
  
  console.log("\n⛽ Gas Strategy Analysis:");
  for (const strategy of gasStrategies) {
    const estimatedCost = strategy.gasLimit * strategy.gasPrice;
    const estimatedCostInBNB = ethers.formatEther(estimatedCost);
    const isAffordable = balance >= estimatedCost;
    
    console.log(`- ${strategy.name}:`);
    console.log(`  Gas Price: ${ethers.formatUnits(strategy.gasPrice, "gwei")} gwei`);
    console.log(`  Gas Limit: ${strategy.gasLimit.toLocaleString()}`);
    console.log(`  Estimated Cost: ${estimatedCostInBNB} BNB`);
    console.log(`  Affordable: ${isAffordable ? '✅ Yes' : '❌ No'}`);
    
    if (isAffordable && !selectedStrategy) {
      selectedStrategy = strategy;
    }
  }

  if (!selectedStrategy) {
    console.log("\n❌ No affordable gas strategy found!");
    console.log("You need at least", ethers.formatEther(gasStrategies[0].gasLimit * gasStrategies[0].gasPrice), "BNB");
    process.exit(1);
  }

  console.log(`\n✅ Selected Strategy: ${selectedStrategy.name}`);
  console.log(`- Gas Price: ${ethers.formatUnits(selectedStrategy.gasPrice, "gwei")} gwei`);
  console.log(`- Gas Limit: ${selectedStrategy.gasLimit.toLocaleString()}`);
  console.log(`- Estimated Cost: ${ethers.formatEther(selectedStrategy.gasLimit * selectedStrategy.gasPrice)} BNB`);

  // Deploy SecondaryMarket with ultra-low gas
  console.log("\n1️⃣ Deploying SecondaryMarket...");
  const SecondaryMarket = await ethers.getContractFactory("SecondaryMarket");
  
  // Use ultra-low gas settings
  const deploymentOptions = {
    gasLimit: selectedStrategy.gasLimit,
    gasPrice: selectedStrategy.gasPrice
  };
  
  console.log("⏳ Deploying with gas optimization...");
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
  console.log("- Gas Saved vs Standard:", ethers.formatEther((BigInt(3000000) * ethers.parseUnits("5", "gwei")) - actualCost), "BNB");

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


