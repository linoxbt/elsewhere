// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAggregatorV3} from "../interfaces/IOracle.sol";

/// @notice Reads the official QIE AggregatorV3 feed. Reverts if the price is
///         missing or older than MAX_STALE — no mock / fallback path.
library OracleLib {
    uint256 internal constant MAX_STALE = 48 hours;

    error OraclePrice();
    error OracleStale();

    function readRound(address oracle)
        internal
        view
        returns (int256 answer, uint256 updatedAt_)
    {
        (, answer,, updatedAt_,) = IAggregatorV3(oracle).latestRoundData();
    }

    function updatedAt(address oracle) internal view returns (uint256) {
        (, uint256 ts) = readRound(oracle);
        return ts;
    }

    /// @return USD per 1 QIE, 8 decimals (same as the QIE oracle).
    function readUsd8(address oracle) internal view returns (uint256) {
        (int256 answer, uint256 ts) = readRound(oracle);
        if (answer <= 0) revert OraclePrice();
        if (ts == 0 || block.timestamp > ts + MAX_STALE) revert OracleStale();
        return uint256(answer);
    }

    /// @return USD per 1 QIE, 18 decimals.
    function readUsd18(address oracle) internal view returns (uint256) {
        return readUsd8(oracle) * 1e10;
    }
}
