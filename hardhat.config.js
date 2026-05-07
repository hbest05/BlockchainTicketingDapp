require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            //optimiser on so the contract bytecode is smaller and cheaper to deploy
            optimizer: { enabled: true, runs: 200 }
        }
    },
    networks: {
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "",
            //only pass the key if it looks like a real 64-char hex string <- avoids config error with placeholder
            accounts: /^[0-9a-fA-F]{64}$/.test(process.env.PRIVATE_KEY || "")
                ? [`0x${process.env.PRIVATE_KEY}`]
                : []
        }
    }
};
