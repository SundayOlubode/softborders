// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./IExchangeRateProvider.sol";

/**
 * @title Oracle Exchange Rate Provider
 * @dev Provides exchange rate from Chainlink oracle
 */
contract OracleExchangeRateProvider is IExchangeRateProvider, AccessControl {
    AggregatorV3Interface public oracle;
    
    bytes32 public constant ORACLE_UPDATER_ROLE = keccak256("ORACLE_UPDATER_ROLE");
    
    event OracleUpdated(address oldOracle, address newOracle);
    
    constructor(address oracleAddress) {
        oracle = AggregatorV3Interface(oracleAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_UPDATER_ROLE, msg.sender);
    }
    
    /**
     * @dev Get current exchange rate from oracle
     */
    function getExchangeRate() external view override returns (uint256 rate) {
        (, int256 price, , , ) = oracle.latestRoundData();
        require(price > 0, "Invalid oracle price");
        return uint256(price);
    }
    
    /**
     * @dev Update oracle address
     * @param newOracleAddress New oracle contract address
     */
    function updateOracle(address newOracleAddress) external onlyRole(ORACLE_UPDATER_ROLE) {
        address oldOracle = address(oracle);
        oracle = AggregatorV3Interface(newOracleAddress);
        emit OracleUpdated(oldOracle, newOracleAddress);
    }
}