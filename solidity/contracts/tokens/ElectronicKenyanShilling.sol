// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CBDCToken.sol";

/**
 * @title Electronic Kenyan Shilling (eKES)
 * @dev CBDC for Kenya
 */
contract ElectronicKenyanShilling is CBDCToken {
    constructor(address centralBankOfKenya) CBDCToken("Electronic Kenyan Shilling", "eKES", centralBankOfKenya) {}
}