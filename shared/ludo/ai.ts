/**
 * Bot move selection. Pure and synchronous: given the current state and the
 * legal moves, pick one. Pacing/animation is the caller's concern.
 *
 * - easy:   plays casually — takes a finish when it sees one, otherwise random.
 * - medium: greedy priorities (finish > capture > exit > safety > progress).
 * - hard:   positional scoring including capture value and capture risk.
 */
import type { AiDifficulty, LudoColor, LudoState, LudoToken } from './types';
import { type MoveOption, globalTrackIndex, homeEntryIndex, ownerOfColor } from './gameLogic';
import { MAIN_PATH, SAFE_TRACK_INDICES } from './constants';

function isStarCell(globalIndex: number, state: LudoState): boolean {
  return state.rules.safeSquares && SAFE_TRACK_INDICES.has(globalIndex);
}

function trackProgress(token: LudoToken): number {
  return token.location.kind === 'track' ? token.location.index : 0;
}

/**
 * How many opposing tokens could land on `destGlobal` with a single die next
 * turn. Tokens in base also threaten their own start square (they enter on a 6).
 */
function threatsAt(state: LudoState, destGlobal: number, mover: LudoColor): number {
  if (isStarCell(destGlobal, state)) return 0;
  const myOwner = ownerOfColor(state, mover);
  let threats = 0;
  for (const t of state.tokens) {
    if (ownerOfColor(state, t.color) === myOwner) continue; // partner houses aren't threats
    if (t.location.kind === 'track') {
      const g = globalTrackIndex(t.color, t.location.index);
      const steps = (destGlobal - g + MAIN_PATH.length) % MAIN_PATH.length;
      if (steps >= 1 && steps <= 6) threats++;
    } else if (t.location.kind === 'base') {
      if (globalTrackIndex(t.color, 0) === destGlobal) threats++;
    }
  }
  return threats;
}

function scoreMove(state: LudoState, move: MoveOption): number {
  const token = state.tokens.find((t) => t.id === move.tokenId)!;
  const entry = homeEntryIndex(state.rules);
  let score = 0;

  if (move.newLocation.kind === 'finished') {
    return 1000; // never pass up finishing a token
  }

  if (move.capture) {
    // A capture retires the capturing token too (same value as finishing
    // it) AND erases the opponent's progress — worth at least as much as a
    // plain finish, more the further along the victim was.
    const victimProgress = trackProgress(move.capture) / entry;
    return 1000 + victimProgress * 200;
  }

  if (token.location.kind === 'base') {
    // Bring tokens into play, more so while few are out
    const tokensOut = state.tokens.filter(
      (t) => t.color === token.color && t.location.kind === 'track'
    ).length;
    score += 30 - tokensOut * 6;
  }

  if (move.newLocation.kind === 'home') {
    // Safe forever; deeper is better
    score += 40 + move.newLocation.index * 4;
    return score;
  }

  if (move.newLocation.kind === 'track') {
    const destGlobal = globalTrackIndex(token.color, move.newLocation.index);

    if (isStarCell(destGlobal, state)) score += 14;

    // Risk of being captured where we land
    score -= threatsAt(state, destGlobal, token.color) * 32;

    // Risk of staying: if the token is currently exposed, moving it has value
    if (token.location.kind === 'track') {
      const hereGlobal = globalTrackIndex(token.color, token.location.index);
      score += threatsAt(state, hereGlobal, token.color) * 18;
    }

    // Progress along the lap
    score += (move.newLocation.index / entry) * 12 + move.dieValueUsed;
  }

  return score;
}

export function chooseAiMove(
  state: LudoState,
  moves: MoveOption[],
  difficulty: AiDifficulty
): MoveOption {
  if (moves.length === 1) return moves[0];

  const finish = moves.find((m) => m.newLocation.kind === 'finished');

  if (difficulty === 'easy') {
    if (finish) return finish;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (difficulty === 'medium') {
    if (finish) return finish;
    const capture = moves.filter((m) => m.capture);
    if (capture.length > 0) return capture[Math.floor(Math.random() * capture.length)];
    const exit = moves.find((m) => {
      const token = state.tokens.find((t) => t.id === m.tokenId)!;
      return token.location.kind === 'base';
    });
    if (exit) return exit;
    const safe = moves.find(
      (m) =>
        m.newLocation.kind === 'track' &&
        isStarCell(
          globalTrackIndex(state.tokens.find((t) => t.id === m.tokenId)!.color, m.newLocation.index),
          state
        )
    );
    if (safe) return safe;
    // Push the furthest token onward
    return moves.reduce((best, m) => {
      const progress = (x: MoveOption) => (x.newLocation.kind === 'track' ? x.newLocation.index : 999);
      return progress(m) > progress(best) ? m : best;
    });
  }

  // hard: full positional scoring with a whisper of noise so games don't repeat
  let best = moves[0];
  let bestScore = -Infinity;
  for (const move of moves) {
    const score = scoreMove(state, move) + Math.random() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}
