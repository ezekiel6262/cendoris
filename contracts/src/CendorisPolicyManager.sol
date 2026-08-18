// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IStrategyRegistry {
    function strategies(address vault) external view returns (uint64,uint16,uint16,uint16,uint16,bool,bool);
}
interface IRiskOracle { function isPublished(bytes32 reportHash) external view returns (bool); }

contract CendorisPolicyManager {
    IStrategyRegistry public immutable strategyRegistry;
    IRiskOracle public immutable riskOracle;

    constructor(address strategyRegistry_, address riskOracle_) {
        require(strategyRegistry_ != address(0) && riskOracle_ != address(0), "zero dependency");
        strategyRegistry = IStrategyRegistry(strategyRegistry_);
        riskOracle = IRiskOracle(riskOracle_);
    }

    function hashReport(address vault, uint256 nonce, bytes32 planHash, uint16 risk, uint16 liquidityBps, uint16 largestPositionBps, uint64 expiresAt) public view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), vault, nonce, planHash, risk, liquidityBps, largestPositionBps, expiresAt));
    }

    function validate(address vault, uint256 nonce, bytes32 planHash, uint16 risk, uint16 liquidityBps, uint16 largestPositionBps, uint64 expiresAt) external view returns (bool) {
        (,uint16 maxRisk,uint16 minLiquidityBps,uint16 maxAssetExposureBps,,,bool active) = strategyRegistry.strategies(vault);
        if (!active || block.timestamp > expiresAt) return false;
        if (risk > maxRisk || liquidityBps < minLiquidityBps || largestPositionBps > maxAssetExposureBps) return false;
        return riskOracle.isPublished(hashReport(vault, nonce, planHash, risk, liquidityBps, largestPositionBps, expiresAt));
    }
}
