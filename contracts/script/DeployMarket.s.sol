// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ShrineToken} from "../src/ShrineToken.sol";
import {MoneyMarket} from "../src/MoneyMarket.sol";

/// PRIVATE_KEY=0x… forge script script/DeployMarket.s.sol:DeployMarket --rpc-url qie_testnet --broadcast
contract DeployMarket is Script {
    address constant TESTNET_WQIE = 0x76623AA01FE1784130E1B56FEcDb83C1E7b0E491;
    address constant TESTNET_ORACLE = 0x7F3635B76790cF57A955E6576504ef17564FE924;
    /// 1 ELSE = 0.001 QIE
    uint256 constant ELSE_PRICE_QIE_WAD = 0.001 ether;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        ShrineToken elseToken = new ShrineToken("Elsewhere", "ELSE", 1_000_000_000 ether, deployer);
        MoneyMarket market = new MoneyMarket(TESTNET_WQIE, TESTNET_ORACLE);
        market.listToken(address(elseToken), ELSE_PRICE_QIE_WAD);
        elseToken.approve(address(market), 10_000_000 ether);
        market.seedToken(address(elseToken), 10_000_000 ether);

        vm.stopBroadcast();
        console.log("ELSE", address(elseToken));
        console.log("MoneyMarket", address(market));
    }
}
