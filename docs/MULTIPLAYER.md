# StellarDice — Multiplayer Architecture (implemented)

This documents the multiplayer system as it exists in the repo today (unlike
`ARCHITECTURE.md`, which sketches the long-term product vision).

## Module layout

```
shared/                     Framework-free game domain — the single source of truth
├── ludo/
│   ├── types.ts            Tokens, players (human | bot | remote), state
│   ├── rules.ts            GameRules + RULE_DEFS registry + sanitizer
│   ├── boardGrid.ts        15×15 grid, 52-cell track, home lanes
│   ├── constants.ts        Paths, colors, safe squares
│   ├── gameLogic.ts        Legal moves, captures, turns — parametrized by rules
│   └── ai.ts               Bot move selection (easy / medium / hard)
└── protocol.ts             Typed client↔server frames + room lifecycle constants

backend/                    Room server: Node + ws, in-memory rooms
├── src/server.ts           HTTP /health + WS upgrade, heartbeat, sweeps
├── src/rooms.ts            RoomManager: create/join/rejoin/ready/rules/leave
└── src/game.ts             ServerGame: authoritative dice + move validation

frontend/
├── src/net/                connection.ts (typed WS + backoff reconnect), client.ts (singleton)
├── src/stores/             appStore (screens, identity, invite deep link)
│                           roomStore (room snapshot, seat, connection)
│                           gameStore (match state for all three modes)
├── src/screens/            Menu / SinglePlayer / Local / Online / Lobby
├── src/components/icons/   Hand-drawn SVG icon set + avatar registry (no emoji)
└── src/scenes/             R3F game room, board, dice, tokens
```

Both `frontend` (via the `@shared` alias) and `backend` (via relative imports)
compile `shared/` directly — game rules can never drift between client and
server because there is only one implementation.

## Game modes

| Mode               | Engine runs                           | Opponents                                        |
| ------------------ | ------------------------------------- | ------------------------------------------------ |
| Single player      | in the client (`gameStore`)           | 1–3 bots, easy/medium/hard (`shared/ludo/ai.ts`) |
| Local two players  | in the client                         | second human, pass-and-play                      |
| Online two players | on the server (`backend/src/game.ts`) | remote player via room invite                    |

In online games the client is a **dumb terminal**: it sends intents (`roll`,
`move tokenId`) and renders whatever `game_state` the server broadcasts. Dice
values are generated server-side; the 3-D dice still tumble with real physics,
then snap the decided face upward when they settle (`DiceMesh.forceValue`), so
the presentation stays honest to the authoritative outcome.

## Room lifecycle

```
create_room ──► waiting ──join_room──► lobby ──start_game──► playing
                  ▲                     │  ▲                    │
                  │   guest leaves──────┘  └────game_over───────┘  (rematch)
                  └── everyone gone / TTL expired ──► closed
```

- **Codes & invites** — 6 chars from an unambiguous alphabet (no `0/O/1/I`).
  Invite links are `https://host/#/join/CODE`; the app parses the hash on load
  and pre-fills the join form.
- **Capacity** — exactly two seats; a third join attempt gets `room_full`.
- **Rules agreement** — only the host edits rules; any change clears both
  ready flags, so a guest's _Ready_ is always consent to the rules currently
  shown. The host's _Start_ is refused (`not_ready`) until both seats are
  connected **and** ready.
- **Rematch** — when a game ends the room drops back to `lobby` with ready
  flags cleared; the same invite keeps working.
- **Host migration** — if the host leaves the lobby, the guest inherits seat 0
  (and the room reverts to `waiting`) instead of having their room torn down.
- **Expiry** — un-started rooms die after 30 min (`ROOM_TTL_MS`); rooms with
  nobody connected are swept once their reconnect timers lapse.

## Disconnects & reconnection

Each occupant gets a `playerToken` (UUID) on join, which the client persists in
`sessionStorage`. On any socket drop the client reconnects with exponential
backoff and sends `rejoin { code, playerToken }`; the server holds the seat for
`RECONNECT_GRACE_MS` (90 s, env-overridable via `GRACE_MS` for tests) and tells
the opponent (`opponent_connection`), which the game screen surfaces as a
banner. If the grace expires mid-game the remaining player wins by **forfeit**;
in the lobby the seat is simply freed. A page refresh mid-game reuses the same
mechanism and drops the player straight back into the match.

