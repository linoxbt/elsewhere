// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {IAggregatorV3} from "./interfaces/IOracle.sol";
import {TransferHelper} from "./lib/TransferHelper.sol";

interface IWQIE {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function transfer(address dst, uint256 wad) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface IAMMFactoryLike {
    function getPair(address tokenA, address tokenB) external view returns (address);
}

interface IAMMPairLike {
    function token0() external view returns (address);
    function getReserves() external view returns (uint112, uint112, uint32);
    function price0CumulativeLast() external view returns (uint256);
    function price1CumulativeLast() external view returns (uint256);
}

/// @notice Isolated QIE money market. Suppliers deposit native QIE. Borrowers
///         post ERC-20 collateral priced via WQIE AMM pairs and the QIE/USD
///         oracle, then borrow QIE against it.
contract LendingPool {
    uint256 public constant WAD = 1e18;
    uint256 public constant COLLATERAL_FACTOR_BPS = 7_000;
    uint256 public constant LIQ_THRESHOLD_BPS = 8_000;
    uint256 public constant LIQ_BONUS_BPS = 800;
    uint256 public constant RESERVE_FACTOR_BPS = 1_000;
    uint256 public constant BASE_RATE_WAD = 0.02e18;
    uint256 public constant SLOPE1_WAD = 0.18e18;
    uint256 public constant SLOPE2_WAD = 1.5e18;
    uint256 public constant KINK_BPS = 8_000;
    uint256 public constant YEAR = 365 days;
    uint256 public constant MAX_COLLATERAL_TOKENS = 16;

    IWQIE public immutable wqie;
    IAggregatorV3 public immutable qieUsdOracle;
    IAMMFactoryLike public immutable ammFactory;

    uint256 public totalSupplyShares;
    uint256 public totalBorrows;
    uint256 public borrowIndex = WAD;
    uint256 public lastAccrue;
    uint256 public reserves;

    mapping(address => uint256) public supplyShares;
    mapping(address => uint256) public borrowPrincipal;
    mapping(address => uint256) public borrowUserIndex;
    mapping(address => mapping(address => uint256)) public collateral;
    mapping(address => address[]) internal _collateralTokens;

    /// @dev Time-weighted collateral pricing. Reading the AMM's instantaneous
    ///      spot reserves (the original design) lets anyone move a thin pool's
    ///      price in one transaction, borrow against the inflated valuation,
    ///      then reverse the swap — or push it down to unfairly liquidate a
    ///      healthy borrower. A TWAP over the pair's existing (previously
    ///      unused) cumulative-price accumulators removes the single-block
    ///      manipulation window.
    struct Twap {
        uint256 priceCumulativeLast; // Q112.112 fixed point
        uint32 timestampLast;
        uint32 windowStart;
        uint256 priceAverageWad; // WQIE per 1 token, 1e18 fixed point
    }

    uint32 public constant TWAP_MIN_WINDOW = 30 minutes;
    uint32 public constant TWAP_MAX_STALENESS = 2 hours;

    mapping(address => Twap) public twaps;

    event TwapUpdated(address indexed token, uint256 priceAverageWad);

    event Supplied(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event CollateralDeposited(address indexed user, address indexed token, uint256 amount);
    event CollateralWithdrawn(address indexed user, address indexed token, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(
        address indexed liquidator,
        address indexed user,
        address indexed token,
        uint256 repayQie,
        uint256 seized
    );

    constructor(address wqie_, address oracle_, address ammFactory_) {
        require(wqie_ != address(0) && oracle_ != address(0) && ammFactory_ != address(0), "ZERO");
        wqie = IWQIE(wqie_);
        qieUsdOracle = IAggregatorV3(oracle_);
        ammFactory = IAMMFactoryLike(ammFactory_);
        lastAccrue = block.timestamp;
    }

    receive() external payable {
        if (msg.sender != address(wqie)) {
            _supply(msg.sender, msg.value);
        }
    }

    function accrue() public {
        uint256 dt = block.timestamp - lastAccrue;
        if (dt == 0) return;
        lastAccrue = block.timestamp;
        uint256 borrows = totalBorrows;
        if (borrows == 0) return;
        uint256 rate = borrowRateWad();
        uint256 interest = (borrows * rate * dt) / YEAR / WAD;
        if (interest == 0) return;
        uint256 reserve = (interest * RESERVE_FACTOR_BPS) / 10_000;
        totalBorrows = borrows + interest;
        reserves += reserve;
        borrowIndex = borrowIndex + (borrowIndex * rate * dt) / YEAR / WAD;
    }

    function supply() external payable {
        _supply(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        accrue();
        uint256 bal = supplyBalance(msg.sender);
        require(amount > 0 && amount <= bal, "BAL");
        uint256 shares = (amount * totalSupplyShares) / _totalUnderlying();
        require(shares > 0 && shares <= supplyShares[msg.sender], "SHARES");
        supplyShares[msg.sender] -= shares;
        totalSupplyShares -= shares;
        require(wqie.balanceOf(address(this)) >= amount, "CASH");
        wqie.withdraw(amount);
        TransferHelper.safeTransferQIE(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, shares);
    }

    function depositCollateral(address token, uint256 amount) external {
        require(token != address(0) && token != address(wqie), "TOKEN");
        require(amount > 0, "AMT");
        require(ammFactory.getPair(token, address(wqie)) != address(0), "NO_PAIR");
        // Seed/advance this token's TWAP checkpoint. Depositing itself is safe
        // even before the window has matured (it doesn't rely on price); the
        // price only needs to be ready by the time it's borrowed against.
        updateTwap(token);
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), amount);
        if (collateral[msg.sender][token] == 0) {
            require(_collateralTokens[msg.sender].length < MAX_COLLATERAL_TOKENS, "MAX");
            _collateralTokens[msg.sender].push(token);
        }
        collateral[msg.sender][token] += amount;
        emit CollateralDeposited(msg.sender, token, amount);
    }

    function withdrawCollateral(address token, uint256 amount) external {
        accrue();
        require(amount > 0 && amount <= collateral[msg.sender][token], "BAL");
        _refreshCollateralTwaps(msg.sender);
        collateral[msg.sender][token] -= amount;
        if (collateral[msg.sender][token] == 0) _removeCollateralToken(msg.sender, token);
        require(_healthy(msg.sender, COLLATERAL_FACTOR_BPS), "HEALTH");
        TransferHelper.safeTransfer(token, msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, token, amount);
    }

    function borrow(uint256 amount) external {
        accrue();
        require(amount > 0, "AMT");
        require(wqie.balanceOf(address(this)) >= amount, "CASH");
        _refreshCollateralTwaps(msg.sender);
        uint256 debt = borrowBalance(msg.sender) + amount;
        borrowPrincipal[msg.sender] = debt;
        borrowUserIndex[msg.sender] = borrowIndex;
        totalBorrows += amount;
        require(_healthy(msg.sender, COLLATERAL_FACTOR_BPS), "HEALTH");
        wqie.withdraw(amount);
        TransferHelper.safeTransferQIE(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
    }

    function repay() external payable {
        accrue();
        uint256 debt = borrowBalance(msg.sender);
        require(debt > 0, "DEBT");
        uint256 pay = msg.value > debt ? debt : msg.value;
        uint256 leftover = msg.value - pay;
        borrowPrincipal[msg.sender] = debt - pay;
        borrowUserIndex[msg.sender] = borrowIndex;
        totalBorrows -= pay;
        wqie.deposit{value: pay}();
        if (leftover > 0) TransferHelper.safeTransferQIE(msg.sender, leftover);
        emit Repaid(msg.sender, pay);
    }

    function liquidate(address user, address token) external payable {
        accrue();
        require(user != msg.sender, "SELF");
        _refreshCollateralTwaps(user);
        require(!_healthy(user, LIQ_THRESHOLD_BPS), "HEALTHY");
        uint256 debt = borrowBalance(user);
        require(debt > 0 && msg.value > 0, "DEBT");
        uint256 pay = msg.value > debt ? debt : msg.value;
        uint256 leftover = msg.value - pay;
        uint256 price = tokenUsd8(token);
        uint256 qieUsd = qieUsd8();
        require(price > 0 && qieUsd > 0, "PRICE");
        uint256 seizeUsd8 = (pay * qieUsd * (10_000 + LIQ_BONUS_BPS)) / (1e18 * 10_000);
        uint256 seize = (seizeUsd8 * 1e18) / price;
        uint256 posted = collateral[user][token];
        require(posted > 0, "COLLAT");
        if (seize > posted) seize = posted;
        collateral[user][token] = posted - seize;
        if (collateral[user][token] == 0) _removeCollateralToken(user, token);
        borrowPrincipal[user] = debt - pay;
        borrowUserIndex[user] = borrowIndex;
        totalBorrows -= pay;
        wqie.deposit{value: pay}();
        TransferHelper.safeTransfer(token, msg.sender, seize);
        if (leftover > 0) TransferHelper.safeTransferQIE(msg.sender, leftover);
        emit Liquidated(msg.sender, user, token, pay, seize);
    }

    function supplyBalance(address user) public view returns (uint256) {
        if (totalSupplyShares == 0) return 0;
        return (supplyShares[user] * _previewUnderlying()) / totalSupplyShares;
    }

    function borrowBalance(address user) public view returns (uint256) {
        uint256 principal = borrowPrincipal[user];
        if (principal == 0) return 0;
        uint256 idx = borrowUserIndex[user];
        if (idx == 0) return principal;
        return (principal * _previewBorrowIndex()) / idx;
    }

    function qieUsd8() public view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = qieUsdOracle.latestRoundData();
        require(answer > 0 && updatedAt != 0 && block.timestamp - updatedAt <= 48 hours, "ORACLE");
        return uint256(answer);
    }

    /// @notice USD value of 1e18 units of `token`, priced off a matured TWAP
    ///         (never the AMM's instantaneous spot reserves). Reverts if the
    ///         checkpoint hasn't matured past TWAP_MIN_WINDOW yet or has gone
    ///         stale past TWAP_MAX_STALENESS — callers must call updateTwap()
    ///         (or trigger it via deposit/withdraw/borrow/liquidate) to refresh.
    function tokenUsd8(address token) public view returns (uint256) {
        if (token == address(0) || token == address(wqie)) return qieUsd8();
        Twap storage t = twaps[token];
        require(t.windowStart != 0, "TWAP_UNSET");
        require(block.timestamp - t.windowStart >= TWAP_MIN_WINDOW, "TWAP_WARMUP");
        require(block.timestamp - t.timestampLast <= TWAP_MAX_STALENESS, "TWAP_STALE");
        if (t.priceAverageWad == 0) return 0;
        return (t.priceAverageWad * qieUsd8()) / WAD;
    }

    /// @notice Whether tokenUsd8(token) can currently be read without reverting.
    function twapReady(address token) public view returns (bool) {
        if (token == address(0) || token == address(wqie)) return true;
        Twap storage t = twaps[token];
        if (t.windowStart == 0) return false;
        if (block.timestamp - t.windowStart < TWAP_MIN_WINDOW) return false;
        if (block.timestamp - t.timestampLast > TWAP_MAX_STALENESS) return false;
        return true;
    }

    /// @notice Permissionlessly advance `token`'s TWAP checkpoint against its
    ///         WQIE pair. Anyone can call this (a keeper, or automatically via
    ///         deposit/withdraw/borrow/liquidate) to keep pricing fresh.
    function updateTwap(address token) public returns (uint256 priceAverageWad) {
        address pair = ammFactory.getPair(token, address(wqie));
        require(pair != address(0), "NO_PAIR");
        uint256 priceCumulative = _currentCumulativePrice(token, pair);
        uint32 nowTs = uint32(block.timestamp % 2 ** 32);

        Twap storage t = twaps[token];
        if (t.timestampLast == 0) {
            t.priceCumulativeLast = priceCumulative;
            t.timestampLast = nowTs;
            t.windowStart = nowTs;
            return t.priceAverageWad;
        }
        uint32 elapsed = nowTs - t.timestampLast;
        if (elapsed == 0) return t.priceAverageWad;

        uint256 avgQ112;
        unchecked {
            // Matches the AMM accumulator's own wraparound arithmetic.
            avgQ112 = (priceCumulative - t.priceCumulativeLast) / elapsed;
        }
        t.priceAverageWad = (avgQ112 * WAD) >> 112;
        t.priceCumulativeLast = priceCumulative;
        t.timestampLast = nowTs;
        emit TwapUpdated(token, t.priceAverageWad);
        return t.priceAverageWad;
    }

    /// @dev Cumulative price extrapolated to "now", mirroring the canonical
    ///      UniswapV2 oracle pattern: the pair only writes its accumulator on
    ///      mint/burn/swap/sync, so we add the elapsed-time contribution at
    ///      the pair's last-known reserves on top of its stored value.
    function _currentCumulativePrice(address token, address pair) internal view returns (uint256 priceCumulative) {
        address t0 = IAMMPairLike(pair).token0();
        priceCumulative =
            t0 == token ? IAMMPairLike(pair).price0CumulativeLast() : IAMMPairLike(pair).price1CumulativeLast();
        (uint112 r0, uint112 r1, uint32 pairTs) = IAMMPairLike(pair).getReserves();
        uint32 nowTs = uint32(block.timestamp % 2 ** 32);
        uint32 elapsed = nowTs - pairTs;
        if (elapsed == 0) return priceCumulative;
        (uint256 tokenRes, uint256 wqieRes) = t0 == token ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));
        if (tokenRes == 0) return priceCumulative;
        unchecked {
            priceCumulative += (wqieRes * (uint256(1) << 112) / tokenRes) * elapsed;
        }
    }

