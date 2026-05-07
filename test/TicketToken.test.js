const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

//okay so the fixture pattern gives each test a fresh clean deployment
//instead of redeploying manually in every it() block <- way faster
async function deployFixture() {
    const [owner, buyer, other] = await ethers.getSigners();
    const INITIAL_SUPPLY = 100n;
    const TICKET_PRICE = ethers.parseEther("0.01");

    const TicketToken = await ethers.getContractFactory("TicketToken");
    const ticketToken = await TicketToken.deploy(INITIAL_SUPPLY, TICKET_PRICE);

    return { ticketToken, owner, buyer, other, INITIAL_SUPPLY, TICKET_PRICE };
}

//fixture where buyer already has 5 tickets <- used by return/withdraw tests
async function buyerHasTicketsFixture() {
    const base = await deployFixture();
    const { ticketToken, buyer, TICKET_PRICE } = base;
    await ticketToken.connect(buyer).buyTickets(5n, { value: TICKET_PRICE * 5n });
    return base;
}

describe("TicketToken", function () {

    //--- deployment ---
    describe("Deployment", function () {
        it("sets the token name to EventTicket", async function () {
            const { ticketToken } = await loadFixture(deployFixture);
            expect(await ticketToken.name()).to.equal("EventTicket");
        });

        it("sets the token symbol to TKT", async function () {
            const { ticketToken } = await loadFixture(deployFixture);
            expect(await ticketToken.symbol()).to.equal("TKT");
        });

        it("sets decimals to 0 so tickets are whole units", async function () {
            const { ticketToken } = await loadFixture(deployFixture);
            expect(await ticketToken.decimals()).to.equal(0n);
        });

        it("sets the deployer as owner", async function () {
            const { ticketToken, owner } = await loadFixture(deployFixture);
            expect(await ticketToken.owner()).to.equal(owner.address);
        });

        it("mints the full initial supply into the contract's own balance", async function () {
            const { ticketToken, INITIAL_SUPPLY } = await loadFixture(deployFixture);
            const contractAddr = await ticketToken.getAddress();
            expect(await ticketToken.balanceOf(contractAddr)).to.equal(INITIAL_SUPPLY);
        });

        it("leaves the deployer with 0 tokens at start", async function () {
            const { ticketToken, owner } = await loadFixture(deployFixture);
            expect(await ticketToken.balanceOf(owner.address)).to.equal(0n);
        });

        it("sets the correct ticket price", async function () {
            const { ticketToken, TICKET_PRICE } = await loadFixture(deployFixture);
            expect(await ticketToken.ticketPrice()).to.equal(TICKET_PRICE);
        });
    });

    //--- buyTickets ---
    describe("buyTickets", function () {
        it("transfers the correct number of tickets to the buyer", async function () {
            const { ticketToken, buyer, TICKET_PRICE } = await loadFixture(deployFixture);
            await ticketToken.connect(buyer).buyTickets(3n, { value: TICKET_PRICE * 3n });
            expect(await ticketToken.balanceOf(buyer.address)).to.equal(3n);
        });

        it("emits a TicketPurchased event with the right args", async function () {
            const { ticketToken, buyer, TICKET_PRICE } = await loadFixture(deployFixture);
            await expect(
                ticketToken.connect(buyer).buyTickets(1n, { value: TICKET_PRICE })
            ).to.emit(ticketToken, "TicketPurchased").withArgs(buyer.address, 1n);
        });

        it("reverts when amount is 0", async function () {
            const { ticketToken, buyer } = await loadFixture(deployFixture);
            await expect(
                ticketToken.connect(buyer).buyTickets(0n, { value: 0n })
            ).to.be.revertedWith("must buy at least one ticket");
        });

        it("reverts when the wrong amount of ETH is sent", async function () {
            const { ticketToken, buyer, TICKET_PRICE } = await loadFixture(deployFixture);
            //sending half the price should fail
            await expect(
                ticketToken.connect(buyer).buyTickets(1n, { value: TICKET_PRICE / 2n })
            ).to.be.revertedWith("incorrect SETH amount sent");
        });

        it("reverts when the contract has run out of tickets", async function () {
            const { ticketToken, buyer, TICKET_PRICE, INITIAL_SUPPLY } = await loadFixture(deployFixture);
            //buy the whole lot first
            await ticketToken.connect(buyer).buyTickets(INITIAL_SUPPLY, { value: TICKET_PRICE * INITIAL_SUPPLY });
            //now trying to buy one more should revert
            await expect(
                ticketToken.connect(buyer).buyTickets(1n, { value: TICKET_PRICE })
            ).to.be.revertedWith("not enough tickets available");
        });

        it("updates ticketsAvailable and ticketsSold correctly", async function () {
            const { ticketToken, buyer, TICKET_PRICE } = await loadFixture(deployFixture);
            await ticketToken.connect(buyer).buyTickets(3n, { value: TICKET_PRICE * 3n });
            expect(await ticketToken.ticketsAvailable()).to.equal(97n);
            expect(await ticketToken.ticketsSold()).to.equal(3n);
        });
    });

    //--- returnTickets ---
    describe("returnTickets", function () {
        it("moves tickets back to contract and refunds SETH to caller", async function () {
            const { ticketToken, buyer, TICKET_PRICE } = await loadFixture(buyerHasTicketsFixture);
            const balanceBefore = await ethers.provider.getBalance(buyer.address);

            const tx = await ticketToken.connect(buyer).returnTickets(2n);
            const receipt = await tx.wait();
            //gas cost so we can account for it in the balance check
            const gasCost = receipt.gasUsed * receipt.gasPrice;

            const balanceAfter = await ethers.provider.getBalance(buyer.address);
            expect(await ticketToken.balanceOf(buyer.address)).to.equal(3n);
            //buyer got their 2 * ticketPrice back minus gas
            expect(balanceAfter).to.be.closeTo(
                balanceBefore + TICKET_PRICE * 2n - gasCost,
                ethers.parseEther("0.0001")
            );
        });

        it("emits a TicketReturned event with the right args", async function () {
            const { ticketToken, buyer } = await loadFixture(buyerHasTicketsFixture);
            await expect(
                ticketToken.connect(buyer).returnTickets(1n)
            ).to.emit(ticketToken, "TicketReturned").withArgs(buyer.address, 1n);
        });

        it("reverts when amount is 0", async function () {
            const { ticketToken, buyer } = await loadFixture(buyerHasTicketsFixture);
            await expect(
                ticketToken.connect(buyer).returnTickets(0n)
            ).to.be.revertedWith("must return at least one ticket");
        });

        it("reverts if caller does not hold enough tickets", async function () {
            const { ticketToken, other } = await loadFixture(buyerHasTicketsFixture);
            //`other` has no tickets at all
            await expect(
                ticketToken.connect(other).returnTickets(1n)
            ).to.be.revertedWith("not enough tickets to return");
        });
    });

    //--- withdraw ---
    describe("withdraw", function () {
        it("sends all contract ETH to the owner", async function () {
            const { ticketToken, owner, TICKET_PRICE } = await loadFixture(buyerHasTicketsFixture);
            const ownerBefore = await ethers.provider.getBalance(owner.address);
            const contractBalance = await ethers.provider.getBalance(await ticketToken.getAddress());

            const tx = await ticketToken.connect(owner).withdraw();
            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed * receipt.gasPrice;

            const ownerAfter = await ethers.provider.getBalance(owner.address);
            expect(ownerAfter).to.be.closeTo(
                ownerBefore + contractBalance - gasCost,
                ethers.parseEther("0.0001")
            );
        });

        it("reverts if called by a non-owner", async function () {
            const { ticketToken, buyer } = await loadFixture(buyerHasTicketsFixture);
            await expect(
                ticketToken.connect(buyer).withdraw()
            ).to.be.revertedWithCustomError(ticketToken, "OwnableUnauthorizedAccount");
        });

        it("reverts if there is nothing to withdraw", async function () {
            const { ticketToken, owner } = await loadFixture(deployFixture);
            //no tickets sold means contract has 0 ETH
            await expect(
                ticketToken.connect(owner).withdraw()
            ).to.be.revertedWith("nothing to withdraw");
        });
    });

    //--- ERC-20 standard compliance ---
    describe("ERC-20 standard", function () {
        it("supports direct transfer between two external addresses", async function () {
            const { ticketToken, buyer, other } = await loadFixture(buyerHasTicketsFixture);
            await ticketToken.connect(buyer).transfer(other.address, 2n);
            expect(await ticketToken.balanceOf(other.address)).to.equal(2n);
            expect(await ticketToken.balanceOf(buyer.address)).to.equal(3n);
        });

        it("supports the approve + transferFrom flow", async function () {
            const { ticketToken, buyer, other, owner } = await loadFixture(buyerHasTicketsFixture);
            //buyer approves other to spend 3 of their tickets
            await ticketToken.connect(buyer).approve(other.address, 3n);
            expect(await ticketToken.allowance(buyer.address, other.address)).to.equal(3n);

            //other moves 2 of those tickets to owner
            await ticketToken.connect(other).transferFrom(buyer.address, owner.address, 2n);
            expect(await ticketToken.balanceOf(owner.address)).to.equal(2n);
            expect(await ticketToken.balanceOf(buyer.address)).to.equal(3n);
            //allowance should be reduced by 2
            expect(await ticketToken.allowance(buyer.address, other.address)).to.equal(1n);
        });
    });

    //--- isValidTicketHolder ---
    describe("isValidTicketHolder", function () {
        it("returns false for an address with no tickets", async function () {
            const { ticketToken, other } = await loadFixture(deployFixture);
            expect(await ticketToken.isValidTicketHolder(other.address)).to.equal(false);
        });

        it("returns true for an address that holds at least one ticket", async function () {
            const { ticketToken, buyer, TICKET_PRICE } = await loadFixture(deployFixture);
            await ticketToken.connect(buyer).buyTickets(1n, { value: TICKET_PRICE });
            expect(await ticketToken.isValidTicketHolder(buyer.address)).to.equal(true);
        });

        it("returns false again after the holder returns all their tickets", async function () {
            const { ticketToken, buyer, TICKET_PRICE } = await loadFixture(deployFixture);
            await ticketToken.connect(buyer).buyTickets(1n, { value: TICKET_PRICE });
            await ticketToken.connect(buyer).returnTickets(1n);
            expect(await ticketToken.isValidTicketHolder(buyer.address)).to.equal(false);
        });
    });
});
