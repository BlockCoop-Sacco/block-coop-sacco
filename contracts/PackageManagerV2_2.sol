// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IERC20Decimals is IERC20 { function decimals() external view returns (uint8); }
interface IBLOCKS { function mint(address to, uint256 amount) external; }
interface IBLOCKS_LP { function mint(address to, uint256 amount) external; function burn(address from, uint256 amount) external; function totalSupply() external view returns (uint256); }
interface IVestingVault { function lock(address user, uint256 amount, uint64 cliff, uint64 duration) external; function claimFor(address user) external; }
interface IPancakeRouter {
  function addLiquidity(address tokenA,address tokenB,uint amountADesired,uint amountBDesired,uint amountAMin,uint amountBMin,address to,uint deadline) external returns (uint amountA, uint amountB, uint liquidity);
  function removeLiquidity(address tokenA,address tokenB,uint liquidity,uint amountAMin,uint amountBMin,address to,uint deadline) external returns (uint amountA, uint amountB);
  function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}
interface IPancakeFactory { function getPair(address tokenA, address tokenB) external view returns (address pair); }
interface IPancakePair { function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast); function token0() external view returns (address); function token1() external view returns (address); function totalSupply() external view returns (uint256); }
interface ISwapTaxManager { function buckets(bytes32 key) external view returns (uint16 rateBps, address recipient); }

