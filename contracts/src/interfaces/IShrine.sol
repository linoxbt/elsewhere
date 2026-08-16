// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILaunchpadFactory {
    function wqie() external view returns (address);
    function feeRouter() external view returns (address);
    function ammFactory() external view returns (address);
    function ammRouter() external view returns (address);
    function qieUsdOracle() external view returns (address);
    function qieUsd8() external view returns (uint256);
    function oracleUpdatedAt() external view returns (uint256);
    function graduationMarketCapUsd() external view returns (uint256);
    function creatorOf(address token) external view returns (address);
    function curveOf(address token) external view returns (address);
    function pairOf(address token) external view returns (address);
    function isLaunchpadToken(address token) external view returns (bool);
    function markGraduated(address token, address pair) external;
}

interface IBondingCurve {
    function token() external view returns (address);
    function graduated() external view returns (bool);
    function buy(uint256 minTokensOut, address to) external payable returns (uint256 tokensOut);
    function buyWQIE(uint256 quoteIn, uint256 minTokensOut, address to) external returns (uint256 tokensOut);
    function sell(uint256 tokensIn, uint256 minQuoteOut, address to) external returns (uint256 quoteOut);
    function getReserves() external view returns (uint256 quoteReserve, uint256 tokenReserve);
    function quoteBuy(uint256 quoteIn) external view returns (uint256 tokensOut, uint256 creatorFee, uint256 protocolFee);
    function quoteSell(uint256 tokensIn) external view returns (uint256 quoteOut, uint256 creatorFee, uint256 protocolFee);
    function marketCapUsd() external view returns (uint256);
}

interface IAMMFactory {
    function getPair(address tokenA, address tokenB) external view returns (address);
    function allPairs(uint256) external view returns (address);
    function allPairsLength() external view returns (uint256);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IAMMPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function totalSupply() external view returns (uint256);
    function balanceOf(address) external view returns (uint256);
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
    function sync() external;
}

interface IAMMRouter {
    function factory() external view returns (address);
    function wqie() external view returns (address);
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
    function addLiquidityQIE(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountQIEMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountQIE, uint256 liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function swapExactQIEForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
    function swapExactTokensForQIE(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
}

interface IFeeRouter {
    function onProtocolFee(address token, uint256 amount) external;
    function treasury() external view returns (address);
}
