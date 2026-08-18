// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ICendorisRegistryView { function isAssetEnabled(address) external view returns (bool); function isAdapterEnabled(address) external view returns (bool); }
interface ICendorisAdapter { function execute(address vault, address token, uint256 amount, bytes calldata data) external returns (bytes memory); }

contract CendorisVault is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;
    address public immutable router;
    ICendorisRegistryView public immutable registry;

    event Deposited(address indexed token, uint256 amount);
    event Withdrawn(address indexed token, address indexed recipient, uint256 amount);
    event AdapterExecuted(address indexed adapter, address indexed token, uint256 amount);

    modifier onlyRouter() { require(msg.sender == router, "router only"); _; }

    constructor(address initialOwner, address router_, address registry_) Ownable(initialOwner) {
        require(router_ != address(0) && registry_ != address(0), "zero dependency");
        router = router_;
        registry = ICendorisRegistryView(registry_);
    }

    function deposit(address token, uint256 amount) external onlyOwner nonReentrant {
        require(registry.isAssetEnabled(token) && amount > 0, "invalid deposit");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(token, amount);
    }

    function withdraw(address token, address recipient, uint256 amount) external onlyOwner nonReentrant {
        require(recipient != address(0), "zero recipient");
        IERC20(token).safeTransfer(recipient, amount);
        emit Withdrawn(token, recipient, amount);
    }

    function executeAdapter(address adapter, address token, uint256 amount, bytes calldata data) external onlyRouter nonReentrant returns (bytes memory result) {
        require(registry.isAssetEnabled(token) && registry.isAdapterEnabled(adapter), "not allowlisted");
        IERC20(token).forceApprove(adapter, amount);
        result = ICendorisAdapter(adapter).execute(address(this), token, amount, data);
        IERC20(token).forceApprove(adapter, 0);
        emit AdapterExecuted(adapter, token, amount);
    }
}
