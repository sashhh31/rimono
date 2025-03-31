// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FLXTokenContractTRC20
 * @dev TRC-20 token with 180-day expiration from minting
 */
contract FLXTokenContractTRC20 {
    // Token details
    string public name = "FLX";
    string public symbol = "FLX";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    
    // Expiration period in seconds (180 days)
    uint256 private constant EXPIRATION_PERIOD = 180 days;
    
    // Token record for tracking mint timestamp
    struct TokenRecord {
        uint256 mintTimestamp;
    }
    
    // Mappings
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => TokenRecord) private _tokenRecords;
    
    // Owner address
    address public owner;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensExpired(address indexed account, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    
    // Reentrancy guard
    bool private _locked;
    
    /**
     * @dev Constructor
     */
    constructor() {
        owner = msg.sender;
    }
    
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
        
        balanceOf[recipient] += amount;
        totalSupply += amount;
        
        emit Transfer(address(0), recipient, amount);
    }
    
    /**
     * @dev Burn tokens from an account (only owner)
     * @param account Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address account, uint256 amount) external onlyOwner nonReentrant {
        require(account != address(0), "Cannot burn from zero address");
        require(amount > 0, "Amount must be greater than zero");
        require(amount <= balanceOf[account], "Burn amount exceeds balance");
        
        balanceOf[account] -= amount;
        totalSupply -= amount;
        
        emit Transfer(account, address(0), amount);
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
     * @dev Transfer tokens to a specified address
     * @param to The address to transfer to
     * @param amount The amount to be transferred
     * @return Success boolean
     */
    function transfer(address to, uint256 amount) public nonReentrant returns (bool) {
        _checkAndHandleExpiration(msg.sender);
        
        require(to != address(0), "Transfer to zero address");
        require(amount <= balanceOf[msg.sender], "Transfer amount exceeds balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @dev Transfer tokens from one address to another
     * @param from address The address which you want to send tokens from
     * @param to address The address which you want to transfer to
     * @param amount uint256 the amount of tokens to be transferred
     * @return Success boolean
     */
    function transferFrom(address from, address to, uint256 amount) public nonReentrant returns (bool) {
        _checkAndHandleExpiration(from);
        
        require(from != address(0), "Transfer from zero address");
        require(to != address(0), "Transfer to zero address");
        require(amount <= balanceOf[from], "Transfer amount exceeds balance");
        require(amount <= allowance[from][msg.sender], "Transfer amount exceeds allowance");
        
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    /**
     * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender
     * @param spender The address which will spend the funds
     * @param amount The amount of tokens to be spent
     * @return Success boolean
     */
    function approve(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Approve to zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    
    /**
     * @dev Internal function to check and handle token expiration
     */
    function _checkAndHandleExpiration(address account) internal {
        if (isExpired(account)) {
            uint256 balance = balanceOf[account];
            if (balance > 0) {
                balanceOf[account] = 0;
                totalSupply -= balance;
                emit TokensExpired(account, balance);
                emit Transfer(account, address(0), balance);
            }
        }
    }
    
    /**
     * @dev Transfer ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "New owner is the zero address");
        owner = newOwner;
    }
} 