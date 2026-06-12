export type LudoColor = 'yellow' | 'blue' | 'green' | 'red';

export type LudoPhase = 'roll' | 'select_token' | 'moving' | 'game_over';

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
  id: string;
  username: string;
  avatar: string;
  color: LudoColor;
  isLocalPlayer: boolean;
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
}

export interface BoardCell {
  row: number;
  col: number;
  type: 'base' | 'path' | 'home' | 'center' | 'outside';
  color?: LudoColor;
  isSafe?: boolean;
}
