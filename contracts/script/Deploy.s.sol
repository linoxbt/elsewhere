// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WQIE} from "../src/WQIE.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {LaunchpadFactory} from "../src/LaunchpadFactory.sol";
import {AMMFactory} from "../src/amm/AMMFactory.sol";
import {AMMRouter} from "../src/amm/AMMRouter.sol";
import {TestnetPriceFeed} from "../src/testnet/TestnetPriceFeed.sol";

/// @notice Deploy shrine. On QIE testnet (1983) we also deploy an AggregatorV3
///         feed (no official oracle exists there). On mainnet (1990) we bind
///         the official QIE/USD oracle.
///   PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy --rpc-url qie_testnet --broadcast
contract Deploy is Script {
    address constant MAINNET_QIE_USD_ORACLE = 0x3Bc617cF3A4Bb77003e4c556B87b13D556903D17;
    uint256 constant VIRTUAL_QUOTE = 2584 ether;
    /// @dev Seed testnet feed at the last observed mainnet print (~$0.1548).
    int256 constant TESTNET_SEED_USD8 = 15_480_076;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        address oracle;
        if (block.chainid == 1983) {
            TestnetPriceFeed feed = new TestnetPriceFeed(TESTNET_SEED_USD8);
            oracle = address(feed);
        } else {
            oracle = MAINNET_QIE_USD_ORACLE;
        }

        WQIE wqie = new WQIE();
        FeeRouter fees = new FeeRouter(deployer);
        AMMFactory ammFactory = new AMMFactory();
        AMMRouter router = new AMMRouter(address(ammFactory), address(wqie));
        LaunchpadFactory launchpad = new LaunchpadFactory(address(wqie), oracle, VIRTUAL_QUOTE);

        launchpad.setAddresses(address(fees), address(ammFactory), address(router), oracle);
        router.setLaunchpad(address(launchpad));
        fees.setCaller(address(launchpad), true);
        fees.setCaller(address(router), true);

        vm.stopBroadcast();

        console.log("chainId", block.chainid);
        console.log("WQIE", address(wqie));
        console.log("FeeRouter", address(fees));
        console.log("AMMFactory", address(ammFactory));
        console.log("AMMRouter", address(router));
        console.log("LaunchpadFactory", address(launchpad));
        console.log("QIE_USD_ORACLE", oracle);
    }
}
