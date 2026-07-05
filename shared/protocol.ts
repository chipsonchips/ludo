/**
 * Wire protocol between the game client and the room server.
 * Every frame is a single JSON object with a `t` discriminant.
 */
import type { GameRules } from './ludo/rules';
import type { LudoState } from './ludo/types';

/** Seat 0 is always the host. */
export type Seat = 0 | 1;

export type RoomStatus =
  | 'waiting' // host alone, waiting for a guest
  | 'lobby' // both seats filled, agreeing on rules / readying up
  | 'playing'
  | 'closed';

export interface RoomPlayerInfo {
  seat: Seat;
  name: string;
  avatarId: string;
  ready: boolean;
  connected: boolean;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  rules: GameRules;
  /** Indexed by seat; null seat = empty. */
  players: (RoomPlayerInfo | null)[];
  createdAt: number;
  /** Epoch ms after which an un-started room is reclaimed. */
  expiresAt: number;
}

export type GameOverReason = 'finished' | 'forfeit' | 'left';

// ── Client → Server ────────────────────────────────────────────────

export type ClientMessage =
  | { t: 'create_room'; name: string; avatarId: string }
  | { t: 'join_room'; code: string; name: string; avatarId: string }
  | { t: 'rejoin'; code: string; playerToken: string }
  | { t: 'set_rules'; rules: GameRules }
  | { t: 'set_ready'; ready: boolean }
  | { t: 'start_game' }
  | { t: 'roll' }
  | { t: 'move'; tokenId: string }
  | { t: 'chat'; text: string }
  | { t: 'reaction'; icon: string }
  | { t: 'leave' };

// ── Server → Client ────────────────────────────────────────────────

export type ServerMessage =
  | { t: 'joined'; seat: Seat; playerToken: string; room: RoomSnapshot }
  | { t: 'room_update'; room: RoomSnapshot }
  | { t: 'game_started'; state: LudoState }
  | { t: 'roll_result'; seat: Seat; values: number[] }
  | { t: 'game_state'; state: LudoState }
  | { t: 'chat'; seat: Seat; name: string; text: string; ts: number }
  | { t: 'reaction'; seat: Seat; icon: string }
  | { t: 'opponent_connection'; seat: Seat; connected: boolean; graceSeconds?: number }
  | { t: 'game_over'; winnerSeat: Seat; reason: GameOverReason; state?: LudoState }
  | { t: 'room_closed'; reason: string }
  | { t: 'error'; code: ErrorCode; message: string };

export type ErrorCode =
  | 'room_not_found'
  | 'room_full'
  | 'room_expired'
  | 'not_host'
  | 'not_ready'
  | 'not_your_turn'
  | 'invalid_move'
  | 'invalid_message'
  | 'already_in_room';

/** Milliseconds an un-started room lives before being reclaimed. */
export const ROOM_TTL_MS = 30 * 60 * 1000;
/** Grace period to reconnect before a live game is forfeited. */
export const RECONNECT_GRACE_MS = 90 * 1000;
/** Room codes: unambiguous uppercase alphanumerics (no 0/O/1/I). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