## Protocol

All frames are single JSON objects with a `t` discriminant, defined in
`shared/protocol.ts` (`ClientMessage` / `ServerMessage`). Highlights:

- `joined` carries the seat, the player token, and a full `RoomSnapshot`.
- `room_update` re-broadcasts the snapshot on every lobby change.
- `roll_result` precedes `game_state` so clients can animate dice before
  applying the post-roll state (the client buffers the state until the dice
  visuals settle).
- `error` carries a machine code (`room_full`, `not_your_turn`, …) plus a
  human-readable message that the UI shows verbatim.

The server validates everything: turn ownership, move legality (recomputed
via `getLegalMoves`), rules payloads (`sanitizeRules`), name/chat lengths, and
message size (4 KB cap). Heartbeat pings terminate dead sockets.

## Rules registry

`shared/ludo/rules.ts` defines match rules once:

```ts
RULE_DEFS = [ { id, label, description, defaultValue }, ... ]
```

The lobby's rules panel, the in-game "Table Rules" card, wire sanitization,
and the engine all read this registry — adding a rule means extending
`GameRules`, appending one entry, and consuming the flag in `gameLogic.ts`.
Shipped rules: **Crossed Houses** (finish in the diagonally opposite house,
+26 squares), **Twin Dice** (bonus roll only on a double six), **Quick
Start**, **Safe Squares**, **Side-by-Side Houses** (1v1 pairing arrangement).

### One-on-one = two houses per player

Every 1v1 match (online, local, or vs a single bot) seats each player behind
TWO houses: crossed diagonals by default (Yellow+Red vs Blue+Green), or
same-side rows under the Side-by-Side rule. Seats carry an `ownerId`; the
seat order interleaves owners so house turns alternate control. Ownership —
not color — decides captures (partner houses can't cut each other) and the
win (all 8 of an owner's tokens home). The wire seat (0/1) maps to the two
`seat-N` owner ids.

## Why Vite + a dedicated WS server (and not Next.js)

Evaluated and deliberately rejected for this codebase:

1. **The app is a WebGL game.** Every screen is client-rendered; react-three
   -fiber cannot render on the server. SSR/streaming/SEO — Next's core wins —
   buy nothing here, while adding hydration and `use client` ceremony.
2. **Realtime needs a stateful socket server.** Rooms live in memory attached
   to WebSocket connections. Next's request/response and serverless model
   doesn't hold long-lived sockets — the standard workaround is running a
   custom Node server _next to_ Next, which is exactly `backend/`, minus the
   framework overhead.
3. **Routing is trivial.** Four screens and one invite deep link, handled by a
   30-line hash parser; a file-system router is dead weight in a game that
   must never unmount its Canvas between screens.
4. **Migration risk.** The R3F/rapier/drei stack is tuned and verified under
   Vite; a framework swap would re-test the entire 3-D pipeline for zero
   functional gain.

Scaling path: the room server is a single stateless-startup process holding
state in memory. To scale horizontally, pin rooms to instances via the room
code (consistent hashing at the LB) or move room state to Redis — the
`RoomManager` interface is the seam.

## Running it

```bash
# 1. Room server (ws://localhost:5100)
cd backend && npm install && npm run dev

# 2. Game client (http://localhost:5000)
cd frontend && npm install && npm run dev
```

The client reads `VITE_WS_URL` to point at a deployed room server; it defaults
to `ws(s)://<page-host>:5100`.

## Verification

- `shared` engine: 240-game randomized simulation across every rules variant
  (termination + board invariants), plus AI strength checks (hard beats easy
  ~79%, medium ~74%).
- `backend`: 17-assertion protocol integration test with raw ws clients —
  join/full/rules/ready/start gating, a full game to completion, rematch
  reset, reconnect-within-grace, forfeit-after-grace, stale-token rejection.
- `frontend`: browser e2e across all three modes — single (bot takes its
  turn), local (turn alternation), online (two browsers: create → invite →
  ready-dance → rule-change resets ready → play with state convergence →
  disconnect banner → forfeit).
