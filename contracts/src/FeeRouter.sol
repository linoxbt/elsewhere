// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {TransferHelper} from "./lib/TransferHelper.sol";

/// @notice Collects protocol fees (WQIE / ERC-20) and lets the treasury sweep them.
contract FeeRouter {
    address public owner;
    address public treasury;
    mapping(address => bool) public callers;

    event OwnershipTransferred(address indexed previous, address indexed next);
    event TreasurySet(address indexed treasury);
    event CallerSet(address indexed caller, bool allowed);
    event ProtocolFee(address indexed token, uint256 amount, address indexed from);
    event Swept(address indexed token, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address treasury_) {
        require(treasury_ != address(0), "TREASURY");
        owner = msg.sender;
        treasury = treasury_;
        emit OwnershipTransferred(address(0), msg.sender);
        emit TreasurySet(treasury_);
    }

    receive() external payable {}

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "ZERO");
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function setTreasury(address t) external onlyOwner {
        require(t != address(0), "ZERO");
        treasury = t;
        emit TreasurySet(t);
    }

    function setCaller(address c, bool allowed) external onlyOwner {
        callers[c] = allowed;
        emit CallerSet(c, allowed);
    }

    /// @notice Accounting hook — tokens must already have been transferred in.
    function onProtocolFee(address token, uint256 amount) external {
        require(callers[msg.sender] || msg.sender == owner, "NOT_CALLER");
        emit ProtocolFee(token, amount, msg.sender);
    }

    function sweep(address token, uint256 amount) external onlyOwner {
        address to = treasury;
        if (token == address(0)) {
            TransferHelper.safeTransferQIE(to, amount);
        } else {
            TransferHelper.safeTransfer(token, to, amount);
        }
        emit Swept(token, to, amount);
    }

    function sweepAll(address token) external onlyOwner {
        uint256 amount = token == address(0) ? address(this).balance : IERC20(token).balanceOf(address(this));
        if (amount == 0) return;
        address to = treasury;
        if (token == address(0)) TransferHelper.safeTransferQIE(to, amount);
        else TransferHelper.safeTransfer(token, to, amount);
        emit Swept(token, to, amount);
    }
}
