// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @dev Interface for SwapTaxManager integration
 */
interface ISwapTaxManager {
    function buckets(bytes32 key) external view returns (uint16 rateBps, address recipient);
}

/**
 * @title BLOCKS
 * @dev ERC20 token representing BlockCoop Sacco Share Token with DEX swap taxes.
 *      Integrates with SwapTaxManager for configurable buy/sell taxes on AMM trades.
 */
contract BLOCKS is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant TAX_MANAGER_ROLE = keccak256("TAX_MANAGER_ROLE");

    // Tax bucket keys for SwapTaxManager integration
    bytes32 public constant BUY_TAX_KEY = keccak256("BUY");
    bytes32 public constant SELL_TAX_KEY = keccak256("SELL");

    ISwapTaxManager public swapTaxManager;

    // AMM pair tracking
    mapping(address => bool) public isAMM;

    // Events
    event AMMStatusUpdated(address indexed pair, bool isAMM);
    event SwapTaxManagerUpdated(address indexed oldManager, address indexed newManager);
    event SwapTaxApplied(bytes32 indexed taxKey, address indexed from, address indexed to, uint256 taxAmount);

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address _swapTaxManager
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        swapTaxManager = ISwapTaxManager(_swapTaxManager);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Set AMM status for a pair address
     * @param pair The pair address to update
     * @param _isAMM Whether the address is an AMM pair
     */
    function setAMMStatus(address pair, bool _isAMM) external onlyRole(TAX_MANAGER_ROLE) {
        require(pair != address(0), "BLOCKS: Invalid pair address");
        isAMM[pair] = _isAMM;
        emit AMMStatusUpdated(pair, _isAMM);
    }

    /**
     * @dev Update the SwapTaxManager contract address
     * @param _swapTaxManager New SwapTaxManager address
     */
    function setSwapTaxManager(address _swapTaxManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_swapTaxManager != address(0), "BLOCKS: Invalid tax manager");
        address oldManager = address(swapTaxManager);
        swapTaxManager = ISwapTaxManager(_swapTaxManager);
        emit SwapTaxManagerUpdated(oldManager, _swapTaxManager);
    }

    /**
     * @dev Override transfer to apply DEX taxes
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = _msgSender();
        uint256 transferAmount = _calculateTransferAmount(owner, to, amount);
        _transfer(owner, to, transferAmount);
        return true;
    }

    /**
     * @dev Override transferFrom to apply DEX taxes
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        uint256 transferAmount = _calculateTransferAmount(from, to, amount);
        _transfer(from, to, transferAmount);
        return true;
    }

    /**
     * @dev Calculate transfer amount after applying DEX taxes
     * @param from Transfer sender
     * @param to Transfer recipient
     * @param amount Original transfer amount
     * @return Net amount after tax deduction
     */
    function _calculateTransferAmount(address from, address to, uint256 amount) internal returns (uint256) {
        // Apply buy tax (when buying from AMM)
        if (isAMM[from] && to != address(0)) {
            return _applyTax(BUY_TAX_KEY, from, to, amount);
        }
        // Apply sell tax (when selling to AMM)
        else if (isAMM[to] && from != address(0)) {
            return _applyTax(SELL_TAX_KEY, from, to, amount);
        }

        return amount;
    }

    /**
     * @dev Internal function to apply swap tax
     * @param taxKey The tax bucket key (BUY_TAX_KEY or SELL_TAX_KEY)
     * @param from Transfer sender
     * @param to Transfer recipient
     * @param amount Original transfer amount
     * @return Net amount after tax deduction
     */
    function _applyTax(bytes32 taxKey, address from, address to, uint256 amount) internal returns (uint256) {
        if (address(swapTaxManager) == address(0)) {
            return amount;
        }

        (uint16 rateBps, address recipient) = swapTaxManager.buckets(taxKey);

        if (rateBps > 0 && recipient != address(0)) {
            uint256 taxAmount = (amount * rateBps) / 10_000;
            if (taxAmount > 0) {
                // Transfer tax directly to recipient
                _transfer(from, recipient, taxAmount);
                emit SwapTaxApplied(taxKey, from, to, taxAmount);
                return amount - taxAmount;
            }
        }

        return amount;
    }
}

/**
 * @title BLOCKS_LP
 * @dev ERC20 token representing BlockCoop Sacco LP Token. Minted on purchase and burnable.
 */
contract BLOCKS_LP is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(string memory name, string memory symbol, address admin) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
    }
}

/**
 * @title VestingVault
 * @dev Per-user linear vesting with cliff, uses Schedule per user.
 */
