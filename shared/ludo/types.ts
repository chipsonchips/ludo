import type { GameRules } from './rules';

export type LudoColor = 'yellow' | 'blue' | 'green' | 'red';

export type LudoPhase = 'roll' | 'select_token' | 'moving' | 'game_over';

/** Who controls a seat: a human on this device, a bot, or a remote player. */
export type PlayerKind = 'human' | 'bot' | 'remote';

export type AiDifficulty = 'easy' | 'medium' | 'hard';

export type TokenLocation =
  | { kind: 'base'; slot: number }
  | { kind: 'track'; index: number }
  | { kind: 'home'; index: number }
  | { kind: 'finished' };

export interface LudoToken {
  id: string;
  color: LudoColor;
  location: TokenLocation;
}

export interface LudoPlayer {
  /** Unique per seat (one seat per house/color). */
  id: string;
  username: string;
  /** Key into the avatar registry (rendered as an SVG badge, never an emoji). */
  avatarId: string;
  color: LudoColor;
  kind: PlayerKind;
  /**
   * The actual player this seat belongs to. In one-on-one matches each player
   * owns TWO seats (two houses); partner houses can't capture each other and
   * a player wins only when all 8 of their tokens are home.
   */
  ownerId: string;
  isCurrentTurn: boolean;
  tokensFinished: number;
}

export interface LudoState {
  players: LudoPlayer[];
  tokens: LudoToken[];
  currentPlayerIndex: number;
  phase: LudoPhase;
  diceValues: number[];
  isRolling: boolean;
  extraTurn: boolean;
  selectableTokenIds: string[];
  winnerId: string | null;
  message: string;
  rules: GameRules;
}

export interface LudoPlayerDef {
  id: string;
  username: string;
  avatarId: string;
  color: LudoColor;
  kind: PlayerKind;
  /** Defaults to `id` (a seat owning itself). */
  ownerId?: string;
}
