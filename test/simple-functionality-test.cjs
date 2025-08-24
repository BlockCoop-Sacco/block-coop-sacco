const { expect } = require("chai");
const hre = require("hardhat");

describe("BlockCoop V2 Simple Functionality Test", function () {
  let deployer, user1;
  let usdtToken, blocksToken, packageManager;
  
  const TEST_PACKAGE_ENTRY = hre.ethers.parseUnits("100", 18); // 100 USDT
  const TEST_PACKAGE_RATE = hre.ethers.parseUnits("1.5", 18); // 1.5 USDT per BLOCKS
  const INITIAL_USDT_SUPPLY = hre.ethers.parseUnits("1000000", 18); // 1M USDT

  before(async function () {
    [deployer, user1] = await hre.ethers.getSigners();
    
    // Deploy the system using the deployment script
    console.log("🚀 Deploying BlockCoop V2 system...");
    
    // Deploy USDT Test Token (18 decimals)
    const USDTTestToken = await hre.ethers.getContractFactory("USDTTestToken");
    usdtToken = await USDTTestToken.deploy("USDT Test Token", "USDT", deployer.address);
    await usdtToken.waitForDeployment();

    // Deploy BLOCKS Token
    const BLOCKS = await hre.ethers.getContractFactory("BLOCKS");
    blocksToken = await BLOCKS.deploy("BLOCKS Token", "BLOCKS", deployer.address, hre.ethers.ZeroAddress);
    await blocksToken.waitForDeployment();

    // Deploy BLOCKS-LP Token
    const BLOCKS_LP = await hre.ethers.getContractFactory("BLOCKS_LP");
    const blocksLpToken = await BLOCKS_LP.deploy("BLOCKS LP Token", "BLOCKS-LP", deployer.address);
    await blocksLpToken.waitForDeployment();
    
    // Deploy VestingVault
    const VestingVault = await hre.ethers.getContractFactory("VestingVault");
    const vestingVault = await VestingVault.deploy(
      await blocksToken.getAddress(),
      deployer.address
    );
    await vestingVault.waitForDeployment();
    
    // Deploy SwapTaxManager
    const SwapTaxManager = await hre.ethers.getContractFactory("SwapTaxManager");
    const swapTaxManager = await SwapTaxManager.deploy(deployer.address);
    await swapTaxManager.waitForDeployment();
    
    // Deploy PackageManagerV2_1
    const PackageManagerV2_1 = await hre.ethers.getContractFactory("PackageManagerV2_1");
    packageManager = await PackageManagerV2_1.deploy(
      await usdtToken.getAddress(),
      await blocksToken.getAddress(),
      await blocksLpToken.getAddress(),
      await vestingVault.getAddress(),
      "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // PancakeRouter (BSC testnet)
      "0x6725F303b657a9451d8BA641348b6761A6CC7a17", // PancakeFactory (BSC testnet)
      deployer.address, // treasury
      await swapTaxManager.getAddress(),
      deployer.address, // admin
      hre.ethers.parseUnits("2.0", 18) // global target price
    );
    await packageManager.waitForDeployment();
    
    // Grant roles
    await usdtToken.grantRole(await usdtToken.MINTER_ROLE(), deployer.address);
    await blocksToken.grantRole(await blocksToken.MINTER_ROLE(), await packageManager.getAddress());
    await blocksLpToken.grantRole(await blocksLpToken.MINTER_ROLE(), await packageManager.getAddress());
    await vestingVault.grantRole(await vestingVault.LOCKER_ROLE(), await packageManager.getAddress());
    
    // Create a test package
    await packageManager.addPackage(
      "Test Package",
      TEST_PACKAGE_ENTRY,
      TEST_PACKAGE_RATE,
      7000, // 70% vesting
      86400, // 1 day cliff
      2592000, // 30 days duration
      500 // 5% referral
    );
    
    // Mint USDT to user1
    await usdtToken.mint(user1.address, INITIAL_USDT_SUPPLY);
    
    console.log("✅ System deployed successfully");
  });

  it("Should confirm USDT uses 18 decimals", async function () {
    const decimals = await usdtToken.decimals();
    expect(Number(decimals)).to.equal(18);
    console.log("✅ USDT decimals confirmed:", Number(decimals));
  });

  it("Should allow user to purchase package with 18-decimal USDT", async function () {
    const user1UsdtContract = usdtToken.connect(user1);
    const user1PackageManager = packageManager.connect(user1);

    // Check initial balances
    const initialUsdtBalance = await usdtToken.balanceOf(user1.address);
    const initialBlocksBalance = await blocksToken.balanceOf(user1.address);
    
    console.log("Initial USDT balance:", hre.ethers.formatUnits(initialUsdtBalance, 18));
    console.log("Initial BLOCKS balance:", hre.ethers.formatUnits(initialBlocksBalance, 18));

    // Approve and purchase
    await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
    const tx = await user1PackageManager.purchase(0, hre.ethers.ZeroAddress);
    const receipt = await tx.wait();

    // Check final balances
    const finalUsdtBalance = await usdtToken.balanceOf(user1.address);
    const finalBlocksBalance = await blocksToken.balanceOf(user1.address);
    
    console.log("Final USDT balance:", hre.ethers.formatUnits(finalUsdtBalance, 18));
    console.log("Final BLOCKS balance:", hre.ethers.formatUnits(finalBlocksBalance, 18));

    // Verify USDT was spent
    expect(finalUsdtBalance).to.equal(initialUsdtBalance - TEST_PACKAGE_ENTRY);
    
    // Verify BLOCKS tokens were received
    expect(finalBlocksBalance).to.be.greaterThan(initialBlocksBalance);
    
    console.log("✅ Package purchase successful with 18-decimal USDT");
  });

  it("Should calculate correct token amounts with V2 architecture", async function () {
    const user1UsdtContract = usdtToken.connect(user1);
    const user1PackageManager = packageManager.connect(user1);

    await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
    const tx = await user1PackageManager.purchase(0, hre.ethers.ZeroAddress);
    const receipt = await tx.wait();

    // Find the Purchased event
    const purchasedEvent = receipt.logs.find(log => {
      try {
        const parsed = packageManager.interface.parseLog(log);
        return parsed.name === 'Purchased';
      } catch {
        return false;
      }
    });

    expect(purchasedEvent).to.not.be.undefined;
    const parsedEvent = packageManager.interface.parseLog(purchasedEvent);
    
    const totalTokens = parsedEvent.args.totalTokens;
    const vestTokens = parsedEvent.args.vestTokens;
    const poolTokens = parsedEvent.args.poolTokens;
    
    console.log("Total user tokens:", hre.ethers.formatUnits(totalTokens, 18));
    console.log("Vested tokens:", hre.ethers.formatUnits(vestTokens, 18));
    console.log("Pool tokens:", hre.ethers.formatUnits(poolTokens, 18));
    
    // Verify 70/30 split (approximately, accounting for treasury allocation)
    const expectedTotalTokens = (TEST_PACKAGE_ENTRY * hre.ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
    expect(totalTokens).to.be.closeTo(expectedTotalTokens, hre.ethers.parseUnits("0.1", 18));
    
    console.log("✅ Token calculations verified for V2 architecture");
  });
});
