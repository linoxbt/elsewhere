// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {TransferHelper} from "./lib/TransferHelper.sol";

interface IWQIEDca {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
    function transfer(address dst, uint256 wad) external returns (bool);
    function approve(address guy, uint256 wad) external returns (bool);
}

interface IUniV2Router {
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);
    function extraFees(address tokenIn, uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256 creatorFee, uint256 protocolFee);
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/// @notice Recurring slice swaps. Matches enshrined.exchange DCA rules:
///         1% fee per executed swap (paid to the executor), 5 minute min
///         interval, 7 day max duration, cancel anytime.
contract DCA {
    uint256 public constant FEE_BPS = 100;
    uint256 public constant MIN_INTERVAL = 5 minutes;
    uint256 public constant MAX_DURATION = 7 days;
    uint256 public constant MIN_SLICES = 2;

    struct Order {
        address owner;
        address tokenIn;
        address tokenOut;
        uint256 amountPerSlice;
        uint32 slices;
        uint32 executed;
        uint32 interval;
        uint32 nextExec;
        uint16 slippageBps;
        bool cancelled;
        bool nativeIn;
        bool nativeOut;
    }

    IUniV2Router public immutable router;
    IWQIEDca public immutable wqie;

    uint256 public nextId = 1;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) internal _ownerOrders;

    event Created(uint256 indexed id, address indexed owner, address tokenIn, address tokenOut, uint256 total, uint32 slices, uint32 interval);
    event Executed(uint256 indexed id, address indexed executor, uint256 amountIn, uint256 amountOut, uint256 fee);
    event Cancelled(uint256 indexed id, uint256 refunded);

    constructor(address router_, address wqie_) {
        require(router_ != address(0) && wqie_ != address(0), "ZERO");
        router = IUniV2Router(router_);
        wqie = IWQIEDca(wqie_);
    }

    receive() external payable {
        require(msg.sender == address(wqie), "WQIE_ONLY");
    }

    function create(
        address tokenIn,
        address tokenOut,
        uint256 totalAmount,
        uint32 slices,
        uint32 interval,
        uint16 slippageBps
    ) external payable returns (uint256 id) {
        require(slices >= MIN_SLICES, "SLICES");
        require(interval >= MIN_INTERVAL, "INTERVAL");
        require(uint256(slices) * uint256(interval) <= MAX_DURATION, "DURATION");
        require(slippageBps <= 2_000, "SLIP");
        require(totalAmount > 0 && totalAmount % slices == 0, "AMOUNT");

        bool nativeIn = tokenIn == address(0);
        bool nativeOut = tokenOut == address(0);
        address inAddr = nativeIn ? address(wqie) : tokenIn;
        address outAddr = nativeOut ? address(wqie) : tokenOut;
        require(inAddr != outAddr, "PAIR");

        if (nativeIn) {
            require(msg.value == totalAmount, "VALUE");
            wqie.deposit{value: totalAmount}();
        } else {
            require(msg.value == 0, "VALUE");
            TransferHelper.safeTransferFrom(inAddr, msg.sender, address(this), totalAmount);
        }

        id = nextId++;
        orders[id] = Order({
            owner: msg.sender,
            tokenIn: inAddr,
            tokenOut: outAddr,
            amountPerSlice: totalAmount / slices,
            slices: slices,
            executed: 0,
            interval: interval,
            nextExec: uint32(block.timestamp),
            slippageBps: slippageBps,
            cancelled: false,
            nativeIn: nativeIn,
            nativeOut: nativeOut
        });
        _ownerOrders[msg.sender].push(id);
        emit Created(id, msg.sender, inAddr, outAddr, totalAmount, slices, interval);
    }

    function execute(uint256 id) external {
        Order storage o = orders[id];
        require(o.owner != address(0) && !o.cancelled, "ORDER");
        require(o.executed < o.slices, "DONE");
        require(block.timestamp >= o.nextExec, "WAIT");

        uint256 slice = o.amountPerSlice;
        uint256 fee = (slice * FEE_BPS) / 10_000;
        uint256 trade = slice - fee;
        o.executed += 1;
        o.nextExec = uint32(block.timestamp + o.interval);

        if (o.nativeIn) {
            wqie.withdraw(fee);
            TransferHelper.safeTransferQIE(msg.sender, fee);
        } else {
            TransferHelper.safeTransfer(o.tokenIn, msg.sender, fee);
        }

        address[] memory path = new address[](2);
        path[0] = o.tokenIn;
        path[1] = o.tokenOut;
        // The router deducts its own extra creator/protocol fee from `trade`
        // before swapping (relevant whenever tokenIn/tokenOut touches a
        // launchpad token) — quote against that net amount, not the gross
        // slice, or a real execution can undershoot the quoted minOut and
        // revert with SLIPPAGE (or, with looser tolerance, silently deliver
        // less than the quote implied).
        (uint256 routerCreatorFee, uint256 routerProtocolFee) = router.extraFees(o.tokenIn, trade, path);
        uint256 netTrade = trade - routerCreatorFee - routerProtocolFee;
        uint256[] memory quoted = router.getAmountsOut(netTrade, path);
        uint256 minOut = (quoted[quoted.length - 1] * (10_000 - o.slippageBps)) / 10_000;

        _approveRouter(o.tokenIn, trade);
        uint256[] memory amounts = router.swapExactTokensForTokens(trade, minOut, path, address(this), block.timestamp + 10 minutes);
        uint256 outAmt = amounts[amounts.length - 1];

        if (o.nativeOut) {
            wqie.withdraw(outAmt);
            TransferHelper.safeTransferQIE(o.owner, outAmt);
        } else {
            TransferHelper.safeTransfer(o.tokenOut, o.owner, outAmt);
        }

        emit Executed(id, msg.sender, trade, outAmt, fee);
    }

    function cancel(uint256 id) external {
        Order storage o = orders[id];
        require(o.owner == msg.sender, "OWNER");
        require(!o.cancelled && o.executed < o.slices, "DONE");
        o.cancelled = true;
        uint256 left = o.amountPerSlice * (o.slices - o.executed);
        if (o.nativeIn) {
            wqie.withdraw(left);
            TransferHelper.safeTransferQIE(o.owner, left);
        } else {
            TransferHelper.safeTransfer(o.tokenIn, o.owner, left);
        }
        emit Cancelled(id, left);
    }

    function ownerOrders(address user) external view returns (uint256[] memory) {
        return _ownerOrders[user];
    }

    function remaining(uint256 id) external view returns (uint256) {
        Order storage o = orders[id];
        if (o.cancelled || o.executed >= o.slices) return 0;
        return o.amountPerSlice * (o.slices - o.executed);
    }

    function _approveRouter(address token, uint256 amount) internal {
        TransferHelper.safeApprove(token, address(router), 0);
        TransferHelper.safeApprove(token, address(router), amount);
    }
}
