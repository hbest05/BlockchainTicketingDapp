//transfer.js - lets a ticket holder return tickets back to the contract for a full SETH refund
//this calls returnTickets() on the smart contract via metamask

let web3 = null;
let account = null;
let contract = null;
let ticketPriceWei = null;

//read-only provider for balance refreshes
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

// ── metamask connection ──

document.getElementById("connectBtn").addEventListener("click", connectWallet);

async function connectWallet() {
    if (!window.ethereum) {
        showStatus("MetaMask is not installed. Get it from metamask.io to continue.", "error");
        return;
    }

    try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        web3 = new Web3(window.ethereum);

        const chainId = await web3.eth.getChainId();
        if (parseInt(chainId) !== SEPOLIA_CHAIN_ID) {
            showStatus("Wrong network. Please switch MetaMask to Sepolia and try again.", "error");
            return;
        }

        const accounts = await web3.eth.getAccounts();
        account = accounts[0];
        contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

        //load the ticket price so we can show the refund preview
        ticketPriceWei = (await readContract.methods.ticketPrice().call()).toString();

        //show the return form
        document.getElementById("connectSection").classList.add("hidden");
        document.getElementById("returnSection").classList.remove("hidden");
        document.getElementById("connectedAddress").textContent = account.slice(0, 6) + "..." + account.slice(-4);
        hideStatus();

        await loadUserBalances();

        window.ethereum.on("accountsChanged", function (accounts) {
            if (accounts.length === 0) { window.location.reload(); }
            else {
                account = accounts[0];
                document.getElementById("connectedAddress").textContent = account.slice(0, 6) + "..." + account.slice(-4);
                loadUserBalances();
            }
        });

        window.ethereum.on("chainChanged", function () { window.location.reload(); });

    } catch (err) {
        if (err.code === 4001) {
            showStatus("You rejected the MetaMask connection.", "error");
        } else {
            showStatus("Connection failed: " + err.message, "error");
        }
    }
}

// ── load the user's current SETH and TKT balances ──

async function loadUserBalances() {
    if (!account) return;

    document.getElementById("currentTKT").textContent = "...";
    document.getElementById("currentSETH").textContent = "...";

    try {
        const [sethBalance, tktBalance] = await Promise.all([
            web3.eth.getBalance(account),
            contract.methods.balanceOf(account).call()
        ]);

        const sethFormatted = parseFloat(web3.utils.fromWei(sethBalance, "ether")).toFixed(4);
        document.getElementById("currentSETH").textContent = sethFormatted;
        document.getElementById("currentTKT").textContent = tktBalance.toString();

        //update the max allowed return amount
        const maxReturn = parseInt(tktBalance);
        document.getElementById("returnAmountInput").max = maxReturn;

        updateRefundPreview();

    } catch (err) {
        showStatus("Could not load your balances: " + err.message, "error");
    }
}

// ── live refund preview ──

function updateRefundPreview() {
    if (!ticketPriceWei) return;

    const amount = parseInt(document.getElementById("returnAmountInput").value);
    if (!amount || amount < 1) {
        document.getElementById("refundAmountDisplay").textContent = "—";
        return;
    }

    //same BigInt approach as purchase.js to stay precise in wei
    const refundWei = (BigInt(ticketPriceWei) * BigInt(amount)).toString();
    const refundEth = readWeb3.utils.fromWei(refundWei, "ether");
    document.getElementById("refundAmountDisplay").textContent = refundEth + " SETH";
}

// ── return tickets ──

document.getElementById("returnBtn").addEventListener("click", returnTickets);

async function returnTickets() {
    if (!account || !contract) {
        showStatus("Please connect MetaMask first.", "error");
        return;
    }

    const amountInput = document.getElementById("returnAmountInput").value;
    const amount = parseInt(amountInput);

    if (!amount || amount < 1) {
        showStatus("Please enter how many tickets you want to return (minimum 1).", "error");
        return;
    }

    //check the user actually holds enough tickets before calling the contract
    let currentBalance;
    try {
        currentBalance = parseInt(await contract.methods.balanceOf(account).call());
    } catch (err) {
        showStatus("Could not check your ticket balance: " + err.message, "error");
        return;
    }

    if (amount > currentBalance) {
        showStatus(
            "You only hold " + currentBalance + " ticket" + (currentBalance !== 1 ? "s" : "") +
            " but tried to return " + amount + ". Reduce the quantity and try again.",
            "error"
        );
        return;
    }

    showStatus("Waiting for MetaMask confirmation. Check your MetaMask popup.", "loading");
    document.getElementById("returnBtn").disabled = true;
    document.getElementById("txResult").classList.add("hidden");

    try {
        //returnTickets doesn't send ETH (it receives it back from the contract)
        const tx = await contract.methods.returnTickets(amount).send({
            from: account,
            gas: 300000
        });

        const txHash = tx.transactionHash;
        const etherscanUrl = "https://sepolia.etherscan.io/tx/" + txHash;

        const refundWei = (BigInt(ticketPriceWei) * BigInt(amount)).toString();
        const refundEth = parseFloat(web3.utils.fromWei(refundWei, "ether")).toFixed(4);

        showStatus("Tickets returned and refund sent!", "success");

        //show success with etherscan link
        const resultEl = document.getElementById("txResult");
        resultEl.innerHTML =
            '<div style="font-weight: 700; color: var(--success-text); margin-bottom: 0.4rem;">' +
            amount + (amount === 1 ? " ticket" : " tickets") + " returned. " + refundEth + " SETH refunded.</div>" +
            '<a class="tx-link" href="' + etherscanUrl + '" target="_blank">View transaction on Etherscan</a>' +
            '<div class="tx-hash">' + txHash + '</div>';
        resultEl.classList.remove("hidden");

        //refresh the balances to reflect the new state
        await loadUserBalances();

    } catch (err) {
        if (err.code === 4001) {
            showStatus("Transaction rejected in MetaMask. Nothing was returned.", "error");
        } else if (err.message && err.message.includes("not enough tickets to return")) {
            showStatus("Your on-chain ticket balance changed. Please refresh and try again.", "error");
        } else if (err.message && err.message.includes("contract has insufficient ETH")) {
            showStatus("The contract does not have enough ETH to refund you. Contact the event organiser.", "error");
        } else {
            showStatus("Transaction failed: " + (err.message || "Unknown error."), "error");
        }
    } finally {
        document.getElementById("returnBtn").disabled = false;
    }
}

// ── refresh button ──

document.getElementById("refreshBtn").addEventListener("click", loadUserBalances);
document.getElementById("returnAmountInput").addEventListener("input", updateRefundPreview);
