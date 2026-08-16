// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {DCA} from "../src/DCA.sol";

/// PRIVATE_KEY=0x… forge script script/DeployDca.s.sol:DeployDca --rpc-url qie_testnet --broadcast
contract DeployDca is Script {
    address constant TESTNET_WQIE = 0x76623AA01FE1784130E1B56FEcDb83C1E7b0E491;
    address constant TESTNET_ROUTER = 0xC348694650Fd0E2b51197425e4Ad88aEe11b5d48;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        DCA dca = new DCA(TESTNET_ROUTER, TESTNET_WQIE);
        vm.stopBroadcast();
        console.log("DCA", address(dca));
    }
}
