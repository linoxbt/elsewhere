// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WQIE} from "../src/WQIE.sol";
import {ShrineToken} from "../src/ShrineToken.sol";
import {MoneyMarket} from "../src/MoneyMarket.sol";
import {MockOracle} from "./mocks/MockOracle.sol";

contract MoneyMarketTest is Test {
    WQIE wqie;
    MockOracle oracle;
    ShrineToken elseToken;
    MoneyMarket market;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.deal(alice, 1_000 ether);
        vm.deal(bob, 1_000 ether);
        oracle = new MockOracle(15_480_076);
        wqie = new WQIE();
        elseToken = new ShrineToken("Elsewhere", "ELSE", 1_000_000_000 ether, address(this));
        market = new MoneyMarket(address(wqie), address(oracle));
        market.listToken(address(elseToken), 0.001 ether);
        elseToken.approve(address(market), 1_000_000 ether);
        market.seedToken(address(elseToken), 1_000_000 ether);
    }

    function testSupplyThenBorrowElse() public {
        vm.prank(alice);
        market.supply{value: 2 ether}();
        assertEq(market.supplyBalance(alice), 2 ether);

        // 2 QIE * 70% / 0.001 = 1400 ELSE max
        vm.prank(alice);
        market.borrow(address(elseToken), 1_000 ether);
        assertEq(elseToken.balanceOf(alice), 1_000 ether);
        assertGt(market.borrowRateWad(address(elseToken)), 0.05e18);
        assertGt(market.qieSupplyRateWad(), 0);
    }

    function testBorrowBlockedWithoutSupply() public {
        vm.prank(bob);
        vm.expectRevert(bytes("HEALTH"));
        market.borrow(address(elseToken), 1 ether);
    }

    function testAprRisesWithUtilization() public {
        uint256 idle = market.borrowRateWad(address(elseToken));
        vm.prank(alice);
        market.supply{value: 10 ether}();
        vm.prank(alice);
        market.borrow(address(elseToken), 5_000 ether);
        uint256 hot = market.borrowRateWad(address(elseToken));
        assertGt(hot, idle);
        assertGt(market.utilizationBps(address(elseToken)), 0);
    }
}
