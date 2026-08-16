// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WQIE} from "../src/WQIE.sol";
import {AMMFactory} from "../src/amm/AMMFactory.sol";
import {AMMRouter} from "../src/amm/AMMRouter.sol";
import {AMMPair} from "../src/amm/AMMPair.sol";
import {LendingPool} from "../src/LendingPool.sol";
import {BatchSender} from "../src/BatchSender.sol";
import {MockOracle} from "./mocks/MockOracle.sol";
import {ShrineToken} from "../src/ShrineToken.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

contract LendingTest is Test {
    WQIE wqie;
    AMMFactory factory;
    AMMRouter router;
    MockOracle oracle;
    LendingPool pool;
    BatchSender batch;
    ShrineToken col;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address carol = address(0xCA201);

    function setUp() public {
        vm.deal(alice, 200_000 ether);
        vm.deal(bob, 10_000 ether);
        vm.deal(carol, 10_000 ether);

        oracle = new MockOracle(15_480_076);
        wqie = new WQIE();
        factory = new AMMFactory();
        router = new AMMRouter(address(factory), address(wqie));
        pool = new LendingPool(address(wqie), address(oracle), address(factory));
        batch = new BatchSender();

        col = new ShrineToken("Collateral", "COL", 1_000_000_000 ether, address(this));
        col.transfer(bob, 1_000_000 ether);

        // 1 COL = 1 WQIE in the AMM so collateral is easy to reason about.
        vm.startPrank(alice);
        wqie.deposit{value: 50_000 ether}();
        wqie.approve(address(router), type(uint256).max);
        col.approve(address(router), type(uint256).max);
        // mint extra COL to alice for the pool
        vm.stopPrank();
        col.transfer(alice, 50_000 ether);
        vm.startPrank(alice);
        col.approve(address(router), type(uint256).max);
        router.addLiquidityQIE{value: 50_000 ether}(address(col), 50_000 ether, 0, 0, alice, block.timestamp + 60);
        vm.stopPrank();
    }

    function testSupplyWithdraw() public {
        vm.prank(alice);
        pool.supply{value: 10 ether}();
        assertEq(pool.supplyBalance(alice), 10 ether);

        uint256 before = alice.balance;
        vm.prank(alice);
        pool.withdraw(4 ether);
        assertEq(pool.supplyBalance(alice), 6 ether);
        assertEq(alice.balance, before + 4 ether);
    }

    function testBorrowRepay() public {
        vm.prank(alice);
        pool.supply{value: 100 ether}();

        vm.startPrank(bob);
        col.approve(address(pool), 20 ether);
        pool.depositCollateral(address(col), 20 ether);
        // 20 COL * $0.1548 * 70% ≈ 2.16 QIE max. Borrow 1 QIE.
        pool.borrow(1 ether);
        assertEq(pool.borrowBalance(bob), 1 ether);
        assertGt(pool.healthBps(bob), 7_000);
        pool.repay{value: 1 ether}();
        assertEq(pool.borrowBalance(bob), 0);
        vm.stopPrank();
    }

    function testBorrowBlockedWithoutCollateral() public {
        vm.prank(alice);
        pool.supply{value: 10 ether}();
        vm.prank(bob);
        vm.expectRevert(bytes("HEALTH"));
        pool.borrow(1 ether);
    }

    function testInterestAccrues() public {
        vm.prank(alice);
        pool.supply{value: 100 ether}();
        vm.startPrank(bob);
        col.approve(address(pool), 40 ether);
        pool.depositCollateral(address(col), 40 ether);
        pool.borrow(2 ether);
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);
        pool.accrue();
        assertGt(pool.borrowBalance(bob), 2 ether);
        assertGt(pool.supplyBalance(alice), 100 ether);
    }

    function testBatchNative() public {
        address[] memory to = new address[](2);
        uint256[] memory amt = new uint256[](2);
        to[0] = bob;
        to[1] = carol;
        amt[0] = 1 ether;
        amt[1] = 2 ether;
        uint256 bobBefore = bob.balance;
        vm.prank(alice);
        batch.sendNative{value: 3 ether}(to, amt);
        assertEq(bob.balance, bobBefore + 1 ether);
        assertEq(carol.balance, 10_000 ether + 2 ether);
    }

    function testBatchToken() public {
        address[] memory to = new address[](2);
        uint256[] memory amt = new uint256[](2);
        to[0] = bob;
        to[1] = carol;
        amt[0] = 5 ether;
        amt[1] = 7 ether;
        col.approve(address(batch), 12 ether);
        batch.sendToken(address(col), to, amt);
        assertEq(col.balanceOf(carol), 7 ether);
    }
}
