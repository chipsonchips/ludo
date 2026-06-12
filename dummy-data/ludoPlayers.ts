import { LOCAL_PLAYER_ID } from './players';

export type LudoColorName = 'yellow' | 'blue' | 'green' | 'red';

export interface LudoPlayerDef {
  id: string;
  username: string;
  avatar: string;
  color: LudoColorName;
  isLocalPlayer: boolean;
}

export const ludoPlayerDefs: LudoPlayerDef[] = [
  { id: LOCAL_PLAYER_ID, username: 'You', avatar: '🎯', color: 'yellow', isLocalPlayer: true },
  { id: 'player-2', username: 'NovaBlaze', avatar: '🔥', color: 'blue', isLocalPlayer: false },
  { id: 'player-3', username: 'LuckyStar', avatar: '⭐', color: 'green', isLocalPlayer: false },
  { id: 'player-4', username: 'DiceKing', avatar: '👑', color: 'red', isLocalPlayer: false },
];
