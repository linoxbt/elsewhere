// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IAggregatorV3} from "../src/interfaces/IOracle.sol";
import {WQIE} from "../src/WQIE.sol";
import {LaunchpadFactory} from "../src/LaunchpadFactory.sol";

/// @notice Fork-only: talks to the official QIE/USD oracle on chain 1990.
///   forge test --match-contract LiveOracleFork --fork-url https://rpc1mainnet.qie.digital -vv
contract LiveOracleFork is Test {
    address constant ORACLE = 0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17;

    function testOfficialFeedIsLive() public view {
        if (block.chainid != 1990) return;

        IAggregatorV3 feed = IAggregatorV3(ORACLE);
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        uint8 decimals = feed.decimals();

        assertEq(decimals, 8);
        assertGt(answer, 0);
        assertGt(updatedAt, 0);
        assertLe(block.timestamp, updatedAt + 48 hours);
    }

    function testFactoryCreationFeeMatchesLiveOracle() public {
        if (block.chainid != 1990) return;

        WQIE wqie = new WQIE();
        LaunchpadFactory factory = new LaunchpadFactory(address(wqie), ORACLE, 2584 ether);

        uint256 px = factory.qieUsd8();
        uint256 fee = factory.creationFeeQie();
        uint256 usd18 = fee * px / 1e8;
        assertApproxEqRel(usd18, 2.5 ether, 0.001e18);

        assertEq(factory.qieUsdOracle(), ORACLE);
        assertGt(factory.oracleUpdatedAt(), 0);
    }
}
