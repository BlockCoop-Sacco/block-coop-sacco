// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title DividendDistributor
 * @dev Distributes dividends to BLOCKS token holders proportionally to their holdings
 * @notice This contract allows for dividend distribution in any ERC20 token (typically USDT)
 *         to BLOCKS token holders based on their proportional ownership
 */
contract DividendDistributor is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // The BLOCKS token contract
    IERC20 public immutable token;
    
    // The dividend token (typically USDT)
    IERC20 public immutable dividendToken;

    // Total dividends distributed
    uint256 public totalDividendsDistributed;

    // Dividend tracking per user
    mapping(address => uint256) private _dividendsWithdrawn;
    mapping(address => uint256) private _lastDividendPoints;

    // Global dividend tracking
    uint256 private _totalDividendPoints;
    uint256 private constant PRECISION = 1e18;

    // Events
    event DividendDistributed(uint256 amount, uint256 totalSupply);
    event DividendClaimed(address indexed user, uint256 amount);

    /**
     * @dev Constructor
     * @param _blocksToken Address of the BLOCKS token contract
     * @param _dividendToken Address of the dividend token contract (typically USDT)
     * @param admin Address of the admin
     */
    constructor(
        address _blocksToken,
        address _dividendToken,
        address admin
    ) {
        require(_blocksToken != address(0), "DividendDistributor: Invalid BLOCKS token address");
        require(_dividendToken != address(0), "DividendDistributor: Invalid dividend token address");
        require(admin != address(0), "DividendDistributor: Invalid admin address");

        token = IERC20(_blocksToken);
        dividendToken = IERC20(_dividendToken);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DISTRIBUTOR_ROLE, admin);
    }

    /**
     * @dev Distribute dividends to all BLOCKS token holders
     * @param amount Amount of dividend tokens to distribute
     */
    function distributeDividends(uint256 amount) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused nonReentrant {
        require(amount > 0, "DividendDistributor: Amount must be greater than 0");

        uint256 totalSupply = token.totalSupply();
        require(totalSupply > 0, "DividendDistributor: No tokens in circulation");

        // Transfer dividend tokens from sender to this contract
        dividendToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update global dividend points
        _totalDividendPoints += (amount * PRECISION) / totalSupply;
        totalDividendsDistributed += amount;

        emit DividendDistributed(amount, totalSupply);
    }

    /**
     * @dev Claim pending dividends for the caller
     */
    function claimDividend() external whenNotPaused nonReentrant {
        uint256 pendingDividends = getPendingDividends(msg.sender);
        require(pendingDividends > 0, "DividendDistributor: No dividends to claim");

        // Update user's last dividend points
        _lastDividendPoints[msg.sender] = _totalDividendPoints;
        _dividendsWithdrawn[msg.sender] += pendingDividends;

        // Transfer dividends to user
        dividendToken.safeTransfer(msg.sender, pendingDividends);

        emit DividendClaimed(msg.sender, pendingDividends);
    }

    /**
     * @dev Get pending dividends for a user
     * @param user Address of the user
     * @return Pending dividend amount
     */
    function getPendingDividends(address user) public view returns (uint256) {
        uint256 userBalance = token.balanceOf(user);
        if (userBalance == 0) {
            return 0;
        }

        uint256 newDividendPoints = _totalDividendPoints - _lastDividendPoints[user];
        return (userBalance * newDividendPoints) / PRECISION;
    }

    /**
     * @dev Get total dividends withdrawn by a user
     * @param user Address of the user
     * @return Total dividends withdrawn
     */
    function getDividendsWithdrawn(address user) external view returns (uint256) {
        return _dividendsWithdrawn[user];
    }

    /**
     * @dev Get total dividends earned by a user (claimed + pending)
     * @param user Address of the user
     * @return Total dividends earned
     */
    function getTotalDividendsEarned(address user) external view returns (uint256) {
        return _dividendsWithdrawn[user] + getPendingDividends(user);
    }

    /**
     * @dev Get dividend distribution statistics
     * @return totalDistributed Total dividends distributed
     * @return totalClaimed Total dividends claimed by all users
     * @return totalPending Total pending dividends across all users
     */
    function getDividendStats() external view returns (
        uint256 totalDistributed,
        uint256 totalClaimed,
        uint256 totalPending
    ) {
        totalDistributed = totalDividendsDistributed;
        totalClaimed = totalDistributed - dividendToken.balanceOf(address(this));
        totalPending = dividendToken.balanceOf(address(this));
    }

    /**
     * @dev Emergency function to withdraw stuck tokens (admin only)
     * @param tokenAddress Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddress != address(dividendToken), "DividendDistributor: Cannot withdraw dividend tokens");
        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
    }

    /**
     * @dev Pause the contract (admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract (admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Update user's dividend tracking when their token balance changes
     * @param user Address of the user
     * @notice This should be called by the BLOCKS token contract on transfers
     */
    function updateDividendTracker(address user) external {
        require(msg.sender == address(token), "DividendDistributor: Only BLOCKS token can call this");
        
        // Claim any pending dividends before balance change
        uint256 pendingDividends = getPendingDividends(user);
        if (pendingDividends > 0) {
            _lastDividendPoints[user] = _totalDividendPoints;
            _dividendsWithdrawn[user] += pendingDividends;
            dividendToken.safeTransfer(user, pendingDividends);
            emit DividendClaimed(user, pendingDividends);
        } else {
            // Just update the tracking point
            _lastDividendPoints[user] = _totalDividendPoints;
        }
    }
}
