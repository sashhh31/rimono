// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title FLXTokenContract
 * @dev BEP-20 token with 180-day expiration from minting
 */
contract FLXTokenContract is ERC20, Ownable, ReentrancyGuard {
    // Expiration period in seconds (180 days)
    uint256 private constant EXPIRATION_PERIOD = 180 days;
    
    // Token record for tracking mint timestamp
    struct TokenRecord {
        uint256 mintTimestamp;
    }
    
    // Mapping from address to token record
    mapping(address => TokenRecord) private _tokenRecords;
    
    // Events
    event TokensExpired(address indexed account, uint256 amount);
    
    /**
     * @dev Constructor
     */
    constructor() ERC20("FLX", "FLX") Ownable(msg.sender) {}
    
    /**
     * @dev Mint new tokens (only owner)
     * @param recipient Address to receive the tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address recipient, uint256 amount) external onlyOwner nonReentrant {
        require(recipient != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than zero");
        
        // Always update the mint timestamp on new mints
        _tokenRecords[recipient].mintTimestamp = block.timestamp;
        
        _mint(recipient, amount);
    }
    
    /**
     * @dev Burn tokens from an account (only owner)
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) external onlyOwner nonReentrant {
        require(account != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= balanceOf(account), "Burn amount exceeds balance");
        
        _burn(account, amount);
    }
    
    /**
     * @dev Check if tokens are expired
     * @param account Address to check
     * @return True if tokens are expired
     */
    function isExpired(address account) public view returns (bool) {
        if (_tokenRecords[account].mintTimestamp == 0) {
            return false; // No tokens minted yet
        }
        
        return block.timestamp > _tokenRecords[account].mintTimestamp + EXPIRATION_PERIOD;
    }
    
    /**
     * @dev Override transfer function to check expiration
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        _checkAndHandleExpiration(msg.sender);
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom function to check expiration
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _checkAndHandleExpiration(from);
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @dev Internal function to check and handle token expiration
     */
    function _checkAndHandleExpiration(address account) internal {
        if (isExpired(account)) {
            uint256 balance = balanceOf(account);
            if (balance > 0) {
                _burn(account, balance);
                emit TokensExpired(account, balance);
            }
        }
    }
} 