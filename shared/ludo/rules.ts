/**
 * Match rules the players agree on before a game starts.
 *
 * To add a rule: extend `GameRules`, add an entry to `RULE_DEFS`, and read the
 * flag wherever the engine needs it. Lobby UI, agreement flow, and the wire
 * protocol pick the new rule up automatically from the registry.
 */
export interface GameRules {
  /** Finish in the house diagonally across the board — the lap is 26 squares longer. */
  crossedHouses: boolean;
  /** Roll two dice per turn and spend them on one or two tokens. */
  doubleDice: boolean;
  /** Each player begins with one token already on their starting square. */
  quickStart: boolean;
  /** Star squares shelter tokens from capture. */
  safeSquares: boolean;
  /** 1v1 pairing: both houses on the same side of the board instead of diagonal corners. */
  sameLinePairs: boolean;
}

export interface RuleDef {
  id: keyof GameRules;
  label: string;
  description: string;
  defaultValue: boolean;
}

export const RULE_DEFS: RuleDef[] = [
  {
    id: 'crossedHouses',
    label: 'Crossed Houses',
    description: 'Tokens finish in the house diagonally across the board. The journey is 26 squares longer.',
    defaultValue: false,
  },
  {
    id: 'doubleDice',
    label: 'Twin Dice',
    description: 'Roll two dice each turn and spend them on one or two tokens. Only a double six grants a bonus roll.',
    defaultValue: true,
  },
  {
    id: 'quickStart',
    label: 'Quick Start',
    description: 'Each player begins with one token already out on their starting square.',
    defaultValue: false,
  },
  {
    id: 'safeSquares',
    label: 'Safe Squares',
    description: 'Star squares shelter tokens from capture.',
    defaultValue: true,
  },
  {
    id: 'sameLinePairs',
    label: 'Side-by-Side Houses',
    description: 'One-on-one only: each player runs two houses on the same side of the board instead of diagonally crossed corners.',
    defaultValue: false,
  },
];

export const DEFAULT_RULES: GameRules = Object.fromEntries(
  RULE_DEFS.map((def) => [def.id, def.defaultValue])
) as unknown as GameRules;

/** Number of dice rolled per turn under the given rules. */
export function diceCount(rules: GameRules): number {
  return rules.doubleDice ? 2 : 1;
}

/** Coerce an untrusted rules object (e.g. off the wire) into a valid GameRules. */
export function sanitizeRules(input: unknown): GameRules {
  const raw = (input ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    RULE_DEFS.map((def) => [def.id, typeof raw[def.id] === 'boolean' ? raw[def.id] : def.defaultValue])
  ) as unknown as GameRules;
}
