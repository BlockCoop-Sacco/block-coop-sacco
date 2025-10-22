// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20MinimalV2 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

interface IPackageManagerMinimalV2 {
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
 * @title MpesaTreasuryAdapterV2
 * @notice Adds a preapprove() helper and fixes package tuple destructuring.
 */
contract MpesaTreasuryAdapterV2 {
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

    function preapprove() external onlyBackend {
        // Give PackageManager unlimited allowance from adapter to avoid inline approve cost
        require(IERC20MinimalV2(usdt).approve(packageManager, type(uint256).max), "preapprove fail");
    }

    function purchaseUsingTreasury(address buyer, uint256 packageId, address referrer) external onlyBackend {
        require(buyer != address(0), "bad buyer");

        // Ensure adapter holds SERVER_ROLE on PackageManager
        bytes32 serverRole = IPackageManagerMinimalV2(packageManager).SERVER_ROLE();
        require(IPackageManagerMinimalV2(packageManager).hasRole(serverRole, address(this)), "no server role");

        (
            uint256 entryUSDT,
            uint256 exchangeRate,
            uint64 cliff,
            uint64 duration,
            uint16 vestBps,
            uint16 referralBps,
            bool active,
            bool exists,
            string memory name
        ) = IPackageManagerMinimalV2(packageManager).getPackage(packageId);
        require(exists && active, "bad package");

        // Pull USDT from Safe treasury (Safe must approve this contract as spender)
        require(IERC20MinimalV2(usdt).transferFrom(treasury, address(this), entryUSDT), "pull fail");

        // Ensure PM can pull from adapter
        if (IERC20MinimalV2(usdt).allowance(address(this), packageManager) < entryUSDT) {
            require(IERC20MinimalV2(usdt).approve(packageManager, type(uint256).max), "approve fail");
        }

        // Execute purchase (PackageManager will transferFrom(adapter->PM))
        IPackageManagerMinimalV2(packageManager).purchaseFor(buyer, packageId, referrer);
    }
}





