# Ludo — Rules & Implementation

## Rules (implemented)

| Rule | Behavior |
|------|----------|
| Setup | 4 houses, 4 tokens each (Yellow, Blue, Red, Green) |
| One-on-one | Each player (bots included) runs **two houses** — crossed diagonals by default (Yellow+Red vs Blue+Green), or same-side rows with the Side-by-Side rule. House turns alternate owners; partner houses can't capture each other |
| Objective | Bring every token you own home (8 in 1v1, 4 per house otherwise) |
| Exit base | Must roll **6** to bring a token onto the starting square |
| Movement | Tokens move clockwise; count matches die roll |
| Bonus roll | Twin dice: only a **double six** grants another roll. Single die: a 6 does |
| Capturing | Landing on an opponent sends their token back to base |
| Safe squares | ★ squares — no captures allowed |
| Entering home | After rounding the board, a token turns into its own colored home lane |
| Finishing | An exact roll carries it to the center — journey complete |

## Configurable rules (agreed in the lobby)

Defined once in `shared/ludo/rules.ts` (`RULE_DEFS`) and consumed by the
engine, the lobby UI, and the wire protocol. See `docs/MULTIPLAYER.md`.

| Rule | Default | Effect |
|------|---------|--------|
| Crossed Houses | off | Tokens finish in the diagonally opposite house (+26 squares) |
| Twin Dice | on | Two dice per roll, spendable on one or two tokens; bonus roll only on double six |
| Quick Start | off | Each player starts with one token already out |
| Safe Squares | on | ★ squares shelter tokens from capture |
| Side-by-Side Houses | off | 1v1 pairs sit on the same side of the board instead of crossed diagonals |

## Board layout

Classic 15×15 grid matching standard Ludo:

- **Yellow** — top-left base
- **Blue** — top-right base
- **Green** — bottom-left base
- **Red** — bottom-right base

52-square main track, 5-square home columns, 4 center HOME triangles.

## Code map

```
shared/ludo/                # single source of truth for client AND server
├── types.ts          # Token, player (human|bot|remote), game state
├── rules.ts          # Configurable match rules registry
├── constants.ts      # Paths, safe squares, colors
├── boardGrid.ts      # 15×15 grid definition
├── gameLogic.ts      # Legal moves, captures, turns (rules-parametrized)
└── ai.ts             # Bot move selection (easy / medium / hard)

frontend/src/ludo/          # thin re-exports of shared + rendering helpers
└── boardLayout.ts    # Grid → 3D positions

frontend/src/scenes/
├── LudoBoard.tsx     # 3D board rendering
└── LudoToken.tsx     # 3D pawn pieces

backend/src/game.ts         # server-authoritative match (online mode)
```

## How to play (frontend)

1. **Roll Die** when it's your turn (Yellow / You starts)
2. Roll **6** to move a token out of your base
3. If multiple tokens can move, **tap the highlighted pawn** on the board
4. Capture opponents, use safe ★ squares, race to HOME
5. First player with 4 tokens home wins
