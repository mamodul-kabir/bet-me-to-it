# Project Specification: bet-me-to-it
**Track:** NYU Shipyard – Fintech Builder Track (True Markets Gateway)  
**Target:** Production MVP with Live Mainnet Execution for 4:15 PM Judging  

---

## 1. Executive Summary & Vision
**Product Description:**  
**bet-me-to-it** is a behavioral fintech and productivity trading app built on the True Markets Gateway that transforms low-stakes daily tasks (homework, coding prep, fitness, projects) into high-stakes financial commitments. Users stake real PYUSD on completing a task by a deadline, validated by an **AI Proof-of-Task Oracle (powered by Gemini Vision)**. 

If the user succeeds, they grow a visual "Wealth Forest" (inspired by the *Forest* app, where each tree tracks live stock market data) and can optionally auto-invest their stake into unlocked stocks. If the user misses the deadline, a **Probabilistic Consequence Engine** triggers real mainnet execution via the True Markets Gateway: either donating the staked funds to a chosen charity/accountability wallet via **Gateway Payments**, or forcibly purchasing tokenized stocks via **Gateway Trading** that are placed inside a **Time-Locked Vault** (un-sellable for 6 months to 2 years).

**Target User & Core Value Proposition:**
- **Who uses it:** Students, developers, and retail investors who struggle with procrastination on low-stakes tasks and want to build both discipline and a long-term stock portfolio.
- **The Core Problem Solved:** Standard to-do apps lack real consequences, and standard trading apps lack daily habit loops. **bet-me-to-it** combines loss aversion, AI verification, and automated stock accumulation/charity slashing into a daily-use fintech companion.

---

## 2. Core Track Mandatory Requirements (Rule 1: Ship a Real Trading App)
The application must interface with the **True Markets Gateway API** on mainnet for all baseline financial functionality:

1. **User Onboarding & Provisioned Wallets:**
   - Automatic user creation and authentication via the True Markets Gateway API (using ECDSA P-256 request signing).
   - Provisioning and display of the user's Solana and EVM wallet addresses and live PYUSD / asset balances.
2. **Trading Execution (Crypto & Tokenized Stocks):**
   - Full Buy/Sell order panel for supported crypto and tokenized stocks (e.g., `NVDA`, `AAPL`, `TSLA`, `SOL`, `ETH`).
   - Explicit display and accounting for the Gateway execution fee ($0.20\%$ / $20\text{ bps}$).
   - Support for both **Liquid Trades** (standard trading) and **Time-Locked Vault Trades** (triggered by task commitments, where the UI/backend restricts selling until `unlock_timestamp`).
3. **Payments & Transfers:**
   - Send PYUSD or assets to other registered users or external Solana/EVM wallet addresses.
   - Pre-configured **Verified Charity / Accountability Wallets** for instant penalty donation transfers.
4. **Market Data Feed:**
   - Live price quotes and historical price data from the Gateway API to power the Trading Terminal and dynamically animate the health/growth of trees in the user's "Stock Forest."

---

## 3. Differentiator: "The Feature You Wish Existed" (Rule 2)
### Feature Name: High-Stakes Task Commitments with AI Oracle & Consequence Roulette

### Mechanism & User Flow:
1. **Create a Task Bet (Commitment Contract):**
   - User inputs:
     - **Task Title & Verification Criteria:** e.g., *"Complete 2 LeetCode Medium problems"* or *"Finish Calc III Homework."*
     - **Stake Amount:** e.g., $\$2.00$ to $\$10.00$ in `PYUSD`.
     - **Deadline:** Date & countdown timer.
     - **Failure Consequence Odds:** User sets the probability split (e.g., $50\%$ Charity Donation / $50\%$ Forced Time-Locked Stock Investment) or selects a deterministic penalty.
     - **Target Asset & Lock Duration:** e.g., Buy `NVDA` locked for **6 Months** or **2 Years** if the Stock Lockup consequence lands, plus a chosen Charity recipient if the Donation consequence lands.
2. **Task Validation via the AI Proof-of-Task Oracle (Gemini API):**
   - Before the deadline expires, the user submits proof of completion (uploading a screenshot/photo of homework, code submission, or text proof).
   - The backend calls **Gemini 2.5 Flash** acting as an impartial **Blockchain-style Oracle**, evaluating the proof against the task description and returning structured JSON:
     - `verified` (boolean)
     - `confidence` ($0.0$ to $1.0$)
     - `verdict_reason` (string explanation)
3. **Resolution Paths:**
   - **Path A — Task Verified On Time (Success):**
     - The user's staked PYUSD is released (or optionally swept into an unlocked Reward Trade if configured).
     - The user earns **Forest XP** and plants a new **Wealth Tree** in their interactive **Productivity Forest**. Each tree represents a completed milestone and is linked to a live ticker from Gateway Market Data.
   - **Path B — Deadline Missed or Proof Rejected (Failure Consequence Roulette):**
     - A visual **Consequence Wheel / Roulette** spins based on the configured probability:
       - **Outcome 1: Charity / Peer Slash (Gateway Payment):** Immediately executes a live True Markets Gateway transfer sending the staked PYUSD to the selected Charity / Accountability Wallet address.
       - **Outcome 2: Forced Long-Term Investing (Gateway Trade + Time Lock):** Immediately executes a live True Markets Gateway buy order for the chosen tokenized stock (e.g., `NVDA`). The purchased shares are recorded in the user's **Time-Locked Vault** with an `unlock_date` set to 6 months or 2 years in the future. Selling is disabled on locked lots until the timer expires.
