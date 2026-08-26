// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BatchSender} from "../src/BatchSender.sol";
import {LendingPool} from "../src/LendingPool.sol";

/// PRIVATE_KEY=0x… forge script script/DeployExtras.s.sol:DeployExtras --rpc-url qie_testnet --broadcast
contract DeployExtras is Script {
    address constant TESTNET_WQIE = 0xDEF2Bd495F8874BF52DA9b1AA6c58e821695fB7F;
    address constant TESTNET_ORACLE = 0xd394a84c695cb6a93026134b24EBad8B62Da6B39;
    address constant TESTNET_AMM_FACTORY = 0x71EF5F125119654a19d80B94fB8Ef75fd37eB882;

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
