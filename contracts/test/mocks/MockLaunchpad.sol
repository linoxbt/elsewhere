// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Unit-test double only — the minimal ILaunchpadFactory surface AMMRouter
///      actually calls, so tests can exercise the launchpad-token creator-fee
///      path (0.4%) without standing up the full LaunchpadFactory.
contract MockLaunchpad {
    mapping(address => bool) public isLaunchpadToken;
    mapping(address => address) public creatorOf;
    address public feeRouter;

    constructor(address feeRouter_) {
        feeRouter = feeRouter_;
    }

    function setLaunchpadToken(address token, address creator) external {
        isLaunchpadToken[token] = true;
        creatorOf[token] = creator;
    }
}
