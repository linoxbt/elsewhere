// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BatchSender} from "../src/BatchSender.sol";
import {LendingPool} from "../src/LendingPool.sol";

/// PRIVATE_KEY=0x… forge script script/DeployExtras.s.sol:DeployExtras --rpc-url qie_testnet --broadcast
contract DeployExtras is Script {
    address constant TESTNET_WQIE = 0x76623AA01FE1784130E1B56FEcDb83C1E7b0E491;
    address constant TESTNET_ORACLE = 0x7F3635B76790cF57A955E6576504ef17564FE924;
    address constant TESTNET_AMM_FACTORY = 0xc0E497c064163d455e8AEaD40795401d09Ac4B43;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        BatchSender batch = new BatchSender();
        LendingPool lend = new LendingPool(TESTNET_WQIE, TESTNET_ORACLE, TESTNET_AMM_FACTORY);
        vm.stopBroadcast();
        console.log("BatchSender", address(batch));
        console.log("LendingPool", address(lend));
    }
}
