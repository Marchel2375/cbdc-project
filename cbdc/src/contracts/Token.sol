// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    address public minter;
    
    event MinterChanged(address indexed from, address to);
    
    constructor() payable ERC20("CBDC", "CBDC") {
    minter = msg.sender; //only initially
    }
    
    function passMinterRole(address dBank) public returns (bool) {
      require(msg.sender==minter, 'Error, only owner can change pass minter role');
      minter = dBank;
      emit MinterChanged(msg.sender, dBank);
      return true;
    }
    
    function mint(address account, uint256 amount) public {
    	require(msg.sender==minter, 'Error, msg.sender does not have minter role');
    	_mint(account, amount);
    }
    
    function burn(uint256 amount) public{
        require(msg.sender==minter, 'Error, msg.sender does not have minter role');
        _burn(msg.sender, amount);
    }
	
	function approve(address spender, uint256 amount) public override returns (bool){
	    _approve(tx.origin, spender, amount);
	    return true;
	}

}