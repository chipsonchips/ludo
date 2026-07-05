import type { LudoColor, LudoPlayerDef, LudoState, LudoToken, TokenLocation } from './types';
import { diceCount, type GameRules } from './rules';
import { HOME_PATHS, MAIN_PATH, SAFE_TRACK_INDICES, START_INDEX } from './constants';

/**
 * Bonus-roll rule: with twin dice, only a DOUBLE SIX earns another roll;
 * with a single die, a six does (classic).
 */
export function grantsExtraTurn(values: number[], rules: GameRules): boolean {
  if (diceCount(rules) > 1) return values.filter((v) => v === 6).length >= 2;
  return values.includes(6);
}

/** Diagonally opposite houses (yellow TL ↔ red BR, blue TR ↔ green BL). */
export const OPPOSITE_COLOR: Record<LudoColor, LudoColor> = {
  yellow: 'red',
  red: 'yellow',
  blue: 'green',
  green: 'blue',
};

/** Which house's home lane a token finishes in under the given rules. */
export function homeLaneColor(color: LudoColor, rules: GameRules): LudoColor {
  return rules.crossedHouses ? OPPOSITE_COLOR[color] : color;
}

/**
 * Relative track index of the cell where a token turns into its home lane.
 * A token enters at relative 0 and its own turnoff sits two cells behind the
 * start square (relative 50). With Crossed Houses the token continues past it
 * to the opposite house's turnoff, half a lap (26 cells) further.
 */
export function homeEntryIndex(rules: GameRules): number {
  const own = MAIN_PATH.length - 2;
  return rules.crossedHouses ? own + MAIN_PATH.length / 2 : own;
}

/** Map a color-relative track index (may exceed one lap) to the global MAIN_PATH index. */
export function globalTrackIndex(color: LudoColor, relativeIndex: number): number {
  return (START_INDEX[color] + relativeIndex) % MAIN_PATH.length;
}

/** SAFE_TRACK_INDICES are global MAIN_PATH indices (the cells drawn with a ★). */
function isSafeSquare(globalIndex: number, rules: GameRules): boolean {
  return rules.safeSquares && SAFE_TRACK_INDICES.has(globalIndex);
}

function tokensAtTrackCell(state: LudoState, globalIndex: number, excludeTokenId?: string): LudoToken[] {
  return state.tokens.filter((t) => {
    if (t.id === excludeTokenId) return false;
    if (t.location.kind !== 'track') return false;
    const gi = globalTrackIndex(t.color, t.location.index);
    return gi === globalIndex;
  });
}

/** Which actual player a house belongs to (two houses per player in 1v1). */
export function ownerOfColor(state: LudoState, color: LudoColor): string {
  return state.players.find((p) => p.color === color)?.ownerId ?? color;
}

function sameOwner(state: LudoState, a: LudoColor, b: LudoColor): boolean {
  return ownerOfColor(state, a) === ownerOfColor(state, b);
}

function canLandOn(state: LudoState, color: LudoColor, globalIndex: number, tokenId: string): boolean {
  const occupants = tokensAtTrackCell(state, globalIndex, tokenId);
  if (occupants.length === 0) return true;
  if (isSafeSquare(globalIndex, state.rules)) return false;
  // Can't land on your own tokens — including your partner house's
  if (occupants.every((t) => sameOwner(state, t.color, color))) return false;
  // Can capture an opponent (single token only)
  return occupants.length === 1 && !sameOwner(state, occupants[0].color, color);
}

export interface MoveOption {
  tokenId: string;
  newLocation: TokenLocation;
  capture?: LudoToken;
  dieValueUsed: number;
}

function simulateTrackMove(state: LudoState, token: LudoToken, steps: number): MoveOption | null {
  if (token.location.kind !== 'track') return null;

  const rules = state.rules;
  const laneLength = HOME_PATHS[homeLaneColor(token.color, rules)].length;
  const newIndex = token.location.index + steps;
  const entryIndex = homeEntryIndex(rules);

  if (newIndex > entryIndex) {
    const homeIndex = newIndex - entryIndex - 1;
    if (homeIndex > laneLength) return null;
    if (homeIndex === laneLength) {
      return { tokenId: token.id, newLocation: { kind: 'finished' }, dieValueUsed: steps };
    }
    return { tokenId: token.id, newLocation: { kind: 'home', index: homeIndex }, dieValueUsed: steps };
  }

  const globalIdx = globalTrackIndex(token.color, newIndex);
  if (!canLandOn(state, token.color, globalIdx, token.id)) return null;

  const capture = tokensAtTrackCell(state, globalIdx, token.id).find(
    (t) => !sameOwner(state, t.color, token.color)
  );
  return {
    tokenId: token.id,
    newLocation: { kind: 'track', index: newIndex },
    capture,
    dieValueUsed: steps,
  };
}

