// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DCA} from "../src/DCA.sol";

/// PRIVATE_KEY=0x… forge script script/DeployDca.s.sol:DeployDca --rpc-url qie_testnet --broadcast
contract DeployDca is Script {
    address constant TESTNET_WQIE = 0xDEF2Bd495F8874BF52DA9b1AA6c58e821695fB7F;
    address constant TESTNET_ROUTER = 0xC87F2eb3a67C0D4E113e8d3173ce5Bb488850493;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        DCA dca = new DCA(TESTNET_ROUTER, TESTNET_WQIE);
        vm.stopBroadcast();
        console.log("DCA", address(dca));
    }
}
