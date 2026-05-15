//balance.js - three different views of the contract depending on the user's role
//attendee: metamask + their own SETH/TKT balance
//doorman: read-only check of any address against isValidTicketHolder()
//venue operator: live stats read from the contract via public RPC

//this provider connects to sepolia without needing metamask <- used for all read-only calls
const readWeb3 = new Web3(SEPOLIA_RPC);
const readContract = new readWeb3.eth.Contract(ABI, CONTRACT_ADDRESS);

let activeRole = "attendee";
let metamaskWeb3 = null;
let connectedAccount = null;

// ── shared utilities ──

function showAttendeeStatus(msg, type) {
    const box = document.getElementById("attendeeStatusBox");
    box.className = "status-box status-" + type;
    document.getElementById("attendeeStatusMsg").textContent = msg;
    box.classList.remove("hidden");
}

function showDoormanStatus(msg, type) {
    const box = document.getElementById("doormanStatusBox");
    box.className = "status-box status-" + type;
    document.getElementById("doormanStatusMsg").textContent = msg;
    box.classList.remove("hidden");
}

function showVenueStatus(msg, type) {
    const box = document.getElementById("venueStatusBox");
    box.className = "status-box status-" + type;
    document.getElementById("venueStatusMsg").textContent = msg;
    box.classList.remove("hidden");
}

// ── tab switching ──

function switchRole(role) {
    activeRole = role;
    //deactivate all tabs and panels first
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn.dataset.role === role);
    });
    document.querySelectorAll(".tab-panel").forEach(function (panel) {
        panel.classList.remove("active");
    });
    //activate the matching panel
    const roleMap = { attendee: "panelAttendee", doorman: "panelDoorman", venue: "panelVenue" };
    document.getElementById(roleMap[role]).classList.add("active");

    //auto-load venue stats whenever that tab is opened
    if (role === "venue") loadVenueStats();
}

document.querySelectorAll(".tab-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { switchRole(btn.dataset.role); });
});

// ── attendee: metamask connect + balance load ──

document.getElementById("connectBtnAttendee").addEventListener("click", connectMetaMaskAttendee);
document.getElementById("refreshAttendeeBtn").addEventListener("click", loadAttendeeBalances);

async function connectMetaMaskAttendee() {
    //metamask injects window.ethereum into the page
    if (!window.ethereum) {
        showAttendeeStatus("MetaMask is not installed. Get it at metamask.io then come back.", "error");
        return;
    }

    try {
        //ask metamask to show the account selection popup
        await window.ethereum.request({ method: "eth_requestAccounts" });
        metamaskWeb3 = new Web3(window.ethereum);

        //verify the user is on sepolia before doing anything
        const chainId = await metamaskWeb3.eth.getChainId();
        if (parseInt(chainId) !== SEPOLIA_CHAIN_ID) {
            showAttendeeStatus("Wrong network. Please switch MetaMask to Sepolia (chain ID 11155111).", "error");
            return;
        }

        const accounts = await metamaskWeb3.eth.getAccounts();
        connectedAccount = accounts[0];

        //update the address chip and show the balance section
        document.getElementById("attendeeAddress").textContent = connectedAccount;
        document.getElementById("attendeeConnectSection").classList.add("hidden");
        document.getElementById("attendeeBalanceSection").classList.remove("hidden");

        await loadAttendeeBalances();

        //listen for the user switching accounts in metamask
        window.ethereum.on("accountsChanged", function (newAccounts) {
            if (newAccounts.length === 0) {
                //disconnected
                document.getElementById("attendeeConnectSection").classList.remove("hidden");
                document.getElementById("attendeeBalanceSection").classList.add("hidden");
                connectedAccount = null;
            } else {
                connectedAccount = newAccounts[0];
                document.getElementById("attendeeAddress").textContent = connectedAccount;
                loadAttendeeBalances();
            }
        });

    } catch (err) {
        if (err.code === 4001) {
            showAttendeeStatus("You rejected the MetaMask connection request.", "error");
        } else {
            showAttendeeStatus("Connection failed: " + err.message, "error");
        }
    }
}