function simulateHomeMove(state: LudoState, token: LudoToken, steps: number): MoveOption | null {
  if (token.location.kind !== 'home') return null;
  const laneLength = HOME_PATHS[homeLaneColor(token.color, state.rules)].length;
  const target = token.location.index + steps;
  if (target === laneLength) {
    return { tokenId: token.id, newLocation: { kind: 'finished' }, dieValueUsed: steps };
  }
  if (target > laneLength) return null;
  return { tokenId: token.id, newLocation: { kind: 'home', index: target }, dieValueUsed: steps };
}

export function getLegalMoves(state: LudoState): MoveOption[] {
  // One roll serves EVERYTHING the current player owns — with two houses in
  // 1v1, the dice can be spent on tokens from either house.
  const owner = state.players[state.currentPlayerIndex].ownerId;
  const ownedColors = new Set(
    state.players.filter((p) => p.ownerId === owner).map((p) => p.color)
  );
  const playerTokens = state.tokens.filter(
    (t) => ownedColors.has(t.color) && t.location.kind !== 'finished'
  );
  const moves: MoveOption[] = [];

  const uniqueDice = Array.from(new Set(state.diceValues)).sort((a, b) => b - a);

  for (const dice of uniqueDice) {
    for (const token of playerTokens) {
      if (token.location.kind === 'base') {
        if (dice === 6) {
          const startGlobal = globalTrackIndex(token.color, 0);
          if (canLandOn(state, token.color, startGlobal, token.id)) {
            const capture = tokensAtTrackCell(state, startGlobal, token.id).find(
              (t) => !sameOwner(state, t.color, token.color)
            );
            moves.push({
              tokenId: token.id,
              newLocation: { kind: 'track', index: 0 },
              capture,
              dieValueUsed: dice,
            });
          }
        }
        continue;
      }

      if (token.location.kind === 'home') {
        const m = simulateHomeMove(state, token, dice);
        if (m) moves.push(m);
        continue;
      }

      const m = simulateTrackMove(state, token, dice);
      if (m) moves.push(m);
    }
  }

  return moves;
}

export function applyMove(state: LudoState, move: MoveOption): LudoState {
  let tokens = state.tokens.map((t) =>
    t.id === move.tokenId ? { ...t, location: move.newLocation } : { ...t }
  );

  if (move.capture) {
    tokens = tokens.map((t) =>
      t.id === move.capture!.id
        ? { ...t, location: { kind: 'base' as const, slot: parseInt(t.id.split('-')[1], 10) } }
        : t
    );
  }

  const newDiceValues = [...state.diceValues];
  const usedIdx = newDiceValues.indexOf(move.dieValueUsed);
  if (usedIdx !== -1) newDiceValues.splice(usedIdx, 1);

  // A player wins when EVERY house they own is home (8 tokens in 1v1)
  const mover = state.players[state.currentPlayerIndex];
  const ownedColors = state.players.filter((p) => p.ownerId === mover.ownerId).map((p) => p.color);
  const allFinished = tokens
    .filter((t) => ownedColors.includes(t.color))
    .every((t) => t.location.kind === 'finished');

  const players = state.players.map((p) => ({
    ...p,
    tokensFinished: tokens.filter((t) => t.color === p.color && t.location.kind === 'finished').length,
    isCurrentTurn: false,
  }));
  const turnContinues = newDiceValues.length > 0 && !allFinished;

  let nextIndex = state.currentPlayerIndex;
  let nextPhase: LudoState['phase'] = 'select_token';

  if (allFinished) {
    nextPhase = 'game_over';
  } else if (!turnContinues) {
    nextPhase = 'roll';
    if (!state.extraTurn) {
      nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
    }
  }
  if (!allFinished) {
    // Light up every house the active player owns (both, in 1v1)
    const nextOwner = players[nextIndex].ownerId;
    for (const p of players) p.isCurrentTurn = p.ownerId === nextOwner;
  }

  const winner = allFinished ? mover.ownerId : null;

  return {
    ...state,
    tokens,
    players,
    currentPlayerIndex: nextIndex,
    phase: nextPhase,
    diceValues: newDiceValues,
    isRolling: false,
    extraTurn: !turnContinues ? false : state.extraTurn,
    selectableTokenIds: [],
    winnerId: winner,
    message: allFinished
      ? `${state.players[state.currentPlayerIndex].username} wins!`
      : move.capture
        ? `Captured ${move.capture.color} token!`
        : turnContinues
          ? `Moved! ${newDiceValues.length} move(s) left.`
          : state.extraTurn
            ? 'Bonus turn!'
            : '',
  };
}

