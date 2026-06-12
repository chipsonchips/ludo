import type { Room, MatchState } from './types';
import { dummyPlayers } from './players';

export const dummyRoom: Room = {
  id: 'ROOM-7X9K2',
  name: 'High Stakes Arena',
  mode: '4player',
  isPrivate: false,
  inviteLink: 'https://stellardice.gg/join/7X9K2',
  hostId: 'player-local',
  maxPlayers: 4,
  createdAt: Date.now() - 180000,
};

export const dummyMatchState: MatchState = {
  room: dummyRoom,
  players: dummyPlayers,
  round: {
    number: 4,
    maxRounds: 10,
    targetScore: 50,
    phase: 'rolling',
  },
  diceRolls: [
  {
    playerId: 'player-4',
    values: [6, 5],
    total: 11,
    timestamp: Date.now() - 45000,
  },
  {
    playerId: 'player-2',
    values: [4, 3],
    total: 7,
    timestamp: Date.now() - 30000,
  },
  {
    playerId: 'player-3',
    values: [2, 1],
    total: 3,
    timestamp: Date.now() - 15000,
  },
  ],
  reactions: [
    { id: 'r1', playerId: 'player-2', emoji: '🔥', timestamp: Date.now() - 20000 },
    { id: 'r2', playerId: 'player-4', emoji: '🎉', timestamp: Date.now() - 10000 },
  ],
  chat: [
    {
      id: 'c1',
      playerId: 'system',
      username: 'System',
      message: 'Match started! First to 50 points wins.',
      timestamp: Date.now() - 180000,
      type: 'system',
    },
    {
      id: 'c2',
      playerId: 'player-2',
      username: 'NovaBlaze',
      message: 'GL everyone! 🎲',
      timestamp: Date.now() - 120000,
      type: 'chat',
    },
    {
      id: 'c3',
      playerId: 'player-4',
      username: 'DiceKing',
      message: 'Let\'s gooo',
      timestamp: Date.now() - 90000,
      type: 'chat',
    },
    {
      id: 'c4',
      playerId: 'player-3',
      username: 'LuckyStar',
      message: '😱',
      timestamp: Date.now() - 5000,
      type: 'emote',
    },
  ],
  matchTimer: 342,
  matchTimerMax: 600,
};
