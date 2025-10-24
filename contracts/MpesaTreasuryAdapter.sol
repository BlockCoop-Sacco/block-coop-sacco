// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Minimal {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IPackageManagerMinimal {
    function SERVER_ROLE() external view returns (bytes32);
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getPackage(uint256 id) external view returns (
        uint256 entryUSDT,
        uint256 exchangeRate,
        uint64 cliff,
        uint64 duration,
        uint16 vestBps,
        uint16 referralBps,
        bool active,
        bool exists,
        string memory name
    );
    function purchaseFor(address buyer, uint256 id, address referrer) external;
}

/**
 * @title MpesaTreasuryAdapter
 * @notice Pulls USDT from Safe treasury via allowance, approves PackageManager, and calls purchaseFor on behalf of backend.
 *         The contract itself must have SERVER_ROLE on PackageManager. Backend EOA is restricted as the only caller.
 */
contract MpesaTreasuryAdapter {
    address public immutable usdt;
    address public immutable packageManager;
    address public immutable treasury;
    address public immutable backendEOA;

    constructor(address _usdt, address _pm, address _treasury, address _backend) {
        require(_usdt != address(0) && _pm != address(0) && _treasury != address(0) && _backend != address(0), "bad addr");
        usdt = _usdt;
        packageManager = _pm;
        treasury = _treasury;
        backendEOA = _backend;
    }

    modifier onlyBackend() {
        require(msg.sender == backendEOA, "not backend");
        _;
    }

    function purchaseUsingTreasury(address buyer, uint256 packageId, address referrer) external onlyBackend {
        require(buyer != address(0), "bad buyer");

        // Ensure adapter holds SERVER_ROLE on PackageManager
        bytes32 serverRole = IPackageManagerMinimal(packageManager).SERVER_ROLE();
        require(IPackageManagerMinimal(packageManager).hasRole(serverRole, address(this)), "no server role");

        (
            uint256 entryUSDT,,,
            ,
            ,
            ,
            bool active,
            bool exists,
            
        ) = IPackageManagerMinimal(packageManager).getPackage(packageId);
        require(exists && active, "bad package");

        // Pull USDT from Safe treasury (Safe must approve this contract as spender)
        require(IERC20Minimal(usdt).transferFrom(treasury, address(this), entryUSDT), "pull fail");

        // Approve PackageManager if needed
        if (IERC20Minimal(usdt).allowance(address(this), packageManager) < entryUSDT) {
            require(IERC20Minimal(usdt).approve(packageManager, type(uint256).max), "approve fail");
        }

        // Execute purchase (PackageManager will transferFrom(adapter->PM))
        IPackageManagerMinimal(packageManager).purchaseFor(buyer, packageId, referrer);
    }
}