/** End the current turn without a move (no legal moves for the remaining dice). */
export function passTurn(state: LudoState, keepExtraTurn: boolean): LudoState {
  const nextIndex = keepExtraTurn
    ? state.currentPlayerIndex
    : (state.currentPlayerIndex + 1) % state.players.length;
  const nextOwner = state.players[nextIndex].ownerId;
  return {
    ...state,
    phase: 'roll',
    diceValues: [],
    extraTurn: false,
    selectableTokenIds: [],
    currentPlayerIndex: nextIndex,
    players: state.players.map((p) => ({ ...p, isCurrentTurn: p.ownerId === nextOwner })),
  };
}

/** Seat colors in clockwise turn order (3+ players: one house each). */
export function colorsForPlayerCount(count: number): LudoColor[] {
  if (count === 3) return ['yellow', 'blue', 'red'];
  return ['yellow', 'blue', 'red', 'green'];
}

export interface PairPlayerDef {
  id: string;
  username: string;
  avatarId: string;
  kind: LudoPlayerDef['kind'];
}

/** House pairs for 1v1 (board: yellow TL, blue TR, red BR, green BL). */
export function pairColorsFor(sameLine: boolean): [LudoColor[], LudoColor[]] {
  return sameLine
    ? [['yellow', 'blue'], ['red', 'green']] // top row vs bottom row
    : [['yellow', 'red'], ['blue', 'green']]; // crossed diagonals
}

/**
 * One-on-one seating: each player runs TWO houses (bots included). Pairs are
 * diagonally crossed by default, or same-side with the Side-by-Side rule.
 * The seat order interleaves owners so control alternates every turn.
 */
export function twoPlayerSeatDefs(p1: PairPlayerDef, p2: PairPlayerDef, sameLine = false): LudoPlayerDef[] {
  const seat = (p: PairPlayerDef, color: LudoColor): LudoPlayerDef => ({
    id: `${p.id}-${color}`,
    username: p.username,
    avatarId: p.avatarId,
    color,
    kind: p.kind,
    ownerId: p.id,
  });
  const [pair1, pair2] = pairColorsFor(sameLine);
  return [seat(p1, pair1[0]), seat(p2, pair2[0]), seat(p1, pair1[1]), seat(p2, pair2[1])];
}

export function createInitialLudoState(playerDefs: LudoPlayerDef[], rules: GameRules): LudoState {
  const tokens: LudoToken[] = [];
  for (const p of playerDefs) {
    for (let slot = 0; slot < 4; slot++) {
      tokens.push({
        id: `${p.color}-${slot}`,
        color: p.color,
        location:
          rules.quickStart && slot === 0
            ? { kind: 'track', index: 0 }
            : { kind: 'base', slot },
      });
    }
  }

  const firstOwner = playerDefs[0].ownerId ?? playerDefs[0].id;
  const players = playerDefs.map((p) => ({
    ...p,
    ownerId: p.ownerId ?? p.id,
    isCurrentTurn: (p.ownerId ?? p.id) === firstOwner,
    tokensFinished: 0,
  }));

  return {
    players,
    tokens,
    currentPlayerIndex: 0,
    phase: 'roll',
    diceValues: [],
    isRolling: false,
    extraTurn: false,
    selectableTokenIds: [],
    winnerId: null,
    message: rules.quickStart ? 'Roll to move out or advance!' : 'Roll a 6 to bring a token out!',
    rules,
  };
}
