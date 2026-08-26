// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WQIE} from "../src/WQIE.sol";
import {AMMFactory} from "../src/amm/AMMFactory.sol";
import {AMMRouter} from "../src/amm/AMMRouter.sol";
import {ShrineToken} from "../src/ShrineToken.sol";
import {DCA} from "../src/DCA.sol";
import {MockLaunchpad} from "./mocks/MockLaunchpad.sol";

contract DCATest is Test {
    WQIE wqie;
    AMMFactory factory;
    AMMRouter router;
    ShrineToken col;
    DCA dca;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.deal(alice, 200_000 ether);
        vm.deal(bob, 10 ether);
        wqie = new WQIE();
        factory = new AMMFactory();
        router = new AMMRouter(address(factory), address(wqie));
        col = new ShrineToken("Collateral", "COL", 1_000_000_000 ether, address(this));
        dca = new DCA(address(router), address(wqie));

        col.transfer(alice, 100_000 ether);
        vm.startPrank(alice);
        col.approve(address(router), type(uint256).max);
        router.addLiquidityQIE{value: 50_000 ether}(address(col), 50_000 ether, 0, 0, alice, block.timestamp + 60);
        vm.stopPrank();
    }

    function testCreateExecuteCancel() public {
        vm.prank(alice);
        uint256 id = dca.create{value: 10 ether}(address(0), address(col), 10 ether, 5, 5 minutes, 100);
        (address owner,,,,, uint32 executed,,,,,,) = dca.orders(id);
        assertEq(owner, alice);
        assertEq(executed, 0);

        vm.prank(bob);
        dca.execute(id);
        (,,,,, executed,,,,,,) = dca.orders(id);
        assertEq(executed, 1);
        assertGt(col.balanceOf(alice), 0);
        assertGt(bob.balance, 10 ether); // 1% fee in QIE

        vm.prank(alice);
        dca.cancel(id);
        (,,,,,,,,, bool cancelled,,) = dca.orders(id);
        assertTrue(cancelled);
    }

    function testCannotExecuteEarly() public {
        vm.prank(alice);
        uint256 id = dca.create{value: 2 ether}(address(0), address(col), 2 ether, 2, 5 minutes, 100);
        vm.prank(bob);
        dca.execute(id);
        vm.prank(bob);
        vm.expectRevert(bytes("WAIT"));
        dca.execute(id);
    }

    function testRejectsShortInterval() public {
        vm.prank(alice);
        vm.expectRevert(bytes("INTERVAL"));
        dca.create{value: 2 ether}(address(0), address(col), 2 ether, 2, 4 minutes, 100);
    }

    /// @dev Regression test for the router-fee/quote mismatch: once the swap
    ///      touches a launchpad token, AMMRouter deducts its own extra 0.45%
    ///      creator+protocol fee from the input before swapping. Before the
    ///      fix, execute() quoted minOut against the *gross* slice amount and
    ///      this reverted with SLIPPAGE; it must now succeed.
    function testExecuteAccountsForRouterCreatorFee() public {
        MockLaunchpad lp = new MockLaunchpad(address(0xFEE));
        lp.setLaunchpadToken(address(col), address(0xC0FFEE));
        router.setLaunchpad(address(lp));

        // Tight (0.1%) tolerance: the router's 0.45% extra fee is bigger than
        // this, so a quote that ignores it (the pre-fix bug) must revert
        // SLIPPAGE, while a quote computed net of that fee (the fix) must not.
        vm.prank(alice);
        uint256 id = dca.create{value: 10 ether}(address(0), address(col), 10 ether, 5, 5 minutes, 10);
        vm.prank(bob);
        dca.execute(id);
        (,,,,, uint32 executed,,,,,,) = dca.orders(id);
        assertEq(executed, 1);
        assertGt(col.balanceOf(alice), 0);
    }
}