    function _refreshCollateralTwaps(address user) internal {
        address[] storage list = _collateralTokens[user];
        for (uint256 i; i < list.length; i++) {
            updateTwap(list[i]);
        }
    }

    function collateralUsd8(address user) public view returns (uint256 usd8) {
        address[] storage list = _collateralTokens[user];
        for (uint256 i; i < list.length; i++) {
            address t = list[i];
            uint256 amt = collateral[user][t];
            if (amt == 0) continue;
            usd8 += (amt * tokenUsd8(t)) / 1e18;
        }
    }

    function debtUsd8(address user) public view returns (uint256) {
        return (borrowBalance(user) * qieUsd8()) / 1e18;
    }

    function healthBps(address user) public view returns (uint256) {
        uint256 debt = debtUsd8(user);
        if (debt == 0) return type(uint256).max;
        return (collateralUsd8(user) * 10_000) / debt;
    }

    function collateralTokens(address user) external view returns (address[] memory) {
        return _collateralTokens[user];
    }

    function utilizationBps() public view returns (uint256) {
        uint256 underlying = _previewUnderlying();
        if (underlying == 0) return 0;
        uint256 borrows = _previewTotalBorrows();
        if (borrows >= underlying) return 10_000;
        return (borrows * 10_000) / underlying;
    }

