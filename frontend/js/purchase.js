//purchase.js - lets a user buy event tickets using SETH through metamask
//flow: connect metamask -> check network -> input amount -> preview cost -> confirm tx

let web3 = null;
let account = null;
let contract = null;
let ticketPriceWei = null;  //raw wei string from the contract

//read-only provider for loading the ticket price before metamask is connected
const readWeb3 = new Web3(SEPOLIA_RPC);
const readContract = new readWeb3.eth.Contract(ABI, CONTRACT_ADDRESS);

// ── utility: status display ──

function showStatus(msg, type) {
    const box = document.getElementById("statusBox");
    box.className = "status-box status-" + type;
    document.getElementById("statusMsg").textContent = msg;
    box.classList.remove("hidden");
}

function hideStatus() {
    document.getElementById("statusBox").classList.add("hidden");
}

// ── load ticket price from contract (no wallet needed) ──

async function loadTicketPrice() {
    try {
        const priceWei = await readContract.methods.ticketPrice().call();
        ticketPriceWei = priceWei.toString();
        const priceEth = readWeb3.utils.fromWei(ticketPriceWei, "ether");
        document.getElementById("ticketPriceDisplay").textContent = priceEth + " SETH";

        //also show how many are still available
        const available = await readContract.methods.ticketsAvailable().call();
        document.getElementById("availableDisplay").textContent = available.toString() + " tickets remaining";

        //trigger a cost preview update with the default quantity of 1
        updateCostPreview();

    } catch (err) {
        document.getElementById("ticketPriceDisplay").textContent = "Unable to load";
        //not critical at this stage, just a UI hint that the contract might not be deployed yet
    }
}

// ── update the total cost preview live as the user types ──

function updateCostPreview() {
    if (!ticketPriceWei) return;

    const amountInput = document.getElementById("amountInput").value;
    const amount = parseInt(amountInput);

    if (!amount || amount < 1) {
        document.getElementById("totalCostDisplay").textContent = "—";
        return;
    }

    //use BigInt for the multiplication to avoid floating point issues with wei amounts
    const totalWei = (BigInt(ticketPriceWei) * BigInt(amount)).toString();
    const totalEth = readWeb3.utils.fromWei(totalWei, "ether");
    document.getElementById("totalCostDisplay").textContent = totalEth + " SETH";
}

// ── metamask connection ──

document.getElementById("connectBtn").addEventListener("click", connectWallet);

async function connectWallet() {
    if (!window.ethereum) {
        showStatus("MetaMask is not installed. Install it from metamask.io and try again.", "error");
        return;
    }

    try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        web3 = new Web3(window.ethereum);

        //check the user is on sepolia before proceeding
        const chainId = await web3.eth.getChainId();
        if (parseInt(chainId) !== SEPOLIA_CHAIN_ID) {
            showStatus("Wrong network. Switch MetaMask to Sepolia (chain ID 11155111) and try again.", "error");
            return;
        }

        const accounts = await web3.eth.getAccounts();
        account = accounts[0];
        contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

        //update the UI to show the purchase form
        document.getElementById("connectSection").classList.add("hidden");
        document.getElementById("purchaseSection").classList.remove("hidden");
        document.getElementById("connectedAddress").textContent = account.slice(0, 6) + "..." + account.slice(-4);
        hideStatus();

        //listen for the user swapping accounts or networks mid-session
        window.ethereum.on("accountsChanged", function (accounts) {
            if (accounts.length === 0) {
                window.location.reload();
            } else {
                account = accounts[0];
                document.getElementById("connectedAddress").textContent = account.slice(0, 6) + "..." + account.slice(-4);
            }
        });

        window.ethereum.on("chainChanged", function () {
            //easiest to just reload if they switch chains
            window.location.reload();
        });

    } catch (err) {
        if (err.code === 4001) {
            showStatus("You rejected the MetaMask connection request.", "error");
        } else {
            showStatus("Failed to connect: " + err.message, "error");
        }
    }
}

// ── buy tickets ──

document.getElementById("buyBtn").addEventListener("click", buyTickets);

async function buyTickets() {
    if (!account || !contract) {
        showStatus("Please connect MetaMask first.", "error");
        return;
    }

    const amountInput = document.getElementById("amountInput").value;
    const amount = parseInt(amountInput);

    //validate the input before hitting the network
    if (!amount || amount < 1) {
        showStatus("Please enter a valid ticket quantity (minimum 1).", "error");
        return;
    }

    if (!ticketPriceWei) {
        showStatus("Ticket price not loaded yet. Please wait a moment and try again.", "error");
        return;
    }

    //calculate total cost in wei using BigInt <- avoids precision issues
    const totalWei = (BigInt(ticketPriceWei) * BigInt(amount)).toString();

    //check the user has enough SETH before submitting to metamask
    const balance = await web3.eth.getBalance(account);
    if (BigInt(balance) < BigInt(totalWei)) {
        const needed = web3.utils.fromWei(totalWei, "ether");
        const have = web3.utils.fromWei(balance, "ether");
        showStatus(
            "Insufficient SETH balance. You need " + parseFloat(needed).toFixed(4) +
            " SETH but your wallet only has " + parseFloat(have).toFixed(4) + " SETH.",
            "error"
        );
        return;
    }

    showStatus("Waiting for MetaMask confirmation. Please check your MetaMask popup.", "loading");
    document.getElementById("buyBtn").disabled = true;
    document.getElementById("txResult").classList.add("hidden");

    try {
        //this opens the metamask confirmation dialogue <- user signs and broadcasts the tx
        const tx = await contract.methods.buyTickets(amount).send({
            from: account,
            value: totalWei,
            gas: 300000
        });

        const txHash = tx.transactionHash;
        const etherscanUrl = "https://sepolia.etherscan.io/tx/" + txHash;

        showStatus("Transaction confirmed!", "success");

        //show the success result with an etherscan link
        const resultEl = document.getElementById("txResult");
        resultEl.innerHTML =
            '<div style="font-weight: 700; color: var(--success-text); margin-bottom: 0.4rem;">' +
            amount + (amount === 1 ? " ticket" : " tickets") + " purchased successfully.</div>" +
            '<a class="tx-link" href="' + etherscanUrl + '" target="_blank">View transaction on Etherscan</a>' +
            '<div class="tx-hash">' + txHash + '</div>';
        resultEl.classList.remove("hidden");

        //update the available count
        try {
            const available = await readContract.methods.ticketsAvailable().call();
            document.getElementById("availableDisplay").textContent = available.toString() + " tickets remaining";
        } catch (_) { /* non-critical, ignore refresh error */ }

    } catch (err) {
        //parse the different kinds of errors into friendly messages
        if (err.code === 4001) {
            showStatus("Transaction rejected in MetaMask. Nothing was sent.", "error");
        } else if (err.message && err.message.toLowerCase().includes("insufficient funds")) {
            showStatus("Insufficient SETH to cover this purchase plus gas fees.", "error");
        } else if (err.message && err.message.includes("incorrect SETH amount sent")) {
            showStatus("The wrong amount of SETH was calculated. Please refresh the page and try again.", "error");
        } else if (err.message && err.message.includes("not enough tickets available")) {
            showStatus("The contract ran out of tickets before your transaction went through.", "error");
        } else {
            showStatus("Transaction failed: " + (err.message || "Unknown error."), "error");
        }
    } finally {
        document.getElementById("buyBtn").disabled = false;
    }
}

// ── init ──

document.getElementById("amountInput").addEventListener("input", updateCostPreview);
loadTicketPrice();
