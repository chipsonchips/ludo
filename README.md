# 🎲 LuduChips

> A decentralized dice betting game built on the Stellar blockchain — provably fair, fully transparent, and non-custodial.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Network](https://img.shields.io/badge/network-Stellar-7B2FBE)
![Status](https://img.shields.io/badge/status-alpha-orange)

---

## Overview

LuduChips lets players wager USDC on the outcome of a dice roll. Every roll is verifiable on-chain using a commit-reveal scheme, eliminating any possibility of house manipulation. The smart contract logic is implemented as a Stellar Soroban smart contract, and the frontend is a lightweight React app that connects via Freighter or any WalletConnect-compatible Stellar wallet.

### The Ludo lounge (playable today)

The repo currently ships a full 3-D multiplayer Ludo game with three modes —
single player vs. bots (easy/medium/hard), online two-player rooms with invite
codes, and local pass-and-play — backed by a WebSocket room server with a
server-authoritative game engine shared between client and server.

```bash
cd backend && npm install && npm run dev    # room server on :5100
cd frontend && npm install && npm run dev   # game client on :5000
```

See [docs/MULTIPLAYER.md](./docs/MULTIPLAYER.md) for the room system,
protocol, and design decisions, and [docs/LUDO.md](./docs/LUDO.md) for the
game rules.

---

## Features

- 🎲 **1–6 dice roll** with configurable bet multipliers
- 💸 **Bet in USDC** or whitelisted Stellar assets
- 🔐 **Provably fair** via commit-reveal randomness (VRF)
- 🏦 **Non-custodial** — funds move directly on-chain
- 📊 **Live leaderboard** and on-chain history
- 🌐 **Testnet & Mainnet** support
- 🔗 **Freighter wallet** integration (WalletConnect planned)

---

## Quick Start

### Prerequisites

| Tool                        | Version       |
| --------------------------- | ------------- |
| Node.js                     | >= 18         |
| Rust + Cargo                | latest stable |
| Stellar CLI (`stellar`)     | >= 0.9        |
| Freighter browser extension | latest        |

### 1. Clone the repo

```bash
git clone https://github.com/your-org/stellar-dice.git
cd stellar-dice
```

### 2. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Contract
cd ../contracts && cargo build
```

### 3. Configure environment

```bash
cp .env.example .env
# Fill in: STELLAR_NETWORK, CONTRACT_ID, RPC_URL
```

### 4. Deploy contract (Testnet)

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/dice_game.wasm \
  --network testnet \
  --source-account YOUR_SECRET_KEY
```

### 5. Run the frontend

```bash
cd frontend
npm run dev
# Open http://localhost:5000
```

---

## How It Works

1. **Player connects** their Stellar wallet (Freighter).
2. **Player places a bet** — selects a dice face (1–6) and wager amount.
3. **Commit phase** — a hashed commitment is submitted to the contract.
4. **Reveal phase** — the oracle reveals the random seed; the contract derives the dice result.
5. **Payout** — if the player's guess matches, they receive the payout multiplier instantly.

---

## Project Structure

```
stellar-dice/
├── contracts/          # Soroban smart contracts (Rust)
├── frontend/           # React + Vite UI
├── oracle/             # Off-chain VRF oracle service
├── scripts/            # Deployment & admin scripts
├── tests/              # Integration & unit tests
└── docs/               # Architecture diagrams, ADRs
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a full technical breakdown.

---

## Network Configuration

| Network | RPC URL                               | Contract ID                  |
| ------- | ------------------------------------- | ---------------------------- |
| Testnet | `https://soroban-testnet.stellar.org` | `CXXXXXXX...` (after deploy) |
| Mainnet | `https://soroban-mainnet.stellar.org` | TBD                          |

---

## Security

- Randomness is generated off-chain via a Verifiable Random Function (VRF) and committed before the bet is placed, preventing look-ahead attacks.
- The house edge is hard-coded in the contract and cannot be changed post-deployment.
- An on-chain pause mechanism exists for emergency stops (governed by multisig).

For vulnerability reports, see [SECURITY.md](./SECURITY.md).

---

## Contributing

We welcome contributions of all kinds. See [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

---

## License

MIT © 2026 LuduChips Contributors
