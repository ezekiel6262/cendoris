// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CendorisVault} from "./CendorisVault.sol";

contract CendorisVaultFactory is Ownable2Step {
    address public immutable registry;
    address public router;
    mapping(address => address) public vaultOf;
    mapping(address => bool) public isVault;
    event RouterInitialized(address indexed router);
    event VaultCreated(address indexed owner, address indexed vault);

    constructor(address admin, address registry_) Ownable(admin) { require(registry_ != address(0), "zero registry"); registry = registry_; }

    function initializeRouter(address router_) external onlyOwner {
        require(router == address(0) && router_ != address(0), "router initialized");
        router = router_;
        emit RouterInitialized(router_);
    }

    function createVault() external returns (address vault) {
        require(router != address(0) && vaultOf[msg.sender] == address(0), "cannot create");
        vault = address(new CendorisVault(msg.sender, router, registry));
        vaultOf[msg.sender] = vault;
        isVault[vault] = true;
        emit VaultCreated(msg.sender, vault);
    }
}
