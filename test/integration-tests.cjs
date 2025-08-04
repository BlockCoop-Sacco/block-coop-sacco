const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockCoop V2 Integration Tests", function () {
  let deployer, user1, user2, user3, referrer, treasury;
  let usdtToken, blocksToken, blocksLpToken, vestingVault, packageManager;
  let dividendDistributor, secondaryMarket, swapTaxManager;
  
  // Test constants
  const INITIAL_USDT_SUPPLY = ethers.parseUnits("10000", 18); // 10K USDT per user
  const GLOBAL_TARGET_PRICE = ethers.parseUnits("2.0", 18); // 2.0 USDT per BLOCKS
  const DIVIDEND_AMOUNT = ethers.parseUnits("500", 18); // 500 USDT for dividends

  beforeEach(async function () {
    [deployer, user1, user2, user3, referrer, treasury] = await ethers.getSigners();

    // Deploy complete V2 system
    const USDTTestToken = await ethers.getContractFactory("USDTTestToken");
    usdtToken = await USDTTestToken.deploy(
      "USDT Test Token (18 decimals)",
      "USDT",
      deployer.address
    );

    const SwapTaxManager = await ethers.getContractFactory("SwapTaxManager");
    swapTaxManager = await SwapTaxManager.deploy(deployer.address);

    const BLOCKS = await ethers.getContractFactory("BLOCKS");
    blocksToken = await BLOCKS.deploy(
      "BlockCoop Sacco Share Token",
      "BLOCKS",
      deployer.address,
      await swapTaxManager.getAddress()
    );

    const BLOCKS_LP = await ethers.getContractFactory("BLOCKS_LP");
    blocksLpToken = await BLOCKS_LP.deploy(
      "BlockCoop Sacco LP Token",
      "BLOCKS-LP",
      deployer.address
    );

    const VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy(
      await blocksToken.getAddress(),
      deployer.address
    );

    const PackageManagerV2_1 = await ethers.getContractFactory("PackageManagerV2_1");
    packageManager = await PackageManagerV2_1.deploy(
      await usdtToken.getAddress(),
      await blocksToken.getAddress(),
      await blocksLpToken.getAddress(),
      await vestingVault.getAddress(),
      "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // Router (dummy)
      "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", // Factory (dummy)
      treasury.address,
      await swapTaxManager.getAddress(),
      deployer.address,
      GLOBAL_TARGET_PRICE
    );

    const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
    dividendDistributor = await DividendDistributor.deploy(
      await blocksToken.getAddress(),
      await usdtToken.getAddress(),
      deployer.address
    );

    const SecondaryMarket = await ethers.getContractFactory("SecondaryMarket");
    secondaryMarket = await SecondaryMarket.deploy(
      await usdtToken.getAddress(),
      await blocksToken.getAddress(),
      "0xD99D1c33F9fC3444f8101754aBC46c52416550D1", // Router (dummy)
      "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73", // Factory (dummy)
      treasury.address,
      deployer.address,
      GLOBAL_TARGET_PRICE
    );

    // Grant all necessary roles
    const MINTER_ROLE = await blocksToken.MINTER_ROLE();
    await blocksToken.grantRole(MINTER_ROLE, await packageManager.getAddress());
    await blocksToken.grantRole(MINTER_ROLE, await dividendDistributor.getAddress());

    const BURNER_ROLE = await blocksLpToken.BURNER_ROLE();
    await blocksLpToken.grantRole(BURNER_ROLE, await packageManager.getAddress());

    const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
    await vestingVault.grantRole(LOCKER_ROLE, await packageManager.getAddress());

    const DISTRIBUTOR_ROLE = await dividendDistributor.DISTRIBUTOR_ROLE();
    await dividendDistributor.grantRole(DISTRIBUTOR_ROLE, deployer.address);

    // Mint USDT to all test users
    await usdtToken.mint(user1.address, INITIAL_USDT_SUPPLY);
    await usdtToken.mint(user2.address, INITIAL_USDT_SUPPLY);
    await usdtToken.mint(user3.address, INITIAL_USDT_SUPPLY);
    await usdtToken.mint(deployer.address, DIVIDEND_AMOUNT * 3n); // For dividend distributions

    // Create multiple test packages
    await packageManager.addPackage(
      "Starter Package",
      ethers.parseUnits("100", 18),    // 100 USDT
      ethers.parseUnits("1.5", 18),    // 1.5 USDT per BLOCKS
      7000,                            // 70% vesting
      0,                               // No cliff
      86400 * 30,                      // 30 days
      250                              // 2.5% referral
    );

    await packageManager.addPackage(
      "Growth Package",
      ethers.parseUnits("500", 18),    // 500 USDT
      ethers.parseUnits("1.8", 18),    // 1.8 USDT per BLOCKS
      7000,                            // 70% vesting
      86400 * 7,                       // 7 day cliff
      86400 * 90,                      // 90 days
      500                              // 5% referral
    );

    await packageManager.addPackage(
      "Premium Package",
      ethers.parseUnits("1000", 18),   // 1000 USDT
      ethers.parseUnits("2.2", 18),   // 2.2 USDT per BLOCKS
      7000,                            // 70% vesting
      86400 * 14,                      // 14 day cliff
      86400 * 180,                     // 180 days
      500                              // 5% referral
    );
  });

  describe("1. Complete Package Purchase Flow", function () {
    it("Should handle complete package purchase workflow with all 8 contracts", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      // Initial balances
      const initialUsdtBalance = await usdtToken.balanceOf(user1.address);
      const initialBlocksBalance = await blocksToken.balanceOf(user1.address);
      const initialLpBalance = await blocksLpToken.balanceOf(user1.address);
      const initialVaultBalance = await blocksToken.balanceOf(await vestingVault.getAddress());
      const initialTreasuryBalance = await blocksToken.balanceOf(treasury.address);
      const initialReferrerBalance = await blocksToken.balanceOf(referrer.address);

      // Purchase package with referrer
      const packageEntry = ethers.parseUnits("100", 18);
      await user1UsdtContract.approve(await packageManager.getAddress(), packageEntry);
      
      const tx = await user1PackageManager.purchasePackage(0, referrer.address);
      const receipt = await tx.wait();

      // Verify all contract interactions
      const finalUsdtBalance = await usdtToken.balanceOf(user1.address);
      const finalBlocksBalance = await blocksToken.balanceOf(user1.address);
      const finalLpBalance = await blocksLpToken.balanceOf(user1.address);
      const finalVaultBalance = await blocksToken.balanceOf(await vestingVault.getAddress());
      const finalTreasuryBalance = await blocksToken.balanceOf(treasury.address);
      const finalReferrerBalance = await blocksToken.balanceOf(referrer.address);

      // Verify USDT transfer
      expect(finalUsdtBalance).to.equal(initialUsdtBalance - packageEntry);

      // Verify BLOCKS tokens were not directly minted to user (they get LP tokens instead)
      expect(finalBlocksBalance).to.equal(initialBlocksBalance);

      // Verify LP tokens were minted to user
      expect(finalLpBalance).to.be.gt(initialLpBalance);

      // Verify tokens were locked in vesting vault
      expect(finalVaultBalance).to.be.gt(initialVaultBalance);

      // Verify treasury received allocation
      expect(finalTreasuryBalance).to.be.gt(initialTreasuryBalance);

      // Verify referrer received reward
      expect(finalReferrerBalance).to.be.gt(initialReferrerBalance);

      // Verify event emission
      const purchasedEvent = receipt.logs.find(log => {
        try {
          const parsed = packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });
      expect(purchasedEvent).to.not.be.undefined;
    });

    it("Should handle multiple users purchasing different packages", async function () {
      // User1 purchases Starter Package
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);
      
      await user1UsdtContract.approve(await packageManager.getAddress(), ethers.parseUnits("100", 18));
      await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);

      // User2 purchases Growth Package
      const user2UsdtContract = usdtToken.connect(user2);
      const user2PackageManager = packageManager.connect(user2);
      
      await user2UsdtContract.approve(await packageManager.getAddress(), ethers.parseUnits("500", 18));
      await user2PackageManager.purchasePackage(1, referrer.address);

      // User3 purchases Premium Package
      const user3UsdtContract = usdtToken.connect(user3);
      const user3PackageManager = packageManager.connect(user3);
      
      await user3UsdtContract.approve(await packageManager.getAddress(), ethers.parseUnits("1000", 18));
      await user3PackageManager.purchasePackage(2, referrer.address);

      // Verify all users received LP tokens
      const user1LpBalance = await blocksLpToken.balanceOf(user1.address);
      const user2LpBalance = await blocksLpToken.balanceOf(user2.address);
      const user3LpBalance = await blocksLpToken.balanceOf(user3.address);

      expect(user1LpBalance).to.be.gt(0);
      expect(user2LpBalance).to.be.gt(0);
      expect(user3LpBalance).to.be.gt(0);

      // Verify different amounts based on package rates
      expect(user3LpBalance).to.be.gt(user2LpBalance);
      expect(user2LpBalance).to.be.gt(user1LpBalance);

      // Verify referrer received rewards from multiple purchases
      const referrerBalance = await blocksToken.balanceOf(referrer.address);
      expect(referrerBalance).to.be.gt(0);
    });
  });

  describe("2. Dividend Distribution and Claiming Workflow", function () {
    beforeEach(async function () {
      // Create BLOCKS token holders by having users purchase packages
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);
      const user2UsdtContract = usdtToken.connect(user2);
      const user2PackageManager = packageManager.connect(user2);

      await user1UsdtContract.approve(await packageManager.getAddress(), ethers.parseUnits("100", 18));
      await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);

      await user2UsdtContract.approve(await packageManager.getAddress(), ethers.parseUnits("500", 18));
      await user2PackageManager.purchasePackage(1, ethers.ZeroAddress);
    });

    it("Should distribute and claim dividends correctly across multiple holders", async function () {
      // Distribute dividends
      await usdtToken.approve(await dividendDistributor.getAddress(), DIVIDEND_AMOUNT);
      await dividendDistributor.distributeDividends(DIVIDEND_AMOUNT);

      // Check pending dividends for both users
      const user1PendingBefore = await dividendDistributor.getPendingDividends(user1.address);
      const user2PendingBefore = await dividendDistributor.getPendingDividends(user2.address);

      expect(user1PendingBefore).to.be.gt(0);
      expect(user2PendingBefore).to.be.gt(0);

      // User2 should have more pending dividends (larger BLOCKS balance)
      expect(user2PendingBefore).to.be.gt(user1PendingBefore);

      // Users claim their dividends
      const user1DividendContract = dividendDistributor.connect(user1);
      const user2DividendContract = dividendDistributor.connect(user2);

      const user1InitialUsdt = await usdtToken.balanceOf(user1.address);
      const user2InitialUsdt = await usdtToken.balanceOf(user2.address);

      await user1DividendContract.claimDividend();
      await user2DividendContract.claimDividend();

      const user1FinalUsdt = await usdtToken.balanceOf(user1.address);
      const user2FinalUsdt = await usdtToken.balanceOf(user2.address);

      // Verify dividends were received
      expect(user1FinalUsdt - user1InitialUsdt).to.equal(user1PendingBefore);
      expect(user2FinalUsdt - user2InitialUsdt).to.equal(user2PendingBefore);

      // Verify no more pending dividends
      const user1PendingAfter = await dividendDistributor.getPendingDividends(user1.address);
      const user2PendingAfter = await dividendDistributor.getPendingDividends(user2.address);

      expect(user1PendingAfter).to.equal(0);
      expect(user2PendingAfter).to.equal(0);
    });

    it("Should handle multiple dividend distributions correctly", async function () {
      // First distribution
      await usdtToken.approve(await dividendDistributor.getAddress(), DIVIDEND_AMOUNT);
      await dividendDistributor.distributeDividends(DIVIDEND_AMOUNT);

      const user1PendingFirst = await dividendDistributor.getPendingDividends(user1.address);

      // Second distribution
      await usdtToken.approve(await dividendDistributor.getAddress(), DIVIDEND_AMOUNT);
      await dividendDistributor.distributeDividends(DIVIDEND_AMOUNT);

      const user1PendingSecond = await dividendDistributor.getPendingDividends(user1.address);

      // Pending should be approximately double (accounting for any rounding)
      expect(user1PendingSecond).to.be.approximately(user1PendingFirst * 2n, ethers.parseUnits("0.01", 18));

      // Claim all dividends
      const user1DividendContract = dividendDistributor.connect(user1);
      const initialBalance = await usdtToken.balanceOf(user1.address);
      
      await user1DividendContract.claimDividend();
      
      const finalBalance = await usdtToken.balanceOf(user1.address);
      expect(finalBalance - initialBalance).to.equal(user1PendingSecond);
    });
  });

  describe("3. Secondary Market Trading Scenarios", function () {
    beforeEach(async function () {
      // Grant MINTER_ROLE to SecondaryMarket for testing
      const MINTER_ROLE = await blocksToken.MINTER_ROLE();
      await blocksToken.grantRole(MINTER_ROLE, await secondaryMarket.getAddress());

      // Create BLOCKS token holders
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), ethers.parseUnits("1000", 18));
      await user1PackageManager.purchasePackage(2, ethers.ZeroAddress); // Premium package

      // Mint additional BLOCKS to user1 for trading
      await blocksToken.mint(user1.address, ethers.parseUnits("100", 18));
    });

    it("Should handle complete trading workflow", async function () {
      const user1SecondaryMarket = secondaryMarket.connect(user1);
      const blocksToTrade = ethers.parseUnits("50", 18);

      // Get initial balances
      const initialBlocksBalance = await blocksToken.balanceOf(user1.address);
      const initialUsdtBalance = await usdtToken.balanceOf(user1.address);

      // Get quote for the trade
      const quote = await secondaryMarket.getSwapQuote(blocksToTrade);
      expect(quote).to.be.gt(0);

      // Note: In a real scenario, we would need liquidity in the DEX
      // For this test, we'll verify the quote calculation is correct
      const targetPrice = await secondaryMarket.targetPrice();
      const swapFee = await secondaryMarket.swapFee();
      
      const expectedGrossUsdt = (blocksToTrade * targetPrice) / ethers.parseUnits("1", 18);
      const expectedFee = (expectedGrossUsdt * swapFee) / 10000n;
      const expectedNetUsdt = expectedGrossUsdt - expectedFee;

      expect(quote).to.equal(expectedNetUsdt);
    });

    it("Should update quotes when target price changes", async function () {
      const blocksAmount = ethers.parseUnits("10", 18);
      
      // Get quote with initial target price
      const initialQuote = await secondaryMarket.getSwapQuote(blocksAmount);
      
      // Update target price
      const newTargetPrice = ethers.parseUnits("3.0", 18);
      await secondaryMarket.updateTargetPrice(newTargetPrice);
      
      // Get quote with new target price
      const newQuote = await secondaryMarket.getSwapQuote(blocksAmount);
      
      // New quote should be higher (higher target price)
      expect(newQuote).to.be.gt(initialQuote);
      
      // Verify the calculation
      const swapFee = await secondaryMarket.swapFee();
      const expectedGrossUsdt = (blocksAmount * newTargetPrice) / ethers.parseUnits("1", 18);
      const expectedFee = (expectedGrossUsdt * swapFee) / 10000n;
      const expectedNetUsdt = expectedGrossUsdt - expectedFee;
      
      expect(newQuote).to.equal(expectedNetUsdt);
    });
  });

  describe("4. Cross-Contract Integration Scenarios", function () {
    it("Should handle package purchase followed by dividend distribution and claiming", async function () {
      // User purchases package
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);
      
      await user1UsdtContract.approve(await packageManager.getAddress(), ethers.parseUnits("500", 18));
      await user1PackageManager.purchasePackage(1, ethers.ZeroAddress);

      // Distribute dividends
      await usdtToken.approve(await dividendDistributor.getAddress(), DIVIDEND_AMOUNT);
      await dividendDistributor.distributeDividends(DIVIDEND_AMOUNT);

      // User claims dividends
      const user1DividendContract = dividendDistributor.connect(user1);
      const pendingDividends = await dividendDistributor.getPendingDividends(user1.address);
      
      expect(pendingDividends).to.be.gt(0);
      
      const initialBalance = await usdtToken.balanceOf(user1.address);
      await user1DividendContract.claimDividend();
      const finalBalance = await usdtToken.balanceOf(user1.address);
      
      expect(finalBalance - initialBalance).to.equal(pendingDividends);
    });

    it("Should maintain consistency across all contracts during complex operations", async function () {
      // Multiple users purchase different packages
      const users = [user1, user2, user3];
      const packages = [0, 1, 2];
      const amounts = [
        ethers.parseUnits("100", 18),
        ethers.parseUnits("500", 18),
        ethers.parseUnits("1000", 18)
      ];

      for (let i = 0; i < users.length; i++) {
        const userUsdtContract = usdtToken.connect(users[i]);
        const userPackageManager = packageManager.connect(users[i]);
        
        await userUsdtContract.approve(await packageManager.getAddress(), amounts[i]);
        await userPackageManager.purchasePackage(packages[i], i === 0 ? ethers.ZeroAddress : referrer.address);
      }

      // Verify total supply consistency
      const totalBlocksSupply = await blocksToken.totalSupply();
      const totalLpSupply = await blocksLpToken.totalSupply();
      const vaultBalance = await blocksToken.balanceOf(await vestingVault.getAddress());
      const treasuryBalance = await blocksToken.balanceOf(treasury.address);
      const referrerBalance = await blocksToken.balanceOf(referrer.address);

      // Total BLOCKS supply should equal vault + treasury + referrer balances
      expect(totalBlocksSupply).to.equal(vaultBalance + treasuryBalance + referrerBalance);

      // Distribute and claim dividends
      await usdtToken.approve(await dividendDistributor.getAddress(), DIVIDEND_AMOUNT);
      await dividendDistributor.distributeDividends(DIVIDEND_AMOUNT);

      // All users claim dividends
      for (const user of users) {
        const userDividendContract = dividendDistributor.connect(user);
        const pending = await dividendDistributor.getPendingDividends(user.address);
        
        if (pending > 0) {
          await userDividendContract.claimDividend();
        }
      }

      // Verify dividend distribution was complete
      const [totalDistributed, totalClaimed, totalPending] = await dividendDistributor.getDividendStats();
      expect(totalPending).to.equal(0);
      expect(totalClaimed).to.equal(totalDistributed);
    });
  });
});
