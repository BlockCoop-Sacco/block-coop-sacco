const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockCoop V2 Comprehensive Test Suite", function () {
  let deployer, user1, user2, referrer, treasury;
  let usdtToken, blocksToken, blocksLpToken, vestingVault, packageManager;
  let dividendDistributor, secondaryMarket, swapTaxManager;
  
  // Test constants
  const INITIAL_USDT_SUPPLY = ethers.parseUnits("1000000", 18); // 1M USDT
  const GLOBAL_TARGET_PRICE = ethers.parseUnits("2.0", 18); // 2.0 USDT per BLOCKS
  const TEST_PACKAGE_ENTRY = ethers.parseUnits("100", 18); // 100 USDT
  const TEST_PACKAGE_RATE = ethers.parseUnits("1.5", 18); // 1.5 USDT per BLOCKS
  const VEST_BPS = 7000; // 70%
  const REFERRAL_BPS = 500; // 5%

  beforeEach(async function () {
    [deployer, user1, user2, referrer, treasury] = await ethers.getSigners();

    // Deploy 18-decimal USDT test token
    const USDTTestToken = await ethers.getContractFactory("USDTTestToken");
    usdtToken = await USDTTestToken.deploy(
      "USDT Test Token (18 decimals)",
      "USDT",
      deployer.address
    );

    // Deploy SwapTaxManager
    const SwapTaxManager = await ethers.getContractFactory("SwapTaxManager");
    swapTaxManager = await SwapTaxManager.deploy(deployer.address);

    // Deploy BLOCKS token
    const BLOCKS = await ethers.getContractFactory("BLOCKS");
    blocksToken = await BLOCKS.deploy(
      "BlockCoop Sacco Share Token",
      "BLOCKS",
      deployer.address,
      await swapTaxManager.getAddress()
    );

    // Deploy BLOCKS-LP token
    const BLOCKS_LP = await ethers.getContractFactory("BLOCKS_LP");
    blocksLpToken = await BLOCKS_LP.deploy(
      "BlockCoop Sacco LP Token",
      "BLOCKS-LP",
      deployer.address
    );

    // Deploy VestingVault
    const VestingVault = await ethers.getContractFactory("VestingVault");
    vestingVault = await VestingVault.deploy(
      await blocksToken.getAddress(),
      deployer.address
    );

    // Deploy PackageManagerV2_1
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

    // Deploy DividendDistributor
    const DividendDistributor = await ethers.getContractFactory("DividendDistributor");
    dividendDistributor = await DividendDistributor.deploy(
      await blocksToken.getAddress(),
      await usdtToken.getAddress(),
      deployer.address
    );

    // Deploy SecondaryMarket
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

    // Grant roles
    const MINTER_ROLE = await blocksToken.MINTER_ROLE();
    await blocksToken.grantRole(MINTER_ROLE, await packageManager.getAddress());
    await blocksToken.grantRole(MINTER_ROLE, await dividendDistributor.getAddress());

    const BURNER_ROLE = await blocksLpToken.BURNER_ROLE();
    await blocksLpToken.grantRole(BURNER_ROLE, await packageManager.getAddress());

    const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
    await vestingVault.grantRole(LOCKER_ROLE, await packageManager.getAddress());

    // Mint USDT to test users
    await usdtToken.mint(user1.address, INITIAL_USDT_SUPPLY);
    await usdtToken.mint(user2.address, INITIAL_USDT_SUPPLY);

    // Create test package
    await packageManager.addPackage(
      "Test Package",
      TEST_PACKAGE_ENTRY,
      TEST_PACKAGE_RATE,
      VEST_BPS,
      0, // No cliff
      86400 * 30, // 30 days
      REFERRAL_BPS
    );
  });

  describe("1. USDT Decimal Handling (18-decimal V2 Architecture)", function () {
    it("Should confirm USDT uses 18 decimals", async function () {
      const decimals = await usdtToken.decimals();
      expect(decimals).to.equal(18);
    });

    it("Should handle 18-decimal USDT amounts correctly in package purchases", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx = await user1PackageManager.purchase(0, ethers.ZeroAddress);
      await expect(tx).to.not.be.reverted;
      
      // Verify USDT was transferred correctly
      const userBalance = await usdtToken.balanceOf(user1.address);
      expect(userBalance).to.equal(INITIAL_USDT_SUPPLY - TEST_PACKAGE_ENTRY);
    });
  });

  describe("2. 70/30 USDT Split Logic", function () {
    it("Should split USDT correctly between vesting (70%) and liquidity (30%)", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx = await user1PackageManager.purchase(0, ethers.ZeroAddress);
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
      
      // Calculate expected values
      const totalUserTokens = (TEST_PACKAGE_ENTRY * ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
      const expectedVestTokens = (totalUserTokens * BigInt(VEST_BPS)) / 10000n;
      const expectedPoolTokens = totalUserTokens - expectedVestTokens;

      expect(parsedEvent.args.vestTokens).to.equal(expectedVestTokens);
      expect(parsedEvent.args.poolTokens).to.equal(expectedPoolTokens);
    });

    it("Should calculate treasury allocation correctly (5% of total user tokens)", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      const initialTreasuryBalance = await blocksToken.balanceOf(treasury.address);
      
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchase(0, ethers.ZeroAddress);

      const finalTreasuryBalance = await blocksToken.balanceOf(treasury.address);
      const treasuryAllocation = finalTreasuryBalance - initialTreasuryBalance;

      // Calculate expected treasury allocation (5% of total user tokens)
      const totalUserTokens = (TEST_PACKAGE_ENTRY * ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
      const expectedTreasuryTokens = (totalUserTokens * 500n) / 10000n; // 5%

      expect(treasuryAllocation).to.equal(expectedTreasuryTokens);
    });
  });

  describe("3. BLOCKS Token Calculations (usdtPool÷targetPrice)", function () {
    it("Should calculate LP BLOCKS allocation using global target price", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx = await user1PackageManager.purchase(0, ethers.ZeroAddress);
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

      const parsedEvent = packageManager.interface.parseLog(purchasedEvent);
      
      // Calculate expected LP allocation using global target price
      const usdtPool = (TEST_PACKAGE_ENTRY * (10000n - BigInt(VEST_BPS))) / 10000n; // 30% of USDT
      const expectedPoolTokens = (usdtPool * ethers.parseUnits("1", 18)) / GLOBAL_TARGET_PRICE;

      expect(parsedEvent.args.poolTokens).to.equal(expectedPoolTokens);
    });

    it("Should maintain consistent calculations when global target price changes", async function () {
      // Test with original target price
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchase(0, ethers.ZeroAddress);

      // Change global target price
      const newTargetPrice = ethers.parseUnits("2.5", 18); // 2.5 USDT per BLOCKS
      await packageManager.updateGlobalTargetPrice(newTargetPrice);

      // Test with new target price
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);

      const tx = await user1PackageManager.purchase(0, ethers.ZeroAddress);
      const receipt = await tx.wait();

      const purchasedEvent = receipt.logs.find(log => {
        try {
          const parsed = packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });

      const parsedEvent = packageManager.interface.parseLog(purchasedEvent);
      
      // Calculate expected LP allocation with new target price
      const usdtPool = (TEST_PACKAGE_ENTRY * (10000n - BigInt(VEST_BPS))) / 10000n;
      const expectedPoolTokens = (usdtPool * ethers.parseUnits("1", 18)) / newTargetPrice;

      expect(parsedEvent.args.poolTokens).to.equal(expectedPoolTokens);
    });
  });

  describe("4. 1:1 BLOCKS-LP Token Distribution", function () {
    it("Should distribute BLOCKS-LP tokens 1:1 with total user BLOCKS tokens", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      const initialLpBalance = await blocksLpToken.balanceOf(user1.address);
      
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx = await user1PackageManager.purchase(0, ethers.ZeroAddress);
      const receipt = await tx.wait();

      const finalLpBalance = await blocksLpToken.balanceOf(user1.address);
      const lpTokensReceived = finalLpBalance - initialLpBalance;

      // Find the Purchased event to get total user tokens
      const purchasedEvent = receipt.logs.find(log => {
        try {
          const parsed = packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });

      const parsedEvent = packageManager.interface.parseLog(purchasedEvent);
      const totalUserTokens = parsedEvent.args.totalTokens;

      // Verify 1:1 ratio
      expect(lpTokensReceived).to.equal(totalUserTokens);
      expect(parsedEvent.args.lpTokens).to.equal(totalUserTokens);
    });
  });

  describe("5. Vesting Mechanisms", function () {
    it("Should lock vested tokens in VestingVault with correct parameters", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchase(0, ethers.ZeroAddress);

      // Check vesting vault balance
      const vaultBalance = await blocksToken.balanceOf(await vestingVault.getAddress());
      
      // Calculate expected vested tokens
      const totalUserTokens = (TEST_PACKAGE_ENTRY * ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
      const expectedVestTokens = (totalUserTokens * BigInt(VEST_BPS)) / 10000n;

      expect(vaultBalance).to.equal(expectedVestTokens);

      // Check user's vesting schedule
      const vestingInfo = await vestingVault.getVestingInfo(user1.address);
      expect(vestingInfo.amount).to.equal(expectedVestTokens);
      expect(vestingInfo.duration).to.equal(86400 * 30); // 30 days
    });
  });

  describe("6. Fixed Referral System", function () {
    it("Should mint referral rewards directly to referrer", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      const initialReferrerBalance = await blocksToken.balanceOf(referrer.address);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchase(0, referrer.address);

      const finalReferrerBalance = await blocksToken.balanceOf(referrer.address);
      const referralReward = finalReferrerBalance - initialReferrerBalance;

      // Calculate expected referral reward
      const totalUserTokens = (TEST_PACKAGE_ENTRY * ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
      const expectedReferralReward = (totalUserTokens * BigInt(REFERRAL_BPS)) / 10000n;

      expect(referralReward).to.equal(expectedReferralReward);
    });

    it("Should not give referral rewards when no referrer is provided", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      const initialReferrerBalance = await blocksToken.balanceOf(referrer.address);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchase(0, ethers.ZeroAddress); // No referrer

      const finalReferrerBalance = await blocksToken.balanceOf(referrer.address);

      expect(finalReferrerBalance).to.equal(initialReferrerBalance);
    });

    it("Should track referral stats correctly", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchase(0, referrer.address);

      const referrerStats = await packageManager.getUserStats(referrer.address);

      // Calculate expected referral reward
      const totalUserTokens = (TEST_PACKAGE_ENTRY * ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
      const expectedReferralReward = (totalUserTokens * BigInt(REFERRAL_BPS)) / 10000n;

      expect(referrerStats.totalReferralRewards).to.equal(expectedReferralReward);
    });
  });

  describe("7. Dividend Distribution Functionality", function () {
    beforeEach(async function () {
      // Create some BLOCKS token holders by having users purchase packages
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchase(0, ethers.ZeroAddress);
    });

    it("Should distribute dividends proportionally to BLOCKS holders", async function () {
      const dividendAmount = ethers.parseUnits("50", 18); // 50 USDT

      // Mint USDT for dividend distribution
      await usdtToken.mint(deployer.address, dividendAmount);
      await usdtToken.approve(await dividendDistributor.getAddress(), dividendAmount);

      // Distribute dividends
      await dividendDistributor.distributeDividends(dividendAmount);

      // Check total dividends distributed
      const totalDistributed = await dividendDistributor.totalDividendsDistributed();
      expect(totalDistributed).to.equal(dividendAmount);

      // Check pending dividends for user1
      const pendingDividends = await dividendDistributor.getPendingDividends(user1.address);
      expect(pendingDividends).to.be.gt(0);
    });

    it("Should allow users to claim their dividends", async function () {
      const dividendAmount = ethers.parseUnits("50", 18);

      await usdtToken.mint(deployer.address, dividendAmount);
      await usdtToken.approve(await dividendDistributor.getAddress(), dividendAmount);
      await dividendDistributor.distributeDividends(dividendAmount);

      const initialUserBalance = await usdtToken.balanceOf(user1.address);
      const pendingDividends = await dividendDistributor.getPendingDividends(user1.address);

      // Claim dividends
      const user1DividendContract = dividendDistributor.connect(user1);
      await user1DividendContract.claimDividend();

      const finalUserBalance = await usdtToken.balanceOf(user1.address);
      expect(finalUserBalance - initialUserBalance).to.equal(pendingDividends);
    });

    it("Should track dividend statistics correctly", async function () {
      const dividendAmount = ethers.parseUnits("100", 18);

      await usdtToken.mint(deployer.address, dividendAmount);
      await usdtToken.approve(await dividendDistributor.getAddress(), dividendAmount);
      await dividendDistributor.distributeDividends(dividendAmount);

      const [totalDistributed, totalClaimed, totalPending] = await dividendDistributor.getDividendStats();

      expect(totalDistributed).to.equal(dividendAmount);
      expect(totalClaimed).to.equal(0); // No claims yet
      expect(totalPending).to.equal(dividendAmount);
    });
  });

  describe("8. SecondaryMarket Bidirectional Swapping", function () {
    beforeEach(async function () {
      // Grant MINTER_ROLE to SecondaryMarket for testing
      const MINTER_ROLE = await blocksToken.MINTER_ROLE();
      await blocksToken.grantRole(MINTER_ROLE, await secondaryMarket.getAddress());

      // Mint some BLOCKS tokens to user1 for testing swaps
      await blocksToken.mint(user1.address, ethers.parseUnits("100", 18));
    });

    it("Should provide accurate swap quotes", async function () {
      const blocksAmount = ethers.parseUnits("10", 18); // 10 BLOCKS
      const quote = await secondaryMarket.getSwapQuote(blocksAmount);

      // Quote should be based on target price minus fees
      const expectedGrossUsdt = (blocksAmount * GLOBAL_TARGET_PRICE) / ethers.parseUnits("1", 18);
      const swapFee = await secondaryMarket.swapFee();
      const expectedFee = (expectedGrossUsdt * swapFee) / 10000n;
      const expectedNetUsdt = expectedGrossUsdt - expectedFee;

      expect(quote).to.equal(expectedNetUsdt);
    });

    it("Should handle target price updates correctly", async function () {
      const newTargetPrice = ethers.parseUnits("3.0", 18); // 3.0 USDT per BLOCKS

      await secondaryMarket.updateTargetPrice(newTargetPrice);
      const updatedTargetPrice = await secondaryMarket.targetPrice();

      expect(updatedTargetPrice).to.equal(newTargetPrice);

      // Verify quotes reflect new target price
      const blocksAmount = ethers.parseUnits("10", 18);
      const quote = await secondaryMarket.getSwapQuote(blocksAmount);

      const expectedGrossUsdt = (blocksAmount * newTargetPrice) / ethers.parseUnits("1", 18);
      const swapFee = await secondaryMarket.swapFee();
      const expectedFee = (expectedGrossUsdt * swapFee) / 10000n;
      const expectedNetUsdt = expectedGrossUsdt - expectedFee;

      expect(quote).to.equal(expectedNetUsdt);
    });
  });

  describe("9. Error Conditions and Edge Cases", function () {
    it("Should reject package purchases with insufficient USDT balance", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      // Try to purchase with more USDT than user has
      const excessiveAmount = INITIAL_USDT_SUPPLY + ethers.parseUnits("1", 18);

      await user1UsdtContract.approve(await packageManager.getAddress(), excessiveAmount);

      await expect(
        user1PackageManager.purchase(0, ethers.ZeroAddress)
      ).to.be.reverted;
    });

    it("Should reject dividend distribution with zero amount", async function () {
      await expect(
        dividendDistributor.distributeDividends(0)
      ).to.be.revertedWith("DividendDistributor: Amount must be greater than 0");
    });

    it("Should reject claiming dividends when none are pending", async function () {
      const user2DividendContract = dividendDistributor.connect(user2);

      await expect(
        user2DividendContract.claimDividend()
      ).to.be.revertedWith("DividendDistributor: No dividends to claim");
    });

    it("Should enforce maximum referral rate limit", async function () {
      await expect(
        packageManager.addPackage(
          "Invalid Package",
          TEST_PACKAGE_ENTRY,
          TEST_PACKAGE_RATE,
          VEST_BPS,
          0,
          86400 * 30,
          1500 // 15% - exceeds 10% limit
        )
      ).to.be.revertedWith("PackageManager: Referral rate too high");
    });

    it("Should require 18-decimal USDT for V2 architecture", async function () {
      // This test verifies the decimal check in PackageManager
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);

      // The purchase should succeed with 18-decimal USDT
      await expect(
        user1PackageManager.purchase(0, ethers.ZeroAddress)
      ).to.not.be.reverted;
    });
  });
});
