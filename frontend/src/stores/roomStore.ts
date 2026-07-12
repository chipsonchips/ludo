/**
 * Online-mode state: the connection, the room snapshot, and the seat we hold.
 * Routes server frames to the game store during a match.
 */
import { create } from 'zustand';
import type { GameRules } from '@shared/ludo/rules';
import type { RoomSnapshot, Seat, ServerMessage } from '@shared/protocol';
import { connection } from '@/net/client';
import type { ConnectionStatus } from '@/net/connection';
import { useAppStore } from './appStore';
import { useGameStore } from './gameStore';
import { useVoiceStore } from './voiceStore';

const SESSION_KEY = 'luduchips.session';

interface StoredSession {
  code: string;
  token: string;
}

function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed.code === 'string' && typeof parsed.token === 'string') return parsed as StoredSession;
  } catch {
    // ignore
  }
  return null;
}

function saveSession(session: StoredSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

interface RoomStore {
  status: ConnectionStatus;
  room: RoomSnapshot | null;
  seat: Seat | null;
  /** Which async lobby action is in flight (drives button spinners). */
  pending: 'create' | 'join' | 'start' | null;
  lastError: string | null;
  opponentDisconnected: { seat: Seat; graceSeconds: number } | null;
  roomClosedReason: string | null;

  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  setRules: (rules: GameRules) => void;
  toggleReady: () => void;
  startGame: () => void;
  leaveRoom: () => void;
  sendRoll: () => void;
  sendMove: (tokenId: string) => void;
  sendChat: (text: string) => void;
  sendReaction: (icon: string) => void;
  clearError: () => void;
  clearClosedReason: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => {
  let playerToken: string | null = null;

  const handleMessage = (msg: ServerMessage) => {
    const game = useGameStore.getState();
    const app = useAppStore.getState();

    switch (msg.t) {
      case 'joined':
        playerToken = msg.playerToken;
        saveSession({ code: msg.room.code, token: msg.playerToken });
        set({ seat: msg.seat, room: msg.room, pending: null, lastError: null, roomClosedReason: null });
        useVoiceStore.getState()._setSeat(msg.seat);
        if (app.screen !== 'game') app.navigate('lobby');
        break;

      case 'room_update': {
        const wasPlaying = get().room?.status === 'playing';
        set({ room: msg.room });
        const stillDisconnected = get().opponentDisconnected;
        if (stillDisconnected && msg.room.players[stillDisconnected.seat]?.connected) {
          set({ opponentDisconnected: null });
        }
        // Room fell back to lobby while we're on the game screen (opponent left
        // mid-game and the result was already shown) — nothing to do; the
        // player returns via the game-over panel.
        void wasPlaying;
        break;
      }

      case 'game_started': {
        const seat = get().seat ?? 0;
        game.startOnlineGame(msg.state, seat);
        set({ opponentDisconnected: null });
        app.navigate('game');
        break;
      }

      case 'roll_result':
        game.onServerRoll(msg.seat, msg.values);
        break;

      case 'game_state':
        game.applyServerState(msg.state);
        break;

      case 'chat':
        if (msg.seat !== get().seat) game.receiveChat(msg.name, msg.text);
        break;

      case 'reaction':
        if (msg.seat !== get().seat) game.receiveReaction(msg.icon);
        break;

      case 'voice_signal':
        if (msg.seat !== get().seat) useVoiceStore.getState()._handleSignal(msg.signal);
        break;

      case 'opponent_connection':
        set({
          opponentDisconnected: msg.connected
            ? null
            : { seat: msg.seat, graceSeconds: msg.graceSeconds ?? 90 },
        });
        useVoiceStore.getState()._onPeerConnectivity(msg.connected);
        break;

      case 'game_over':
        game.onServerGameOver(msg.winnerSeat, msg.reason, msg.state);
        set({ opponentDisconnected: null });
        break;

      case 'room_closed':
        playerToken = null;
        saveSession(null);
        useVoiceStore.getState()._reset();
        set({ room: null, seat: null, roomClosedReason: msg.reason, opponentDisconnected: null });
        if (useAppStore.getState().screen === 'lobby') useAppStore.getState().navigate('online');
        break;

      case 'error':
        set({ lastError: msg.message, pending: null });
        break;
    }
  };

  connection.onMessage(handleMessage);
  connection.onStatus((status) => {
    set({ status });
    // After any (re)connect, reclaim our seat if we hold a session
    if (status === 'open') {
      const session = loadSession();
      if (session && !get().room) {
        playerToken = session.token;
        connection.send({ t: 'rejoin', code: session.code, playerToken: session.token });
      } else if (playerToken && get().room) {
        connection.send({ t: 'rejoin', code: get().room!.code, playerToken });
      }
    }
  });

  const ensureConnected = async () => {
    if (connection.status !== 'open') await connection.connect();
  };

  return {
    status: 'idle',
    room: null,
    seat: null,
    pending: null,
    lastError: null,
    opponentDisconnected: null,
    roomClosedReason: null,

    createRoom: async () => {
      const { identity } = useAppStore.getState();
      set({ pending: 'create', lastError: null });
      try {
        await ensureConnected();
        connection.send({ t: 'create_room', name: identity.name || 'Host', avatarId: identity.avatarId });
      } catch {
        set({ pending: null, lastError: 'Could not reach the game server. Is it running?' });
      }
    },

    joinRoom: async (code) => {
      const { identity } = useAppStore.getState();
      set({ pending: 'join', lastError: null });
      try {
        await ensureConnected();
        connection.send({
          t: 'join_room',
          code: code.trim().toUpperCase(),
          name: identity.name || 'Guest',
          avatarId: identity.avatarId,
        });
      } catch {
        set({ pending: null, lastError: 'Could not reach the game server. Is it running?' });
      }
    },

    setRules: (rules) => {
      connection.send({ t: 'set_rules', rules });
    },

    toggleReady: () => {
      const { room, seat } = get();
      const me = seat !== null ? room?.players[seat] : null;
      connection.send({ t: 'set_ready', ready: !me?.ready });
    },

    startGame: () => {
      set({ pending: 'start' });
      connection.send({ t: 'start_game' });
      // pending cleared by game_started or error
      setTimeout(() => {
        if (get().pending === 'start') set({ pending: null });
      }, 5000);
    },

    leaveRoom: () => {
      useVoiceStore.getState()._reset();
      connection.send({ t: 'leave' });
      playerToken = null;
      saveSession(null);
      connection.close();
      set({ room: null, seat: null, opponentDisconnected: null, pending: null, lastError: null });
    },

    sendRoll: () => connection.send({ t: 'roll' }) && undefined,
    sendMove: (tokenId) => connection.send({ t: 'move', tokenId }) && undefined,
    sendChat: (text) => connection.send({ t: 'chat', text }) && undefined,
    sendReaction: (icon) => connection.send({ t: 'reaction', icon }) && undefined,

    clearError: () => set({ lastError: null }),
    clearClosedReason: () => set({ roomClosedReason: null }),
  };
});

// Dev-only handle so e2e scripts can inspect room state
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__roomStore = useRoomStore;
}

/** Try to resume a session after a full page reload (e.g. mid-game refresh). */
export async function resumeSessionIfAny(): Promise<void> {
  const session = loadSession();
  if (!session) return;
  try {
    await connection.connect();
    // onStatus('open') handler sends the rejoin
  } catch {
    saveSession(null);
  }
}
