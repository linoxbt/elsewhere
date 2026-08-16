// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AMMPair} from "./AMMPair.sol";

contract AMMFactory {
    address public feeTo;
    address public owner;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event OwnershipTransferred(address indexed previous, address indexed next);
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 index);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO");
        require(getPair[token0][token1] == address(0), "EXISTS");
        AMMPair p = new AMMPair();
        p.initialize(token0, token1);
        pair = address(p);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length - 1);
    }

    function setFeeTo(address feeTo_) external onlyOwner {
        feeTo = feeTo_;
    }

    function transferOwnership(address next) external onlyOwner {
        require(next != address(0), "ZERO");
        emit OwnershipTransferred(owner, next);
        owner = next;
    }
}
