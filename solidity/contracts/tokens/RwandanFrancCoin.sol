// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CBDCToken.sol";

/**
 * @title Rwandan Franc Coin (RWFC)
 * @dev CBDC for Rwanda
 */
contract RwandanFrancCoin is CBDCToken {
    constructor(address centralBankOfRwanda) CBDCToken("Rwandan Franc Coin", "RWFC", centralBankOfRwanda) {}
}