// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IOwnedVault { function owner() external view returns (address); }

contract CendorisStrategyRegistry {
    struct Strategy {
        uint64 version;
        uint16 maxRisk;
        uint16 minLiquidityBps;
        uint16 maxAssetExposureBps;
        uint16 maxSlippageBps;
        bool automationAllowed;
        bool active;
    }
    mapping(address => Strategy) public strategies;
    event StrategyUpdated(address indexed vault, uint64 indexed version, Strategy strategy);
    event StrategyDeactivated(address indexed vault, uint64 indexed version);

    function setStrategy(address vault, Strategy calldata next) external {
        require(IOwnedVault(vault).owner() == msg.sender, "vault owner only");
        require(next.maxRisk <= 100 && next.minLiquidityBps <= 10_000 && next.maxAssetExposureBps <= 10_000 && next.maxSlippageBps <= 2_000, "invalid strategy");
        uint64 version = strategies[vault].version + 1;
        Strategy memory stored = next;
        stored.version = version;
        stored.active = true;
        strategies[vault] = stored;
        emit StrategyUpdated(vault, version, stored);
    }

    function deactivate(address vault) external {
        require(IOwnedVault(vault).owner() == msg.sender, "vault owner only");
        Strategy storage strategy = strategies[vault];
        require(strategy.active, "inactive");
        strategy.active = false;
        emit StrategyDeactivated(vault, strategy.version);
    }
}
