# CHIPS in Ludo — casino economy design

*Status: Phase 1 (practice-chip casino layer + flat table) implemented in the
frontend, July 2026. Phases 2–4 are the plan for real CHIP settlement.*

## Investigation summary

The hub economy already exists and ludo should **reuse it, not invent one**:

- **ChipsBank** (`chipschips/contracts`, ABI vendored in
  `@chipsonchips/shared`) is an on-chain USDC ledger on Celo (Base next).
  Players `deposit`/`withdraw`; registered **game operators** move balances
  gaslessly via `debitFor`/`creditFor` with per-game daily limits, and the
  hub treasury can `treasuryCredit`/`treasuryDebit` (Paystack fiat top-ups
  via `casino-api`).
- **Spaceship** is the reference integration: its backend holds an operator
  key and settles bets against ChipsBank (`SETTLEMENT_MODE=chipsbank`).
  Ludo's backend should follow the identical pattern.
- **Ludo today**: `chipsHubConnector` gives the game the hub wallet
  (read-only usefulness: address + reads) when embedded in the hub iframe.
  There is no ludo operator key, no deployed ChipsBank address configured,
  and the ws backend has no settlement code.

So the best way to bring CHIPS into ludo is a **table/pot model** layered on
ChipsBank escrow, shipped in phases that are each independently playable.

## The casino loop (game design)

Every mode speaks the same language — *tables, buy-ins, pots, bounties*:

| Concept | Rule |
|---|---|
| **Buy-in** | Each seat antes the table stake before the first roll. |
| **Pot** | Stake × seats, displayed live in the board's center medallion. |
| **Winner takes pot** | All tokens home (or opponent forfeit) rakes the pot. |
| **Capture bounty** | Each capture pays 10% of the stake instantly — keeps mid-game exciting even when the win is far away. |
| **Leaving = forfeit** | Abandoning a staked table forfeits the buy-in. |

## Phases

### Phase 1 — practice chips (DONE, this repo)
Client-side bankroll (`chipsStore`, localStorage, 500 free chips, top-up when
broke). Single-player staked tables: you ante, the house matches every bot
seat, winner takes the pot, captures pay bounties. Zero trust required, works
offline, teaches the loop. The on-chain balance shows read-only in the HUD
when `VITE_CHIPS_BANK_ADDRESS` is set and the hub wallet is connected.

### Phase 2 — real CHIP stakes for online 1v1
Backend becomes a ChipsBank operator (same as spaceship):

1. Deploy/point at ChipsBank; `registerGame(ludoOperator, debitLimit, creditLimit)`.
2. Room creation gains a `stake` field (agreed in the lobby like rules).
3. On match start the backend `debitFor(playerA, stake)` + `debitFor(playerB, stake)`
   → escrow; on `game_over` it `creditFor(winner, pot − rake)`.
   Suggested rake: 2–5% to the house, capture bounties paid out of rake share.
4. Wire protocol: `room_config.stake`, `balance_update`, `settlement` messages.
5. Failure rules: refund both on abort before first roll; disconnect past the
   grace window = forfeit (already the game's rule; settlement follows it).

### Phase 3 — tournaments (the 3D lounge's job)
The 3D room is the **tournament arena** — normal play lives on the flat
table. Tournament = N players × fixed buy-in, single-elimination or
points-race; payout split 60/30/10 (adjust per size). Backend escrows all
buy-ins at registration, pays from the pot at the final. The 3D lounge
environment (spotlit table, spectator chat via LiveKit) becomes the "final
table" presentation.

### Phase 4 — juice
Side-bets for spectators ("next capture", "first home"), win-streak
multipliers on practice tables, daily bonus chips through the hub treasury.

## Env

- `VITE_CHIPS_BANK_ADDRESS` (frontend, optional): deployed ChipsBank proxy on
  Celo; enables the read-only "banked" balance in the HUD.
- Backend (phase 2): `CHIPS_BANK_ADDRESS`, `LUDO_OPERATOR_KEY`, `RPC_URL`.
