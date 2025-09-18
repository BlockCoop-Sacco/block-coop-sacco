const { ethers, network } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying SecondaryMarket contract");
  console.log("Network:", network.name);

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Load existing deployment addresses
  let existingDeployment;
  try {
    if (network.name === "bscmainnet") {
      existingDeployment = JSON.parse(fs.readFileSync("deployments/deployments-mainnet-v2_2.json", "utf8"));
    } else {
      existingDeployment = JSON.parse(fs.readFileSync("deployments/deployments-testnet-v2_2.json", "utf8"));
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

  console.log("Deployment Configuration:");
  console.log("- Router:", ROUTER_ADDRESS);
  console.log("- Factory:", FACTORY_ADDRESS);
  console.log("- USDT:", USDT_ADDRESS);
  console.log("- BLOCKS Token:", BLOCKS_TOKEN_ADDRESS);
  console.log("- Treasury:", TREASURY_ADDRESS);
  console.log("- Initial Target Price:", ethers.formatUnits(INITIAL_TARGET_PRICE, 18), "USDT per BLOCKS");

  // Deploy SecondaryMarket
  console.log("\n1️⃣ Deploying SecondaryMarket...");
  const SecondaryMarket = await ethers.getContractFactory("SecondaryMarket");
  const secondaryMarket = await SecondaryMarket.deploy(
    USDT_ADDRESS,           // USDT token address
    BLOCKS_TOKEN_ADDRESS,   // BLOCKS token address
    ROUTER_ADDRESS,         // PancakeSwap router
    FACTORY_ADDRESS,        // PancakeSwap factory
    TREASURY_ADDRESS,       // Fee recipient
    deployer.address,       // Admin
    INITIAL_TARGET_PRICE    // Initial target price
  );

  await secondaryMarket.waitForDeployment();
  const secondaryMarketAddr = await secondaryMarket.getAddress();
  console.log("✅ SecondaryMarket deployed at:", secondaryMarketAddr);

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
  const deploymentKey = network.name === "bscmainnet" ? "deployments-mainnet-v2_2.json" : "deployments-testnet-v2_2.json";
  const deploymentPath = `deployments/${deploymentKey}`;
  
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


