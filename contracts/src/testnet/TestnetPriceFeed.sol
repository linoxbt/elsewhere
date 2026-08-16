// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice AggregatorV3-compatible feed for QIE testnet only.
///         Owner sets the 8-decimal USD answer; no mainnet mock path.
contract TestnetPriceFeed {
    uint8 public constant decimals = 8;
    string public constant description = "QIE / USD (testnet)";

    address public owner;
    int256 public answer;
    uint256 public updatedAt;
    uint80 public roundId;

    event AnswerUpdated(int256 indexed current, uint256 indexed updatedAt);
    event OwnershipTransferred(address indexed previous, address indexed next);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(int256 initialAnswer) {
        require(initialAnswer > 0, "PRICE");
        owner = msg.sender;
        _set(initialAnswer);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "ZERO");
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function setAnswer(int256 next) external onlyOwner {
        require(next > 0, "PRICE");
        _set(next);
    }

    function latestRoundData()
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (roundId, answer, updatedAt, updatedAt, roundId);
    }

    function _set(int256 next) internal {
        answer = next;
        updatedAt = block.timestamp;
        unchecked {
            roundId += 1;
        }
        emit AnswerUpdated(next, updatedAt);
    }
}