    function borrowRateWad() public view returns (uint256) {
        uint256 util = utilizationBps();
        if (util <= KINK_BPS) {
            return BASE_RATE_WAD + (SLOPE1_WAD * util) / KINK_BPS;
        }
        uint256 excess = util - KINK_BPS;
        return BASE_RATE_WAD + SLOPE1_WAD + (SLOPE2_WAD * excess) / (10_000 - KINK_BPS);
    }

    function supplyRateWad() public view returns (uint256) {
        uint256 util = utilizationBps();
        return (borrowRateWad() * util * (10_000 - RESERVE_FACTOR_BPS)) / 10_000 / 10_000;
    }

    function marketSnapshot()
        external
        view
        returns (
            uint256 cash,
            uint256 borrows,
            uint256 supplied,
            uint256 utilBps,
            uint256 supplyAprWad,
            uint256 borrowAprWad
        )
    {
        cash = wqie.balanceOf(address(this));
        borrows = _previewTotalBorrows();
        supplied = _previewUnderlying();
        utilBps = utilizationBps();
        supplyAprWad = supplyRateWad();
        borrowAprWad = borrowRateWad();
    }

    function accountSnapshot(address user)
        external
        view
        returns (
            uint256 supplied,
            uint256 borrowed,
            uint256 collatUsd8,
            uint256 debtUsd,
            uint256 health,
            address[] memory tokens
        )
    {
        supplied = supplyBalance(user);
        borrowed = borrowBalance(user);
        collatUsd8 = collateralUsd8(user);
        debtUsd = debtUsd8(user);
        health = healthBps(user);
        tokens = _collateralTokens[user];
    }

