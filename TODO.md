# Blockchain Ticketing DApp — TODO

**Due:** Friday 15 May 2026 at 1:00 PM

---

## Phase 0 — Project Setup

- [ ] `npm init -y` inside this directory
- [ ] Install Hardhat: `npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox`
- [ ] `npx hardhat init` — choose JavaScript project
- [ ] Install OpenZeppelin: `npm install @openzeppelin/contracts`
- [ ] Install dotenv: `npm install dotenv`
- [ ] Create `.gitignore` (node_modules, .env, artifacts/, cache/)
- [ ] Create `.env` with `PRIVATE_KEY` and `SEPOLIA_RPC_URL` placeholders
- [ ] Configure `hardhat.config.js` for Sepolia + dotenv
- [ ] Create folder structure: `contracts/`, `scripts/`, `test/`, `frontend/js/`, `frontend/css/`
- [ ] Initial git commit: `chore: project scaffold`

---

## Phase 1 — Smart Contract (`contracts/TicketToken.sol`)

### ERC-20 Base
- [ ] Inherit from OpenZeppelin `ERC20`, `Ownable`, `ReentrancyGuard`
- [ ] Token name: `"EventTicket"`, symbol: `"TKT"`, decimals: `0` (whole tickets)
- [ ] Mint initial supply to deployer (venue operator) in constructor

### Ticket Purchase with SETH
- [ ] Add `ticketPrice` variable (set at deploy, e.g. 0.01 SETH)
- [ ] Implement `buyTickets(uint256 amount) payable` with `nonReentrant`:
  - [ ] Require `msg.value == ticketPrice * amount`
  - [ ] Require contract holds enough tokens
  - [ ] Transfer tokens from contract to `msg.sender`
  - [ ] Emit `TicketPurchased(address buyer, uint256 amount)` event
- [ ] Implement `returnTickets(uint256 amount)` with `nonReentrant`:
  - [ ] Require caller holds `amount` tokens
  - [ ] Transfer tokens back from caller to contract
  - [ ] Refund `ticketPrice * amount` SETH to caller
  - [ ] Emit `TicketReturned(address holder, uint256 amount)` event
- [ ] Implement `withdraw()` — `onlyOwner`, pulls all SETH to owner

### View Functions for Frontend
- [ ] `ticketsAvailable()` — returns contract's own token balance
- [ ] `ticketsSold()` — returns initial supply minus tickets available
- [ ] `isValidTicketHolder(address)` — returns true if address holds ≥ 1 token

### Security
- [ ] `require` on zero-amount inputs
- [ ] `require` on insufficient contract token balance
- [ ] `require` on incorrect ETH sent
- [ ] `nonReentrant` on all state-changing payable functions

---

## Phase 2 — Deployment (`scripts/deploy.js`)

- [ ] Write deploy script: deploy `TicketToken(initialSupply, ticketPrice)`
- [ ] Log contract address and tx hash
- [ ] Auto-write contract address + ABI to `frontend/js/config.js`
- [ ] Fund deployer wallet with Sepolia ETH via faucet (e.g. sepoliafaucet.com)
- [ ] Run: `npx hardhat run scripts/deploy.js --network sepolia`
- [ ] Record and save:
  - [ ] Contract address: ___________________________
  - [ ] Deployment tx hash: ___________________________
  - [ ] Sepolia Etherscan link: ___________________________

### Test Wallets — Fund All Three
- [ ] **Contract creator / Venue operator** wallet address: ___________________________
  - [ ] Funding tx hash: ___________________________
- [ ] **Ticket purchaser / Attendee** wallet address: ___________________________
  - [ ] Funding tx hash: ___________________________
- [ ] **Vendor / Doorman** wallet address: ___________________________
  - [ ] Funding tx hash: ___________________________

---

## Phase 3 — Smart Contract Tests (`test/TicketToken.test.js`)

- [ ] Test: deployment sets correct name, symbol, decimals, owner
- [ ] Test: initial supply minted to deployer
- [ ] Test: `buyTickets` transfers tokens to buyer
- [ ] Test: `buyTickets` emits `TicketPurchased` event
- [ ] Test: `buyTickets` reverts on incorrect ETH amount
- [ ] Test: `buyTickets` reverts on zero amount
- [ ] Test: `buyTickets` reverts when contract has insufficient tokens
- [ ] Test: `returnTickets` transfers tokens back, refunds ETH
- [ ] Test: `returnTickets` emits `TicketReturned` event
- [ ] Test: `returnTickets` reverts if caller has insufficient tokens
- [ ] Test: `withdraw` transfers contract ETH balance to owner
- [ ] Test: `withdraw` reverts for non-owner
- [ ] Test: ERC-20 `transfer` between addresses works
- [ ] Test: ERC-20 `approve` + `transferFrom` flow
- [ ] Test: `isValidTicketHolder` returns correct result
- [ ] Run `npx hardhat test` — all pass ✓

---

## Phase 4 — Frontend

### Shared Setup
- [ ] `frontend/index.html` — landing page with nav to all four pages
- [ ] `frontend/css/style.css` — clean professional UI, consistent across pages
- [ ] `frontend/js/config.js` — `CONTRACT_ADDRESS` and `ABI` constants
- [ ] Download `ethers.min.js` (v6) into `frontend/js/`

### 4.1 Wallet Creation (`frontend/wallet.html` + `frontend/js/wallet.js`)
- [ ] "Generate New Wallet" button → `ethers.Wallet.createRandom()`
- [ ] Display: address, private key, mnemonic phrase
- [ ] "Download Credentials" button → exports JSON file to disk
- [ ] Security warning displayed: never share private key
- [ ] Error handling for any generation failure

