// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ShrineToken} from "../src/ShrineToken.sol";

/// Deploys just the ELSE token (still listed/tradeable via the official
/// token list). MoneyMarket is deliberately NOT redeployed here: it has no
/// liquidate() and prices collateral off an arbitrary owner-set value with
/// no oracle — the app no longer uses it (see LendingPool instead), and a
/// fresh instance of a known-flawed contract isn't worth deploying.
///   PRIVATE_KEY=0x… forge script script/DeployMarket.s.sol:DeployMarket --rpc-url qie_testnet --broadcast
contract DeployMarket is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        ShrineToken elseToken = new ShrineToken("Elsewhere", "ELSE", 1_000_000_000 ether, deployer);

        vm.stopBroadcast();
        console.log("ELSE", address(elseToken));
    }
}