    function _supply(address user, uint256 amount) internal {
        require(amount > 0, "AMT");
        accrue();
        uint256 underlying = _totalUnderlying();
        uint256 shares = totalSupplyShares == 0 || underlying == 0
            ? amount
            : (amount * totalSupplyShares) / underlying;
        require(shares > 0, "SHARES");
        supplyShares[user] += shares;
        totalSupplyShares += shares;
        wqie.deposit{value: amount}();
        emit Supplied(user, amount, shares);
    }

    function _totalUnderlying() internal view returns (uint256) {
        return wqie.balanceOf(address(this)) + totalBorrows - reserves;
    }

    function _previewUnderlying() internal view returns (uint256) {
        return wqie.balanceOf(address(this)) + _previewTotalBorrows() - reserves - _previewInterestReserve();
    }

    function _previewTotalBorrows() internal view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrue;
        if (dt == 0 || totalBorrows == 0) return totalBorrows;
        uint256 interest = (totalBorrows * borrowRateWad() * dt) / YEAR / WAD;
        return totalBorrows + interest;
    }

    function _previewInterestReserve() internal view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrue;
        if (dt == 0 || totalBorrows == 0) return 0;
        uint256 interest = (totalBorrows * borrowRateWad() * dt) / YEAR / WAD;
        return (interest * RESERVE_FACTOR_BPS) / 10_000;
    }

    function _previewBorrowIndex() internal view returns (uint256) {
        uint256 dt = block.timestamp - lastAccrue;
        if (dt == 0 || totalBorrows == 0) return borrowIndex;
        return borrowIndex + (borrowIndex * borrowRateWad() * dt) / YEAR / WAD;
    }

    function _healthy(address user, uint256 factorBps) internal view returns (bool) {
        uint256 debt = debtUsd8(user);
        if (debt == 0) return true;
        return collateralUsd8(user) * factorBps / 10_000 >= debt;
    }

    function _removeCollateralToken(address user, address token) internal {
        address[] storage list = _collateralTokens[user];
        for (uint256 i; i < list.length; i++) {
            if (list[i] == token) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
    }
}