contract PackageManagerV2_2 is AccessControl, ReentrancyGuard, Pausable {
  using SafeERC20 for IERC20Decimals;
  using SafeERC20 for IERC20;

  bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
  bytes32 public constant SERVER_ROLE = keccak256("SERVER_ROLE");

  struct Package {
    // pack fixed-size fields first to reduce storage slots
    uint256 entryUSDT;
    uint256 exchangeRate; // USDT per BLOCKS (18 decimals)
    uint64 cliff;
    uint64 duration;
    uint16 vestBps;
    uint16 referralBps;
    bool active;
    bool exists;
    // dynamic field last
    string name;
  }

  IERC20Decimals public immutable usdt;
  IBLOCKS public immutable shareToken;
  IBLOCKS_LP public immutable lpToken;
  IVestingVault public immutable vestingVault;
  IPancakeRouter public immutable router;
  IPancakeFactory public immutable factory;
  ISwapTaxManager public immutable taxManager;
  address public treasury;
  uint256 public deadlineWindow = 300; // 5 minutes
  uint256 public globalTargetPrice; // 18 decimals
  uint256 public slippageTolerance = 500; // 5%
  uint16 public liquidityBps = 3000; // 30% of net USDT to liquidity by default

  // Immutable USDT decimals normalization
  uint8 public immutable USDT_DEC;
  uint256 public immutable USDT_SCALE;
  bool public immutable USDT_SCALE_UP;

  uint256 public nextPackageId;
  uint256[] private _packageIds;
  mapping(uint256 => Package) private _packages;

  struct UserPurchase { uint256 packageId; uint256 usdtAmount; uint256 totalTokens; uint256 vestTokens; uint256 poolTokens; uint256 lpTokens; address referrer; uint256 referralReward; uint256 timestamp; }
  struct UserStats { uint256 totalInvested; uint256 totalTokensReceived; uint256 totalVestTokens; uint256 totalPoolTokens; uint256 totalLPTokens; uint256 totalReferralRewards; uint256 purchaseCount; uint256 redemptionCount; uint256 totalRedemptions; }
  mapping(address => UserStats) private _userStats;
  mapping(address => UserPurchase[]) private _userPurchases;
  mapping(address => uint256[]) private _userRedemptions;
  mapping(address => uint256[]) private _userRedemptionTimestamps;

  bytes32 public constant PURCHASE_TAX_KEY = keccak256("PURCHASE");

  event PackageAdded(uint256 indexed id, string name, uint256 entryUSDT, uint256 exchangeRate, uint16 vestBps, uint64 cliff, uint64 duration, uint16 referralBps);
  event PackageToggled(uint256 indexed id, bool active);
  event PackageExchangeRateUpdated(uint256 indexed id, uint256 oldExchangeRate, uint256 newExchangeRate);
  event GlobalTargetPriceUpdated(uint256 oldGlobalTargetPrice, uint256 newGlobalTargetPrice);
  event Purchased(address indexed buyer, uint256 indexed packageId, uint256 usdtAmount, uint256 totalTokens, uint256 vestTokens, uint256 poolTokens, uint256 lpTokens, address indexed referrer, uint256 referralReward);
  event Redeemed(address indexed user, uint256 lpAmount);
  event LiquidityRedeemed(address indexed user, uint256 lpTokensBurned, uint256 liquidityRemoved, uint256 shareTokenReceived, uint256 usdtReceived);
  event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
  event DeadlineWindowUpdated(uint256 oldWindow, uint256 newWindow);
  event TaxApplied(bytes32 indexed taxKey, uint256 amount, address indexed recipient);
  event ReferralPaid(address indexed referrer, address indexed buyer, uint256 reward);
  event TreasuryBlocksAllocated(address indexed buyer, uint256 indexed packageId, uint256 amount);
  event MarketPriceUsed(uint256 marketPrice, uint256 globalTargetPrice, uint256 priceDifference);
  event LiquidityAdded(address indexed user, uint256 indexed packageId, uint256 shareTokenAmount, uint256 usdtAmount, uint256 liquidityTokens, uint256 actualShareToken, uint256 actualUSDT);
  event LiquidityAdditionFailed(address indexed user, uint256 indexed packageId, uint256 usdtAmount, string reason);
  event SlippageProtectionTriggered(address indexed user, uint256 indexed packageId, uint256 requestedShareToken, uint256 requestedUSDT, uint256 minShareToken, uint256 minUSDT);
  event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
  event LiquidityBpsUpdated(uint16 oldBps, uint16 newBps);

  constructor(
    address usdt_, address share_, address lp_, address vault_, address router_, address factory_, address treasury_, address tax_, address admin, uint256 initialGlobalTargetPrice_
  ) {
    require(usdt_!=address(0)&&share_!=address(0)&&lp_!=address(0)&&vault_!=address(0)&&router_!=address(0)&&factory_!=address(0)&&treasury_!=address(0)&&tax_!=address(0)&&admin!=address(0), "Invalid addr");
    require(initialGlobalTargetPrice_>0, "Invalid global target");
    usdt = IERC20Decimals(usdt_); shareToken=IBLOCKS(share_); lpToken=IBLOCKS_LP(lp_); vestingVault=IVestingVault(vault_); router=IPancakeRouter(router_); factory=IPancakeFactory(factory_); taxManager=ISwapTaxManager(tax_); treasury=treasury_; globalTargetPrice=initialGlobalTargetPrice_;

    // Set immutable USDT scaling
    uint8 d = IERC20Decimals(usdt_).decimals();
    USDT_DEC = d;
    // Initialize immutable scale values via ternary to satisfy immutability rules
    USDT_SCALE = d == 18 ? 1 : (d < 18 ? (10 ** (18 - d)) : (10 ** (d - 18)));
    USDT_SCALE_UP = d <= 18;

    _grantRole(DEFAULT_ADMIN_ROLE, admin);
    // Grant server role to treasury by default (backend signer)
    _grantRole(SERVER_ROLE, treasury_);
  }

  modifier onlyAdmin() { require(hasRole(ADMIN_ROLE, msg.sender), "Not admin"); _; }
  modifier validPackage(uint256 id) { require(_packages[id].exists, "Invalid package"); _; }

  function addPackage(string calldata name,uint256 entryUSDT,uint256 exchangeRate,uint16 vestBps,uint64 cliff,uint64 duration,uint16 referralBps) external onlyAdmin whenNotPaused {
    require(bytes(name).length>0 && entryUSDT>0 && exchangeRate>0 && vestBps<=10000 && referralBps<=1000 && duration>0, "Invalid params");
    uint256 id = nextPackageId++;
    _packages[id]=Package({name:name,entryUSDT:entryUSDT,exchangeRate:exchangeRate,vestBps:vestBps,cliff:cliff,duration:duration,referralBps:referralBps,active:true,exists:true});
    _packageIds.push(id);
    emit PackageAdded(id,name,entryUSDT,exchangeRate,vestBps,cliff,duration,referralBps);
  }

  function togglePackage(uint256 id) external onlyAdmin validPackage(id) { _packages[id].active=!_packages[id].active; emit PackageToggled(id,_packages[id].active); }
  function setPackageExchangeRate(uint256 id,uint256 newExchangeRate) external onlyAdmin validPackage(id) { require(newExchangeRate>0,"Invalid rate"); uint256 old=_packages[id].exchangeRate; _packages[id].exchangeRate=newExchangeRate; emit PackageExchangeRateUpdated(id,old,newExchangeRate);}
  function setGlobalTargetPrice(uint256 newPrice) external onlyAdmin { require(newPrice>0, "Invalid price"); uint256 old=globalTargetPrice; globalTargetPrice=newPrice; emit GlobalTargetPriceUpdated(old,newPrice);}

  function getCurrentMarketPrice() public view returns (uint256 marketPrice, bool hasLiquidity) {
    address pairAddress = factory.getPair(address(shareToken), address(usdt));
    if (pairAddress==address(0)) return (globalTargetPrice,false);
    IPancakePair pair = IPancakePair(pairAddress);
    (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
    if (reserve0==0 || reserve1==0) return (globalTargetPrice,false);
    address token0 = pair.token0(); uint256 usdtReserve; uint256 shareReserve;
    if (token0==address(usdt)) { usdtReserve=uint256(reserve0); shareReserve=uint256(reserve1);} else { usdtReserve=uint256(reserve1); shareReserve=uint256(reserve0);}

    // Normalize USDT reserve to 18 decimals for consistent pricing
    if (USDT_DEC < 18) {
      usdtReserve = usdtReserve * (10 ** (18 - USDT_DEC));
    } else if (USDT_DEC > 18) {
      usdtReserve = usdtReserve / (10 ** (USDT_DEC - 18));
    }

    marketPrice = (usdtReserve * 1e18) / shareReserve; hasLiquidity=true;
  }

  function getPackage(uint256 id) external view validPackage(id) returns (Package memory) { return _packages[id]; }
  function getPackageIds() external view returns (uint256[] memory) { return _packageIds; }
  function getActivePackageIds() external view returns (uint256[] memory) { uint256 n; for(uint256 i=0;i<_packageIds.length;i++){ if(_packages[_packageIds[i]].active) n++; } uint256[] memory ids=new uint256[](n); uint256 j; for(uint256 i=0;i<_packageIds.length;i++){ if(_packages[_packageIds[i]].active) ids[j++]=_packageIds[i]; } return ids; }
  function getPackageCount() external view returns (uint256) { return _packageIds.length; }
  function getUserStats(address user) external view returns (UserStats memory) { return _userStats[user]; }
  function getUserPurchases(address user) external view returns (UserPurchase[] memory) { return _userPurchases[user]; }
  function getUserPurchaseCount(address user) external view returns (uint256) { return _userPurchases[user].length; }
  function getUserPurchase(address user,uint256 index) external view returns (UserPurchase memory) { require(index<_userPurchases[user].length, "Invalid index"); return _userPurchases[user][index]; }
  function getUserRedemptions(address user) external view returns (uint256[] memory amounts, uint256[] memory timestamps) { return (_userRedemptions[user], _userRedemptionTimestamps[user]); }
  function getUserRedemptionCount(address user) external view returns (uint256) { return _userRedemptions[user].length; }
  function getUserPackages(address user) external view returns (UserPurchase[] memory) { return _userPurchases[user]; }
  function getUserPackageCount(address user) external view returns (uint256) { return _userPurchases[user].length; }

  // Original purchase (user pays from their wallet)
  function purchase(uint256 id, address referrer) external nonReentrant whenNotPaused validPackage(id) {
    _purchaseInternal(msg.sender, msg.sender, id, referrer);
  }

  // New server-authorized purchase on behalf of user (server pays USDT)
  function purchaseFor(address buyer, uint256 id, address referrer) external nonReentrant whenNotPaused validPackage(id) onlyRole(SERVER_ROLE) {
    require(buyer!=address(0), "Invalid buyer");
    _purchaseInternal(msg.sender, buyer, id, referrer);
  }

  function redeem(uint256 lpAmount) external nonReentrant whenNotPaused {
    require(lpAmount>0, "Invalid LP amount");

    // Compute user's proportional share of real AMM LP held by this contract
    uint256 totalSynthetic = lpToken.totalSupply();
    require(totalSynthetic > 0, "No LP supply");

    address pairAddress = factory.getPair(address(shareToken), address(usdt));
    require(pairAddress != address(0), "No LP pair");

    uint256 contractRealLP = IERC20(pairAddress).balanceOf(address(this));
    require(contractRealLP > 0, "No real LP held");

    uint256 amountToRemove = (contractRealLP * lpAmount) / totalSynthetic;

    // Burn user's synthetic LP first
    lpToken.burn(msg.sender, lpAmount);

    // Approve router to pull real LP and remove liquidity to user (safe)
    IERC20(pairAddress).safeIncreaseAllowance(address(router), amountToRemove);

    (uint amountA, uint amountB) = router.removeLiquidity(
      address(shareToken),
      address(usdt),
      amountToRemove,
      0,
      0,
      msg.sender,
      block.timestamp + deadlineWindow
    );

    // Attempt to release any vested tokens for the redeemer; ignore if none available
    try vestingVault.claimFor(msg.sender) { } catch { }

    _updateUserRedemptionData(msg.sender, lpAmount);
    emit LiquidityRedeemed(msg.sender, lpAmount, amountToRemove, amountA, amountB);
    emit Redeemed(msg.sender, lpAmount);
  }

  function setDeadlineWindow(uint256 newWindow) external onlyAdmin { require(newWindow>=60 && newWindow<=3600, "Invalid window"); uint256 old=deadlineWindow; deadlineWindow=newWindow; emit DeadlineWindowUpdated(old,newWindow); }
  function setTreasury(address newTreasury) external onlyAdmin { require(newTreasury!=address(0),"Invalid treasury"); address old=treasury; treasury=newTreasury; emit TreasuryUpdated(old,newTreasury); }
  function setLiquidityBps(uint16 newBps) external onlyAdmin { require(newBps<=10000, "Invalid bps"); uint16 old=liquidityBps; liquidityBps=newBps; emit LiquidityBpsUpdated(old,newBps); }

  // One-time router allowances to save gas per tx
  function initRouterAllowances() external onlyAdmin {
    // Approve max for router to spend USDT and BLOCKS from this contract
    usdt.safeIncreaseAllowance(address(router), type(uint256).max);
    IERC20(address(shareToken)).safeIncreaseAllowance(address(router), type(uint256).max);
    // If pair exists, approve router to spend LP too
    address pair = factory.getPair(address(shareToken), address(usdt));
    if (pair != address(0)) {
      IERC20(pair).safeIncreaseAllowance(address(router), type(uint256).max);
    }
  }

  // Admin controls
  function pause() external onlyAdmin { _pause(); }
  function unpause() external onlyAdmin { _unpause(); }

  function setSlippageTolerance(uint256 newTolBps) external onlyAdmin {
    require(newTolBps <= 2000, "Too high"); // cap at 20%
    uint256 old = slippageTolerance;
    slippageTolerance = newTolBps;
    emit SlippageToleranceUpdated(old, newTolBps);
  }

  function _purchaseInternal(address payer, address buyer, uint256 id, address referrer) internal {
    Package memory pkg = _packages[id];
    require(pkg.active, "Package not active");
    require(referrer != buyer, "Cannot refer yourself");

    // Transfer USDT from payer (msg.sender for purchase; server for purchaseFor)
    usdt.safeTransferFrom(payer, address(this), pkg.entryUSDT);

    uint256 netUSDT = _applyTax(PURCHASE_TAX_KEY, pkg.entryUSDT);

    // Normalize using immutable scale
    uint256 normalizedNetUSDT = USDT_SCALE_UP ? (netUSDT * USDT_SCALE) : (netUSDT / USDT_SCALE);

    // Total BLOCKS allocated to user based on package exchange rate
    uint256 totalUserTokens = (normalizedNetUSDT * 1e18) / pkg.exchangeRate;

    // Split net USDT into liquidity and treasury using configurable bps (default 30% liquidity)
    uint256 usdtForPool = (netUSDT * liquidityBps) / 10_000;
    uint256 usdtForVault = netUSDT - usdtForPool;

    // Immediately send treasury portion
    if (usdtForVault > 0) { usdt.safeTransfer(treasury, usdtForVault); }

    // Determine price: prefer AMM market price if liquidity exists, else fallback to global target price
    uint256 poolTokens = 0;
    uint256 liquidity = 0;
    if (usdtForPool > 0) {
      require(globalTargetPrice > 0, "No valid global target price");

      (uint256 marketPrice, bool hasLiquidity) = getCurrentMarketPrice();
      uint256 priceToUse = hasLiquidity ? marketPrice : globalTargetPrice;

      // Normalize usdtForPool to 18 decimals for liquidity calculation using immutable scale
      uint256 normalizedUsdtForPool = USDT_SCALE_UP ? (usdtForPool * USDT_SCALE) : (usdtForPool / USDT_SCALE);

      // Desired BLOCKS for liquidity based on chosen price
      uint256 liquidityBLOCKS = (normalizedUsdtForPool * 1e18) / priceToUse;
      shareToken.mint(address(this), liquidityBLOCKS);

      // Add liquidity with slippage protection; capture actual BLOCKS consumed by router
      uint256 actualShareTokenUsed = 0;
      (liquidity, actualShareTokenUsed) = _addLiquidityWithProtection(buyer, id, usdtForPool, liquidityBLOCKS);

      // Emit event showing market price vs global target price for transparency
      emit MarketPriceUsed(marketPrice, globalTargetPrice, marketPrice>globalTargetPrice?marketPrice-globalTargetPrice:globalTargetPrice-marketPrice);

      // If addLiquidity succeeded, treat actualShareTokenUsed as pool tokens; otherwise, 0
      poolTokens = actualShareTokenUsed;
      if (liquidity == 0) {
        // On failure, sweep all minted BLOCKS intended for liquidity to treasury
        IERC20(address(shareToken)).safeTransfer(treasury, liquidityBLOCKS);
        // poolTokens remains 0 and all tokens will be vested below
      }
    }

    // Vesting tokens are the remainder of user's allocation after pool contribution
    uint256 vestTokens = totalUserTokens - poolTokens;
    if (vestTokens > 0) {
      shareToken.mint(address(vestingVault), vestTokens);
      vestingVault.lock(buyer, vestTokens, pkg.cliff, pkg.duration);
    }

    // Mint synthetic LP tokens 1:1 with BLOCKS contributed to liquidity
    // Mint BLOCKS-LP equal to total user tokens (1:1 with total allocation),
    // not just the portion added to liquidity. This ensures LP mirrors the
    // user's total BLOCKS allocation for redemption/accounting symmetry.
    uint256 lpTokensMinted = totalUserTokens;
    if (lpTokensMinted > 0) { lpToken.mint(buyer, lpTokensMinted); }

    uint256 referralReward = 0;
    if (referrer != address(0) && pkg.referralBps > 0) {
      referralReward = (totalUserTokens * pkg.referralBps) / 10_000;
      // Pay referral from treasury (no new mint). If insufficient funds/allowance, skip and emit 0-paid event.
      IERC20 shareErc20 = IERC20(address(shareToken));
      uint256 bal = shareErc20.balanceOf(treasury);
      uint256 allow = shareErc20.allowance(treasury, address(this));
      if (bal >= referralReward && allow >= referralReward) {
        shareErc20.safeTransferFrom(treasury, referrer, referralReward);
        _userStats[referrer].totalReferralRewards += referralReward;
        emit ReferralPaid(referrer, buyer, referralReward);
      } else {
        emit ReferralPaid(referrer, buyer, 0);
      }
    }

    // FIXED: Update buyer's purchase data with 0 referral reward (they didn't earn any)
    // Referrer's stats are updated above when they receive the actual reward
    _updateUserPurchaseData(buyer, id, pkg.entryUSDT, totalUserTokens, vestTokens, poolTokens, lpTokensMinted, referrer, 0);

    emit Purchased(buyer, id, pkg.entryUSDT, totalUserTokens, vestTokens, poolTokens, lpTokensMinted, referrer, referralReward);
  }

  function _applyTax(bytes32 taxKey, uint256 amount) internal returns (uint256) {
    (uint16 rateBps, address recipient) = taxManager.buckets(taxKey);
    require(rateBps <= 10000, "Tax > 100%");
    if (rateBps > 0 && recipient != address(0)) {
      uint256 taxAmount = (amount * rateBps) / 10_000;
      if (taxAmount > 0) { usdt.safeTransfer(recipient, taxAmount); emit TaxApplied(taxKey, taxAmount, recipient); return amount - taxAmount; }
    }
    return amount;
  }

  function _updateUserPurchaseData(address user,uint256 packageId,uint256 usdtAmount,uint256 totalTokens,uint256 vestTokens,uint256 poolTokens,uint256 lpTokens,address referrer,uint256 referralReward) internal {
    UserStats storage stats = _userStats[user];
    stats.totalInvested += usdtAmount; stats.totalTokensReceived += totalTokens; stats.totalVestTokens += vestTokens; stats.totalPoolTokens += poolTokens; stats.totalLPTokens += lpTokens; stats.purchaseCount += 1;
    _userPurchases[user].push(UserPurchase({packageId:packageId,usdtAmount:usdtAmount,totalTokens:totalTokens,vestTokens:vestTokens,poolTokens:poolTokens,lpTokens:lpTokens,referrer:referrer,referralReward:referralReward,timestamp:block.timestamp}));
  }

  function _addLiquidityWithProtection(address user,uint256 packageId,uint256 usdtAmount,uint256 blocksAmount) internal returns (uint256 liquidity, uint256 actualShareTokenUsed) {
    uint256 minUSDT = (usdtAmount * (10000 - slippageTolerance)) / 10000;
    uint256 minBLOCKS = (blocksAmount * (10000 - slippageTolerance)) / 10000;
    emit SlippageProtectionTriggered(user, packageId, blocksAmount, usdtAmount, minBLOCKS, minUSDT);
    // Ensure allowances are sufficient (avoid overflowing max allowances)
    {
      IERC20 usdtErc20 = IERC20(address(usdt));
      uint256 allowU = usdtErc20.allowance(address(this), address(router));
      if (allowU < usdtAmount) {
        usdtErc20.safeIncreaseAllowance(address(router), usdtAmount - allowU);
      }
      IERC20 shareErc20 = IERC20(address(shareToken));
      uint256 allowS = shareErc20.allowance(address(this), address(router));
      if (allowS < blocksAmount) {
        shareErc20.safeIncreaseAllowance(address(router), blocksAmount - allowS);
      }
    }

    try router.addLiquidity(address(shareToken), address(usdt), blocksAmount, usdtAmount, minBLOCKS, minUSDT, address(this), block.timestamp + deadlineWindow) returns (uint256 actualShareToken, uint256 actualUSDT, uint256 liquidityTokens) {
      require(liquidityTokens > 0, "No liquidity tokens");
      emit LiquidityAdded(user, packageId, blocksAmount, usdtAmount, liquidityTokens, actualShareToken, actualUSDT);
      // Sweep leftover BLOCKS not consumed by router
      uint256 leftover = blocksAmount > actualShareToken ? (blocksAmount - actualShareToken) : 0;
      if (leftover > 0) {
        IERC20(address(shareToken)).safeTransfer(treasury, leftover);
      }
      return (liquidityTokens, actualShareToken);
    } catch Error(string memory reason) {
      _handleLiquidityFailure(user, packageId, usdtAmount, reason); return (0, 0);
    } catch (bytes memory low) {
      string memory reason = low.length>0 ? string(low) : "Unknown low-level error"; _handleLiquidityFailure(user, packageId, usdtAmount, reason); return (0, 0);
    }
  }

  function _handleLiquidityFailure(address user,uint256 packageId,uint256 usdtAmount,string memory reason) internal {
    usdt.safeTransfer(treasury, usdtAmount);
    emit LiquidityAdditionFailed(user, packageId, usdtAmount, reason);
  }

  function _updateUserRedemptionData(address user, uint256 lpAmount) internal {
    UserStats storage stats = _userStats[user];
    stats.redemptionCount += 1;
    stats.totalRedemptions += lpAmount;
    _userRedemptions[user].push(lpAmount);
    _userRedemptionTimestamps[user].push(block.timestamp);
  }

}

