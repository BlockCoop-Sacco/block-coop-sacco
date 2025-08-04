// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IERC20Decimals is IERC20 {
    function decimals() external view returns (uint8);
}

interface IBLOCKS {
    function mint(address to, uint256 amount) external;
}

interface IBLOCKS_LP {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function totalSupply() external view returns (uint256);
}

interface IVestingVault {
    function lock(address user, uint256 amount, uint64 cliff, uint64 duration) external;
    function claim() external;
}

interface IPancakeRouter {
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);
}

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPancakePair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function totalSupply() external view returns (uint256);
}

interface ISwapTaxManager {
    function buckets(bytes32 key) external view returns (uint16 rateBps, address recipient);
}

/**
 * @title PackageManagerV2_1
 * @dev Manages investment packages with sophisticated token splitting, vesting, and liquidity provision
 * @notice This contract handles package creation, purchases with automatic token distribution,
 *         vesting schedules, liquidity provision, and referral rewards
 */
contract PackageManagerV2_1 is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20Decimals;

    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    struct Package {
        string   name;
        uint256  entryUSDT;
        uint256  exchangeRate;     // Exchange rate: USDT per BLOCKS for user token allocation (e.g., 2000000 = 2.0 USDT per BLOCKS)
        uint16   vestBps;
        uint64   cliff;
        uint64   duration;
        uint16   referralBps;
        bool     active;
        bool     exists;  // Added to track package existence
    }

    // State variables
    IERC20Decimals   public immutable usdt;
    IBLOCKS          public immutable shareToken;
    IBLOCKS_LP       public immutable lpToken;
    IVestingVault    public immutable vestingVault;
    IPancakeRouter   public immutable router;
    IPancakeFactory  public immutable factory;
    ISwapTaxManager  public immutable taxManager;
    address          public           treasury;
    uint256          public           deadlineWindow = 300; // 5 minutes in seconds
    uint256          public           globalTargetPrice; // Global target price for liquidity operations only
    uint256          public           slippageTolerance = 500; // 5% slippage tolerance in basis points (500 = 5%)

    uint256   public nextPackageId;
    uint256[] private _packageIds;
    mapping(uint256 => Package) private _packages;

    // User portfolio tracking
    struct UserPurchase {
        uint256 packageId;
        uint256 usdtAmount;
        uint256 totalTokens;
        uint256 vestTokens;
        uint256 poolTokens;
        uint256 lpTokens;
        address referrer;
        uint256 referralReward;
        uint256 timestamp;
    }

    struct UserStats {
        uint256 totalInvested;        // Total USDT invested
        uint256 totalTokensReceived;  // Total tokens received (vest + pool)
        uint256 totalVestTokens;      // Total tokens in vesting
        uint256 totalPoolTokens;      // Total tokens used for liquidity
        uint256 totalLPTokens;        // Total LP tokens received
        uint256 totalReferralRewards; // Total referral rewards earned
        uint256 purchaseCount;        // Number of packages purchased
        uint256 redemptionCount;      // Number of redemptions made
        uint256 totalRedemptions;     // Total LP tokens redeemed
    }

    // User data mappings
    mapping(address => UserStats) private _userStats;
    mapping(address => UserPurchase[]) private _userPurchases;
    mapping(address => uint256[]) private _userRedemptions; // LP amounts redeemed
    mapping(address => uint256[]) private _userRedemptionTimestamps;

    // Constants for tax bucket keys
    bytes32 public constant PURCHASE_TAX_KEY = keccak256("PURCHASE");
    bytes32 public constant REFERRAL_TAX_KEY = keccak256("REFERRAL");

    // Events
    event PackageAdded(
        uint256 indexed id,
        string name,
        uint256 entryUSDT,
        uint256 exchangeRate,
        uint16 vestBps,
        uint64 cliff,
        uint64 duration,
        uint16 referralBps
    );

    event PackageToggled(uint256 indexed id, bool active);

    event PackageExchangeRateUpdated(
        uint256 indexed id,
        uint256 oldExchangeRate,
        uint256 newExchangeRate
    );

    event GlobalTargetPriceUpdated(
        uint256 oldGlobalTargetPrice,
        uint256 newGlobalTargetPrice
    );

    event Purchased(
        address indexed buyer,
        uint256 indexed packageId,
        uint256 usdtAmount,
        uint256 totalTokens,
        uint256 vestTokens,
        uint256 poolTokens,
        uint256 lpTokens,
        address indexed referrer,
        uint256 referralReward
    );

    event Redeemed(
        address indexed user,
        uint256 lpAmount
    );

    event LiquidityRedeemed(
        address indexed user,
        uint256 lpTokensBurned,
        uint256 liquidityRemoved,
        uint256 shareTokenReceived,
        uint256 usdtReceived
    );

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event DeadlineWindowUpdated(uint256 oldWindow, uint256 newWindow);

    event TaxApplied(bytes32 indexed taxKey, uint256 amount, address indexed recipient);

    event ReferralPaid(
        address indexed referrer,
        address indexed buyer,
        uint256 reward
    );

    event TreasuryBlocksAllocated(
        address indexed buyer,
        uint256 indexed packageId,
        uint256 amount
    );

    event MarketPriceUsed(
        uint256 marketPrice,
        uint256 globalTargetPrice,
        uint256 priceDifference
    );

    // Enhanced liquidity addition events for improved transparency
    event LiquidityAdded(
        address indexed user,
        uint256 indexed packageId,
        uint256 shareTokenAmount,
        uint256 usdtAmount,
        uint256 liquidityTokens,
        uint256 actualShareToken,
        uint256 actualUSDT
    );

    event LiquidityAdditionFailed(
        address indexed user,
        uint256 indexed packageId,
        uint256 usdtAmount,
        string reason
    );

    event SlippageProtectionTriggered(
        address indexed user,
        uint256 indexed packageId,
        uint256 requestedShareToken,
        uint256 requestedUSDT,
        uint256 minShareToken,
        uint256 minUSDT
    );

    /**
     * @dev Constructor to initialize the PackageManager contract
     * @param usdt_ USDT token contract address (must use 18 decimals for V2 architecture)
     * @param share_ Share token contract address
     * @param lp_ LP token contract address
     * @param vault_ Vesting vault contract address
     * @param router_ PancakeSwap router contract address
     * @param factory_ PancakeSwap factory contract address
     * @param treasury_ Treasury address for receiving funds
     * @param tax_ Tax manager contract address
     * @param admin Admin address for access control
     * @param initialGlobalTargetPrice_ Initial global target price for liquidity operations (18 decimals)
     */
    constructor(
        address usdt_,
        address share_,
        address lp_,
        address vault_,
        address router_,
        address factory_,
        address treasury_,
        address tax_,
        address admin,
        uint256 initialGlobalTargetPrice_
    ) {
        require(usdt_ != address(0), "Invalid USDT address");
        require(share_ != address(0), "Invalid share token address");
        require(lp_ != address(0), "Invalid LP token address");
        require(vault_ != address(0), "Invalid vault address");
        require(router_ != address(0), "Invalid router address");
        require(factory_ != address(0), "Invalid factory address");
        require(treasury_ != address(0), "Invalid treasury address");
        require(tax_ != address(0), "Invalid tax manager address");
        require(admin != address(0), "Invalid admin address");
        require(initialGlobalTargetPrice_ > 0, "Invalid initial global target price");

        usdt         = IERC20Decimals(usdt_);
        shareToken   = IBLOCKS(share_);
        lpToken      = IBLOCKS_LP(lp_);
        vestingVault = IVestingVault(vault_);
        router       = IPancakeRouter(router_);
        factory      = IPancakeFactory(factory_);
        taxManager   = ISwapTaxManager(tax_);
        treasury     = treasury_;
        globalTargetPrice = initialGlobalTargetPrice_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        // Grant admin role to additional admin wallet
        _grantRole(DEFAULT_ADMIN_ROLE, 0x6F6782148F208F9547f68e2354B1d7d2d4BeF987);
    }

    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "PackageManager: Not admin");
        _;
    }

    modifier validPackage(uint256 id) {
        require(_packages[id].exists, "PackageManager: Invalid package");
        _;
    }

    /**
     * @dev Add a new investment package
     * @param name Package name
     * @param entryUSDT Entry amount in USDT (with 18 decimals for V2 architecture)
     * @param exchangeRate Exchange rate: USDT per BLOCKS for user token allocation (e.g., 2000000000000000000 = 2.0 USDT per BLOCKS with 18 decimals)
     * @param vestBps Percentage of tokens to vest in basis points
     * @param cliff Cliff period in seconds before vesting starts
     * @param duration Total vesting duration in seconds
     * @param referralBps Referral reward in basis points
     */
    function addPackage(
        string calldata name,
        uint256 entryUSDT,
        uint256 exchangeRate,
        uint16  vestBps,
        uint64  cliff,
        uint64  duration,
        uint16  referralBps
    ) external onlyAdmin whenNotPaused {
        require(bytes(name).length > 0, "PackageManager: Empty name");
        require(entryUSDT > 0, "PackageManager: Invalid entry amount");
        require(exchangeRate > 0, "PackageManager: Invalid exchange rate");
        require(vestBps <= 10000, "PackageManager: Invalid vest percentage");
        require(referralBps <= 1000, "PackageManager: Referral rate too high"); // Max 10%
        require(duration > 0, "PackageManager: Invalid duration");

        uint256 id = nextPackageId++;
        _packages[id] = Package({
            name: name,
            entryUSDT: entryUSDT,
            exchangeRate: exchangeRate,
            vestBps: vestBps,
            cliff: cliff,
            duration: duration,
            referralBps: referralBps,
            active: true,
            exists: true
        });
        _packageIds.push(id);

        emit PackageAdded(id, name, entryUSDT, exchangeRate, vestBps, cliff, duration, referralBps);
    }

    /**
     * @dev Toggle package active status
     * @param id Package ID to toggle
     */
    function togglePackage(uint256 id) external onlyAdmin validPackage(id) {
        _packages[id].active = !_packages[id].active;
        emit PackageToggled(id, _packages[id].active);
    }

    /**
     * @dev Update exchange rate for an existing package
     * @param id Package ID to update
     * @param newExchangeRate New exchange rate: USDT per BLOCKS for user token allocation
     */
    function setPackageExchangeRate(uint256 id, uint256 newExchangeRate)
        external
        onlyAdmin
        validPackage(id)
    {
        require(newExchangeRate > 0, "PackageManager: Invalid exchange rate");

        uint256 oldExchangeRate = _packages[id].exchangeRate;
        _packages[id].exchangeRate = newExchangeRate;

        emit PackageExchangeRateUpdated(id, oldExchangeRate, newExchangeRate);
    }

    /**
     * @dev Set global target price for liquidity operations
     * @param newGlobalTargetPrice New global target price in wei precision
     */
    function setGlobalTargetPrice(uint256 newGlobalTargetPrice)
        external
        onlyAdmin
    {
        require(newGlobalTargetPrice > 0, "PackageManager: Invalid global target price");

        uint256 oldGlobalTargetPrice = globalTargetPrice;
        globalTargetPrice = newGlobalTargetPrice;

        emit GlobalTargetPriceUpdated(oldGlobalTargetPrice, newGlobalTargetPrice);
    }

    /**
     * @dev Get current market price from the liquidity pool
     * @return marketPrice Current price in 18 decimals (USDT per BLOCKS)
     * @return hasLiquidity Whether the pool has sufficient liquidity
     */
    function getCurrentMarketPrice() public view returns (uint256 marketPrice, bool hasLiquidity) {
        address pairAddress = factory.getPair(address(shareToken), address(usdt));

        if (pairAddress == address(0)) {
            // No pair exists - use global target price as fallback
            return (globalTargetPrice, false);
        }

        IPancakePair pair = IPancakePair(pairAddress);
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();

        if (reserve0 == 0 || reserve1 == 0) {
            // No liquidity - use global target price as fallback
            return (globalTargetPrice, false);
        }

        // Determine token order
        address token0 = pair.token0();
        uint256 usdtReserve;
        uint256 shareReserve;

        if (token0 == address(usdt)) {
            usdtReserve = uint256(reserve0);
            shareReserve = uint256(reserve1);
        } else {
            usdtReserve = uint256(reserve1);
            shareReserve = uint256(reserve0);
        }

        // Calculate price: USDT per BLOCKS (18 decimals)
        // marketPrice = (usdtReserve * 1e18) / shareReserve
        marketPrice = (usdtReserve * 1e18) / shareReserve;
        hasLiquidity = true;
    }

    /**
     * @dev Get package information by ID
     * @param id Package ID
     * @return Package struct containing all package details
     */
    function getPackage(uint256 id) external view validPackage(id) returns (Package memory) {
        return _packages[id];
    }

    /**
     * @dev Get all package IDs
     * @return Array of all package IDs
     */
    function getPackageIds() external view returns (uint256[] memory) {
        return _packageIds;
    }

    /**
     * @dev Get active package IDs only
     * @return Array of active package IDs
     */
    function getActivePackageIds() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        // Count active packages
        for (uint256 i = 0; i < _packageIds.length; i++) {
            if (_packages[_packageIds[i]].active) {
                activeCount++;
            }
        }

        // Create array of active package IDs
        uint256[] memory activeIds = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < _packageIds.length; i++) {
            if (_packages[_packageIds[i]].active) {
                activeIds[index] = _packageIds[i];
                index++;
            }
        }

        return activeIds;
    }

    /**
     * @dev Get total number of packages
     * @return Total package count
     */
    function getPackageCount() external view returns (uint256) {
        return _packageIds.length;
    }

    /**
     * @dev Get user's portfolio statistics
     * @param user User address
     * @return UserStats struct containing aggregated user data
     */
    function getUserStats(address user) external view returns (UserStats memory) {
        return _userStats[user];
    }

    /**
     * @dev Get user's purchase history
     * @param user User address
     * @return Array of UserPurchase structs
     */
    function getUserPurchases(address user) external view returns (UserPurchase[] memory) {
        return _userPurchases[user];
    }

    /**
     * @dev Get user's purchase count
     * @param user User address
     * @return Number of purchases made by user
     */
    function getUserPurchaseCount(address user) external view returns (uint256) {
        return _userPurchases[user].length;
    }

    /**
     * @dev Get user's specific purchase by index
     * @param user User address
     * @param index Purchase index
     * @return UserPurchase struct
     */
    function getUserPurchase(address user, uint256 index) external view returns (UserPurchase memory) {
        require(index < _userPurchases[user].length, "PackageManager: Invalid purchase index");
        return _userPurchases[user][index];
    }

    /**
     * @dev Get user's redemption history
     * @param user User address
     * @return amounts Array of LP token amounts redeemed
     * @return timestamps Array of redemption timestamps
     */
    function getUserRedemptions(address user) external view returns (uint256[] memory amounts, uint256[] memory timestamps) {
        return (_userRedemptions[user], _userRedemptionTimestamps[user]);
    }

    /**
     * @dev Get user's redemption count
     * @param user User address
     * @return Number of redemptions made by user
     */
    function getUserRedemptionCount(address user) external view returns (uint256) {
        return _userRedemptions[user].length;
    }

    /**
     * @dev Get user's packages (alias for getUserPurchases for frontend compatibility)
     * @param user User address
     * @return Array of UserPurchase structs representing user's packages
     */
    function getUserPackages(address user) external view returns (UserPurchase[] memory) {
        return _userPurchases[user];
    }

    /**
     * @dev Get user's package count (alias for getUserPurchaseCount for frontend compatibility)
     * @param user User address
     * @return Number of packages purchased by user
     */
    function getUserPackageCount(address user) external view returns (uint256) {
        return _userPurchases[user].length;
    }

    /**
     * @dev Get packages by owner (alias for getUserPurchases for frontend compatibility)
     * @param owner Owner address
     * @return Array of UserPurchase structs representing owner's packages
     */
    function getPackagesByOwner(address owner) external view returns (UserPurchase[] memory) {
        return _userPurchases[owner];
    }

    /**
     * @dev Purchase an investment package
     * @param id Package ID to purchase
     * @param referrer Address of referrer (can be zero address)
     */
    function purchase(uint256 id, address referrer)
        external
        nonReentrant
        whenNotPaused
        validPackage(id)
    {
        Package memory pkg = _packages[id];
        require(pkg.active, "PackageManager: Package not active");
        require(referrer != msg.sender, "PackageManager: Cannot refer yourself");

        // Transfer USDT from user
        usdt.safeTransferFrom(msg.sender, address(this), pkg.entryUSDT);

        // Apply purchase tax if configured
        uint256 netUSDT = _applyTax(PURCHASE_TAX_KEY, pkg.entryUSDT);

        // Dual pricing system implementation
        // Step 1: Calculate total user BLOCKS tokens based on package exchange rate
        // exchangeRate is in 18-decimal precision (USDT per BLOCKS) for V2 architecture
        // Formula: totalTokens = (netUSDT * 10^18) / exchangeRate
        // Both USDT and BLOCKS use 18 decimals in V2 architecture
        uint8 usdtDecimals = usdt.decimals();
        require(usdtDecimals == 18, "PackageManager: USDT must use 18 decimals for V2 architecture");

        // Direct calculation since both tokens use 18 decimals
        uint256 totalUserTokens = (netUSDT * 1e18) / pkg.exchangeRate;

        // Step 2: Calculate USDT allocation based on vestBps
        uint256 usdtForPool = (netUSDT * (10_000 - pkg.vestBps)) / 10_000;
        uint256 usdtForVault = netUSDT - usdtForPool;

        // Step 3: Calculate vesting and pool token allocation
        uint256 vestTokens = (totalUserTokens * pkg.vestBps) / 10_000;
        uint256 poolTokens = totalUserTokens - vestTokens;

        // Step 4: Calculate treasury allocation (5% of user claimable tokens)
        uint256 treasuryTokens = (totalUserTokens * 500) / 10_000; // 5% of total user tokens

        // Handle vesting tokens
        if (vestTokens > 0) {
            shareToken.mint(address(vestingVault), vestTokens);
            vestingVault.lock(msg.sender, vestTokens, pkg.cliff, pkg.duration);
        }

        // Handle treasury BLOCKS allocation (for operational sustainability)
        if (treasuryTokens > 0) {
            shareToken.mint(treasury, treasuryTokens);
            emit TreasuryBlocksAllocated(msg.sender, id, treasuryTokens);
        }

        // Transfer vault portion to treasury
        if (usdtForVault > 0) {
            usdt.safeTransfer(treasury, usdtForVault);
        }

        // Handle liquidity provision using DYNAMIC MARKET PRICE with enhanced error handling
        uint256 liquidity = 0;
        if (usdtForPool > 0) {
            // Get current market price instead of using fixed global target price
            (uint256 marketPrice, bool hasLiquidity) = getCurrentMarketPrice();

            // Use market price if available, otherwise fallback to global target price
            uint256 priceToUse = hasLiquidity ? marketPrice : globalTargetPrice;
            require(priceToUse > 0, "PackageManager: No valid price available");

            // Calculate BLOCKS tokens for liquidity based on current market price
            // Both USDT and price use 18 decimals in V2 architecture
            uint256 liquidityBLOCKS = (usdtForPool * 1e18) / priceToUse;

            // Mint BLOCKS tokens for liquidity
            shareToken.mint(address(this), liquidityBLOCKS);

            // Use enhanced liquidity addition with comprehensive error handling
            liquidity = _addLiquidityWithProtection(
                msg.sender,
                id,
                usdtForPool,
                liquidityBLOCKS
            );

            // Emit event showing which price was used for transparency
            emit MarketPriceUsed(
                marketPrice,
                globalTargetPrice,
                marketPrice > globalTargetPrice ? marketPrice - globalTargetPrice : globalTargetPrice - marketPrice
            );

            // If liquidity addition failed, BLOCKS tokens were already minted but USDT was sent to treasury
            // We need to handle the excess BLOCKS tokens
            if (liquidity == 0) {
                // Send the minted BLOCKS tokens to treasury as well
                IERC20(address(shareToken)).transfer(treasury, liquidityBLOCKS);
            }
        }

        // Mint LP tokens to user for their claimable tokens (total user tokens)
        // Treasury allocation is not claimable by user, so not included in LP tokens
        uint256 userClaimableTokens = totalUserTokens;
        if (userClaimableTokens > 0) {
            lpToken.mint(msg.sender, userClaimableTokens);
        }

        // Handle referral rewards
        uint256 referralReward = 0;
        if (referrer != address(0) && pkg.referralBps > 0) {
            referralReward = (totalUserTokens * pkg.referralBps) / 10_000;

            // Mint referral reward directly to referrer instead of using treasury
            // This ensures referral rewards are always available and don't depend on treasury balance
            shareToken.mint(referrer, referralReward);

            // Update referrer's stats
            _userStats[referrer].totalReferralRewards += referralReward;

            // Emit dedicated referral event
            emit ReferralPaid(referrer, msg.sender, referralReward);
        }

        // Update user's portfolio data
        // LP tokens represent user's claimable tokens (total user tokens)
        // Pass totalUserTokens instead of totalTokens to exclude treasury allocation from user stats
        _updateUserPurchaseData(msg.sender, id, pkg.entryUSDT, totalUserTokens, vestTokens, poolTokens, userClaimableTokens, referrer, referralReward);

        emit Purchased(
            msg.sender,
            id,
            pkg.entryUSDT,
            totalUserTokens, // User-claimable tokens only, excluding treasury allocation
            vestTokens,
            poolTokens,
            userClaimableTokens, // LP tokens for user's claimable portion
            referrer,
            referralReward
        );
    }

    /**
     * @dev Redeem LP tokens (simplified version - actual implementation may vary)
     * @param lpAmount Amount of LP tokens to redeem
     */
    function redeem(uint256 lpAmount) external nonReentrant whenNotPaused {
        require(lpAmount > 0, "PackageManager: Invalid LP amount");

        // Burn LP tokens from user
        lpToken.burn(msg.sender, lpAmount);

        // Trigger vesting claim for user
        vestingVault.claim();

        // Update user's redemption data
        _updateUserRedemptionData(msg.sender, lpAmount);

        emit Redeemed(msg.sender, lpAmount);
    }

    /**
     * @dev Enhanced LP token redemption with actual liquidity removal from PancakeSwap
     * @param lpAmount Amount of LP tokens to redeem
     * @param amountShareMin Minimum amount of ShareToken to receive (slippage protection)
     * @param amountUSDTMin Minimum amount of USDT to receive (slippage protection)
     * @param deadline Transaction deadline timestamp
     */
    function redeemWithLiquidityRemoval(
        uint256 lpAmount,
        uint256 amountShareMin,
        uint256 amountUSDTMin,
        uint256 deadline
    ) external nonReentrant whenNotPaused {
        require(lpAmount > 0, "PackageManager: Invalid LP amount");
        require(deadline >= block.timestamp, "PackageManager: Deadline expired");

        // Get the PancakeSwap pair address
        address pairAddress = factory.getPair(address(shareToken), address(usdt));
        require(pairAddress != address(0), "PackageManager: No liquidity pair found");

        // Calculate proportional liquidity to remove based on LP tokens
        uint256 pairLPBalance = IERC20(pairAddress).balanceOf(address(this));

        // Calculate the actual liquidity to remove from the pool
        uint256 liquidityToRemove = (lpAmount * pairLPBalance) / lpToken.totalSupply();
        require(liquidityToRemove > 0, "PackageManager: No liquidity to remove");

        // Burn LP tokens from user
        lpToken.burn(msg.sender, lpAmount);

        // Approve router to spend pair LP tokens
        IERC20(pairAddress).approve(address(router), liquidityToRemove);

        // Remove liquidity from PancakeSwap
        (uint256 amountShare, uint256 amountUSDT) = router.removeLiquidity(
            address(shareToken),
            address(usdt),
            liquidityToRemove,
            amountShareMin,
            amountUSDTMin,
            msg.sender, // Send tokens directly to user
            deadline
        );

        // Trigger vesting claim for user
        vestingVault.claim();

        // Update user's redemption data
        _updateUserRedemptionData(msg.sender, lpAmount);

        emit LiquidityRedeemed(msg.sender, lpAmount, liquidityToRemove, amountShare, amountUSDT);
    }

    /**
     * @dev Get expected returns for LP token redemption
     * @param lpAmount Amount of LP tokens to redeem
     * @return expectedShare Expected ShareToken amount
     * @return expectedUSDT Expected USDT amount
     * @return liquidityToRemove Actual liquidity amount to remove from pool
     */
    function getRedemptionPreview(uint256 lpAmount)
        external
        view
        returns (uint256 expectedShare, uint256 expectedUSDT, uint256 liquidityToRemove)
    {
        require(lpAmount > 0, "PackageManager: Invalid LP amount");

        // Get the PancakeSwap pair address
        address pairAddress = factory.getPair(address(shareToken), address(usdt));
        if (pairAddress == address(0)) {
            return (0, 0, 0);
        }

        IPancakePair pair = IPancakePair(pairAddress);
        uint256 pairLPBalance = IERC20(pairAddress).balanceOf(address(this));
        uint256 totalLPTokens = lpToken.totalSupply();

        if (totalLPTokens == 0 || pairLPBalance == 0) {
            return (0, 0, 0);
        }

        // Calculate liquidity to remove
        liquidityToRemove = (lpAmount * pairLPBalance) / totalLPTokens;

        // Get current reserves
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        uint256 totalPairSupply = pair.totalSupply();

        if (totalPairSupply == 0) {
            return (0, 0, liquidityToRemove);
        }

        // Calculate proportional amounts
        uint256 amount0 = (liquidityToRemove * reserve0) / totalPairSupply;
        uint256 amount1 = (liquidityToRemove * reserve1) / totalPairSupply;

        // Determine which token is which
        address token0 = pair.token0();
        if (token0 == address(shareToken)) {
            expectedShare = amount0;
            expectedUSDT = amount1;
        } else {
            expectedShare = amount1;
            expectedUSDT = amount0;
        }
    }

    /**
     * @dev Internal function to apply tax if configured
     * @param taxKey Tax bucket key
     * @param amount Amount to apply tax on
     * @return Net amount after tax deduction
     */
    function _applyTax(bytes32 taxKey, uint256 amount) internal returns (uint256) {
        (uint16 rateBps, address recipient) = taxManager.buckets(taxKey);

        if (rateBps > 0 && recipient != address(0)) {
            uint256 taxAmount = (amount * rateBps) / 10_000;
            if (taxAmount > 0) {
                usdt.safeTransfer(recipient, taxAmount);
                emit TaxApplied(taxKey, taxAmount, recipient);
                return amount - taxAmount;
            }
        }

        return amount;
    }

    // Admin functions

    /**
     * @dev Pause the contract
     */
    function pause() external onlyAdmin {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyAdmin {
        _unpause();
    }

    /**
     * @dev Update treasury address
     * @param newTreasury New treasury address
     */
    function setTreasury(address newTreasury) external onlyAdmin {
        require(newTreasury != address(0), "PackageManager: Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev Get treasury's BLOCKS token balance
     * @return Treasury's current BLOCKS balance
     */
    function getTreasuryBlocksBalance() external view returns (uint256) {
        return IERC20(address(shareToken)).balanceOf(treasury);
    }

    /**
     * @dev Get treasury's BLOCKS allowance to this contract (deprecated - referrals now mint directly)
     * @return Current allowance amount
     */
    function getTreasuryBlocksAllowance() external view returns (uint256) {
        return IERC20(address(shareToken)).allowance(treasury, address(this));
    }

    /**
     * @dev Update deadline window for DEX operations
     * @param newWindow New deadline window in seconds
     */
    function setDeadlineWindow(uint256 newWindow) external onlyAdmin {
        require(newWindow >= 60, "PackageManager: Deadline too short"); // Minimum 1 minute
        require(newWindow <= 3600, "PackageManager: Deadline too long"); // Maximum 1 hour
        uint256 oldWindow = deadlineWindow;
        deadlineWindow = newWindow;
        emit DeadlineWindowUpdated(oldWindow, newWindow);
    }



    /**
     * @dev Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyRecoverToken(address token, uint256 amount) external onlyAdmin {
        require(token != address(0), "PackageManager: Invalid token address");
        require(amount > 0, "PackageManager: Invalid amount");

        IERC20(token).transfer(treasury, amount);
    }

    /**
     * @dev Internal function to update user's purchase data
     * @param user User address
     * @param packageId Package ID purchased
     * @param usdtAmount USDT amount invested
     * @param totalTokens Total user-claimable tokens received (excluding treasury allocation)
     * @param vestTokens Tokens sent to vesting
     * @param poolTokens Tokens used for liquidity
     * @param lpTokens LP tokens received
     * @param referrer Referrer address
     * @param referralReward Referral reward amount
     */
    function _updateUserPurchaseData(
        address user,
        uint256 packageId,
        uint256 usdtAmount,
        uint256 totalTokens,
        uint256 vestTokens,
        uint256 poolTokens,
        uint256 lpTokens,
        address referrer,
        uint256 referralReward
    ) internal {
        // Update user stats
        UserStats storage stats = _userStats[user];
        stats.totalInvested += usdtAmount;
        stats.totalTokensReceived += totalTokens;
        stats.totalVestTokens += vestTokens;
        stats.totalPoolTokens += poolTokens;
        stats.totalLPTokens += lpTokens;
        stats.purchaseCount += 1;

        // Add purchase record
        _userPurchases[user].push(UserPurchase({
            packageId: packageId,
            usdtAmount: usdtAmount,
            totalTokens: totalTokens,
            vestTokens: vestTokens,
            poolTokens: poolTokens,
            lpTokens: lpTokens,
            referrer: referrer,
            referralReward: referralReward,
            timestamp: block.timestamp
        }));
    }

    /**
     * @dev Internal function to update user's redemption data
     * @param user User address
     * @param lpAmount LP tokens redeemed
     */
    function _updateUserRedemptionData(address user, uint256 lpAmount) internal {
        // Update user stats
        UserStats storage stats = _userStats[user];
        stats.redemptionCount += 1;
        stats.totalRedemptions += lpAmount;

        // Add redemption record
        _userRedemptions[user].push(lpAmount);
        _userRedemptionTimestamps[user].push(block.timestamp);
    }

    /**
     * @dev Enhanced internal function for adding liquidity with comprehensive error handling
     * @param user User address for event emission
     * @param packageId Package ID for event emission
     * @param usdtAmount USDT amount to add to liquidity
     * @param blocksAmount BLOCKS amount to add to liquidity
     * @return liquidity Amount of liquidity tokens received (0 if failed)
     */
    function _addLiquidityWithProtection(
        address user,
        uint256 packageId,
        uint256 usdtAmount,
        uint256 blocksAmount
    ) internal returns (uint256 liquidity) {
        // Calculate minimum amounts with slippage protection
        uint256 minUSDT = (usdtAmount * (10000 - slippageTolerance)) / 10000;
        uint256 minBLOCKS = (blocksAmount * (10000 - slippageTolerance)) / 10000;

        // Emit slippage protection event for transparency
        emit SlippageProtectionTriggered(
            user,
            packageId,
            blocksAmount,
            usdtAmount,
            minBLOCKS,
            minUSDT
        );

        // Approve router for token transfers
        require(usdt.approve(address(router), usdtAmount), "PackageManager: USDT approve failed");
        require(IERC20(address(shareToken)).approve(address(router), blocksAmount), "PackageManager: BLOCKS approve failed");

        // Attempt to add liquidity with comprehensive error handling
        try router.addLiquidity(
            address(shareToken),
            address(usdt),
            blocksAmount,
            usdtAmount,
            minBLOCKS,
            minUSDT,
            address(this),
            block.timestamp + deadlineWindow
        ) returns (uint256 actualShareToken, uint256 actualUSDT, uint256 liquidityTokens) {
            // Verify liquidity was actually added
            require(liquidityTokens > 0, "PackageManager: No liquidity tokens received");

            // Emit success event
            emit LiquidityAdded(
                user,
                packageId,
                blocksAmount,
                usdtAmount,
                liquidityTokens,
                actualShareToken,
                actualUSDT
            );

            return liquidityTokens;
        } catch Error(string memory reason) {
            // Handle known errors with fallback mechanism
            _handleLiquidityFailure(user, packageId, usdtAmount, reason);
            return 0;
        } catch (bytes memory lowLevelData) {
            // Handle low-level errors
            string memory reason = lowLevelData.length > 0
                ? string(lowLevelData)
                : "Unknown low-level error";
            _handleLiquidityFailure(user, packageId, usdtAmount, reason);
            return 0;
        }
    }

    /**
     * @dev Internal function to handle liquidity addition failures
     * @param user User address
     * @param packageId Package ID
     * @param usdtAmount USDT amount that failed to be added
     * @param reason Failure reason
     */
    function _handleLiquidityFailure(
        address user,
        uint256 packageId,
        uint256 usdtAmount,
        string memory reason
    ) internal {
        // Fallback: send USDT to treasury instead of adding to liquidity
        usdt.safeTransfer(treasury, usdtAmount);

        // Emit failure event for transparency and monitoring
        emit LiquidityAdditionFailed(user, packageId, usdtAmount, reason);
    }

    /**
     * @dev Admin function to update slippage tolerance
     * @param newTolerance New slippage tolerance in basis points (e.g., 500 = 5%)
     */
    function setSlippageTolerance(uint256 newTolerance) external onlyAdmin {
        require(newTolerance <= 1000, "PackageManager: Slippage tolerance too high"); // Max 10%
        require(newTolerance >= 100, "PackageManager: Slippage tolerance too low"); // Min 1%
        uint256 oldTolerance = slippageTolerance;
        slippageTolerance = newTolerance;
        emit SlippageToleranceUpdated(oldTolerance, newTolerance);
    }

    // Event for slippage tolerance updates
    event SlippageToleranceUpdated(uint256 oldTolerance, uint256 newTolerance);
}
