//wallet.js - handles creating and downloading a new ethereum wallet
//uses web3.js accounts API, same pattern as the course reference project

let keystoreJson = null;

//utility: show a status message with the right colour class
function showStatus(msg, type) {
    const box = document.getElementById("statusBox");
    box.className = "status-box status-" + type;
    document.getElementById("statusMsg").textContent = msg;
    box.classList.remove("hidden");
}

function hideStatus() {
    document.getElementById("statusBox").classList.add("hidden");
}

//clicking generate creates a brand new wallet via web3.eth.accounts.create()
document.getElementById("generateBtn").addEventListener("click", function () {
    hideStatus();
    const password = document.getElementById("passwordInput").value.trim();

    //password is required because we use it to encrypt the keystore download
    if (!password) {
        showStatus("Please enter a keystore password before generating.", "error");
        return;
    }

    if (password.length < 8) {
        showStatus("Password should be at least 8 characters for reasonable security.", "error");
        return;
    }

    try {
        //web3 with no provider is enough for local key operations (no network needed here)
        const web3 = new Web3();

        //creates a random private key and derives the public address from it
        const wallet = web3.eth.accounts.create();

        //display the raw address and private key so the user can copy them
        document.getElementById("addressOutput").value = wallet.address;
        document.getElementById("privateKeyOutput").value = wallet.privateKey;

        //encrypt the private key with the user's password to make the keystore JSON
        const keystore = web3.eth.accounts.encrypt(wallet.privateKey, password);
        keystoreJson = JSON.stringify(keystore, null, 2);
        document.getElementById("keystoreOutput").value = keystoreJson;

        //reveal the wallet details section
        document.getElementById("walletDetails").classList.remove("hidden");
        showStatus("Wallet created successfully. Make sure to save your private key offline!", "success");

    } catch (err) {
        showStatus("Wallet generation failed: " + err.message, "error");
    }
});

//download the keystore JSON as a file named after the wallet address
document.getElementById("downloadBtn").addEventListener("click", function () {
    if (!keystoreJson) {
        showStatus("Generate a wallet first.", "error");
        return;
    }

    const address = document.getElementById("addressOutput").value;
    //create a blob and trigger a browser download <- same technique as course reference project
    const blob = new Blob([keystoreJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = address + ".json";
    a.click();
    URL.revokeObjectURL(url);
});

//copy the wallet address to clipboard with a temporary confirmation message
document.getElementById("copyAddressBtn").addEventListener("click", function () {
    const address = document.getElementById("addressOutput").value;
    if (!address) return;

    navigator.clipboard.writeText(address).then(function () {
        const btn = document.getElementById("copyAddressBtn");
        const original = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = original; }, 1500);
    }).catch(function () {
        showStatus("Clipboard access denied. Copy the address manually from the box above.", "warn");
    });
});
