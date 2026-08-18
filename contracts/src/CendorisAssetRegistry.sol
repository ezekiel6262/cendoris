// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CendorisAssetRegistry is Ownable2Step {
    struct AssetConfig { bytes32 symbol; uint8 decimals; uint16 maxAllocationBps; bool enabled; }
    mapping(address => AssetConfig) public assets;
    mapping(address => bool) public adapters;

    event AssetConfigured(address indexed token, bytes32 indexed symbol, uint16 maxAllocationBps, bool enabled);
    event AdapterConfigured(address indexed adapter, bool enabled);

    constructor(address admin) Ownable(admin) { require(admin != address(0), "zero admin"); }

    function configureAsset(address token, AssetConfig calldata config) external onlyOwner {
        require(token != address(0) && config.maxAllocationBps <= 10_000, "invalid asset");
        assets[token] = config;
        emit AssetConfigured(token, config.symbol, config.maxAllocationBps, config.enabled);
    }

    function configureAdapter(address adapter, bool enabled) external onlyOwner {
        require(adapter != address(0), "zero adapter");
        adapters[adapter] = enabled;
        emit AdapterConfigured(adapter, enabled);
    }

    function isAssetEnabled(address token) external view returns (bool) { return assets[token].enabled; }
    function isAdapterEnabled(address adapter) external view returns (bool) { return adapters[adapter]; }
}
