// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {ILaunchpadFactory, IAMMFactory, IAMMPair} from "./interfaces/IShrine.sol";
import {TransferHelper} from "./lib/TransferHelper.sol";
import {WQIE} from "./WQIE.sol";

/// @notice Constant-product bonding curve quoted in WQIE / native QIE.
///         Graduates to the shrine AMM once USD market cap hits the factory threshold.
contract BondingCurve {
    uint256 public constant FEE_DENOM = 100_000;
    uint256 public constant CREATOR_FEE_BPS = 425; // 0.425%
    uint256 public constant PROTOCOL_FEE_BPS = 575; // 0.575%  → 1.000% total
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    address public immutable token;
    address public immutable wqie;
    address public immutable factory;
    address public immutable creator;
    uint256 public immutable virtualQuote;
    uint256 public immutable virtualToken;

    uint256 public realQuote;
    uint256 public tokensSold;
    bool public graduated;
    address public pair;

    event Trade(
        address indexed trader,
        bool isBuy,
        uint256 quoteAmount,
        uint256 tokenAmount,
        uint256 price,
        uint256 marketCapUsd,
        uint256 creatorFee,
        uint256 protocolFee
    );
    event Graduated(address indexed pair, uint256 quoteLiquidity, uint256 tokenLiquidity);

    modifier notGraduated() {
        require(!graduated, "GRADUATED");
        _;
    }

    constructor(
        address token_,
        address wqie_,
        address factory_,
        address creator_,
        uint256 virtualQuote_,
        uint256 virtualToken_
    ) {
        require(token_ != address(0) && wqie_ != address(0) && factory_ != address(0), "ZERO");
        require(virtualQuote_ > 0 && virtualToken_ > 0, "VIRTUAL");
        token = token_;
        wqie = wqie_;
        factory = factory_;
        creator = creator_;
        virtualQuote = virtualQuote_;
        virtualToken = virtualToken_;
    }

    receive() external payable {
        if (msg.sender != wqie) {
            buy(0, msg.sender);
        }
    }

    function getReserves() public view returns (uint256 quoteReserve, uint256 tokenReserve) {
        quoteReserve = virtualQuote + realQuote;
        tokenReserve = virtualToken - tokensSold;
    }

    /// @notice Spot price in WQIE wei per 1 token (1e18).
    function price() public view returns (uint256) {
        (uint256 q, uint256 t) = getReserves();
        if (t == 0) return 0;
        return q * 1e18 / t;
    }

    /// @notice USD market cap, 18 decimals.
    function marketCapUsd() public view returns (uint256) {
        (uint256 q, uint256 t) = getReserves();
        if (t == 0) return 0;
        uint256 mcapQie = q * TOTAL_SUPPLY / t;
        uint256 qieUsd = ILaunchpadFactory(factory).qieUsd8();
        return mcapQie * qieUsd / 1e8;
    }

    function quoteBuy(uint256 quoteIn)
        public
        view
        returns (uint256 tokensOut, uint256 creatorFee, uint256 protocolFee)
    {
        (creatorFee, protocolFee) = _splitFee(quoteIn);
        uint256 net = quoteIn - creatorFee - protocolFee;
        (uint256 q, uint256 t) = getReserves();
        tokensOut = (net * t) / (q + net);
    }

    function quoteSell(uint256 tokensIn)
        public
        view
        returns (uint256 quoteOut, uint256 creatorFee, uint256 protocolFee)
    {
        (uint256 q, uint256 t) = getReserves();
        require(tokensIn < t, "CURVE_EMPTY");
        uint256 gross = (tokensIn * q) / (t + tokensIn);
        (creatorFee, protocolFee) = _splitFee(gross);
        quoteOut = gross - creatorFee - protocolFee;
    }

    function buy(uint256 minTokensOut, address to) public payable notGraduated returns (uint256 tokensOut) {
        require(msg.value > 0, "ZERO_IN");
        WQIE(payable(wqie)).deposit{value: msg.value}();
        tokensOut = _buy(msg.value, minTokensOut, to);
    }

    function buyWQIE(uint256 quoteIn, uint256 minTokensOut, address to)
        external
        notGraduated
        returns (uint256 tokensOut)
    {
        require(quoteIn > 0, "ZERO_IN");
        TransferHelper.safeTransferFrom(wqie, msg.sender, address(this), quoteIn);
        tokensOut = _buy(quoteIn, minTokensOut, to);
    }

    function sell(uint256 tokensIn, uint256 minQuoteOut, address to)
        external
        notGraduated
        returns (uint256 quoteOut)
    {
        require(tokensIn > 0, "ZERO_IN");
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), tokensIn);

        uint256 creatorFee;
        uint256 protocolFee;
        (quoteOut, creatorFee, protocolFee) = quoteSell(tokensIn);
        require(quoteOut >= minQuoteOut, "SLIPPAGE");
        require(realQuote >= quoteOut + creatorFee + protocolFee, "RESERVE");

        tokensSold -= tokensIn;
        realQuote -= (quoteOut + creatorFee + protocolFee);

        _payFees(creatorFee, protocolFee);
        TransferHelper.safeTransfer(wqie, to, quoteOut);

        emit Trade(msg.sender, false, quoteOut + creatorFee + protocolFee, tokensIn, price(), marketCapUsd(), creatorFee, protocolFee);
    }

    function graduate() public {
        require(!graduated, "ALREADY");
        require(marketCapUsd() >= ILaunchpadFactory(factory).graduationMarketCapUsd(), "NOT_READY");
        _graduate();
    }

    function _buy(uint256 quoteIn, uint256 minTokensOut, address to) internal returns (uint256 tokensOut) {
        uint256 creatorFee;
        uint256 protocolFee;
        (tokensOut, creatorFee, protocolFee) = quoteBuy(quoteIn);
        require(tokensOut >= minTokensOut, "SLIPPAGE");
        require(tokensOut > 0, "ZERO_OUT");
        uint256 remaining = IERC20(token).balanceOf(address(this));
        require(tokensOut <= remaining, "SOLD_OUT");

        uint256 net = quoteIn - creatorFee - protocolFee;
        realQuote += net;
        tokensSold += tokensOut;

        _payFees(creatorFee, protocolFee);
        TransferHelper.safeTransfer(token, to, tokensOut);

        emit Trade(msg.sender, true, quoteIn, tokensOut, price(), marketCapUsd(), creatorFee, protocolFee);

        if (marketCapUsd() >= ILaunchpadFactory(factory).graduationMarketCapUsd()) {
            _graduate();
        }
    }

    function _graduate() internal {
        graduated = true;

        address ammFactory = ILaunchpadFactory(factory).ammFactory();
        address existing = IAMMFactory(ammFactory).getPair(token, wqie);
        if (existing == address(0)) {
            pair = IAMMFactory(ammFactory).createPair(token, wqie);
        } else {
            pair = existing;
        }

        // Price-continuous seed: LP tokens = realQuote * tokenReserve / quoteReserve
        (uint256 q, uint256 t) = getReserves();
        uint256 quoteLiq = IERC20(wqie).balanceOf(address(this));
        uint256 tokenLiq = quoteLiq * t / q;
        uint256 tokenBal = IERC20(token).balanceOf(address(this));
        if (tokenLiq > tokenBal) tokenLiq = tokenBal;

        TransferHelper.safeTransfer(wqie, pair, quoteLiq);
        TransferHelper.safeTransfer(token, pair, tokenLiq);
        IAMMPair(pair).mint(DEAD);

        // Burn leftover unsold tokens so supply matches circulating + LP.
        uint256 leftover = IERC20(token).balanceOf(address(this));
        if (leftover > 0) {
            TransferHelper.safeTransfer(token, DEAD, leftover);
        }

        ILaunchpadFactory(factory).markGraduated(token, pair);
        emit Graduated(pair, quoteLiq, tokenLiq);
    }

    function _payFees(uint256 creatorFee, uint256 protocolFee) internal {
        if (creatorFee > 0) TransferHelper.safeTransfer(wqie, creator, creatorFee);
        address feeRouter = ILaunchpadFactory(factory).feeRouter();
        if (protocolFee > 0) {
            TransferHelper.safeTransfer(wqie, feeRouter, protocolFee);
        }
    }

    function _splitFee(uint256 amount) internal pure returns (uint256 creatorFee, uint256 protocolFee) {
        creatorFee = amount * CREATOR_FEE_BPS / FEE_DENOM;
        protocolFee = amount * PROTOCOL_FEE_BPS / FEE_DENOM;
    }

}
