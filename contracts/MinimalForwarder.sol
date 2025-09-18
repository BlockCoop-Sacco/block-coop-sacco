// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title MinimalForwarder
 * @dev A minimal forwarder for gasless transactions
 */
contract MinimalForwarder is EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;
        address to;
        uint256 value;
        uint256 gas;
        uint256 nonce;
        bytes data;
        uint256 validUntil;
    }

    bytes32 private constant _TYPEHASH =
        keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data,uint256 validUntil)");

    mapping(address => uint256) private _nonces;

    event ForwardRequestExecuted(address indexed from, address indexed to, bytes data, uint256 gas, uint256 nonce);

    constructor() EIP712("MinimalForwarder", "0.0.1") {}

    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(abi.encode(_TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, req.data, req.validUntil))
        ).recover(signature);
        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool, bytes memory)
    {
        require(verify(req, signature), "MinimalForwarder: signature does not match request");
        require(req.validUntil == 0 || req.validUntil > block.timestamp, "MinimalForwarder: request expired");
        require(req.nonce == _nonces[req.from]++, "MinimalForwarder: nonce mismatch");

        (bool success, bytes memory returndata) = req.to.call{gas: req.gas, value: req.value}(
            abi.encodePacked(req.data, req.from)
        );

        // Validate that the relayer has sent enough gas for the call.
        // See https://ronan.eth.limo/blog/ethereum-gas-dangers/
        assert(gasleft() > req.gas / 63);

        emit ForwardRequestExecuted(req.from, req.to, req.data, req.gas, req.nonce);

        return (success, returndata);
    }

    function executeBatch(ForwardRequest[] calldata reqs, bytes[] calldata signatures)
        public
        payable
        returns (bool[] memory, bytes[] memory)
    {
        require(reqs.length == signatures.length, "MinimalForwarder: requests and signatures length mismatch");
        bool[] memory successes = new bool[](reqs.length);
        bytes[] memory returndatas = new bytes[](reqs.length);

        for (uint256 i = 0; i < reqs.length; i++) {
            (successes[i], returndatas[i]) = execute(reqs[i], signatures[i]);
        }

        return (successes, returndatas);
    }
}








