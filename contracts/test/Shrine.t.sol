// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {WQIE} from "../src/WQIE.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {LaunchpadFactory} from "../src/LaunchpadFactory.sol";
import {BondingCurve} from "../src/BondingCurve.sol";
import {AMMFactory} from "../src/amm/AMMFactory.sol";
import {AMMRouter} from "../src/amm/AMMRouter.sol";
import {AMMPair} from "../src/amm/AMMPair.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {MockOracle} from "./mocks/MockOracle.sol";

contract ShrineTest is Test {
    WQIE wqie;
    FeeRouter fees;
    AMMFactory ammFactory;
    AMMRouter router;
    LaunchpadFactory launchpad;
    MockOracle oracle;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        vm.deal(alice, 1_000_000 ether);
        vm.deal(bob, 1_000_000 ether);

        // $0.15480076 / QIE (8 decimals) — matches live QIE oracle snapshot.
        oracle = new MockOracle(15_480_076);
        wqie = new WQIE();
        fees = new FeeRouter(address(this));
        ammFactory = new AMMFactory();
        router = new AMMRouter(address(ammFactory), address(wqie));
        launchpad = new LaunchpadFactory(address(wqie), address(oracle), 2584 ether);
        launchpad.setAddresses(address(fees), address(ammFactory), address(router), address(oracle));
        router.setLaunchpad(address(launchpad));
        fees.setCaller(address(launchpad), true);
        fees.setCaller(address(router), true);
    }

    function testCreationFeeApprox250Usd() public view {
        uint256 fee = launchpad.creationFeeQie();
        // 2.5 / 0.15480076 ≈ 16.15 QIE
        assertApproxEqRel(fee, 16.15 ether, 0.02e18);
    }

    function testStaleOracleReverts() public {
        vm.warp(block.timestamp + 49 hours);
        vm.expectRevert();
        launchpad.creationFeeQie();
    }

    function testCreateAndBuySell() public {
        uint256 fee = launchpad.creationFeeQie();
        vm.prank(alice);
        (address token, address curve) =
            launchpad.createToken{value: fee}("shrine dog", "SDOG", "ipfs://meta", 0);

        assertTrue(launchpad.isLaunchpadToken(token));
        assertEq(launchpad.creatorOf(token), alice);

        BondingCurve c = BondingCurve(payable(curve));
        uint256 mcap0 = c.marketCapUsd();
        assertGt(mcap0, 0);

        (uint256 tokensOut,,) = c.quoteBuy(10 ether);
        vm.prank(bob);
        uint256 got = c.buy{value: 10 ether}(tokensOut * 99 / 100, bob);
        assertEq(got, tokensOut);
        assertGt(IERC20(token).balanceOf(bob), 0);

        uint256 bal = IERC20(token).balanceOf(bob);
        vm.startPrank(bob);
        IERC20(token).approve(curve, bal);
        uint256 qOut = c.sell(bal / 2, 0, bob);
        vm.stopPrank();
        assertGt(qOut, 0);
    }

    function testGraduateAndAmmSwap() public {
        uint256 fee = launchpad.creationFeeQie();
        vm.prank(alice);
        (address token, address curve) =
            launchpad.createToken{value: fee}("grad", "GRAD", "ipfs://g", 0);

        BondingCurve c = BondingCurve(payable(curve));

        // Drive mcap to $25k. real quote needed is on the order of ~18k QIE.
        vm.prank(bob);
        c.buy{value: 25_000 ether}(0, bob);
        assertTrue(c.graduated());
        assertTrue(c.pair() != address(0));

        // Bob sells some on the AMM via router (token → QIE).
        uint256 tokBal = IERC20(token).balanceOf(bob);
        require(tokBal > 0, "no tokens");
        address[] memory path = new address[](2);
        path[0] = token;
        path[1] = address(wqie);

        vm.startPrank(bob);
        IERC20(token).approve(address(router), tokBal / 10);
        uint256[] memory amounts =
            router.swapExactTokensForQIE(tokBal / 10, 0, path, bob, block.timestamp + 60);
        vm.stopPrank();
        assertGt(amounts[amounts.length - 1], 0);
    }

    function testAddRemoveLiquidity() public {
        // Seed a standalone pair with a dummy token via factory create + manual.
        uint256 fee = launchpad.creationFeeQie();
        vm.prank(alice);
        (address token, address curve) =
            launchpad.createToken{value: fee + 5 ether}("liq", "LIQ", "ipfs://l", 5 ether);

        // Buy a bit more so alice has tokens, then we cannot add LP until graduated
        // unless we create a custom pair — create a fresh ERC20-less flow:
        // wrap QIE and use two WQIE? can't. Use token + wqie after buying.
        BondingCurve c = BondingCurve(payable(curve));
        vm.prank(alice);
        c.buy{value: 20 ether}(0, alice);

        // Create pair pre-graduation (allowed by AMM; launchpad graduation is separate).
        uint256 tok = IERC20(token).balanceOf(alice);
        vm.startPrank(alice);
        IERC20(token).approve(address(router), tok / 4);
        (,, uint256 liq) = router.addLiquidityQIE{value: 5 ether}(
            token, tok / 4, 0, 0, alice, block.timestamp + 60
        );
        assertGt(liq, 0);
        address pair = ammFactory.getPair(token, address(wqie));
        IERC20(pair).approve(address(router), liq);
        (uint256 a, uint256 b) =
            router.removeLiquidityQIE(token, liq, 0, 0, alice, block.timestamp + 60);
        vm.stopPrank();
        assertGt(a + b, 0);
    }
}
