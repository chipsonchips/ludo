# StellarDice Frontend

Premium 3D multiplayer dice game experience built with React Three Fiber.

## Quick Start

```bash
npm install
npm run dev
# Open http://localhost:5000
```

## Structure

| Path                     | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `src/scenes/`            | 3D WebGL scene (table, dice physics, particles) |
| `src/components/game/`   | Game HUD (top bar, bottom bar, player panel)    |
| `src/components/social/` | Chat, emotes, voice controls, reactions         |
| `src/stores/`            | Zustand state management                        |
| `../dummy-data/`         | Mock game data (replace with API later)         |

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS v4
- Three.js + React Three Fiber + Drei
- Rapier physics for dice rolling
- GSAP + Framer Motion for animations
- Zustand for state
- Web Audio API for sound effects

## Architecture

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for full system design.
