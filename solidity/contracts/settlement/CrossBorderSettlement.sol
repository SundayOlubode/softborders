// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../tokens/RwandanFrancCoin.sol";
import "../tokens/ElectronicKenyanShilling.sol";
import "../rates/IExchangeRateProvider.sol";

/**
 * @title Cross-Border Settlement Contract
 * @dev Manages cross-border transfers between Rwanda and Kenya
 */
contract CrossBorderSettlement is AccessControl, Pausable {
    // Token contracts
    RwandanFrancCoin public rwfcToken;
    ElectronicKenyanShilling public ekesToken;
    
    // Exchange rate provider
    IExchangeRateProvider public exchangeRateProvider;
    
    // Fee percentage with 2 decimal precision (e.g., 0.25% = 25)
    uint256 public feePercentage;
    
    // Fee recipients
    address public rwandaCentralBank;
    address public kenyaCentralBank;
    
    // Roles
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant RATE_PROVIDER_MANAGER_ROLE = keccak256("RATE_PROVIDER_MANAGER_ROLE");
    
    // Events
    event SettlementRwandaToKenya(
        address indexed sender,
        address indexed recipient,
        uint256 rwfcAmount,
        uint256 kesAmount,
        uint256 exchangeRate,
        uint256 fee
    );
    
    event SettlementKenyaToRwanda(
        address indexed sender,
        address indexed recipient,
        uint256 kesAmount,
        uint256 rwfcAmount,
        uint256 exchangeRate,
        uint256 fee
    );
    
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event ExchangeRateProviderUpdated(address oldProvider, address newProvider);
    
    constructor(
        address _rwfcToken,
        address _ekesToken,
        address _exchangeRateProvider,
        uint256 _initialFeePercentage,
        address _rwandaCentralBank,
        address _kenyaCentralBank
    ) {
        rwfcToken = RwandanFrancCoin(_rwfcToken);
        ekesToken = ElectronicKenyanShilling(_ekesToken);
        exchangeRateProvider = IExchangeRateProvider(_exchangeRateProvider);
        feePercentage = _initialFeePercentage;
        rwandaCentralBank = _rwandaCentralBank;
        kenyaCentralBank = _kenyaCentralBank;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);
        _grantRole(RATE_PROVIDER_MANAGER_ROLE, msg.sender);
    }
    
    /**
     * @dev Transfer RWFC from Rwanda to Kenya (convert to eKES)
     * @param recipient Recipient address in Kenya
     * @param rwfcAmount Amount of RWFC to transfer
     */
    function transferRwandaToKenya(address recipient, uint256 rwfcAmount) external whenNotPaused {
        require(rwfcAmount > 0, "Amount must be greater than zero");
        
        // Get current exchange rate (RWFC to eKES)
        uint256 exchangeRate = exchangeRateProvider.getExchangeRate();
        
        // Calculate fee
        uint256 fee = (rwfcAmount * feePercentage) / 10000;
        uint256 rwfcAmountAfterFee = rwfcAmount - fee;
        
        // Calculate KES amount (8 decimal precision in rate)
        uint256 kesAmount = (rwfcAmountAfterFee * exchangeRate) / 10**8;
        
        // Transfer RWFC from sender to settlement contract
        require(rwfcToken.transferFrom(msg.sender, address(this), rwfcAmount), "RWFC transfer failed");
        
        // Transfer fee to Rwanda central bank
        require(rwfcToken.transfer(rwandaCentralBank, fee), "Fee transfer failed");
        
        // Burn remaining RWFC
        rwfcToken.burn(rwfcAmountAfterFee);
        
        // Mint equivalent eKES to recipient
        ekesToken.mint(recipient, kesAmount);
        
        emit SettlementRwandaToKenya(
            msg.sender,
            recipient,
            rwfcAmount,
            kesAmount,
            exchangeRate,
            fee
        );
    }
    
    /**
     * @dev Transfer eKES from Kenya to Rwanda (convert to RWFC)
     * @param recipient Recipient address in Rwanda
     * @param kesAmount Amount of eKES to transfer
     */
    function transferKenyaToRwanda(address recipient, uint256 kesAmount) external whenNotPaused {
        require(kesAmount > 0, "Amount must be greater than zero");
        
        // Get current exchange rate (RWFC to eKES)
        uint256 exchangeRate = exchangeRateProvider.getExchangeRate();
        
        // Calculate fee
        uint256 fee = (kesAmount * feePercentage) / 10000;
        uint256 kesAmountAfterFee = kesAmount - fee;
        
        // Calculate RWFC amount (8 decimal precision in rate)
        uint256 rwfcAmount = (kesAmountAfterFee * 10**8) / exchangeRate;
        
        // Transfer eKES from sender to settlement contract
        require(ekesToken.transferFrom(msg.sender, address(this), kesAmount), "eKES transfer failed");
        
        // Transfer fee to Kenya central bank
        require(ekesToken.transfer(kenyaCentralBank, fee), "Fee transfer failed");
        
        // Burn remaining eKES
        ekesToken.burn(kesAmountAfterFee);
        
        // Mint equivalent RWFC to recipient
        rwfcToken.mint(recipient, rwfcAmount);
        
        emit SettlementKenyaToRwanda(
            msg.sender,
            recipient,
            kesAmount,
            rwfcAmount,
            exchangeRate,
            fee
        );
    }
    
    /**
     * @dev Update fee percentage
     * @param newFeePercentage New fee percentage with 2 decimal precision
     */
    function updateFee(uint256 newFeePercentage) external onlyRole(FEE_MANAGER_ROLE) {
        require(newFeePercentage <= 1000, "Fee cannot exceed 10%");
        uint256 oldFee = feePercentage;
        feePercentage = newFeePercentage;
        emit FeeUpdated(oldFee, newFeePercentage);
    }
    
    /**
     * @dev Update exchange rate provider
     * @param newProvider New exchange rate provider address
     */
    function updateExchangeRateProvider(address newProvider) external onlyRole(RATE_PROVIDER_MANAGER_ROLE) {
        address oldProvider = address(exchangeRateProvider);
        exchangeRateProvider = IExchangeRateProvider(newProvider);
        emit ExchangeRateProviderUpdated(oldProvider, newProvider);
    }
    
    /**
     * @dev Pause settlement operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause settlement operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
}