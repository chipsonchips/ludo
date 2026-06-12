import type { LudoColor, LudoState, LudoToken, TokenLocation } from './types';
import { HOME_PATHS, MAIN_PATH, PLAYER_ORDER, SAFE_TRACK_INDICES, START_INDEX } from './constants';

function trackIndexFor(color: LudoColor, globalPathIndex: number): number {
  const start = START_INDEX[color];
  return (globalPathIndex - start + MAIN_PATH.length) % MAIN_PATH.length;
}

function globalTrackIndex(color: LudoColor, relativeIndex: number): number {
  return (START_INDEX[color] + relativeIndex) % MAIN_PATH.length;
}

function isSafeSquare(globalIndex: number): boolean {
  const relativeFromYellow = trackIndexFor('yellow', globalIndex);
  return SAFE_TRACK_INDICES.has(relativeFromYellow);
}

function tokensAtTrackCell(state: LudoState, globalIndex: number, excludeTokenId?: string): LudoToken[] {
  return state.tokens.filter((t) => {
    if (t.id === excludeTokenId) return false;
    if (t.location.kind !== 'track') return false;
    const gi = globalTrackIndex(t.color, t.location.index);
    return gi === globalIndex;
  });
}

function canLandOn(state: LudoState, color: LudoColor, globalIndex: number, tokenId: string): boolean {
  const occupants = tokensAtTrackCell(state, globalIndex, tokenId);
  if (occupants.length === 0) return true;
  if (isSafeSquare(globalIndex)) return false;
  // Can't land on own token
  if (occupants.every((t) => t.color === color)) return false;
  // Can capture opponent (single token only)
  return occupants.length === 1 && occupants[0].color !== color;
}

export interface MoveOption {
  tokenId: string;
  newLocation: TokenLocation;
  capture?: LudoToken;
  dieValueUsed: number;
}

function simulateTrackMove(
  state: LudoState,
  token: LudoToken,
  steps: number
): MoveOption | null {
  if (token.location.kind === 'base') return null;

  if (token.location.kind === 'track') {
    const current = token.location.index;
    const stepsToHomeEntry = MAIN_PATH.length - current;

    if (steps >= stepsToHomeEntry) {
      const homeIndex = steps - stepsToHomeEntry;
      if (homeIndex > HOME_PATHS[token.color].length) return null;
      if (homeIndex === HOME_PATHS[token.color].length) {
        return { tokenId: token.id, newLocation: { kind: 'finished' }, dieValueUsed: steps };
      }
      return { tokenId: token.id, newLocation: { kind: 'home', index: homeIndex }, dieValueUsed: steps };
    }

    const newIndex = current + steps;
    const globalIdx = globalTrackIndex(token.color, newIndex);
    if (!canLandOn(state, token.color, globalIdx, token.id)) return null;

    const capture = tokensAtTrackCell(state, globalIdx, token.id).find((t) => t.color !== token.color);
    return {
      tokenId: token.id,
      newLocation: { kind: 'track', index: newIndex },
      capture,
      dieValueUsed: steps,
    };
  }

  if (token.location.kind === 'home') {
    const newHomeIndex = token.location.index + steps;
    if (newHomeIndex >= HOME_PATHS[token.color].length) return null;
    return { tokenId: token.id, newLocation: { kind: 'home', index: newHomeIndex }, dieValueUsed: steps };
  }

  return null;
}

function simulateHomeToFinish(token: LudoToken, steps: number): MoveOption | null {
  if (token.location.kind !== 'home') return null;
  const target = token.location.index + steps;
  if (target === HOME_PATHS[token.color].length) {
    return { tokenId: token.id, newLocation: { kind: 'finished' }, dieValueUsed: steps };
  }
  if (target > HOME_PATHS[token.color].length) return null;
  return { tokenId: token.id, newLocation: { kind: 'home', index: target }, dieValueUsed: steps };
}

export function getLegalMoves(state: LudoState): MoveOption[] {
  const color = state.players[state.currentPlayerIndex].color;
  const playerTokens = state.tokens.filter((t) => t.color === color && t.location.kind !== 'finished');
  const moves: MoveOption[] = [];

  const uniqueDice = Array.from(new Set(state.diceValues)).sort((a, b) => b - a);

  for (const dice of uniqueDice) {
    for (const token of playerTokens) {
      if (token.location.kind === 'base') {
        if (dice === 6) {
          const startGlobal = globalTrackIndex(color, 0);
          if (canLandOn(state, color, startGlobal, token.id)) {
            const capture = tokensAtTrackCell(state, startGlobal, token.id).find((t) => t.color !== color);
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
        const m = simulateHomeToFinish(token, dice);
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

  const color = state.players[state.currentPlayerIndex].color;
  const finishedCount = tokens.filter((t) => t.color === color && t.location.kind === 'finished').length;

  const players = state.players.map((p) => ({
    ...p,
    tokensFinished: tokens.filter((t) => t.color === p.color && t.location.kind === 'finished').length,
    isCurrentTurn: false,
  }));

  const allFinished = finishedCount === 4;
  const turnContinues = newDiceValues.length > 0 && !allFinished;

  let nextIndex = state.currentPlayerIndex;
  let nextPhase = 'select_token';

  if (allFinished) {
    nextPhase = 'game_over';
  } else if (!turnContinues) {
    if (state.extraTurn) {
      nextPhase = 'roll';
      players[nextIndex].isCurrentTurn = true;
    } else {
      nextPhase = 'roll';
      nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      players[nextIndex].isCurrentTurn = true;
    }
  } else {
    players[nextIndex].isCurrentTurn = true;
  }

  const winner = allFinished ? state.players[state.currentPlayerIndex].id : null;

  return {
    ...state,
    tokens,
    players,
    currentPlayerIndex: nextIndex,
    phase: nextPhase as any,
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

export function createInitialLudoState(
  playerDefs: { id: string; username: string; avatar: string; color: LudoColor; isLocalPlayer: boolean }[]
): LudoState {
  const tokens: LudoToken[] = [];
  for (const p of playerDefs) {
    for (let slot = 0; slot < 4; slot++) {
      tokens.push({
        id: `${p.color}-${slot}`,
        color: p.color,
        location: { kind: 'base', slot },
      });
    }
  }

  const players = playerDefs.map((p, i) => ({
    id: p.id,
    username: p.username,
    avatar: p.avatar,
    color: p.color,
    isLocalPlayer: p.isLocalPlayer,
    isCurrentTurn: i === 0,
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
    message: 'Roll to bring a token out!',
  };
}

export function getActivePlayerColors(count: number): LudoColor[] {
  return PLAYER_ORDER.slice(0, count);
}
