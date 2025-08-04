const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockCoop V2 Target Price Mechanism Tests", function () {
  let deployer, user1, user2, treasury;
  let usdtToken, blocksToken, blocksLpToken, vestingVault, packageManager, swapTaxManager;
  
  // Test constants
  const INITIAL_USDT_SUPPLY = ethers.parseUnits("1000000", 18); // 1M USDT
  const INITIAL_TARGET_PRICE = ethers.parseUnits("1.5", 18); // 1.5 USDT per BLOCKS
  const NEW_TARGET_PRICE = ethers.parseUnits("2.0", 18); // 2.0 USDT per BLOCKS
  const TEST_PACKAGE_ENTRY = ethers.parseUnits("100", 18); // 100 USDT
  const TEST_PACKAGE_RATE = ethers.parseUnits("1.8", 18); // 1.8 USDT per BLOCKS (package rate)
  const VEST_BPS = 7000; // 70%

  beforeEach(async function () {
    [deployer, user1, user2, treasury] = await ethers.getSigners();

    // Deploy all contracts with initial target price of 1.5
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
      INITIAL_TARGET_PRICE // Start with 1.5 USDT per BLOCKS
    );

    // Grant roles
    const MINTER_ROLE = await blocksToken.MINTER_ROLE();
    await blocksToken.grantRole(MINTER_ROLE, await packageManager.getAddress());

    const BURNER_ROLE = await blocksLpToken.BURNER_ROLE();
    await blocksLpToken.grantRole(BURNER_ROLE, await packageManager.getAddress());

    const LOCKER_ROLE = await vestingVault.LOCKER_ROLE();
    await vestingVault.grantRole(LOCKER_ROLE, await packageManager.getAddress());

    // Mint USDT to test users
    await usdtToken.mint(user1.address, INITIAL_USDT_SUPPLY);
    await usdtToken.mint(user2.address, INITIAL_USDT_SUPPLY);

    // Create test package
    await packageManager.addPackage(
      "Target Price Test Package",
      TEST_PACKAGE_ENTRY,
      TEST_PACKAGE_RATE,
      VEST_BPS,
      0, // No cliff
      86400 * 30, // 30 days
      500 // 5% referral
    );
  });

  describe("1. Target Price Changes Affect Only LP Allocation", function () {
    it("Should calculate different LP allocations with different target prices", async function () {
      // Purchase with initial target price (1.5)
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx1 = await user1PackageManager.purchase(0, ethers.ZeroAddress);
      const receipt1 = await tx1.wait();

      const purchasedEvent1 = receipt1.logs.find(log => {
        try {
          const parsed = packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });

      const parsedEvent1 = packageManager.interface.parseLog(purchasedEvent1);
      const poolTokens1 = parsedEvent1.args.poolTokens;
      const vestTokens1 = parsedEvent1.args.vestTokens;
      const totalTokens1 = parsedEvent1.args.totalTokens;

      // Change target price to 2.0
      await packageManager.updateGlobalTargetPrice(NEW_TARGET_PRICE);

      // Purchase with new target price (2.0)
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx2 = await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
      const receipt2 = await tx2.wait();

      const purchasedEvent2 = receipt2.logs.find(log => {
        try {
          const parsed = packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });

      const parsedEvent2 = packageManager.interface.parseLog(purchasedEvent2);
      const poolTokens2 = parsedEvent2.args.poolTokens;
      const vestTokens2 = parsedEvent2.args.vestTokens;
      const totalTokens2 = parsedEvent2.args.totalTokens;

      // Verify that total user tokens remain the same (based on package exchange rate)
      expect(totalTokens1).to.equal(totalTokens2);
      
      // Verify that vesting tokens remain the same (70% of total user tokens)
      expect(vestTokens1).to.equal(vestTokens2);
      
      // Verify that LP allocation changed due to target price change
      expect(poolTokens1).to.not.equal(poolTokens2);
      
      // Calculate expected LP allocations
      const usdtPool = (TEST_PACKAGE_ENTRY * (10000n - BigInt(VEST_BPS))) / 10000n; // 30% of USDT
      const expectedPoolTokens1 = (usdtPool * ethers.parseUnits("1", 18)) / INITIAL_TARGET_PRICE;
      const expectedPoolTokens2 = (usdtPool * ethers.parseUnits("1", 18)) / NEW_TARGET_PRICE;
      
      expect(poolTokens1).to.equal(expectedPoolTokens1);
      expect(poolTokens2).to.equal(expectedPoolTokens2);
      
      // Higher target price should result in fewer LP tokens
      expect(poolTokens2).to.be.lt(poolTokens1);
    });

    it("Should maintain consistent USDT split regardless of target price", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      // Test with multiple target prices
      const targetPrices = [
        ethers.parseUnits("1.0", 18),
        ethers.parseUnits("2.5", 18),
        ethers.parseUnits("5.0", 18)
      ];

      for (const targetPrice of targetPrices) {
        await packageManager.updateGlobalTargetPrice(targetPrice);
        
        await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
        
        const tx = await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
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
        
        // Verify total user tokens remain constant (based on package rate, not target price)
        const expectedTotalTokens = (TEST_PACKAGE_ENTRY * ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
        expect(parsedEvent.args.totalTokens).to.equal(expectedTotalTokens);
        
        // Verify vesting allocation remains constant (70% of total user tokens)
        const expectedVestTokens = (expectedTotalTokens * BigInt(VEST_BPS)) / 10000n;
        expect(parsedEvent.args.vestTokens).to.equal(expectedVestTokens);
      }
    });
  });

  describe("2. 1:1 BLOCKS-LP Token Ratio Maintained", function () {
    it("Should maintain 1:1 BLOCKS-LP ratio regardless of target price changes", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      const targetPrices = [
        ethers.parseUnits("1.0", 18),
        ethers.parseUnits("1.5", 18),
        ethers.parseUnits("2.0", 18),
        ethers.parseUnits("3.0", 18)
      ];

      for (const targetPrice of targetPrices) {
        await packageManager.updateGlobalTargetPrice(targetPrice);
        
        const initialLpBalance = await blocksLpToken.balanceOf(user1.address);
        
        await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
        
        const tx = await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
        const receipt = await tx.wait();

        const finalLpBalance = await blocksLpToken.balanceOf(user1.address);
        const lpTokensReceived = finalLpBalance - initialLpBalance;

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

        // Verify 1:1 ratio is maintained
        expect(lpTokensReceived).to.equal(totalUserTokens);
        expect(parsedEvent.args.lpTokens).to.equal(totalUserTokens);
      }
    });

    it("Should distribute LP tokens equal to total user BLOCKS regardless of LP allocation", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      // Test with extreme target price that creates very different LP allocations
      await packageManager.updateGlobalTargetPrice(ethers.parseUnits("0.5", 18)); // Very low price
      
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx1 = await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
      const receipt1 = await tx1.wait();

      const purchasedEvent1 = receipt1.logs.find(log => {
        try {
          const parsed = packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });

      const parsedEvent1 = packageManager.interface.parseLog(purchasedEvent1);
      
      // Change to very high target price
      await packageManager.updateGlobalTargetPrice(ethers.parseUnits("10.0", 18)); // Very high price
      
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      
      const tx2 = await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
      const receipt2 = await tx2.wait();

      const purchasedEvent2 = receipt2.logs.find(log => {
        try {
          const parsed = packageManager.interface.parseLog(log);
          return parsed.name === 'Purchased';
        } catch {
          return false;
        }
      });

      const parsedEvent2 = packageManager.interface.parseLog(purchasedEvent2);
      
      // LP tokens should be equal to total user tokens in both cases
      expect(parsedEvent1.args.lpTokens).to.equal(parsedEvent1.args.totalTokens);
      expect(parsedEvent2.args.lpTokens).to.equal(parsedEvent2.args.totalTokens);
      
      // Total user tokens should be the same (based on package rate)
      expect(parsedEvent1.args.totalTokens).to.equal(parsedEvent2.args.totalTokens);
      
      // But pool allocations should be very different
      expect(parsedEvent1.args.poolTokens).to.not.equal(parsedEvent2.args.poolTokens);
    });
  });

  describe("3. Vesting Calculations Unaffected by Target Price", function () {
    it("Should maintain consistent vesting amounts regardless of target price", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      const targetPrices = [
        ethers.parseUnits("0.5", 18),
        ethers.parseUnits("1.0", 18),
        ethers.parseUnits("2.0", 18),
        ethers.parseUnits("5.0", 18)
      ];

      const vestingAmounts = [];

      for (const targetPrice of targetPrices) {
        await packageManager.updateGlobalTargetPrice(targetPrice);
        
        await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
        
        const tx = await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
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
        vestingAmounts.push(parsedEvent.args.vestTokens);
      }

      // All vesting amounts should be identical
      for (let i = 1; i < vestingAmounts.length; i++) {
        expect(vestingAmounts[i]).to.equal(vestingAmounts[0]);
      }

      // Verify the vesting amount is correct (70% of total user tokens)
      const expectedTotalTokens = (TEST_PACKAGE_ENTRY * ethers.parseUnits("1", 18)) / TEST_PACKAGE_RATE;
      const expectedVestTokens = (expectedTotalTokens * BigInt(VEST_BPS)) / 10000n;
      
      expect(vestingAmounts[0]).to.equal(expectedVestTokens);
    });

    it("Should lock consistent amounts in VestingVault regardless of target price", async function () {
      const user1UsdtContract = usdtToken.connect(user1);
      const user1PackageManager = packageManager.connect(user1);

      // Test with different target prices
      const targetPrice1 = ethers.parseUnits("1.0", 18);
      const targetPrice2 = ethers.parseUnits("3.0", 18);

      // Purchase with first target price
      await packageManager.updateGlobalTargetPrice(targetPrice1);
      
      const initialVaultBalance = await blocksToken.balanceOf(await vestingVault.getAddress());
      
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
      
      const vaultBalanceAfterFirst = await blocksToken.balanceOf(await vestingVault.getAddress());
      const vestedAmount1 = vaultBalanceAfterFirst - initialVaultBalance;

      // Purchase with second target price
      await packageManager.updateGlobalTargetPrice(targetPrice2);
      
      await user1UsdtContract.approve(await packageManager.getAddress(), TEST_PACKAGE_ENTRY);
      await user1PackageManager.purchasePackage(0, ethers.ZeroAddress);
      
      const vaultBalanceAfterSecond = await blocksToken.balanceOf(await vestingVault.getAddress());
      const vestedAmount2 = vaultBalanceAfterSecond - vaultBalanceAfterFirst;

      // Both vesting amounts should be identical
      expect(vestedAmount1).to.equal(vestedAmount2);
    });
  });

  describe("4. Target Price Update Mechanics", function () {
    it("Should allow admin to update global target price", async function () {
      const newTargetPrice = ethers.parseUnits("2.5", 18);
      
      await packageManager.updateGlobalTargetPrice(newTargetPrice);
      
      const updatedPrice = await packageManager.globalTargetPrice();
      expect(updatedPrice).to.equal(newTargetPrice);
    });

    it("Should emit event when target price is updated", async function () {
      const newTargetPrice = ethers.parseUnits("2.5", 18);
      
      await expect(packageManager.updateGlobalTargetPrice(newTargetPrice))
        .to.emit(packageManager, "GlobalTargetPriceUpdated")
        .withArgs(INITIAL_TARGET_PRICE, newTargetPrice);
    });

    it("Should reject zero target price", async function () {
      await expect(
        packageManager.updateGlobalTargetPrice(0)
      ).to.be.revertedWith("PackageManager: Invalid target price");
    });

    it("Should only allow admin to update target price", async function () {
      const user1PackageManager = packageManager.connect(user1);
      
      await expect(
        user1PackageManager.updateGlobalTargetPrice(ethers.parseUnits("3.0", 18))
      ).to.be.reverted;
    });
  });
});
