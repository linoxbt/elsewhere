// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Unit-test double only. Production always uses the official QIE feed.
contract MockOracle {
    uint8 public decimals = 8;
    string public description = "QIE / USDT";
    int256 public answer;
    uint256 public updatedAt;

    constructor(int256 answer_) {
        answer = answer_;
        updatedAt = block.timestamp;
    }

    function set(int256 answer_) external {
        answer = answer_;
        updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (1, answer, updatedAt, updatedAt, 1);
    }
}
