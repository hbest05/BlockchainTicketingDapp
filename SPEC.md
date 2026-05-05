# Blockchain Ticketing DApp — Project Specification

**Course:** ISE 2.2 Ethical Hacking and Security — Blockchain Technologies and Applications
**Block:** 8
**Due:** Friday 15 May 2026 at 1:00 PM
**Weight:** 40% of module grade
**Spec version:** 2 (19/03/2026)

---

## Objectives

- Learn the mechanics of a blockchain distributed application
- Gain a foundation in Solidity (smart contract programming language)
- Appreciate the applications of blockchain beyond cryptocurrency

---

## Description

Create a Web3 Distributed Application (DApp) that implements a simple ticketing system.

- **Blockchain:** Ethereum Sepolia Testnet
- **Smart contracts:** Solidity
- **Frontend:** HTML, CSS, JavaScript
- **Tooling:** Visual Studio Code + Remix IDE (recommended)

---

## Requirements

### Frontend

| Page | Requirements |
|---|---|
| **Wallet Creation** | Generate a new crypto wallet; display wallet details once created; provide ability to download the created wallet |
| **Balance Check** | View crypto (SETH) and ticket token balance — for three actor roles (see below) |
| **Ticket Purchase** | Allow a user to buy a ticket (token) using SETH |
| **Ticket Transfer** | Allow a user to transfer/return a ticket back to the vendor |

#### Balance Check — Three Actor Roles

| Role | Purpose |
|---|---|
| **Event Attendee** | Confirm their own ticket purchase |
| **Doorman** | Confirm a wallet is the holder of a valid ticket |
| **Venue Operator** | Check on the distribution of tickets |

### Blockchain Backend

- Smart contract implementing the **full ERC-20 standard**
- Extended to allow tickets to be purchased using the native Sepolia cryptocurrency (**SETH**)
- Deployed to the **Sepolia Testnet**

---

## Submission

### What to submit

Zipped archive via Brightspace containing:

- [ ] All programming artefacts: `.html`, `.css`, `.js`, `.sol` files
- [ ] Details of where smart contracts are deployed (contract addresses, holding wallets)
- [ ] Instructions on how to run the project (VS Code + Live Server plugin)
- [ ] Project report (see below)
- [ ] Statement on use of Generative AI
- [ ] Peer review reflection (200 words)

### Project Report must include

- Code overview
- Design description
- Links to Sepolia blockchain explorer showing:
  - Successful contract deployment transaction
  - Successful ticket purchase transaction
  - Successful wallet funding transactions for:
    - Contract creator
    - Ticket purchaser
    - Vendor / Doorman

### Peer Review

- 3 weeks before submission: engage in a peer code review session with a colleague
- Document findings in a 200-word reflective piece covering:
  - a) Findings in your peer's code (4%)
  - b) Findings your peer found in your code (4%)
  - c) The code review experience in general (2%)

---

## Grading Rubric (40% of Module Grade)

### Peer Review — 10%

| Item | Weight |
|---|---|
| Findings in peer's code | 4% |
| Findings peer found in your code | 4% |
| Code review experience reflection | 2% |

---

### Managerial Grading ("Students as Managers of AI") — 30%

The rubric grades how well you **managed AI** to produce quality output — not just whether the code works.

#### 1. AI-Enhanced Code Review Process — 25%

| Grade | Description |
|---|---|
| A1 (≥75%) | Full traceability across all four steps (PR, comments, resolution, commit hash). Proactive guidance of AI to meet review standards. |
| B2 (60–64%) | Process functional but reactive. Links present but may be missing key stages. |
| C3 (40–44%) | Traceability severely broken. Incomplete process or undocumented human fixes. |
| F (<30%) | Review process non-existent or core steps skipped entirely. |

#### 2. Frontend Validation & Architecture — 30%

| Criterion | Weight | A1 | B2 | C3 | F |
|---|---|---|---|---|---|
| 2.1 Wallet Creation | 5% | All 3 requirements met + security review of key management | Functional, basic validation | Download/display minimal or required human fixes | Incomplete or key features broken |
| 2.2 Balance Check (3 roles) | 10% | Resilient distinct logic for all 3 roles, edge case coverage | Distinct role logic, basic accuracy confirmed | Roles blurred or display inaccurate | Roles lack distinction, frequent inaccuracies |
| 2.3 Ticket Purchase Flow | 10% | All error states and UX anticipated proactively, human-refined UX | Full successful flow + basic error paths | Functional but weak state management/error handling | Incomplete flow or broken interface |
| 2.4 Token Transfer | 5% | Transfer-back logic + balance verification steps included | Transfer works, balance updates verified | Required human input to fix transfer logic | Flawed transfer or balances fail to update |

#### 3. Blockchain Management & Reporting — 30%

| Criterion | Weight | A1 | B2 | C3 | F |
|---|---|---|---|---|---|
| 3.1 Smart Contract Architecture | 15% | Expert guidance on ERC-20 + SETH extension, security patterns demanded (ReentrancyGuard), gas efficiency | Contract meets all ERC-20 requirements + SETH purchase extension | Generic prompts, minimum standards met, human fixes needed | Fails core requirements or major security flaws |
| 3.2 Project Submission Structure | 5% | Intentional human organization of final solution | All required files present, correct structure | Mostly correct but files missing or confusing layout | Missing required files or incorrect structure |
| 3.3 Report: Managerial Communication | 10% | Articulates why AI solutions were chosen, insightful commentary on tx links | Explains code and design choices, tx links verified and commented | Functional overview, relies on AI summaries | Superficial, unexplained code, unverified tx links |

#### 4. Managerial Oversight & QA — 15%

| Criterion | Weight | A1 | B2 | C3 | F |
|---|---|---|---|---|---|
| 4.1 Human-Authored Documentation | 5% | Architectural justification for complex sections, explains integration | High-quality docs on all major functions explaining AI-generated code | Sufficient but lacks architectural insight | Sparse, generic AI-generated comments |
| 4.2 Prompting for Code Efficiency | 2.5% | Dedicated optimization runs for gas efficiency + FE performance | Clear attempt to optimize core functions | Reactive, only addressed after issue discovered | Significant inefficiencies, no optimization prompts |
| 4.3 Proactive Error Handling | 5% | Proactively guided AI to implement all failure state error messages before code was written | Proper error messages and handling for expected failure states | Reactive or generic try/catch only | No error handling, raw blockchain errors exposed |
| 4.4 Comprehensive Testing | 5% | Used AI to generate tests, critically reviewed and expanded for edge case coverage | Functional test cases generated and verified for core functionality | Basic AI tests without review, shallow coverage | No structured tests or non-functional tests |

**Total: 100% (= 40% of module grade)**
