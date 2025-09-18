// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PackageManagerV2_2.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title GaslessPackageManager
 * @dev Gasless version of PackageManager that works with MinimalForwarder
 */
contract GaslessPackageManager is PackageManagerV2_2, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant PURCHASE_TYPEHASH = keccak256(
        "PurchasePackage(uint256 packageId,uint256 usdtAmount,address referrer,uint256 nonce,uint256 deadline)"
    );

    mapping(address => uint256) private _userNonces;

    event GaslessPurchaseExecuted(
        address indexed buyer,
        uint256 indexed packageId,
        uint256 usdtAmount,
        address indexed referrer,
        uint256 nonce
    );

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
    ) PackageManagerV2_2(
        usdt_,
        share_,
        lp_,
        vault_,
        router_,
        factory_,
        treasury_,
        tax_,
        admin,
        initialGlobalTargetPrice_
    ) EIP712("GaslessPackageManager", "1.0.0") {}

    /**
     * @dev Get the current nonce for a user
     */
    function getUserNonce(address user) public view returns (uint256) {
        return _userNonces[user];
    }

    /**
     * @dev Execute a gasless package purchase
     * @param packageId The ID of the package to purchase
     * @param usdtAmount The amount of USDT to spend
     * @param referrer The referrer address (can be address(0))
     * @param deadline The deadline for this transaction
     * @param signature The signature from the user
     */
    function executeGaslessPurchase(
        uint256 packageId,
        uint256 usdtAmount,
        address referrer,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bool) {
        require(deadline >= block.timestamp, "GaslessPackageManager: transaction expired");
        
        address signer = _verifyPurchaseSignature(
            packageId,
            usdtAmount,
            referrer,
            deadline,
            signature
        );

        require(signer != address(0), "GaslessPackageManager: invalid signature");
        require(_userNonces[signer] == _getPurchaseNonce(packageId, usdtAmount, referrer, deadline), 
                "GaslessPackageManager: invalid nonce");

        _userNonces[signer]++;

        // Execute the purchase using the original purchasePackage function
        _executePurchase(signer, packageId, usdtAmount, referrer);

        emit GaslessPurchaseExecuted(signer, packageId, usdtAmount, referrer, _userNonces[signer] - 1);

        return true;
    }

    /**
     * @dev Execute a gasless package purchase with custom data for the forwarder
     * @param from The user who signed the transaction
     * @param packageId The ID of the package to purchase
     * @param usdtAmount The amount of USDT to spend
     * @param referrer The referrer address (can be address(0))
     * @param deadline The deadline for this transaction
     * @param signature The signature from the user
     */
    function executeGaslessPurchaseFromForwarder(
        address from,
        uint256 packageId,
        uint256 usdtAmount,
        address referrer,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bool) {
        require(deadline >= block.timestamp, "GaslessPackageManager: transaction expired");
        
        address signer = _verifyPurchaseSignature(
            packageId,
            usdtAmount,
            referrer,
            deadline,
            signature
        );

        require(signer == from, "GaslessPackageManager: signer mismatch");
        require(_userNonces[from] == _getPurchaseNonce(packageId, usdtAmount, referrer, deadline), 
                "GaslessPackageManager: invalid nonce");

        _userNonces[from]++;

        // Execute the purchase using the original purchasePackage function
        _executePurchase(from, packageId, usdtAmount, referrer);

        emit GaslessPurchaseExecuted(from, packageId, usdtAmount, referrer, _userNonces[from] - 1);

        return true;
    }

    /**
     * @dev Verify the signature for a gasless purchase
     */
    function _verifyPurchaseSignature(
        uint256 packageId,
        uint256 usdtAmount,
        address referrer,
        uint256 deadline,
        bytes calldata signature
    ) internal view returns (address) {
        bytes32 structHash = keccak256(
            abi.encode(PURCHASE_TYPEHASH, packageId, usdtAmount, referrer, 
                      _getPurchaseNonce(packageId, usdtAmount, referrer, deadline), deadline)
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        return hash.recover(signature);
    }

    /**
     * @dev Get the nonce for a purchase request
     */
    function _getPurchaseNonce(
        uint256 packageId,
        uint256 usdtAmount,
        address referrer,
        uint256 deadline
    ) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(packageId, usdtAmount, referrer, deadline)));
    }

    /**
     * @dev Execute the actual purchase logic
     */
    function _executePurchase(
        address buyer,
        uint256 packageId,
        uint256 usdtAmount,
        address referrer
    ) internal {
        // This will call the internal purchase logic from the parent contract
        // We need to ensure the USDT transfer happens correctly
        require(usdt.transferFrom(buyer, address(this), usdtAmount), "GaslessPackageManager: USDT transfer failed");
        
        // Call the parent contract's purchase logic
        // Note: This is a simplified version - you may need to adapt based on your specific needs
        _processPurchase(buyer, packageId, usdtAmount, referrer);
    }

    /**
     * @dev Process the purchase (this would need to be implemented based on your specific logic)
     */
    function _processPurchase(
        address buyer,
        uint256 packageId,
        uint256 usdtAmount,
        address referrer
    ) internal {
        // Implement the purchase logic here
        // This should include all the business logic from your original purchasePackage function
        // For now, we'll leave this as a placeholder
        emit GaslessPurchaseExecuted(buyer, packageId, usdtAmount, referrer, _userNonces[buyer]);
    }

    // Note: _domainSeparatorV4() is handled by the parent EIP712 contract
    // No override needed for this version of OpenZeppelin
}
