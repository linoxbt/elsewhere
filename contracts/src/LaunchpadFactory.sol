// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ShrineToken} from "./ShrineToken.sol";
import {BondingCurve} from "./BondingCurve.sol";
import {WQIE} from "./WQIE.sol";
import {TransferHelper} from "./lib/TransferHelper.sol";
import {OracleLib} from "./lib/OracleLib.sol";

contract LaunchpadFactory {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;
    /// @dev $2.50 creation fee, 18-decimal USD.
    uint256 public constant CREATION_FEE_USD = 2.5 ether;
    /// @dev $25,000 graduation market cap, 18-decimal USD.
    uint256 public constant DEFAULT_GRADUATION_USD = 25_000 ether;

    address public owner;
    address public immutable wqie;
    address public feeRouter;
    address public ammFactory;
    address public ammRouter;
    address public qieUsdOracle;

    uint256 public graduationMarketCapUsd = DEFAULT_GRADUATION_USD;
    uint256 public virtualQuote;
    uint256 public virtualToken = TOTAL_SUPPLY;

    address[] public allTokens;
    mapping(address => address) public curveOf;
    mapping(address => address) public creatorOf;
    mapping(address => address) public pairOf;
    mapping(address => string) public metadataURIOf;
    mapping(address => bool) public isLaunchpadToken;

    event OwnershipTransferred(address indexed previous, address indexed next);
    event AddressesSet(address feeRouter, address ammFactory, address ammRouter, address oracle);
    event ParamsSet(uint256 graduationMarketCapUsd, uint256 virtualQuote, uint256 virtualToken);
    event TokenCreated(
        address indexed token,
        address indexed curve,
        address indexed creator,
        string name,
        string symbol,
        string metadataURI,
        uint256 creationFee,
        uint256 initialBuy
    );
    event TokenGraduated(address indexed token, address indexed pair);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address wqie_, address oracle_, uint256 virtualQuote_) {
        require(wqie_ != address(0) && oracle_ != address(0), "ZERO");
        require(virtualQuote_ > 0, "VIRTUAL");
        owner = msg.sender;
        wqie = wqie_;
        qieUsdOracle = oracle_;
        virtualQuote = virtualQuote_;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "ZERO");
        emit OwnershipTransferred(owner, next);
        owner = next;
    }

    function setAddresses(address feeRouter_, address ammFactory_, address ammRouter_, address oracle_)
        external
        onlyOwner
    {
        require(feeRouter_ != address(0) && ammFactory_ != address(0) && ammRouter_ != address(0), "ZERO");
        feeRouter = feeRouter_;
        ammFactory = ammFactory_;
        ammRouter = ammRouter_;
        if (oracle_ != address(0)) qieUsdOracle = oracle_;
        emit AddressesSet(feeRouter_, ammFactory_, ammRouter_, qieUsdOracle);
    }

    function setParams(uint256 graduationUsd, uint256 virtualQuote_, uint256 virtualToken_) external onlyOwner {
        require(graduationUsd > 0 && virtualQuote_ > 0 && virtualToken_ > 0, "PARAMS");
        graduationMarketCapUsd = graduationUsd;
        virtualQuote = virtualQuote_;
        virtualToken = virtualToken_;
        emit ParamsSet(graduationUsd, virtualQuote_, virtualToken_);
    }

    function allTokensLength() external view returns (uint256) {
        return allTokens.length;
    }

    /// @notice Live QIE/USD from the official oracle, 8 decimals.
    function qieUsd8() public view returns (uint256) {
        return OracleLib.readUsd8(qieUsdOracle);
    }

    function oracleUpdatedAt() public view returns (uint256) {
        return OracleLib.updatedAt(qieUsdOracle);
    }

    function creationFeeQie() public view returns (uint256) {
        uint256 px = qieUsd8();
        // 2.5e18 USD * 1e8 / px  → QIE wei
        return CREATION_FEE_USD * 1e8 / px;
    }

    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata metadataURI,
        uint256 initialBuyQie
    ) external payable returns (address token, address curve) {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "NAME");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 16, "SYMBOL");
        require(bytes(metadataURI).length > 0, "META");
        require(ammFactory != address(0) && feeRouter != address(0), "NOT_SET");

        uint256 fee = creationFeeQie();
        require(msg.value >= fee + initialBuyQie, "FEE");

        ShrineToken t = new ShrineToken(name, symbol, TOTAL_SUPPLY, address(this));
        token = address(t);
        BondingCurve c = new BondingCurve(token, wqie, address(this), msg.sender, virtualQuote, virtualToken);
        curve = address(c);

        require(t.transfer(curve, TOTAL_SUPPLY), "SEED");

        curveOf[token] = curve;
        creatorOf[token] = msg.sender;
        metadataURIOf[token] = metadataURI;
        isLaunchpadToken[token] = true;
        allTokens.push(token);

        // Creation fee → FeeRouter as native QIE.
        TransferHelper.safeTransferQIE(feeRouter, fee);

        emit TokenCreated(token, curve, msg.sender, name, symbol, metadataURI, fee, initialBuyQie);

        uint256 leftover = msg.value - fee - initialBuyQie;
        if (initialBuyQie > 0) {
            BondingCurve(payable(curve)).buy{value: initialBuyQie}(0, msg.sender);
        }
        if (leftover > 0) {
            TransferHelper.safeTransferQIE(msg.sender, leftover);
        }
    }

    function markGraduated(address token, address pair) external {
        require(msg.sender == curveOf[token], "NOT_CURVE");
        pairOf[token] = pair;
        emit TokenGraduated(token, pair);
    }
}
