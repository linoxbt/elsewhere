// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {TransferHelper} from "./lib/TransferHelper.sol";

/// @notice Atomic native-QIE / ERC-20 fan-out. Single-recipient sends can
///         also go direct from the wallet; this is for batch.
contract BatchSender {
    event NativeSent(address indexed from, address indexed to, uint256 amount);
    event TokenSent(address indexed token, address indexed from, address indexed to, uint256 amount);

    function sendNative(address[] calldata to, uint256[] calldata amounts) external payable {
        uint256 n = to.length;
        require(n > 0 && n == amounts.length, "LEN");
        uint256 sum;
        for (uint256 i; i < n; i++) {
            require(to[i] != address(0), "TO");
            sum += amounts[i];
            TransferHelper.safeTransferQIE(to[i], amounts[i]);
            emit NativeSent(msg.sender, to[i], amounts[i]);
        }
        require(msg.value == sum, "VALUE");
    }

    function sendToken(address token, address[] calldata to, uint256[] calldata amounts) external {
        require(token != address(0), "TOKEN");
        uint256 n = to.length;
        require(n > 0 && n == amounts.length, "LEN");
        uint256 sum;
        for (uint256 i; i < n; i++) {
            require(to[i] != address(0), "TO");
            sum += amounts[i];
        }
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), sum);
        for (uint256 i; i < n; i++) {
            TransferHelper.safeTransfer(token, to[i], amounts[i]);
            emit TokenSent(token, msg.sender, to[i], amounts[i]);
        }
    }
}