### 4.2 Balance Check (`frontend/balance.html` + `frontend/js/balance.js`)
- [ ] Connect MetaMask button
- [ ] Role selector: Attendee | Doorman | Venue Operator
- [ ] **Attendee view:**
  - [ ] SETH balance via `provider.getBalance(address)`
  - [ ] TKT token balance via `balanceOf(address)`
  - [ ] Display "You own X ticket(s)"
- [ ] **Doorman view:**
  - [ ] Manual address input field
  - [ ] Show VALID / INVALID ticket holder status via `isValidTicketHolder(address)`
  - [ ] Read-only, no wallet connection required
- [ ] **Venue Operator view:**
  - [ ] Total tickets sold (`ticketsSold()`)
  - [ ] Tickets still available (`ticketsAvailable()`)
  - [ ] Total SETH collected in contract (`provider.getBalance(contractAddress)`)
- [ ] Error handling: invalid address, network error, MetaMask not installed

### 4.3 Ticket Purchase (`frontend/purchase.html` + `frontend/js/purchase.js`)
- [ ] Connect MetaMask
- [ ] Display current ticket price (read from contract)
- [ ] Input: number of tickets to buy
- [ ] Show total cost preview (count × price) before confirming
- [ ] "Buy Tickets" button → calls `buyTickets(amount)` with correct ETH value
- [ ] Transaction pending spinner / status message
- [ ] Success state: tx hash with Sepolia Etherscan link
- [ ] Update TKT balance display after purchase
- [ ] Error handling:
  - [ ] Insufficient ETH balance
  - [ ] User rejected transaction in MetaMask
  - [ ] Contract reverted (show revert reason)
  - [ ] Network/RPC error

### 4.4 Ticket Transfer/Return (`frontend/transfer.html` + `frontend/js/transfer.js`)
- [ ] Connect MetaMask
- [ ] Show current TKT token balance
- [ ] Input: number of tickets to return
- [ ] Show SETH refund preview (count × price)
- [ ] "Return Tickets" button → calls `returnTickets(amount)`
- [ ] Transaction pending state
- [ ] Success state: tx hash with Etherscan link
- [ ] Update TKT + SETH balances after return
- [ ] Error handling:
  - [ ] Insufficient tickets held
  - [ ] User rejected transaction
  - [ ] Contract reverted
  - [ ] Network error

---

## Phase 5 — End-to-End QA on Sepolia

- [ ] Run all Hardhat unit tests — 100% pass
- [ ] Manual E2E test flow:
  - [ ] Deploy contract → record tx ✓
  - [ ] Fund attendee wallet → record tx ✓
  - [ ] Fund doorman wallet → record tx ✓
  - [ ] Fund venue operator wallet → record tx ✓
  - [ ] Attendee purchases 1 ticket → record tx ✓
  - [ ] Doorman checks attendee address → shows VALID ✓
  - [ ] Venue operator checks distribution ✓
  - [ ] Attendee returns ticket → record tx ✓
- [ ] Test all pages in browser via VS Code Live Server
- [ ] Test MetaMask rejection handling (click "reject" on a tx)
- [ ] Test with address that holds zero tickets (Doorman view → INVALID)
- [ ] Test purchase with zero quantity (should reject)
- [ ] Test purchase with insufficient SETH (should show error)

---

## Phase 6 — Code Review (Graded: 10%)

- [ ] Push code to GitHub (private repo)
- [ ] Share repo access with peer reviewer
- [ ] Create a Pull Request for peer to review
- [ ] Peer leaves GitHub review comments
- [ ] Respond to and resolve all peer comments with fix commits
- [ ] Review peer's code — leave at least 3 meaningful comments
- [ ] Collect and save for report:
  - [ ] PR link: ___________________________
  - [ ] Peer's review comment links: ___________________________
  - [ ] Fix commit hash(es): ___________________________
  - [ ] Link to your review on peer's code: ___________________________

---

## Phase 7 — Report & Submission

### Project Report
- [ ] Code overview (architecture diagram or description)
- [ ] Design description (why ERC-20, why these security patterns)
- [ ] Blockchain explorer transaction links:
  - [ ] Contract deployment: ___________________________
  - [ ] Ticket purchase: ___________________________
  - [ ] Contract creator wallet funding: ___________________________
  - [ ] Ticket purchaser wallet funding: ___________________________
  - [ ] Vendor/Doorman wallet funding: ___________________________
- [ ] Contract address and all test wallet addresses
- [ ] Run instructions (open in VS Code → Live Server)
- [ ] AI usage statement (tools used, prompts given, human review decisions made)

### Peer Review Reflection (200 words)
- [ ] a) Findings in peer's code
- [ ] b) Findings peer found in your code
- [ ] c) Code review experience in general

### Final Submission
- [ ] Zip all code artefacts (no `node_modules`, no `.env`)
- [ ] Verify zip extracts cleanly and runs with Live Server
- [ ] Submit via Brightspace before **15 May 2026 at 1:00 PM**

---

## AI Traceability Log

> Keep a running record here throughout development. Required for Managerial AI grade.

| Date | Prompt given to AI | Output | Human review / changes made |
|---|---|---|---|
| | | | |

---

## Key Links (fill in as you go)

| Item | Link |
|---|---|
| Sepolia Etherscan | https://sepolia.etherscan.io |
| Sepolia Faucet | https://sepoliafaucet.com |
| GitHub Repo | |
| Contract on Etherscan | |
| PR for peer review | |
