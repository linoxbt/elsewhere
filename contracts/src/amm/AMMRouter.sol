// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "../interfaces/IERC20.sol";
import {IAMMFactory, IAMMPair, ILaunchpadFactory} from "../interfaces/IShrine.sol";
import {TransferHelper} from "../lib/TransferHelper.sol";
import {WQIE} from "../WQIE.sol";

/// @notice UniswapV2-style router with extra creator (0.4%) + protocol (0.05%) fees
///         on top of the pair's 0.30% LP fee. Creator fee applies when a hop
///         involves a shrine launchpad token.
contract AMMRouter {
    uint256 public constant DEADLINE_GRACE = 0;
    uint256 public constant FEE_DENOM = 100_000;
    uint256 public constant CREATOR_FEE_BPS = 400; // 0.400%
    uint256 public constant PROTOCOL_FEE_BPS = 50; // 0.050%
    uint256 public constant LP_FEE_NUM = 997; // pair keeps 0.30%

    address public immutable factory;
    address public immutable wqie;
    address public owner;
    address public launchpad;

    event RouteUsed(address indexed sender, string route, address[] path, uint256 amountIn, uint256 amountOut);
    event ExtraFees(address indexed tokenIn, address indexed creator, uint256 creatorFee, uint256 protocolFee);

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "EXPIRED");
        _;
    }

    constructor(address factory_, address wqie_) {
        require(factory_ != address(0) && wqie_ != address(0), "ZERO");
        factory = factory_;
        wqie = wqie_;
        owner = msg.sender;
    }

    receive() external payable {
        require(msg.sender == wqie, "WQIE_ONLY");
    }

    function setLaunchpad(address launchpad_) external {
        require(msg.sender == owner, "NOT_OWNER");
        launchpad = launchpad_;
    }

    function transferOwnership(address next) external {
        require(msg.sender == owner, "NOT_OWNER");
        require(next != address(0), "ZERO");
        owner = next;
    }

    // ─── liquidity ───────────────────────────────────────────────────────────

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = IAMMFactory(factory).getPair(tokenA, tokenB);
        TransferHelper.safeTransferFrom(tokenA, msg.sender, pair, amountA);
        TransferHelper.safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IAMMPair(pair).mint(to);
    }

    function addLiquidityQIE(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountQIEMin,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountToken, uint256 amountQIE, uint256 liquidity) {
        (amountToken, amountQIE) =
            _addLiquidity(token, wqie, amountTokenDesired, msg.value, amountTokenMin, amountQIEMin);
        address pair = IAMMFactory(factory).getPair(token, wqie);
        TransferHelper.safeTransferFrom(token, msg.sender, pair, amountToken);
        WQIE(payable(wqie)).deposit{value: amountQIE}();
        assert(WQIE(payable(wqie)).transfer(pair, amountQIE));
        liquidity = IAMMPair(pair).mint(to);
        if (msg.value > amountQIE) TransferHelper.safeTransferQIE(msg.sender, msg.value - amountQIE);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = IAMMFactory(factory).getPair(tokenA, tokenB);
        TransferHelper.safeTransferFrom(pair, msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = IAMMPair(pair).burn(to);
        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin && amountB >= amountBMin, "SLIPPAGE");
    }

    function removeLiquidityQIE(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountQIEMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountToken, uint256 amountQIE) {
        (amountToken, amountQIE) =
            removeLiquidity(token, wqie, liquidity, amountTokenMin, amountQIEMin, address(this), deadline);
        TransferHelper.safeTransfer(token, to, amountToken);
        WQIE(payable(wqie)).withdraw(amountQIE);
        TransferHelper.safeTransferQIE(to, amountQIE);
    }

    // ─── swaps ───────────────────────────────────────────────────────────────

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        uint256 netIn = _takeExtraFees(path[0], amountIn, path);
        amounts = getAmountsOut(netIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "SLIPPAGE");
        TransferHelper.safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
        emit RouteUsed(msg.sender, "amm-router", path, amountIn, amounts[amounts.length - 1]);
    }

    function swapExactQIEForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)
        external
        payable
        ensure(deadline)
        returns (uint256[] memory amounts)
    {
        require(path[0] == wqie, "PATH");
        uint256 netIn = _takeExtraFeesNative(msg.value, path);
        amounts = getAmountsOut(netIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "SLIPPAGE");
        WQIE(payable(wqie)).deposit{value: netIn}();
        assert(WQIE(payable(wqie)).transfer(_pairFor(path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        emit RouteUsed(msg.sender, "amm-router", path, msg.value, amounts[amounts.length - 1]);
    }

    function swapExactTokensForQIE(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == wqie, "PATH");
        uint256 netIn = _takeExtraFees(path[0], amountIn, path);
        amounts = getAmountsOut(netIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "SLIPPAGE");
        TransferHelper.safeTransferFrom(path[0], msg.sender, _pairFor(path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        uint256 wad = amounts[amounts.length - 1];
        WQIE(payable(wqie)).withdraw(wad);
        TransferHelper.safeTransferQIE(to, wad);
        emit RouteUsed(msg.sender, "amm-router", path, amountIn, wad);
    }

    /// @notice Swap directly against a single pair (no extra hops). Same extra fees apply.
    function swapExactTokensForTokensDirect(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        uint256 netIn = _takeExtraFees(tokenIn, amountIn, path);
        uint256[] memory amounts = getAmountsOut(netIn, path);
        amountOut = amounts[1];
        require(amountOut >= amountOutMin, "SLIPPAGE");
        TransferHelper.safeTransferFrom(tokenIn, msg.sender, _pairFor(tokenIn, tokenOut), amounts[0]);
        _swap(amounts, path, to);
        emit RouteUsed(msg.sender, "amm-direct", path, amountIn, amountOut);
    }

    // ─── quotes ──────────────────────────────────────────────────────────────

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256) {
        require(amountA > 0 && reserveA > 0 && reserveB > 0, "QUOTE");
        return amountA * reserveB / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "INSUFFICIENT");
        uint256 amountInWithFee = amountIn * LP_FEE_NUM;
        return amountInWithFee * reserveOut / (reserveIn * 1000 + amountInWithFee);
    }

    function getAmountsOut(uint256 amountIn, address[] memory path) public view returns (uint256[] memory amounts) {
        require(path.length >= 2, "PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /// @notice Gross quote including extra creator/protocol fees on the input.
    function quoteSwap(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256 amountOut, uint256 creatorFee, uint256 protocolFee, uint256 lpFeeEstimate)
    {
        (creatorFee, protocolFee) = extraFees(path[0], amountIn, path);
        uint256 net = amountIn - creatorFee - protocolFee;
        uint256[] memory amounts = getAmountsOut(net, path);
        amountOut = amounts[amounts.length - 1];
        // LP fee is 0.30% of each hop input; report first-hop LP fee in input units.
        lpFeeEstimate = net * 3 / 1000;
    }

    function extraFees(address tokenIn, uint256 amountIn, address[] memory path)
        public
        view
        returns (uint256 creatorFee, uint256 protocolFee)
    {
        protocolFee = amountIn * PROTOCOL_FEE_BPS / FEE_DENOM;
        if (_pathHasLaunchpad(path) || _isLaunchpad(tokenIn)) {
            creatorFee = amountIn * CREATOR_FEE_BPS / FEE_DENOM;
        }
    }

    function getReserves(address tokenA, address tokenB) public view returns (uint256 reserveA, uint256 reserveB) {
        (address token0,) = _sortTokens(tokenA, tokenB);
        address pair = IAMMFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "NO_PAIR");
        (uint112 r0, uint112 r1,) = IAMMPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
    }

    // ─── internals ───────────────────────────────────────────────────────────

    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        if (IAMMFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IAMMFactory(factory).createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = _peekReserves(tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "BMIN");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "AMIN");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function _peekReserves(address tokenA, address tokenB) internal view returns (uint256, uint256) {
        address pair = IAMMFactory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) return (0, 0);
        (address token0,) = _sortTokens(tokenA, tokenB);
        (uint112 r0, uint112 r1,) = IAMMPair(pair).getReserves();
        return tokenA == token0 ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
    }

    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) =
                input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
            address to = i < path.length - 2 ? _pairFor(output, path[i + 2]) : _to;
            IAMMPair(_pairFor(input, output)).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }

    function _takeExtraFees(address tokenIn, uint256 amountIn, address[] memory path) internal returns (uint256 net) {
        (uint256 creatorFee, uint256 protocolFee) = extraFees(tokenIn, amountIn, path);
        net = amountIn - creatorFee - protocolFee;
        if (creatorFee + protocolFee > 0) {
            TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), creatorFee + protocolFee);
            _disperseFees(tokenIn, creatorFee, protocolFee, path);
        }
    }

    function _takeExtraFeesNative(uint256 amountIn, address[] memory path) internal returns (uint256 net) {
        (uint256 creatorFee, uint256 protocolFee) = extraFees(wqie, amountIn, path);
        net = amountIn - creatorFee - protocolFee;
        if (protocolFee > 0) {
            address feeRouter = launchpad == address(0) ? address(this) : ILaunchpadFactory(launchpad).feeRouter();
            TransferHelper.safeTransferQIE(feeRouter, protocolFee);
        }
        if (creatorFee > 0) {
            address creator = _creatorForPath(path);
            if (creator == address(0)) {
                address feeRouter = launchpad == address(0) ? address(this) : ILaunchpadFactory(launchpad).feeRouter();
                TransferHelper.safeTransferQIE(feeRouter, creatorFee);
            } else {
                TransferHelper.safeTransferQIE(creator, creatorFee);
            }
        }
        emit ExtraFees(wqie, _creatorForPath(path), creatorFee, protocolFee);
    }

    function _disperseFees(address token, uint256 creatorFee, uint256 protocolFee, address[] memory path)
        internal
    {
        address creator = _creatorForPath(path);
        address feeSink = launchpad == address(0) ? owner : ILaunchpadFactory(launchpad).feeRouter();
        if (creatorFee > 0) {
            TransferHelper.safeTransfer(token, creator == address(0) ? feeSink : creator, creatorFee);
        }
        if (protocolFee > 0) {
            TransferHelper.safeTransfer(token, feeSink, protocolFee);
        }
        emit ExtraFees(token, creator, creatorFee, protocolFee);
    }

    function _isLaunchpad(address token) internal view returns (bool) {
        if (launchpad == address(0)) return false;
        try ILaunchpadFactory(launchpad).isLaunchpadToken(token) returns (bool v) {
            return v;
        } catch {
            return false;
        }
    }

    function _pathHasLaunchpad(address[] memory path) internal view returns (bool) {
        for (uint256 i; i < path.length; i++) {
            if (_isLaunchpad(path[i])) return true;
        }
        return false;
    }

    function _creatorForPath(address[] memory path) internal view returns (address) {
        if (launchpad == address(0)) return address(0);
        for (uint256 i; i < path.length; i++) {
            if (_isLaunchpad(path[i])) return ILaunchpadFactory(launchpad).creatorOf(path[i]);
        }
        return address(0);
    }

    function _pairFor(address tokenA, address tokenB) internal view returns (address pair) {
        pair = IAMMFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "NO_PAIR");
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO");
    }
}
