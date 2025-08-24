// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BlockCoop Mock USDT - Gas-optimized minimal ERC20
contract BlockCoopMockUSDT {
    string public constant name = "BlockCoop Mock USDT";
    string public constant symbol = "USDT";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        totalSupply = initialSupply;
        balanceOf[msg.sender] = initialSupply;
        emit Transfer(address(0), msg.sender, initialSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        unchecked {
            balanceOf[msg.sender] -= value;
            balanceOf[to] += value;
        }
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(balanceOf[from] >= value && allowed >= value, "Not allowed");
        unchecked {
            balanceOf[from] -= value;
            balanceOf[to] += value;
            allowance[from][msg.sender] = allowed - value;
        }
        emit Transfer(from, to, value);
        return true;
    }
}
