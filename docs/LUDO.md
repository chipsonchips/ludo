# Ludo — Rules & Implementation

## Rules (implemented)

| Rule | Behavior |
|------|----------|
| Setup | 2–4 players, 4 tokens each (Yellow, Blue, Green, Red) |
| Objective | First to get all 4 tokens into HOME wins |
| Exit base | Must roll **6** to bring a token onto the starting square |
| Movement | Tokens move clockwise; count matches die roll |
| Rolling 6 | Bonus turn after completing the move |
| Capturing | Landing on an opponent sends their token back to base |
| Safe squares | ★ squares — no captures allowed |
| Entering home | After a full lap, token enters colored home column |
| Exact roll | Must roll exact count to reach final HOME cell |
| Win | All 4 tokens finished in center |

## Board layout

Classic 15×15 grid matching standard Ludo:

- **Yellow** — top-left base
- **Blue** — top-right base
- **Green** — bottom-left base
- **Red** — bottom-right base

52-square main track, 5-square home columns, 4 center HOME triangles.

## Code map

```
frontend/src/ludo/
├── types.ts          # Token, player, game state
├── constants.ts      # Paths, safe squares, colors
├── boardLayout.ts    # Grid → 3D positions
└── gameLogic.ts      # Legal moves, captures, turns

frontend/src/scenes/
├── LudoBoard.tsx     # 3D board rendering
└── LudoToken.tsx     # 3D pawn pieces

dummy-data/ludoPlayers.ts   # 4-player mock setup
```

## How to play (frontend)

1. **Roll Die** when it's your turn (Yellow / You starts)
2. Roll **6** to move a token out of your base
3. If multiple tokens can move, **tap the highlighted pawn** on the board
4. Capture opponents, use safe ★ squares, race to HOME
5. First player with 4 tokens home wins
