// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20MinimalV3 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

interface IPackageManagerMinimalV3 {
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
 * @title MpesaTreasuryAdapterV3
 * @notice Fallback to pre-funded adapter balance if Safe pull fails.
 */
contract MpesaTreasuryAdapterV3 {
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
        require(IERC20MinimalV3(usdt).approve(packageManager, type(uint256).max), "preapprove fail");
    }

    function purchaseUsingTreasury(address buyer, uint256 packageId, address referrer) external onlyBackend {
        require(buyer != address(0), "bad buyer");

        bytes32 serverRole = IPackageManagerMinimalV3(packageManager).SERVER_ROLE();
        require(IPackageManagerMinimalV3(packageManager).hasRole(serverRole, address(this)), "no server role");

        (uint256 entryUSDT,,,,,,bool active,bool exists,) = IPackageManagerMinimalV3(packageManager).getPackage(packageId);
        require(exists && active, "bad package");

        // Attempt to pull from Safe treasury first
        bool pulled = IERC20MinimalV3(usdt).transferFrom(treasury, address(this), entryUSDT);

        // If pull failed, fallback to using adapter's existing balance
        if (!pulled) {
            uint256 bal = IERC20MinimalV3(usdt).balanceOf(address(this));
            require(bal >= entryUSDT, "insufficient adapter funds");
        }

        // Ensure PM can pull from adapter
        if (IERC20MinimalV3(usdt).allowance(address(this), packageManager) < entryUSDT) {
            require(IERC20MinimalV3(usdt).approve(packageManager, type(uint256).max), "approve fail");
        }

        IPackageManagerMinimalV3(packageManager).purchaseFor(buyer, packageId, referrer);
    }
}





