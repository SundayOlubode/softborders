// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IExchangeRateProvider.sol";

/**
 * @title Fixed Exchange Rate Provider
 * @dev Provides a fixed exchange rate that can be updated by admin
 */
contract FixedExchangeRateProvider is IExchangeRateProvider, AccessControl {
    // Exchange rate with 8 decimal precision (e.g., 9.45 = 945000000)
    uint256 public rwfcToKesRate;
    
    bytes32 public constant RATE_UPDATER_ROLE = keccak256("RATE_UPDATER_ROLE");
    
    event RateUpdated(uint256 oldRate, uint256 newRate);
    
    constructor(uint256 initialRate) {
        rwfcToKesRate = initialRate;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RATE_UPDATER_ROLE, msg.sender);
    }
    
    /**
     * @dev Get current exchange rate
     */
    function getExchangeRate() external view override returns (uint256 rate) {
        return rwfcToKesRate;
    }
    
    /**
     * @dev Update exchange rate
     * @param newRate New exchange rate with 8 decimal precision
     */
    function updateRate(uint256 newRate) external onlyRole(RATE_UPDATER_ROLE) {
        require(newRate > 0, "Rate must be positive");
        uint256 oldRate = rwfcToKesRate;
        rwfcToKesRate = newRate;
        emit RateUpdated(oldRate, newRate);
    }
}