// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IVaultFactory { function isVault(address vault) external view returns (bool); }
interface IWalletVault { function owner() external view returns (address); function executeAdapter(address adapter, address token, uint256 amount, bytes calldata data) external returns (bytes memory); }
interface IPolicyManager { function validate(address vault, uint256 nonce, bytes32 planHash, uint16 risk, uint16 liquidityBps, uint16 largestPositionBps, uint64 expiresAt) external view returns (bool); }

contract CendorisExecutionRouter {
    struct Action { address adapter; address token; uint256 amount; bytes data; }
    struct PolicySnapshot { uint16 risk; uint16 liquidityBps; uint16 largestPositionBps; uint64 expiresAt; }

    IVaultFactory public immutable factory;
    IPolicyManager public immutable policyManager;
    mapping(address => uint256) public nonces;

    event ActionExecuted(bytes32 indexed planHash, address indexed vault, address indexed adapter, address token, uint256 amount);
    event PlanExecuted(bytes32 indexed planHash, address indexed vault, address indexed owner, uint256 nonce, uint256 actionCount);

    constructor(address factory_, address policyManager_) {
        require(factory_ != address(0) && policyManager_ != address(0), "zero dependency");
        factory = IVaultFactory(factory_);
        policyManager = IPolicyManager(policyManager_);
    }

    function hashPlan(address vault, uint256 nonce, uint64 deadline, Action[] calldata actions) public pure returns (bytes32) {
        return keccak256(abi.encode(vault, nonce, deadline, actions));
    }

    function executePlan(address vault, uint64 deadline, Action[] calldata actions, PolicySnapshot calldata snapshot) external returns (bytes32 planHash) {
        require(factory.isVault(vault) && IWalletVault(vault).owner() == msg.sender, "vault owner only");
        require(actions.length > 0 && actions.length <= 16 && block.timestamp <= deadline, "invalid plan");
        uint256 nonce = nonces[vault];
        planHash = hashPlan(vault, nonce, deadline, actions);
        require(policyManager.validate(vault, nonce, planHash, snapshot.risk, snapshot.liquidityBps, snapshot.largestPositionBps, snapshot.expiresAt), "policy rejected");
        nonces[vault] = nonce + 1;
        for (uint256 i; i < actions.length; ++i) {
            IWalletVault(vault).executeAdapter(actions[i].adapter, actions[i].token, actions[i].amount, actions[i].data);
            emit ActionExecuted(planHash, vault, actions[i].adapter, actions[i].token, actions[i].amount);
        }
        emit PlanExecuted(planHash, vault, msg.sender, nonce, actions.length);
    }
}
