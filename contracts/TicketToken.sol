// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

//okay so this is the main ticket contract <- it extends ERC20 so tickets behave like standard tokens
//we also inherit Ownable (owner-only withdraw) and ReentrancyGuard (blocks reentrancy attacks on ETH transfers)
contract TicketToken is ERC20, Ownable, ReentrancyGuard {

    //price per ticket in wei, set once at deployment
    uint256 public ticketPrice;

    //we store the initial supply so ticketsSold() can compute correctly later
    uint256 private _initialSupply;

    //these events fire on every purchase/return so block explorers can track activity
    event TicketPurchased(address indexed buyer, uint256 amount);
    event TicketReturned(address indexed holder, uint256 amount);

    //constructor mints all tickets directly into the contract's own balance
    //this way the contract IS the vendor and holds all unsold stock
    constructor(uint256 initialSupply, uint256 _ticketPrice)
        ERC20("EventTicket", "TKT")
        Ownable(msg.sender)
    {
        require(initialSupply > 0, "supply must be positive");
        require(_ticketPrice > 0, "price must be positive");
        _initialSupply = initialSupply;
        ticketPrice = _ticketPrice;
        //mint all tickets to address(this) <- the contract holds them until purchased
        _mint(address(this), initialSupply);
    }

    //override decimals to 0 because tickets are whole items, not fractions
    function decimals() public pure override returns (uint8) {
        return 0;
    }

    //lets anyone buy `amount` tickets by sending exactly ticketPrice * amount SETH
    //nonReentrant blocks attackers from re-entering before state updates finish
    function buyTickets(uint256 amount) external payable nonReentrant {
        require(amount > 0, "must buy at least one ticket");
        require(msg.value == ticketPrice * amount, "incorrect SETH amount sent");
        require(balanceOf(address(this)) >= amount, "not enough tickets available");

        //move tickets from the contract's stock to the buyer
        _transfer(address(this), msg.sender, amount);
        emit TicketPurchased(msg.sender, amount);
    }

    //lets a ticket holder return tickets for a full SETH refund
    //we move tokens back first, then send ETH <- this order prevents reentrancy exploits
    function returnTickets(uint256 amount) external nonReentrant {
        require(amount > 0, "must return at least one ticket");
        require(balanceOf(msg.sender) >= amount, "not enough tickets to return");

        uint256 refund = ticketPrice * amount;
        require(address(this).balance >= refund, "contract has insufficient ETH for refund");

        //tokens go back to the contract before ETH is sent out
        _transfer(msg.sender, address(this), amount);
        (bool sent, ) = payable(msg.sender).call{value: refund}("");
        require(sent, "ETH refund failed");
        emit TicketReturned(msg.sender, amount);
    }

    //owner (venue operator) can pull all collected SETH to their wallet
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "nothing to withdraw");
        (bool sent, ) = payable(owner()).call{value: balance}("");
        require(sent, "withdraw failed");
    }

    //how many tickets are still in the contract's stock <- unsold seats
    function ticketsAvailable() external view returns (uint256) {
        return balanceOf(address(this));
    }

    //how many tickets have left the contract so far <- sold seats
    function ticketsSold() external view returns (uint256) {
        return _initialSupply - balanceOf(address(this));
    }

    //doorman uses this to check if a wallet holds at least one valid ticket
    function isValidTicketHolder(address account) external view returns (bool) {
        return balanceOf(account) >= 1;
    }
}
