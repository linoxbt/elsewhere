// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {IAggregatorV3} from "./interfaces/IOracle.sol";
import {TransferHelper} from "./lib/TransferHelper.sol";

interface IWQIE2 {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function transfer(address dst, uint256 wad) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @notice Supply native QIE as collateral, then borrow listed tokens (ELSE).
///         Each listed token has its own cash/borrows and utilization APR.
contract MoneyMarket {
    uint256 public constant WAD = 1e18;
    uint256 public constant COLLATERAL_FACTOR_BPS = 7_000;
    uint256 public constant LIQ_THRESHOLD_BPS = 8_000;
    uint256 public constant RESERVE_FACTOR_BPS = 1_000;
    uint256 public constant BASE_RATE_WAD = 0.05e18;
    uint256 public constant SLOPE1_WAD = 0.15e18;
    uint256 public constant SLOPE2_WAD = 2e18;
    uint256 public constant KINK_BPS = 8_000;
    uint256 public constant YEAR = 365 days;

    struct Market {
        bool listed;
        uint256 cash;
        uint256 borrows;
        uint256 borrowIndex;
        uint256 lastAccrue;
        uint256 priceQieWad;
        uint256 reserves;
    }

    IWQIE2 public immutable wqie;
    IAggregatorV3 public immutable qieUsdOracle;
    address public owner;

    uint256 public totalSupplyShares;
    mapping(address => uint256) public supplyShares;

    mapping(address => Market) public markets;
    address[] public listedTokens;

    mapping(address => mapping(address => uint256)) public borrowPrincipal;
    mapping(address => mapping(address => uint256)) public borrowUserIndex;

    event Supplied(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event Listed(address indexed token, uint256 priceQieWad);
    event Seeded(address indexed token, uint256 amount);
    event PriceSet(address indexed token, uint256 priceQieWad);
    event Borrowed(address indexed user, address indexed token, uint256 amount);
    event Repaid(address indexed user, address indexed token, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "OWNER");
        _;
    }

    constructor(address wqie_, address oracle_) {
        require(wqie_ != address(0) && oracle_ != address(0), "ZERO");
        wqie = IWQIE2(wqie_);
        qieUsdOracle = IAggregatorV3(oracle_);
        owner = msg.sender;
    }

    receive() external payable {
        if (msg.sender != address(wqie)) _supply(msg.sender, msg.value);
    }

    function listToken(address token, uint256 priceQieWad) external onlyOwner {
        require(token != address(0) && priceQieWad > 0, "TOKEN");
        Market storage m = markets[token];
        if (!m.listed) {
            m.listed = true;
            m.borrowIndex = WAD;
            m.lastAccrue = block.timestamp;
            listedTokens.push(token);
        }
        m.priceQieWad = priceQieWad;
        emit Listed(token, priceQieWad);
    }

    function seedToken(address token, uint256 amount) external {
        require(markets[token].listed, "LIST");
        require(amount > 0, "AMT");
        accrue(token);
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), amount);
        markets[token].cash += amount;
        emit Seeded(token, amount);
    }

    function setPrice(address token, uint256 priceQieWad) external onlyOwner {
        require(markets[token].listed && priceQieWad > 0, "TOKEN");
        markets[token].priceQieWad = priceQieWad;
        emit PriceSet(token, priceQieWad);
    }

    function supply() external payable {
        _supply(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "AMT");
        _accrueAll();
        uint256 bal = supplyBalance(msg.sender);
        require(amount <= bal, "BAL");
        uint256 shares = (amount * totalSupplyShares) / _totalUnderlying();
        supplyShares[msg.sender] -= shares;
        totalSupplyShares -= shares;
        require(_healthy(msg.sender, COLLATERAL_FACTOR_BPS), "HEALTH");
        require(wqie.balanceOf(address(this)) >= amount, "CASH");
        wqie.withdraw(amount);
        TransferHelper.safeTransferQIE(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, shares);
    }

    function borrow(address token, uint256 amount) external {
        require(amount > 0, "AMT");
        accrue(token);
        Market storage m = markets[token];
        require(m.listed && m.cash >= amount, "CASH");
        uint256 debt = borrowBalance(msg.sender, token) + amount;
        borrowPrincipal[msg.sender][token] = debt;
        borrowUserIndex[msg.sender][token] = m.borrowIndex;
        m.borrows += amount;
        m.cash -= amount;
        require(_healthy(msg.sender, COLLATERAL_FACTOR_BPS), "HEALTH");
        TransferHelper.safeTransfer(token, msg.sender, amount);
        emit Borrowed(msg.sender, token, amount);
    }

    function repay(address token, uint256 amount) external {
        accrue(token);
        uint256 debt = borrowBalance(msg.sender, token);
        require(debt > 0, "DEBT");
        uint256 pay = amount > debt ? debt : amount;
        TransferHelper.safeTransferFrom(token, msg.sender, address(this), pay);
        Market storage m = markets[token];
        borrowPrincipal[msg.sender][token] = debt - pay;
        borrowUserIndex[msg.sender][token] = m.borrowIndex;
        m.borrows -= pay;
        m.cash += pay;
        emit Repaid(msg.sender, token, pay);
    }

    function accrue(address token) public {
        Market storage m = markets[token];
        if (!m.listed) return;
        uint256 dt = block.timestamp - m.lastAccrue;
        if (dt == 0) return;
        m.lastAccrue = block.timestamp;
        if (m.borrows == 0) return;
        uint256 rate = _borrowRate(m);
        uint256 interest = (m.borrows * rate * dt) / YEAR / WAD;
        if (interest == 0) return;
        uint256 reserve = (interest * RESERVE_FACTOR_BPS) / 10_000;
        m.borrows += interest;
        m.reserves += reserve;
        m.borrowIndex = m.borrowIndex + (m.borrowIndex * rate * dt) / YEAR / WAD;
    }

    function supplyBalance(address user) public view returns (uint256) {
        if (totalSupplyShares == 0) return 0;
        return (supplyShares[user] * _totalUnderlying()) / totalSupplyShares;
    }

    function borrowBalance(address user, address token) public view returns (uint256) {
        uint256 principal = borrowPrincipal[user][token];
        if (principal == 0) return 0;
        Market storage m = markets[token];
        uint256 idx = borrowUserIndex[user][token];
        if (idx == 0) return principal;
        return (principal * _previewIndex(m)) / idx;
    }

    function listedCount() external view returns (uint256) {
        return listedTokens.length;
    }

    function utilizationBps(address token) public view returns (uint256) {
        Market storage m = markets[token];
        uint256 borrows = _previewBorrows(m);
        uint256 liq = m.cash + borrows;
        if (liq == 0) return 0;
        if (borrows >= liq) return 10_000;
        return (borrows * 10_000) / liq;
    }

    function borrowRateWad(address token) public view returns (uint256) {
        return _borrowRate(markets[token]);
    }

    function supplyRateWad(address token) public view returns (uint256) {
        uint256 util = utilizationBps(token);
        return (borrowRateWad(token) * util * (10_000 - RESERVE_FACTOR_BPS)) / 10_000 / 10_000;
    }

    /// @notice Blended QIE supplier APR from listed-token borrow interest.
    function qieSupplyRateWad() public view returns (uint256) {
        uint256 supplied = _totalUnderlying();
        if (supplied == 0) return 0;
        uint256 acc;
        for (uint256 i; i < listedTokens.length; i++) {
            address t = listedTokens[i];
            Market storage m = markets[t];
            uint256 borrows = _previewBorrows(m);
            if (borrows == 0 || m.priceQieWad == 0) continue;
            uint256 debtQie = (borrows * m.priceQieWad) / WAD;
            acc += (supplyRateWad(t) * debtQie) / supplied;
        }
        return acc;
    }

    function accountSnapshot(address user)
        external
        view
        returns (uint256 supplied, uint256 debtQie, uint256 health, address[] memory tokens)
    {
        supplied = supplyBalance(user);
        tokens = listedTokens;
        for (uint256 i; i < tokens.length; i++) {
            uint256 bal = borrowBalance(user, tokens[i]);
            if (bal == 0) continue;
            debtQie += (bal * markets[tokens[i]].priceQieWad) / WAD;
        }
        if (debtQie == 0) health = type(uint256).max;
        else health = (supplied * 10_000) / debtQie;
    }

    function marketSnapshot(address token)
        external
        view
        returns (
            bool listed,
            uint256 cash,
            uint256 borrows,
            uint256 utilBps,
            uint256 borrowAprWad,
            uint256 supplyAprWad,
            uint256 priceQieWad
        )
    {
        Market storage m = markets[token];
        listed = m.listed;
        cash = m.cash;
        borrows = _previewBorrows(m);
        utilBps = utilizationBps(token);
        borrowAprWad = borrowRateWad(token);
        supplyAprWad = supplyRateWad(token);
        priceQieWad = m.priceQieWad;
    }

    function qieUsd8() public view returns (uint256) {
        (, int256 answer,, uint256 updatedAt,) = qieUsdOracle.latestRoundData();
        require(answer > 0 && updatedAt != 0 && block.timestamp - updatedAt <= 48 hours, "ORACLE");
        return uint256(answer);
    }

    function _supply(address user, uint256 amount) internal {
        require(amount > 0, "AMT");
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
        return wqie.balanceOf(address(this));
    }

    function _healthy(address user, uint256 factorBps) internal view returns (bool) {
        uint256 supplied = supplyBalance(user);
        uint256 debtQie;
        for (uint256 i; i < listedTokens.length; i++) {
            address t = listedTokens[i];
            uint256 bal = borrowBalance(user, t);
            if (bal == 0) continue;
            debtQie += (bal * markets[t].priceQieWad) / WAD;
        }
        if (debtQie == 0) return true;
        return (supplied * factorBps) / 10_000 >= debtQie;
    }

    function _borrowRate(Market storage m) internal view returns (uint256) {
        uint256 borrows = m.borrows;
        uint256 liq = m.cash + borrows;
        uint256 util = liq == 0 ? 0 : (borrows * 10_000) / liq;
        if (util > 10_000) util = 10_000;
        if (util <= KINK_BPS) return BASE_RATE_WAD + (SLOPE1_WAD * util) / KINK_BPS;
        return BASE_RATE_WAD + SLOPE1_WAD + (SLOPE2_WAD * (util - KINK_BPS)) / (10_000 - KINK_BPS);
    }

    function _previewBorrows(Market storage m) internal view returns (uint256) {
        uint256 dt = block.timestamp - m.lastAccrue;
        if (dt == 0 || m.borrows == 0) return m.borrows;
        uint256 interest = (m.borrows * _borrowRate(m) * dt) / YEAR / WAD;
        return m.borrows + interest;
    }

    function _previewIndex(Market storage m) internal view returns (uint256) {
        uint256 dt = block.timestamp - m.lastAccrue;
        if (dt == 0 || m.borrows == 0) return m.borrowIndex;
        return m.borrowIndex + (m.borrowIndex * _borrowRate(m) * dt) / YEAR / WAD;
    }

    function _accrueAll() internal {
        for (uint256 i; i < listedTokens.length; i++) accrue(listedTokens[i]);
    }
}
