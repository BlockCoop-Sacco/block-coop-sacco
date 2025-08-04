// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPancakeRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    function factory() external pure returns (address);
}

interface IPancakeFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/**
 * @title SecondaryMarket
 * @dev Provides bidirectional USDT↔BLOCKS token swapping functionality
 * @notice This contract enables users to swap between USDT and BLOCKS tokens
 *         using PancakeSwap DEX with configurable target pricing and fees
 */
contract SecondaryMarket is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Token contracts
    IERC20 public immutable usdtToken;
    IERC20 public immutable token; // BLOCKS token
    
    // DEX integration
    IPancakeRouter public immutable router;
    IPancakeFactory public immutable factory;
    
    // Fee and pricing
    address public feeRecipient;
    uint256 public targetPrice; // Target price in USDT per BLOCKS (18 decimals)
    uint256 public swapFee; // Fee in basis points (e.g., 100 = 1%)
    
    // Constants
    uint256 private constant MAX_FEE = 1000; // 10% max fee
    uint256 private constant FEE_DENOMINATOR = 10000;

    // Events
    event TokensSwapped(
        address indexed user,
        uint256 blocksAmount,
        uint256 usdtAmount
    );
    
    event TargetPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event SwapFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    /**
     * @dev Constructor
     * @param _usdtToken Address of the USDT token contract
     * @param _blocksToken Address of the BLOCKS token contract
     * @param _router Address of the PancakeSwap router
     * @param _factory Address of the PancakeSwap factory
     * @param _feeRecipient Address to receive swap fees
     * @param admin Address of the admin
     * @param _targetPrice Initial target price (USDT per BLOCKS, 18 decimals)
     */
    constructor(
        address _usdtToken,
        address _blocksToken,
        address _router,
        address _factory,
        address _feeRecipient,
        address admin,
        uint256 _targetPrice
    ) {
        require(_usdtToken != address(0), "SecondaryMarket: Invalid USDT token address");
        require(_blocksToken != address(0), "SecondaryMarket: Invalid BLOCKS token address");
        require(_router != address(0), "SecondaryMarket: Invalid router address");
        require(_factory != address(0), "SecondaryMarket: Invalid factory address");
        require(_feeRecipient != address(0), "SecondaryMarket: Invalid fee recipient address");
        require(admin != address(0), "SecondaryMarket: Invalid admin address");
        require(_targetPrice > 0, "SecondaryMarket: Invalid target price");

        usdtToken = IERC20(_usdtToken);
        token = IERC20(_blocksToken);
        router = IPancakeRouter(_router);
        factory = IPancakeFactory(_factory);
        feeRecipient = _feeRecipient;
        targetPrice = _targetPrice;
        swapFee = 100; // 1% default fee

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    /**
     * @dev Swap USDT for BLOCKS tokens
     * @param usdtAmount Amount of USDT to swap
     * @param minBlocksAmount Minimum amount of BLOCKS to receive
     */
    function swapUSDTForBLOCKS(uint256 usdtAmount, uint256 minBlocksAmount) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(usdtAmount > 0, "SecondaryMarket: Invalid USDT amount");
        require(minBlocksAmount > 0, "SecondaryMarket: Invalid minimum BLOCKS amount");

        // Transfer USDT from user
        usdtToken.safeTransferFrom(msg.sender, address(this), usdtAmount);

        // Calculate fee
        uint256 feeAmount = (usdtAmount * swapFee) / FEE_DENOMINATOR;
        uint256 swapAmount = usdtAmount - feeAmount;

        // Transfer fee to fee recipient
        if (feeAmount > 0) {
            usdtToken.safeTransfer(feeRecipient, feeAmount);
        }

        // Perform swap via DEX
        address[] memory path = new address[](2);
        path[0] = address(usdtToken);
        path[1] = address(token);

        // Approve router to spend USDT
        IERC20(address(usdtToken)).forceApprove(address(router), swapAmount);

        // Execute swap
        uint[] memory amounts = router.swapExactTokensForTokens(
            swapAmount,
            minBlocksAmount,
            path,
            msg.sender,
            block.timestamp + 300 // 5 minute deadline
        );

        emit TokensSwapped(msg.sender, amounts[1], usdtAmount);
    }

    /**
     * @dev Swap BLOCKS for USDT tokens
     * @param blocksAmount Amount of BLOCKS to swap
     * @param minUsdtAmount Minimum amount of USDT to receive
     */
    function swapBLOCKSForUSDT(uint256 blocksAmount, uint256 minUsdtAmount) 
        external 
        whenNotPaused 
        nonReentrant 
    {
        require(blocksAmount > 0, "SecondaryMarket: Invalid BLOCKS amount");
        require(minUsdtAmount > 0, "SecondaryMarket: Invalid minimum USDT amount");

        // Transfer BLOCKS from user
        token.safeTransferFrom(msg.sender, address(this), blocksAmount);

        // Perform swap via DEX
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = address(usdtToken);

        // Approve router to spend BLOCKS
        IERC20(address(token)).forceApprove(address(router), blocksAmount);

        // Execute swap
        uint[] memory amounts = router.swapExactTokensForTokens(
            blocksAmount,
            minUsdtAmount,
            path,
            address(this),
            block.timestamp + 300 // 5 minute deadline
        );

        // Calculate fee on received USDT
        uint256 receivedUsdt = amounts[1];
        uint256 feeAmount = (receivedUsdt * swapFee) / FEE_DENOMINATOR;
        uint256 userAmount = receivedUsdt - feeAmount;

        // Transfer fee to fee recipient
        if (feeAmount > 0) {
            usdtToken.safeTransfer(feeRecipient, feeAmount);
        }

        // Transfer remaining USDT to user
        usdtToken.safeTransfer(msg.sender, userAmount);

        emit TokensSwapped(msg.sender, blocksAmount, userAmount);
    }

    /**
     * @dev Get swap quote for BLOCKS to USDT
     * @param blocksAmount Amount of BLOCKS to quote
     * @return usdtAmount Estimated USDT amount (after fees)
     */
    function getSwapQuote(uint256 blocksAmount) external view returns (uint256 usdtAmount) {
        if (blocksAmount == 0) return 0;

        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = address(usdtToken);

        try router.getAmountsOut(blocksAmount, path) returns (uint[] memory amounts) {
            uint256 grossUsdt = amounts[1];
            uint256 feeAmount = (grossUsdt * swapFee) / FEE_DENOMINATOR;
            usdtAmount = grossUsdt - feeAmount;
        } catch {
            // Fallback to target price if DEX quote fails
            uint256 grossUsdt = (blocksAmount * targetPrice) / 1e18;
            uint256 feeAmount = (grossUsdt * swapFee) / FEE_DENOMINATOR;
            usdtAmount = grossUsdt - feeAmount;
        }
    }

    /**
     * @dev Update target price (admin only)
     * @param newTargetPrice New target price (USDT per BLOCKS, 18 decimals)
     */
    function updateTargetPrice(uint256 newTargetPrice) external onlyRole(ADMIN_ROLE) {
        require(newTargetPrice > 0, "SecondaryMarket: Invalid target price");
        uint256 oldPrice = targetPrice;
        targetPrice = newTargetPrice;
        emit TargetPriceUpdated(oldPrice, newTargetPrice);
    }

    /**
     * @dev Update swap fee (admin only)
     * @param newSwapFee New swap fee in basis points
     */
    function updateSwapFee(uint256 newSwapFee) external onlyRole(ADMIN_ROLE) {
        require(newSwapFee <= MAX_FEE, "SecondaryMarket: Fee too high");
        uint256 oldFee = swapFee;
        swapFee = newSwapFee;
        emit SwapFeeUpdated(oldFee, newSwapFee);
    }

    /**
     * @dev Update fee recipient (admin only)
     * @param newFeeRecipient New fee recipient address
     */
    function updateFeeRecipient(address newFeeRecipient) external onlyRole(ADMIN_ROLE) {
        require(newFeeRecipient != address(0), "SecondaryMarket: Invalid fee recipient");
        address oldRecipient = feeRecipient;
        feeRecipient = newFeeRecipient;
        emit FeeRecipientUpdated(oldRecipient, newFeeRecipient);
    }

    /**
     * @dev Pause the contract (admin only)
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Emergency function to withdraw stuck tokens (admin only)
     * @param tokenAddress Address of the token to withdraw
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address tokenAddress, uint256 amount) external onlyRole(ADMIN_ROLE) {
        IERC20(tokenAddress).safeTransfer(msg.sender, amount);
    }
}
