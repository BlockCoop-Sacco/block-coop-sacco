// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BLOCKSStakingV2
 * @dev Advanced staking contract for BlockCoop V2 ecosystem
 * @notice Allows users to stake BLOCKS tokens and earn USDT rewards
 *         Features multiple pools with different lock periods and APYs
 *         Integrates with BlockCoop V2 modular architecture
 */
contract BLOCKSStakingV2 is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant REWARD_DISTRIBUTOR_ROLE = keccak256("REWARD_DISTRIBUTOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");

    // Precision for calculations
    uint256 private constant PRECISION = 1e18;
    uint256 private constant BASIS_POINTS = 10000;

    // Tokens
    IERC20 public immutable stakingToken;  // BLOCKS token
    IERC20 public immutable rewardToken;   // USDT token

    // Global staking statistics
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public globalRewardRate; // Rewards per second per token staked

    // Staking pool structure
    struct StakingPool {
        string name;
        uint256 lockPeriod;        // Lock period in seconds
        uint256 apyBasisPoints;    // APY in basis points (e.g., 1200 = 12%)
        uint256 minStake;          // Minimum stake amount
        uint256 maxStake;          // Maximum stake amount per user
        uint256 totalStaked;       // Total amount staked in this pool
        uint256 rewardMultiplier;  // Multiplier for rewards (basis points)
        bool isActive;             // Whether the pool is active
        uint256 emergencyExitPenalty; // Penalty for emergency exit (basis points)
    }

    // User stake structure
    struct UserStake {
        uint256 amount;            // Amount staked
        uint256 stakedAt;          // Timestamp when staked
        uint256 lockEndTime;       // When the lock period ends
        uint256 lastRewardClaim;   // Last time rewards were claimed
        uint256 accumulatedRewards; // Accumulated unclaimed rewards
        bool isActive;             // Whether the stake is active
    }

    // Storage
    StakingPool[] public stakingPools;
    mapping(uint256 => mapping(address => UserStake)) public userStakes; // poolId => user => stake
    mapping(address => uint256[]) public userPoolIds; // user => array of pool IDs they've staked in
    mapping(address => uint256) public totalUserStaked; // user => total amount staked across all pools

    // Reward tracking
    mapping(uint256 => uint256) public poolRewardPerTokenStored; // poolId => reward per token
    mapping(uint256 => uint256) public poolLastUpdateTime; // poolId => last update time
    mapping(uint256 => mapping(address => uint256)) public userRewardPerTokenPaid; // poolId => user => paid amount

    // Events
    event PoolCreated(uint256 indexed poolId, string name, uint256 lockPeriod, uint256 apyBasisPoints);
    event PoolUpdated(uint256 indexed poolId, uint256 apyBasisPoints, bool isActive);
    event Staked(address indexed user, uint256 indexed poolId, uint256 amount, uint256 lockEndTime);
    event Unstaked(address indexed user, uint256 indexed poolId, uint256 amount, uint256 penalty);
    event RewardsClaimed(address indexed user, uint256 indexed poolId, uint256 amount);
    event RewardsDistributed(uint256 amount, uint256 newRewardRate);
    event EmergencyUnstake(address indexed user, uint256 indexed poolId, uint256 amount, uint256 penalty);

    constructor(
        address _stakingToken,
        address _rewardToken,
        address admin
    ) {
        require(_stakingToken != address(0), "BLOCKSStakingV2: Invalid staking token");
        require(_rewardToken != address(0), "BLOCKSStakingV2: Invalid reward token");
        require(admin != address(0), "BLOCKSStakingV2: Invalid admin");

        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POOL_MANAGER_ROLE, admin);
        _grantRole(REWARD_DISTRIBUTOR_ROLE, admin);
        _grantRole(EMERGENCY_ROLE, admin);

        // Create default staking pools
        _createDefaultPools();
    }

    /**
     * @dev Create default staking pools
     */
    function _createDefaultPools() private {
        // Flexible Pool (0% lock, 8% APY)
        stakingPools.push(StakingPool({
            name: "Flexible Staking",
            lockPeriod: 0,
            apyBasisPoints: 800,  // 8%
            minStake: 1e18,       // 1 BLOCKS
            maxStake: 1000000e18, // 1M BLOCKS
            totalStaked: 0,
            rewardMultiplier: 10000, // 100% (no bonus)
            isActive: true,
            emergencyExitPenalty: 0 // No penalty for flexible
        }));

        // 30-Day Lock Pool (12% APY)
        stakingPools.push(StakingPool({
            name: "30-Day Lock",
            lockPeriod: 30 days,
            apyBasisPoints: 1200, // 12%
            minStake: 10e18,      // 10 BLOCKS
            maxStake: 1000000e18, // 1M BLOCKS
            totalStaked: 0,
            rewardMultiplier: 11500, // 115% (15% bonus)
            isActive: true,
            emergencyExitPenalty: 500 // 5% penalty
        }));

        // 90-Day Lock Pool (18% APY)
        stakingPools.push(StakingPool({
            name: "90-Day Lock",
            lockPeriod: 90 days,
            apyBasisPoints: 1800, // 18%
            minStake: 50e18,      // 50 BLOCKS
            maxStake: 1000000e18, // 1M BLOCKS
            totalStaked: 0,
            rewardMultiplier: 13000, // 130% (30% bonus)
            isActive: true,
            emergencyExitPenalty: 1000 // 10% penalty
        }));

        // 1-Year Lock Pool (25% APY)
        stakingPools.push(StakingPool({
            name: "1-Year Lock",
            lockPeriod: 365 days,
            apyBasisPoints: 2500, // 25%
            minStake: 100e18,     // 100 BLOCKS
            maxStake: 1000000e18, // 1M BLOCKS
            totalStaked: 0,
            rewardMultiplier: 15000, // 150% (50% bonus)
            isActive: true,
            emergencyExitPenalty: 2000 // 20% penalty
        }));

        emit PoolCreated(0, "Flexible Staking", 0, 800);
        emit PoolCreated(1, "30-Day Lock", 30 days, 1200);
        emit PoolCreated(2, "90-Day Lock", 90 days, 1800);
        emit PoolCreated(3, "1-Year Lock", 365 days, 2500);
    }

    /**
     * @dev Get the number of staking pools
     */
    function poolCount() external view returns (uint256) {
        return stakingPools.length;
    }

    /**
     * @dev Get user's active pool IDs
     */
    function getUserPoolIds(address user) external view returns (uint256[] memory) {
        return userPoolIds[user];
    }

    /**
     * @dev Check if user has an active stake in a pool
     */
    function hasActiveStake(address user, uint256 poolId) external view returns (bool) {
        return userStakes[poolId][user].isActive;
    }

    /**
     * @dev Get user's stake information for a specific pool
     */
    function getUserStake(address user, uint256 poolId) external view returns (
        uint256 amount,
        uint256 stakedAt,
        uint256 lockEndTime,
        uint256 pendingRewards,
        bool isLocked
    ) {
        UserStake memory stake = userStakes[poolId][user];
        amount = stake.amount;
        stakedAt = stake.stakedAt;
        lockEndTime = stake.lockEndTime;
        pendingRewards = _calculatePendingRewards(user, poolId);
        isLocked = block.timestamp < stake.lockEndTime;
    }

    /**
     * @dev Calculate pending rewards for a user in a specific pool
     */
    function _calculatePendingRewards(address user, uint256 poolId) private view returns (uint256) {
        UserStake memory stake = userStakes[poolId][user];
        if (!stake.isActive || stake.amount == 0) {
            return 0;
        }

        StakingPool memory pool = stakingPools[poolId];
        uint256 timeStaked = block.timestamp - stake.lastRewardClaim;
        
        // Calculate rewards based on APY and time staked
        uint256 annualReward = (stake.amount * pool.apyBasisPoints) / BASIS_POINTS;
        uint256 rewardForPeriod = (annualReward * timeStaked) / 365 days;
        
        // Apply pool multiplier
        rewardForPeriod = (rewardForPeriod * pool.rewardMultiplier) / BASIS_POINTS;
        
        return stake.accumulatedRewards + rewardForPeriod;
    }

    /**
     * @dev Get pending rewards for a user in a specific pool
     */
    function getPendingRewards(address user, uint256 poolId) external view returns (uint256) {
        return _calculatePendingRewards(user, poolId);
    }

    /**
     * @dev Stake tokens in a specific pool
     */
    function stake(uint256 poolId, uint256 amount) external whenNotPaused nonReentrant {
        require(poolId < stakingPools.length, "BLOCKSStakingV2: Invalid pool ID");
        require(amount > 0, "BLOCKSStakingV2: Amount must be greater than 0");

        StakingPool storage pool = stakingPools[poolId];
        require(pool.isActive, "BLOCKSStakingV2: Pool is not active");
        require(amount >= pool.minStake, "BLOCKSStakingV2: Amount below minimum stake");

        UserStake storage userStake = userStakes[poolId][msg.sender];
        require(userStake.amount + amount <= pool.maxStake, "BLOCKSStakingV2: Amount exceeds maximum stake");

        // If user already has a stake in this pool, claim pending rewards first
        if (userStake.isActive) {
            _claimRewards(msg.sender, poolId);
        } else {
            // Add pool to user's active pools
            userPoolIds[msg.sender].push(poolId);
        }

        // Transfer tokens from user to contract
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Update user stake
        userStake.amount += amount;
        userStake.stakedAt = block.timestamp;
        userStake.lockEndTime = block.timestamp + pool.lockPeriod;
        userStake.lastRewardClaim = block.timestamp;
        userStake.isActive = true;

        // Update pool and global statistics
        pool.totalStaked += amount;
        totalStaked += amount;
        totalUserStaked[msg.sender] += amount;

        emit Staked(msg.sender, poolId, amount, userStake.lockEndTime);
    }

    /**
     * @dev Unstake tokens from a specific pool
     */
    function unstake(uint256 poolId, uint256 amount) external whenNotPaused nonReentrant {
        require(poolId < stakingPools.length, "BLOCKSStakingV2: Invalid pool ID");
        require(amount > 0, "BLOCKSStakingV2: Amount must be greater than 0");

        UserStake storage userStake = userStakes[poolId][msg.sender];
        require(userStake.isActive, "BLOCKSStakingV2: No active stake");
        require(userStake.amount >= amount, "BLOCKSStakingV2: Insufficient staked amount");
        require(block.timestamp >= userStake.lockEndTime, "BLOCKSStakingV2: Stake is still locked");

        // Claim pending rewards first
        _claimRewards(msg.sender, poolId);

        // Update user stake
        userStake.amount -= amount;
        if (userStake.amount == 0) {
            userStake.isActive = false;
            _removePoolFromUser(msg.sender, poolId);
        }

        // Update pool and global statistics
        stakingPools[poolId].totalStaked -= amount;
        totalStaked -= amount;
        totalUserStaked[msg.sender] -= amount;

        // Transfer tokens back to user
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, poolId, amount, 0);
    }

    /**
     * @dev Emergency unstake with penalty (for locked stakes)
     */
    function emergencyUnstake(uint256 poolId, uint256 amount) external whenNotPaused nonReentrant {
        require(poolId < stakingPools.length, "BLOCKSStakingV2: Invalid pool ID");
        require(amount > 0, "BLOCKSStakingV2: Amount must be greater than 0");

        UserStake storage userStake = userStakes[poolId][msg.sender];
        require(userStake.isActive, "BLOCKSStakingV2: No active stake");
        require(userStake.amount >= amount, "BLOCKSStakingV2: Insufficient staked amount");

        StakingPool storage pool = stakingPools[poolId];

        // Calculate penalty
        uint256 penalty = 0;
        if (block.timestamp < userStake.lockEndTime) {
            penalty = (amount * pool.emergencyExitPenalty) / BASIS_POINTS;
        }

        // Claim pending rewards first
        _claimRewards(msg.sender, poolId);

        // Update user stake
        userStake.amount -= amount;
        if (userStake.amount == 0) {
            userStake.isActive = false;
            _removePoolFromUser(msg.sender, poolId);
        }

        // Update pool and global statistics
        pool.totalStaked -= amount;
        totalStaked -= amount;
        totalUserStaked[msg.sender] -= amount;

        // Transfer tokens back to user (minus penalty)
        uint256 amountToReturn = amount - penalty;
        if (amountToReturn > 0) {
            stakingToken.safeTransfer(msg.sender, amountToReturn);
        }

        // Send penalty to treasury (burn or send to admin)
        if (penalty > 0) {
            // For now, keep penalty in contract as additional rewards
            // Could be modified to send to treasury address
        }

        emit EmergencyUnstake(msg.sender, poolId, amount, penalty);
    }

    /**
     * @dev Claim rewards from a specific pool
     */
    function claimRewards(uint256 poolId) external whenNotPaused nonReentrant {
        require(poolId < stakingPools.length, "BLOCKSStakingV2: Invalid pool ID");
        _claimRewards(msg.sender, poolId);
    }

    /**
     * @dev Internal function to claim rewards
     */
    function _claimRewards(address user, uint256 poolId) private {
        uint256 pendingRewards = _calculatePendingRewards(user, poolId);
        if (pendingRewards == 0) {
            return;
        }

        UserStake storage userStake = userStakes[poolId][user];
        userStake.lastRewardClaim = block.timestamp;
        userStake.accumulatedRewards = 0;

        // Transfer rewards to user
        rewardToken.safeTransfer(user, pendingRewards);
        totalRewardsDistributed += pendingRewards;

        emit RewardsClaimed(user, poolId, pendingRewards);
    }

    /**
     * @dev Remove pool from user's active pools array
     */
    function _removePoolFromUser(address user, uint256 poolId) private {
        uint256[] storage pools = userPoolIds[user];
        for (uint256 i = 0; i < pools.length; i++) {
            if (pools[i] == poolId) {
                pools[i] = pools[pools.length - 1];
                pools.pop();
                break;
            }
        }
    }

    /**
     * @dev Claim rewards from all active pools
     */
    function claimAllRewards() external whenNotPaused nonReentrant {
        uint256[] memory pools = userPoolIds[msg.sender];
        for (uint256 i = 0; i < pools.length; i++) {
            if (userStakes[pools[i]][msg.sender].isActive) {
                _claimRewards(msg.sender, pools[i]);
            }
        }
    }

    /**
     * @dev Get total pending rewards across all pools for a user
     */
    function getTotalPendingRewards(address user) external view returns (uint256) {
        uint256 totalPending = 0;
        uint256[] memory pools = userPoolIds[user];
        for (uint256 i = 0; i < pools.length; i++) {
            if (userStakes[pools[i]][user].isActive) {
                totalPending += _calculatePendingRewards(user, pools[i]);
            }
        }
        return totalPending;
    }

    /**
     * @dev Create a new staking pool (admin only)
     */
    function createPool(
        string memory name,
        uint256 lockPeriod,
        uint256 apyBasisPoints,
        uint256 minStake,
        uint256 maxStake,
        uint256 rewardMultiplier,
        uint256 emergencyExitPenalty
    ) external onlyRole(POOL_MANAGER_ROLE) {
        require(bytes(name).length > 0, "BLOCKSStakingV2: Pool name cannot be empty");
        require(apyBasisPoints <= 10000, "BLOCKSStakingV2: APY cannot exceed 100%");
        require(minStake > 0, "BLOCKSStakingV2: Minimum stake must be greater than 0");
        require(maxStake >= minStake, "BLOCKSStakingV2: Maximum stake must be >= minimum stake");
        require(rewardMultiplier >= BASIS_POINTS, "BLOCKSStakingV2: Reward multiplier must be >= 100%");
        require(emergencyExitPenalty <= 5000, "BLOCKSStakingV2: Emergency exit penalty cannot exceed 50%");

        stakingPools.push(StakingPool({
            name: name,
            lockPeriod: lockPeriod,
            apyBasisPoints: apyBasisPoints,
            minStake: minStake,
            maxStake: maxStake,
            totalStaked: 0,
            rewardMultiplier: rewardMultiplier,
            isActive: true,
            emergencyExitPenalty: emergencyExitPenalty
        }));

        uint256 poolId = stakingPools.length - 1;
        emit PoolCreated(poolId, name, lockPeriod, apyBasisPoints);
    }

    /**
     * @dev Update pool parameters (admin only)
     */
    function updatePool(
        uint256 poolId,
        uint256 apyBasisPoints,
        uint256 rewardMultiplier,
        bool isActive
    ) external onlyRole(POOL_MANAGER_ROLE) {
        require(poolId < stakingPools.length, "BLOCKSStakingV2: Invalid pool ID");
        require(apyBasisPoints <= 10000, "BLOCKSStakingV2: APY cannot exceed 100%");
        require(rewardMultiplier >= BASIS_POINTS, "BLOCKSStakingV2: Reward multiplier must be >= 100%");

        StakingPool storage pool = stakingPools[poolId];
        pool.apyBasisPoints = apyBasisPoints;
        pool.rewardMultiplier = rewardMultiplier;
        pool.isActive = isActive;

        emit PoolUpdated(poolId, apyBasisPoints, isActive);
    }

    /**
     * @dev Distribute rewards to the contract (admin only)
     */
    function distributeRewards(uint256 amount) external onlyRole(REWARD_DISTRIBUTOR_ROLE) {
        require(amount > 0, "BLOCKSStakingV2: Amount must be greater than 0");

        // Transfer reward tokens to this contract
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        emit RewardsDistributed(amount, globalRewardRate);
    }

    /**
     * @dev Emergency withdraw function (admin only)
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(EMERGENCY_ROLE) {
        require(token != address(stakingToken) || amount <= IERC20(stakingToken).balanceOf(address(this)) - totalStaked,
                "BLOCKSStakingV2: Cannot withdraw staked tokens");

        IERC20(token).safeTransfer(msg.sender, amount);
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
     * @dev Get contract statistics
     */
    function getContractStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalRewardsDistributed,
        uint256 _poolCount,
        uint256 _rewardTokenBalance
    ) {
        _totalStaked = totalStaked;
        _totalRewardsDistributed = totalRewardsDistributed;
        _poolCount = stakingPools.length;
        _rewardTokenBalance = rewardToken.balanceOf(address(this));
    }
}
