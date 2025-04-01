// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title Mock Chainlink Oracle
 * @dev For testing purposes - simulates a Chainlink oracle
 */
contract MockOracle is AggregatorV3Interface {
    int256 private price;
    uint8 private decimals_;
    string private description_;
    uint256 private version_;
    
    constructor(int256 _initialPrice, uint8 _decimals) {
        price = _initialPrice;
        decimals_ = _decimals;
        description_ = "RWFC / KES";
        version_ = 1;
    }
    
    function decimals() external view override returns (uint8) {
        return decimals_;
    }
    
    function description() external view override returns (string memory) {
        return description_;
    }
    
    function version() external view override returns (uint256) {
        return version_;
    }
    
    function getRoundData(uint80 _roundId) external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (_roundId, price, block.timestamp, block.timestamp, _roundId);
    }
    
    function latestRoundData() external view override returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (1, price, block.timestamp, block.timestamp, 1);
    }
    
    // Admin function to update price (not part of the interface)
    function updatePrice(int256 _newPrice) external {
        price = _newPrice;
    }
}