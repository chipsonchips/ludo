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
  /** Verified hub wallet address, or null until `authenticate` succeeds. */
  wallet: string | null;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  rules: GameRules;
  /** USDC ante per seat for a real-money table; 0 = Friendly. */
  stake: number;
  /** Indexed by seat; null seat = empty. */
  players: (RoomPlayerInfo | null)[];
  createdAt: number;
  /** Epoch ms after which an un-started room is reclaimed. */
  expiresAt: number;
}

export type GameOverReason = 'finished' | 'forfeit' | 'left';

// ── Voice chat signaling ───────────────────────────────────────────
// The server never inspects these payloads — it relays them verbatim to the
// other seat so the two clients can negotiate a direct WebRTC audio call.

export type VoiceSignal =
  /** "I opened / closed my voice channel" (also carries the mute state). */
  | { kind: 'presence'; active: boolean; muted: boolean }
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; candidate: RTCIceCandidateInit | null }
  /** Explicit hang-up so the peer can tear down immediately. */
  | { kind: 'bye' };

// Structural stand-in so the backend compiles without DOM lib types.
export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
}

// ── Client → Server ────────────────────────────────────────────────

export type ClientMessage =
  | { t: 'create_room'; name: string; avatarId: string }
  | { t: 'join_room'; code: string; name: string; avatarId: string }
  | { t: 'rejoin'; code: string; playerToken: string }
  | { t: 'set_rules'; rules: GameRules }
  | { t: 'set_stake'; stake: number }
  | { t: 'authenticate'; address: string; message: string; signature: string }
  | { t: 'set_ready'; ready: boolean }
  | { t: 'start_game' }
  | { t: 'roll' }
  | { t: 'move'; tokenId: string; dieValue?: number }
  | { t: 'chat'; text: string }
  | { t: 'reaction'; icon: string }
  | { t: 'voice_signal'; signal: VoiceSignal }
  | { t: 'leave' };

// ── Server → Client ────────────────────────────────────────────────

export type ServerMessage =
  | { t: 'joined'; seat: Seat; playerToken: string; room: RoomSnapshot }
  | { t: 'room_update'; room: RoomSnapshot }
  | { t: 'authenticated'; address: string }
  | { t: 'balance_update'; seat: Seat; balance: number }
  | { t: 'game_started'; state: LudoState }
  | { t: 'roll_result'; seat: Seat; values: number[] }
  | { t: 'game_state'; state: LudoState }
  | { t: 'chat'; seat: Seat; name: string; text: string; ts: number }
  | { t: 'reaction'; seat: Seat; icon: string }
  | { t: 'voice_signal'; seat: Seat; signal: VoiceSignal }
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
  | 'already_in_room'
  | 'stake_unavailable'
  | 'wallet_required'
  | 'insufficient_balance'
  | 'settlement_failed';

/** Milliseconds an un-started room lives before being reclaimed. */
export const ROOM_TTL_MS = 30 * 60 * 1000;
/** Grace period to reconnect before a live game is forfeited. */
export const RECONNECT_GRACE_MS = 90 * 1000;
/** Room codes: unambiguous uppercase alphanumerics (no 0/O/1/I). */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
