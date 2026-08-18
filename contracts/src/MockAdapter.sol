// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockAdapter {
    using SafeERC20 for IERC20;
    event Routed(address indexed vault, address indexed token, address indexed recipient, uint256 amount);
    function execute(address vault, address token, uint256 amount, bytes calldata data) external returns (bytes memory) {
        require(msg.sender == vault, "vault only");
        address recipient = abi.decode(data, (address));
        require(recipient != address(0), "zero recipient");
        IERC20(token).safeTransferFrom(vault, recipient, amount);
        emit Routed(vault, token, recipient, amount);
        return abi.encode(recipient, amount);
    }
}