async function loadAttendeeBalances() {
    if (!connectedAccount) return;

    document.getElementById("attendeeSETH").textContent = "...";
    document.getElementById("attendeeTKT").textContent = "...";

    try {
        //get the native ETH (SETH on sepolia) balance
        const sethBalance = await metamaskWeb3.eth.getBalance(connectedAccount);
        const sethEth = parseFloat(metamaskWeb3.utils.fromWei(sethBalance, "ether")).toFixed(4);
        document.getElementById("attendeeSETH").textContent = sethEth;

        //get the ERC-20 token balance from the contract
        const metamaskContract = new metamaskWeb3.eth.Contract(ABI, CONTRACT_ADDRESS);
        const tktBalance = await metamaskContract.methods.balanceOf(connectedAccount).call();
        const ticketCount = parseInt(tktBalance);
        document.getElementById("attendeeTKT").textContent = ticketCount;

        //friendly ownership message
        const msgEl = document.getElementById("attendeeTicketMsgText");
        const msgBox = document.getElementById("attendeeTicketMsg");
        if (ticketCount === 0) {
            msgEl.textContent = "You don't hold any tickets yet. Head to Buy Tickets to get some.";
            msgBox.className = "status-box status-warn";
        } else if (ticketCount === 1) {
            msgEl.textContent = "You own 1 ticket. See you at the cat function!";
            msgBox.className = "status-box status-success";
        } else {
            msgEl.textContent = "You own " + ticketCount + " tickets.";
            msgBox.className = "status-box status-success";
        }

        //clear any previous error
        document.getElementById("attendeeStatusBox").classList.add("hidden");

    } catch (err) {
        showAttendeeStatus("Failed to load balances: " + err.message, "error");
    }
}

// ── doorman: read-only address validity check ──

document.getElementById("checkDoormanBtn").addEventListener("click", checkDoormanAddress);

async function checkDoormanAddress() {
    document.getElementById("doormanStatusBox").classList.add("hidden");
    document.getElementById("validityDisplay").classList.add("hidden");

    const input = document.getElementById("doormanAddressInput").value.trim();

    //validate the address format before hitting the network
    if (!input) {
        showDoormanStatus("Please enter a wallet address to check.", "error");
        return;
    }

    if (!readWeb3.utils.isAddress(input)) {
        showDoormanStatus("That doesn't look like a valid Ethereum address. Check for typos.", "error");
        return;
    }

    try {
        //isValidTicketHolder returns a bool from the contract
        const isValid = await readContract.methods.isValidTicketHolder(input).call();

        const box = document.getElementById("validityBox");
        //use text labels instead of emoji for the validity indicator
        document.getElementById("validityIcon").textContent = isValid ? "VALID" : "INVALID";
        document.getElementById("validityText").textContent = isValid ? "Ticket Holder" : "No Valid Ticket";
        document.getElementById("validityAddr").textContent = input;

        box.className = "validity-display " + (isValid ? "validity-valid" : "validity-invalid");
        document.getElementById("validityDisplay").classList.remove("hidden");

    } catch (err) {
        if (err.message.includes("contract") || err.message.includes("address")) {
            showDoormanStatus("Could not reach the contract. Make sure CONTRACT_ADDRESS in config.js is set correctly.", "error");
        } else {
            showDoormanStatus("Lookup failed: " + err.message, "error");
        }
    }
}

//allow pressing enter in the address field to trigger the check
document.getElementById("doormanAddressInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") checkDoormanAddress();
});

// ── venue operator: live contract stats ──

document.getElementById("refreshVenueBtn").addEventListener("click", loadVenueStats);

async function loadVenueStats() {
    document.getElementById("statSold").textContent = "...";
    document.getElementById("statAvailable").textContent = "...";
    document.getElementById("statETH").textContent = "...";
    document.getElementById("venueStatusBox").classList.add("hidden");

    try {
        //all three calls happen at the same time for efficiency
        const [sold, available, contractEthBalance] = await Promise.all([
            readContract.methods.ticketsSold().call(),
            readContract.methods.ticketsAvailable().call(),
            readWeb3.eth.getBalance(CONTRACT_ADDRESS)
        ]);

        document.getElementById("statSold").textContent = sold.toString();
        document.getElementById("statAvailable").textContent = available.toString();

        //format the ETH balance to 4 decimal places
        const ethFormatted = parseFloat(readWeb3.utils.fromWei(contractEthBalance, "ether")).toFixed(4);
        document.getElementById("statETH").textContent = ethFormatted;

    } catch (err) {
        showVenueStatus("Could not load stats. Make sure the contract is deployed and config.js is updated.", "error");
        document.getElementById("statSold").textContent = "—";
        document.getElementById("statAvailable").textContent = "—";
        document.getElementById("statETH").textContent = "—";
    }
}

//load venue stats on page open if the venue tab is somehow pre-selected
if (activeRole === "venue") loadVenueStats();