4. **Judge Demo Toolbar (Critical for Live Demo):**
   - Every active task card must include a **"Judge Demo Controls"** bar with:
     - `Verify with AI Oracle` (upload image or use 1-click sample homework/code screenshot).
     - `Simulate Deadline Expired (Trigger Consequence)` (instantly triggers the Consequence Roulette and executes the real Gateway Trade or Gateway Payment on mainnet in front of the judge).

---

## 4. Tech Stack & Architecture
- **Backend:** Python **FastAPI** (or Node.js/Next.js API Routes, matching the Tensho reference pattern if preferred)
- **Frontend:** **React (Next.js or Vite) + Tailwind CSS + Lucide Icons** (Dark-mode modern fintech UI with clean animations for the Forest, Vaults, and Consequence Roulette)
- **Database:** Local **SQLite** or JSON persistent store (tracking user commitments, AI Oracle audit logs, Forest trees, and Time-Locked Vault expiration dates)
- **External Integrations:**
  1. **True Markets Gateway API (`https://api.truemarkets.co`):**
     - Auth token generation via ECDSA P-256 key (`api_key.json`)
     - User & Wallet provisioning (`Solana` & `EVM` addresses + balances)
     - Order execution (Crypto & Tokenized Stocks with $20\text{ bps}$ fee display)
     - Payments / Transfers (Internal user-to-user & external wallet transfers)
     - Live Market Data & Price History
  2. **Google Gemini API (`google-genai` SDK):**
     - Multimodal AI Oracle (`gemini-2.5-flash`) with structured JSON output for verifying task proof submissions.

---

## 5. Key UI Views & Backend Endpoints

### Frontend Views (4-Tab Navigation):
1. **`Focus Stakes & Forest` (Main Differentiator View):**
   - **Active Commitments List:** Countdown timers, stake amount in PYUSD, proof upload modal, and Judge Demo trigger buttons.
   - **New Bet Creator Modal:** Configure task, stake ($\$$ PYUSD), deadline, probability slider (Charity Donation % vs. Time-Locked Stock %), target stock ticker, and lockup period (6 Months / 1 Year / 2 Years).
   - **The Wealth Forest Canvas:** Visual grid of planted trees from completed tasks, linked to live stock tickers.
2. **`Time-Locked Vaults & Wallet`:**
   - Displays provisioned Solana and EVM deposit addresses, QR code, and live PYUSD balance.
   - Separates **Liquid Portfolio** (can sell anytime) from **Time-Locked Vault Positions** (shows lock progress bar, unlock date, and disabled sell button with lock badge).
3. **`Trade Terminal` (Rule 1 Core Trading):**
   - Live price chart & market data feed from True Markets Gateway.
   - Buy/Sell order form for crypto and tokenized stocks showing real-time quote and $0.2\%$ ($20\text{ bps}$) fee breakdown.
4. **`Payments & Charity Hub` (Rule 1 Core Payments):**
   - Direct "Send Funds" form (send PYUSD or stock value to a friend or external wallet).
   - Directory of selectable Charity / Accountability Partner wallets with a live ledger of past penalty donations.

### Backend API Endpoints:
- `POST /api/gateway/auth` & `GET /api/gateway/wallet` — Authenticate with Gateway key and fetch user wallets/balances.
- `GET /api/gateway/markets` — Fetch live prices and historical candles from Gateway.
- `POST /api/gateway/trade` — Execute real mainnet buy/sell order via Gateway.
- `POST /api/gateway/transfer` — Execute real mainnet payment/transfer via Gateway.
- `POST /api/commitments/create` — Create a new high-stakes task commitment.
- `POST /api/commitments/{id}/verify` — Send uploaded proof (image/text) to Gemini AI Oracle, return structured verification verdict, and update Forest state.
- `POST /api/commitments/{id}/trigger-failure` — Spin the probabilistic consequence engine and execute either the Gateway Charity Transfer or the Gateway Time-Locked Stock Purchase.

---

## 6. Live Judging Verification Checklist
- [x] Wallet addresses (Solana & EVM) and real PYUSD balance load live from True Markets Gateway.
- [x] Standard Buy/Sell trade works end-to-end on mainnet with $0.2\%$ fee displayed.
- [x] Standard Payment/Transfer works end-to-end on mainnet.
- [x] Creating a Task Bet, verifying with the Gemini AI Oracle, and growing a tree in the Forest works smoothly.
- [x] Clicking "Simulate Deadline Expired" spins the Consequence Roulette and executes a real Gateway Trade (into the Time-Locked Vault) or a real Gateway Payment (to the Charity/Partner wallet) in front of the judge.