// SPDX-License-Identifier: MIT

//need to seprate the contracts due to how there is too big to be deployed
pragma solidity >=0.6.0 <0.9.0;


import "./Token.sol";
import "./Security.sol";
import "solidity-linked-list/contracts/StructuredLinkedList.sol";




contract dapps {

    struct Request{
        address Buyer;
        address Seller;
        uint256 amount;
        uint256 price;
        uint256 securityid;
        bytes32 status;
    }

    using StructuredLinkedList for StructuredLinkedList.List;

    Request[] requests;

    mapping(address=>StructuredLinkedList.List) public confirmations;
    mapping(address=>StructuredLinkedList.List) public pendings;


    Token private token;
    Security [] public security;
    address public CB;

    constructor(Token _token){
        token = _token;
        CB = msg.sender;
    }

    function AddSecurity(string memory _name, string memory _symbol) public{
        require(msg.sender==CB);
        security.push(new Security(_name, _symbol));
    }

    function SecurityLength() view public returns(uint256){
        return security.length;
    }

    function RemoveConfirmPending (uint256 node) public{
        confirmations[requests[node-1].Buyer].remove(node);
        pendings[requests[node-1].Seller].remove(node);
    }

    function ispending (uint256 node) view private{
        require((requests[node-1].status) == bytes32("pending"), "Error, request not pending");
    }

    function RequestSellSecurity(uint256 amount, uint256 price, address Buyer, uint256 id) public {
        transferSecurity(address(this), amount, id);
        Request memory temp;
        temp.Buyer = Buyer;
        temp.Seller = msg.sender;
        temp.amount = amount;
        temp.price = price;
        temp.securityid = id;
        temp.status = "pending";
        requests.push(temp);
        confirmations[Buyer].insertAfter(0,requests.length);
        pendings[msg.sender].insertAfter(0,requests.length);

    }

    function GetRequest(uint node) public view returns(uint, address, address, uint256, uint256, bytes32, string memory){
        require(node>0);
        uint temp = node-1;
        return (node, requests[temp].Buyer,requests[temp].Seller,requests[temp].amount,requests[temp].price,requests[temp].status, security[requests[temp].securityid].name());
    }

    function CancelRequest(uint256 node) public{
        require(msg.sender == requests[node-1].Seller);
        ispending(node);
        //return the token
        security[requests[node-1].securityid].transfer(requests[node-1].Seller,requests[node-1].amount);

        RemoveConfirmPending (node);

        requests[node-1].status = "cancelled";
    }

    function RejectRequest(uint256 node) public{
        require(msg.sender == requests[node-1].Buyer);
        ispending(node);
        //return the security
        security[requests[node-1].securityid].transfer(requests[node-1].Seller,requests[node-1].amount);

        RemoveConfirmPending (node);

        requests[node-1].status = "rejected";
    }

    function ConfirmRequest(uint256 node) public{
        require(msg.sender == requests[node-1].Buyer);
        ispending(node);

        //transfer token
        if(token.balanceOf(msg.sender) >= requests[node-1].price){
            transfer(requests[node-1].Seller, requests[node-1].price);
            //transfer security
            security[requests[node-1].securityid].transfer(requests[node-1].Buyer,requests[node-1].amount);
            requests[node-1].status = "success";
            RemoveConfirmPending (node);
        }
        else{
            RejectRequest(node);
        }
        
        //remove pendings and confrimations
        

        
    }

//change list to next

    function nextConfirmations(uint256 node, address from)public view returns( bool, uint256 ){
        return confirmations[from].getNextNode(node);
    }

    function nextPendings(uint256 node, address from)public view returns(bool, uint256){
        return pendings[from].getNextNode(node);
    }

    function issuance(address to, uint256 amount) public{
        require(msg.sender==CB, 'Error, msg.sender does not have central bank role');
        token.mint(to, amount);
    }

    function issuanceSecurity(address to, uint256 amount, uint256 id) public{
        require(msg.sender==CB, 'Error, msg.sender does not have central bank role');
        security[id].mint(to, amount);
    }

    function redemption (uint256 amount) public {
        require(token.approve(address(this), amount),"error can't approve amount");
        require(token.transferFrom(msg.sender, address(this), amount), "Error, can't receive tokens");
        token.burn(amount);
    }

    function redemptionSecurity (uint256 amount, uint256 id) public {
        require(security[id].approve(address(this), amount),"error can't approve amount");
        require(security[id].transferFrom(msg.sender, address(this), amount), "Error, can't receive tokens");
        security[id].burn(amount);
    }

    function transfer(address to, uint256 amount) public{
        require(token.approve(address(this), amount),"error can't approve amount");
        require(token.transferFrom(msg.sender, to, amount), "Error, can't send tokens");
    }

    function transferSecurity(address to, uint256 amount, uint256 id) public{
        require(security[id].approve(address(this), amount),"error can't approve amount");
        require(security[id].transferFrom(msg.sender, to, amount), "Error, can't send tokens");
    }

    function passCentralBankRole(address newCB) public{
        require(msg.sender==CB, 'Error, msg.sender does not have central bank role');
        CB = newCB;
    }

    fallback() external payable {}

    receive() external payable {}


}