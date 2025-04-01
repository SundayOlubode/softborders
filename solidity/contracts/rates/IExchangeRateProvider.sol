// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Exchange Rate Provider Interface
 * @dev Interface for exchange rate providers
 */
interface IExchangeRateProvider {
    /**
     * @dev Get exchange rate between RWFC and eKES
     * @return rate Exchange rate (RWFC to eKES) with 8 decimals
     */
    function getExchangeRate() external view returns (uint256 rate);
}