export type Rank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type PlayerStatus = 'online' | 'away' | 'offline';

export type GameMode = 'single' | '1v1' | '3player' | '4player';

export type GamePhase = 'waiting' | 'rolling' | 'resolving' | 'round_end' | 'match_end';

export type VoiceState = 'connected' | 'muted' | 'speaking' | 'disconnected';

export interface PlayerStats {
  gamesPlayed: number;
  winRate: number;
  currentStreak: number;
  highestStreak: number;
  totalRewards: number;
}

export interface Player {
  id: string;
  username: string;
  avatar: string;
  rank: Rank;
  score: number;
  isCurrentTurn: boolean;
  isLocalPlayer: boolean;
  status: PlayerStatus;
  voiceState: VoiceState;
  stats: PlayerStats;
  position: { x: number; y: number; z: number };
  color: string;
}

export interface Reaction {
  id: string;
  playerId: string;
  emoji: string;
  timestamp: number;
  position?: { x: number; y: number };
}

export interface ChatMessage {
  id: string;
  playerId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'emote';
}

export interface DiceRoll {
  playerId: string;
  values: number[];
  total: number;
  timestamp: number;
}

export interface RoundInfo {
  number: number;
  maxRounds: number;
  targetScore: number;
  phase: GamePhase;
}

export interface Room {
  id: string;
  name: string;
  mode: GameMode;
  isPrivate: boolean;
  inviteLink: string;
  hostId: string;
  maxPlayers: number;
  createdAt: number;
}

export interface MatchState {
  room: Room;
  players: Player[];
  round: RoundInfo;
  diceRolls: DiceRoll[];
  reactions: Reaction[];
  chat: ChatMessage[];
  matchTimer: number;
  matchTimerMax: number;
}

export interface Emote {
  id: string;
  emoji: string;
  label: string;
  category: 'celebrate' | 'react' | 'taunt';
}