contract VestingVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant LOCKER_ROLE = keccak256("LOCKER_ROLE");

    struct Schedule {
        uint64 cliff;
        uint64 duration;
        uint256 start;
    }

    BLOCKS public immutable shareToken;
    mapping(address => uint256) public totalLocked;
    mapping(address => uint256) public released;
    mapping(address => Schedule) public userSchedule;

    event Locked(address indexed user, uint256 amount, uint64 cliff, uint64 duration);
    event Claimed(address indexed user, uint256 amount);

    constructor(address shareToken_, address admin) {
        shareToken = BLOCKS(shareToken_);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function lock(
        address user,
        uint256 amount,
        uint64 cliff,
        uint64 duration
    ) external onlyRole(LOCKER_ROLE) {
        // set or override per-user schedule
        userSchedule[user] = Schedule(cliff, duration, block.timestamp);
        totalLocked[user] += amount;
        // Note: Tokens should already be minted to this contract by the caller (PackageManager)
        // No need to mint here - just track the vesting schedule
        emit Locked(user, amount, cliff, duration);
    }

    function claim() external nonReentrant {
        uint256 vested = vestedAmount(msg.sender);
        uint256 unreleased = vested - released[msg.sender];
        require(unreleased > 0, "Nothing to claim");

        released[msg.sender] += unreleased;
        IERC20(address(shareToken)).safeTransfer(msg.sender, unreleased);
        emit Claimed(msg.sender, unreleased);
    }

    // Allow anyone to trigger a claim on behalf of a user; funds always go to the user
    function claimFor(address user) external nonReentrant {
        require(user != address(0), "Invalid user");
        uint256 vested = vestedAmount(user);
        uint256 unreleased = vested - released[user];
        require(unreleased > 0, "Nothing to claim");

        released[user] += unreleased;
        IERC20(address(shareToken)).safeTransfer(user, unreleased);
        emit Claimed(user, unreleased);
    }

    function vestedAmount(address user) public view returns (uint256) {
        Schedule memory s = userSchedule[user];
        uint256 startCliff = s.start + s.cliff;
        if (block.timestamp < startCliff) return 0;
        uint256 total = totalLocked[user];
        uint256 elapsed = block.timestamp - startCliff;
        if (elapsed >= s.duration) return total;
        return (total * elapsed) / s.duration;
    }
}

/**
 * @title SwapTaxManager
 * @dev Configurable tax buckets and recipients for AMM trades.
 */
contract SwapTaxManager is AccessControl {
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct TaxBucket { uint16 rateBps; address recipient; }
    mapping(bytes32 => TaxBucket) public buckets;

    event BucketSet(bytes32 indexed key, uint16 rateBps, address recipient);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setBucket(bytes32 key, uint16 rateBps, address recipient) external onlyRole(MANAGER_ROLE) {
        require(rateBps <= 10000, "Rate too high");
        buckets[key] = TaxBucket(rateBps, recipient);
        emit BucketSet(key, rateBps, recipient);
    }

    function getTaxBucket(bytes32 key) external view returns (TaxBucket memory) {
        return buckets[key];
    }
}

/**
 * @dev Minimal PancakeRouter interface for addLiquidity
 */
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
}

/**
 * @title USDTTestToken
 * @dev 18-decimal USDT test token for BlockCoop V2 architecture
 * @notice This contract implements a test USDT token with 18 decimals instead of the standard 6 decimals
 *         to align with the BlockCoop V2 modular architecture requirements
 */
contract USDTTestToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        string memory name,
        string memory symbol,
        address admin
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);

        // Mint initial supply to admin (1 billion USDT with 18 decimals)
        _mint(admin, 1_000_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    // Override decimals to return 18 instead of default 18 (explicit for clarity)
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}

/**
 * @notice The old PackageManager contract has been removed from this file.
 * @dev Use the standalone PackageManagerV2_1.sol contract instead, which provides:
 *      - Enhanced view functions for portfolio data (getUserPackages, getUserPackageCount, getPackagesByOwner)
 *      - Better user tracking and statistics
 *      - Improved gas efficiency with optimized storage
 *      - Backward compatibility with existing functionality
 *      - Event-based fallback for frontend integration
 *
 * This file now contains only the essential supporting contracts:
 * - USDTTestToken: 18-decimal USDT test token for V2 architecture
 * - BLOCKS: ERC20 token for BlockCoop Sacco Share Token
 * - BLOCKS_LP: ERC20 token for BlockCoop Sacco LP Token
 * - VestingVault: Linear vesting with cliff functionality
 * - SwapTaxManager: Configurable tax buckets for AMM trades
 * - IPancakeRouter: Interface for PancakeSwap integration
 */

