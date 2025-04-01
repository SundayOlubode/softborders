// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CBDC Token Base
 * @dev Base contract for CBDC tokens
 */
abstract contract CBDCToken is ERC20, ERC20Burnable, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Central bank address
    address public centralBank;
    
    // Events
    event Minted(address indexed to, uint256 amount);
    event Burned(address indexed from, uint256 amount);
    
    constructor(
        string memory name,
        string memory symbol,
        address _centralBank
    ) ERC20(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, _centralBank);
        _grantRole(MINTER_ROLE, _centralBank);
        _grantRole(BURNER_ROLE, _centralBank);
        _grantRole(PAUSER_ROLE, _centralBank);
        
        centralBank = _centralBank;
    }
    
    /**
     * @dev Mint tokens to address
     * @param to recipient address
     * @param amount amount to mint
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) whenNotPaused {
        _mint(to, amount);
        emit Minted(to, amount);
    }
    
    /**
     * @dev Burn tokens from address
     * @param from address to burn from
     * @param amount amount to burn
     */
    function burnFrom(address from, uint256 amount) public override onlyRole(BURNER_ROLE) whenNotPaused {
        _burn(from, amount);
        emit Burned(from, amount);
    }
    
    /**
     * @dev Pause token transfers
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause token transfers
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Override transfer functions to add paused modifier
     */
    function transfer(address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transfer(to, amount);
    }
    
    function transferFrom(address from, address to, uint256 amount) public override whenNotPaused returns (bool) {
        return super.transferFrom(from, to, amount);
    }
}