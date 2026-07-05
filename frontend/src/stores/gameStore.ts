/**
 * Match state for all three modes.
 *
 * - single: the local engine runs the game; bots pick moves via the shared AI.
 * - local:  the local engine runs the game; both seats are humans on this device.
 * - online: the server owns the game; this store mirrors authoritative state,
 *           sends intents, and choreographs the dice visuals around them.
 */
import { create } from 'zustand';
import {
  applyMove,
  colorsForPlayerCount,
  createInitialLudoState,
  getLegalMoves,
  grantsExtraTurn,
  passTurn,
  twoPlayerSeatDefs,
} from '@shared/ludo/gameLogic';
import { chooseAiMove } from '@shared/ludo/ai';
import { DEFAULT_RULES, type GameRules } from '@shared/ludo/rules';
import type { AiDifficulty, LudoPlayerDef, LudoState } from '@shared/ludo/types';
import type { GameOverReason, Seat } from '@shared/protocol';
import { useRoomStore } from './roomStore';
import { useAppStore } from './appStore';

export type GameMode = 'single' | 'local' | 'online';

export interface MatchSession {
  mode: GameMode;
  rules: GameRules;
  difficulty: AiDifficulty;
  /** Index into ludo.players that this device's primary player holds (-1 = every seat is local). */
  mySeatIndex: number;
}

export interface ChatEntry {
  id: string;
  author: string;
  text: string;
  ts: number;
  kind: 'chat' | 'system';
  mine: boolean;
}

export interface ReactionEntry {
  id: string;
  icon: string;
}

export interface GameOverInfo {
  winnerId: string;
  reason: GameOverReason;
}

const BOT_ROSTER: { username: string; avatarId: string }[] = [
  { username: 'Astra', avatarId: 'star' },
  { username: 'Vega', avatarId: 'bolt' },
  { username: 'Orion', avatarId: 'moon' },
];

const AI_MOVE_DELAY_MS = 900;
const AI_ROLL_DELAY_MS = 1200;

let chatId = 0;
let reactionId = 0;
let timerHandle: ReturnType<typeof setInterval> | null = null;

const placeholderState = createInitialLudoState(
  twoPlayerSeatDefs(
    { id: 'placeholder-0', username: '—', avatarId: 'pawn', kind: 'human' },
    { id: 'placeholder-1', username: '—', avatarId: 'pawn', kind: 'human' }
  ),
  DEFAULT_RULES
);

interface GameStore {
  session: MatchSession | null;
  ludo: LudoState;
  isRolling: boolean;
  lastDiceValues: number[];
  /** Online: the dice visuals must land on these server-decided values. */
  forcedDiceValues: number[] | null;
  selectedTokenId: string | null;
  chat: ChatEntry[];
  reactions: ReactionEntry[];
  elapsedSeconds: number;
  gameOver: GameOverInfo | null;
  showChat: boolean;
  voiceMuted: boolean;

  startSinglePlayer: (opts: { bots: number; difficulty: AiDifficulty; rules: GameRules }) => void;
  startLocal: (opts: { names: [string, string]; rules: GameRules }) => void;
  startOnlineGame: (state: LudoState, seat: Seat) => void;

  rollDice: () => void;
  completeRoll: (values: number[]) => void;
  selectToken: (tokenId: string) => void;

  applyServerState: (state: LudoState) => void;
  onServerRoll: (seat: Seat, values: number[]) => void;
  onServerGameOver: (winnerSeat: Seat, reason: GameOverReason, state?: LudoState) => void;
  receiveChat: (author: string, text: string) => void;
  receiveReaction: (icon: string) => void;

  sendChatMessage: (text: string) => void;
  sendReactionIcon: (icon: string) => void;

  playAgain: () => void;
  leaveMatch: () => void;
  toggleChat: () => void;
  toggleVoiceMute: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  /** Online: latest authoritative state held back while dice visuals play. */
  let pendingServerState: LudoState | null = null;
  let lastOfflineSetup: (() => void) | null = null;

  const stopTimer = () => {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = null;
  };

  const startTimer = () => {
    stopTimer();
    set({ elapsedSeconds: 0 });
    timerHandle = setInterval(() => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })), 1000);
  };

  const systemMessage = (text: string) => {
    set((s) => ({
      chat: [
        ...s.chat.slice(-99),
        { id: `c${chatId++}`, author: '', text, ts: Date.now(), kind: 'system' as const, mine: false },
      ],
    }));
  };

  const beginMatch = (session: MatchSession, ludo: LudoState) => {
    pendingServerState = null;
    set({
      session,
      ludo,
      isRolling: false,
      lastDiceValues: [],
      forcedDiceValues: null,
      selectedTokenId: null,
      chat: [],
      reactions: [],
      gameOver: null,
    });
    startTimer();
    useAppStore.getState().navigate('game');
  };

  const finishMatch = (info: GameOverInfo) => {
    stopTimer();
    set({ gameOver: info, isRolling: false, forcedDiceValues: null });
  };

  // ── Offline engine (single + local) ──────────────────────────────

  const isBotTurn = (state: LudoState) => state.players[state.currentPlayerIndex]?.kind === 'bot';

  const scheduleBot = (delay: number) => {
    setTimeout(() => {
      const { ludo, session, isRolling, gameOver } = get();
      if (!session || session.mode === 'online' || gameOver) return;
      if (isRolling || ludo.phase !== 'roll' || !isBotTurn(ludo)) return;
      set({ isRolling: true, selectedTokenId: null });
    }, delay);
  };

  const playBotMove = () => {
    const { ludo, session, gameOver } = get();
    if (!session || gameOver || ludo.phase !== 'select_token' || !isBotTurn(ludo)) return;

    const moves = getLegalMoves(ludo);
    if (moves.length === 0) {
      const next = passTurn(ludo, ludo.extraTurn);
      set({ ludo: next });
      if (isBotTurn(next)) scheduleBot(AI_ROLL_DELAY_MS);
      return;
    }

    const bot = ludo.players[ludo.currentPlayerIndex];
    const move = chooseAiMove(ludo, moves, session.difficulty);
    if (move.capture) systemMessage(`${bot.username} captured a token.`);
    if (move.newLocation.kind === 'finished') systemMessage(`${bot.username} brought a token home.`);

    const next = applyMove(ludo, move);
    set({ ludo: next, selectedTokenId: move.tokenId });
    setTimeout(() => set({ selectedTokenId: null }), 600);

    if (next.winnerId) {
      finishMatch({ winnerId: next.winnerId, reason: 'finished' });
      return;
    }
    if (next.phase === 'select_token') {
      setTimeout(playBotMove, AI_MOVE_DELAY_MS);
    } else if (isBotTurn(next)) {
      scheduleBot(AI_ROLL_DELAY_MS);
    }
  };

  const completeOfflineRoll = (values: number[]) => {
    const { ludo } = get();
    const extraTurn = grantsExtraTurn(values, ludo.rules);
    const withDice: LudoState = { ...ludo, diceValues: values, extraTurn, phase: 'select_token' };
    const moves = getLegalMoves(withDice);
    const roller = withDice.players[withDice.currentPlayerIndex];

    if (moves.length === 0) {
      const next: LudoState = {
        ...passTurn(withDice, extraTurn),
        message: extraTurn ? 'No legal moves, but the double six grants another roll.' : 'No legal move — turn passed.',
      };
      set({ isRolling: false, lastDiceValues: values, ludo: next });
      if (isBotTurn(next)) scheduleBot(AI_ROLL_DELAY_MS);
      return;
    }

    if (roller.kind === 'bot') {
      set({
        isRolling: false,
        lastDiceValues: values,
        ludo: { ...withDice, selectableTokenIds: [], message: `${roller.username} rolled ${values.join(' & ')}` },
      });
      setTimeout(playBotMove, AI_MOVE_DELAY_MS);
      return;
    }

    set({
      isRolling: false,
      lastDiceValues: values,
      ludo: {
        ...withDice,
        selectableTokenIds: Array.from(new Set(moves.map((m) => m.tokenId))),
        message: `Rolled ${values.join(' & ')} — pick a token`,
      },
    });
  };

  return {
    session: null,
    ludo: placeholderState,
    isRolling: false,
    lastDiceValues: [],
    forcedDiceValues: null,
    selectedTokenId: null,
    chat: [],
    reactions: [],
    elapsedSeconds: 0,
    gameOver: null,
    showChat: true,
    voiceMuted: false,

    // ── Match setup ─────────────────────────────────────────────

    startSinglePlayer: ({ bots, difficulty, rules }) => {
      const { identity } = useAppStore.getState();
      const botCount = Math.min(3, Math.max(1, bots));
      // One-on-one is played with two houses per player; bigger tables get one each
      const defs: LudoPlayerDef[] =
        botCount === 1
          ? twoPlayerSeatDefs(
              { id: 'you', username: identity.name || 'You', avatarId: identity.avatarId, kind: 'human' },
              { id: 'bot-1', username: BOT_ROSTER[0].username, avatarId: BOT_ROSTER[0].avatarId, kind: 'bot' },
              rules.sameLinePairs
            )
          : colorsForPlayerCount(botCount + 1).map((color, i) =>
              i === 0
                ? { id: 'you', username: identity.name || 'You', avatarId: identity.avatarId, color, kind: 'human' as const }
                : {
                    id: `bot-${i}`,
                    username: BOT_ROSTER[i - 1].username,
                    avatarId: BOT_ROSTER[i - 1].avatarId,
                    color,
                    kind: 'bot' as const,
                  }
            );
      const setup = () => {
        beginMatch({ mode: 'single', rules, difficulty, mySeatIndex: 0 }, createInitialLudoState(defs, rules));
        systemMessage(
          botCount === 1
            ? `Head-to-head vs ${BOT_ROSTER[0].username} (${difficulty}) — two houses each.`
            : `Match started against ${botCount} ${difficulty} bots.`
        );
      };
      lastOfflineSetup = setup;
      setup();
    },

    startLocal: ({ names, rules }) => {
      // Pass-and-play one-on-one: two houses per player
      const defs = twoPlayerSeatDefs(
        { id: 'p1', username: names[0] || 'Player 1', avatarId: 'pawn', kind: 'human' },
        { id: 'p2', username: names[1] || 'Player 2', avatarId: 'flame', kind: 'human' },
        rules.sameLinePairs
      );
      const setup = () => {
        beginMatch({ mode: 'local', rules, difficulty: 'medium', mySeatIndex: -1 }, createInitialLudoState(defs, rules));
        systemMessage('Local match started — pass the device between turns.');
      };
      lastOfflineSetup = setup;
      setup();
    },

    startOnlineGame: (state, seat) => {
      lastOfflineSetup = null;
      // Recast seats from this device's perspective (I own the `seat-N` houses)
      const localized: LudoState = {
        ...state,
        players: state.players.map((p) => ({
          ...p,
          kind: p.ownerId === `seat-${seat}` ? ('human' as const) : ('remote' as const),
        })),
      };
      beginMatch({ mode: 'online', rules: state.rules, difficulty: 'medium', mySeatIndex: seat }, localized);
      systemMessage('Both players connected. Good luck!');
    },

    // ── Turn actions ────────────────────────────────────────────

    rollDice: () => {
      const { ludo, isRolling, session, gameOver } = get();
      if (!session || isRolling || gameOver || ludo.phase !== 'roll' || ludo.winnerId) return;
      const current = ludo.players[ludo.currentPlayerIndex];
      if (current.kind === 'remote' || current.kind === 'bot') return;

      if (session.mode === 'online') {
        useRoomStore.getState().sendRoll();
        return; // isRolling flips when the server's roll_result arrives
      }
      set({ isRolling: true, selectedTokenId: null });
    },

    completeRoll: (values) => {
      const { session } = get();
      if (session?.mode === 'online') {
        // Visual dice finished; release the buffered authoritative state
        const toApply = pendingServerState;
        pendingServerState = null;
        set({
          isRolling: false,
          forcedDiceValues: null,
          lastDiceValues: values,
          ...(toApply ? { ludo: toApply } : {}),
        });
        return;
      }
      completeOfflineRoll(values);
    },

    selectToken: (tokenId) => {
      const { ludo, session, gameOver } = get();
      if (!session || gameOver || ludo.phase !== 'select_token') return;

      if (session.mode === 'online') {
        const current = ludo.players[ludo.currentPlayerIndex];
        if (current.ownerId !== `seat-${session.mySeatIndex}`) return;
        if (!ludo.selectableTokenIds.includes(tokenId)) return;
        useRoomStore.getState().sendMove(tokenId);
        return;
      }

      const current = ludo.players[ludo.currentPlayerIndex];
      if (current.kind !== 'human') return;

      const moves = getLegalMoves(ludo);
      const move = moves.find((m) => m.tokenId === tokenId);
      if (!move) return;

      if (move.capture) systemMessage(`${current.username} captured a token.`);
      if (move.newLocation.kind === 'finished') systemMessage(`${current.username} brought a token home.`);

      let next = applyMove(ludo, move);
      if (next.phase === 'select_token') {
        const remaining = getLegalMoves(next);
        if (remaining.length === 0) next = passTurn(next, next.extraTurn);
        else next = { ...next, selectableTokenIds: Array.from(new Set(remaining.map((m) => m.tokenId))) };
      }

      set({ ludo: next, selectedTokenId: tokenId });
      setTimeout(() => set({ selectedTokenId: null }), 600);

      if (next.winnerId) {
        finishMatch({ winnerId: next.winnerId, reason: 'finished' });
        return;
      }
      if (isBotTurn(next) && next.phase === 'roll') scheduleBot(AI_ROLL_DELAY_MS);
    },

    // ── Server events (online) ──────────────────────────────────

    applyServerState: (state) => {
      const { session, isRolling } = get();
      if (session?.mode !== 'online') return;
      const localized: LudoState = {
        ...state,
        players: state.players.map((p) => ({
          ...p,
          kind: p.ownerId === `seat-${session.mySeatIndex}` ? ('human' as const) : ('remote' as const),
        })),
      };
      if (isRolling) {
        pendingServerState = localized; // hold until the dice visuals settle
      } else {
        set({ ludo: localized });
      }
    },

    onServerRoll: (_seat, values) => {
      const { session } = get();
      if (session?.mode !== 'online') return;
      set({ isRolling: true, forcedDiceValues: values, selectedTokenId: null });
    },

    onServerGameOver: (winnerSeat, reason, state) => {
      const { session } = get();
      if (session?.mode !== 'online') return;
      pendingServerState = null;
      if (reason !== 'finished') {
        systemMessage('Your opponent left the game.');
      }
      if (state) get().applyServerState(state);
      finishMatch({ winnerId: `seat-${winnerSeat}`, reason });
    },

    receiveChat: (author, text) => {
      set((s) => ({
        chat: [...s.chat.slice(-99), { id: `c${chatId++}`, author, text, ts: Date.now(), kind: 'chat' as const, mine: false }],
      }));
    },

    receiveReaction: (icon) => {
      set((s) => ({ reactions: [...s.reactions.slice(-19), { id: `r${reactionId++}`, icon }] }));
    },

    // ── Social ──────────────────────────────────────────────────

    sendChatMessage: (text) => {
      const clean = text.trim().slice(0, 200);
      if (!clean) return;
      const { session } = get();
      set((s) => ({
        chat: [...s.chat.slice(-99), { id: `c${chatId++}`, author: 'You', text: clean, ts: Date.now(), kind: 'chat' as const, mine: true }],
      }));
      if (session?.mode === 'online') useRoomStore.getState().sendChat(clean);
    },

    sendReactionIcon: (icon) => {
      const { session } = get();
      set((s) => ({ reactions: [...s.reactions.slice(-19), { id: `r${reactionId++}`, icon }] }));
      if (session?.mode === 'online') useRoomStore.getState().sendReaction(icon);
    },

    // ── Session control ─────────────────────────────────────────

    playAgain: () => {
      const { session } = get();
      if (!session) return;
      if (session.mode === 'online') {
        // Rematches renegotiate in the lobby (the server already reset the room)
        useAppStore.getState().navigate('lobby');
        set({ gameOver: null, session: null });
        stopTimer();
        return;
      }
      lastOfflineSetup?.();
    },

    leaveMatch: () => {
      const { session } = get();
      stopTimer();
      pendingServerState = null;
      if (session?.mode === 'online') {
        useRoomStore.getState().leaveRoom();
      }
      set({ session: null, gameOver: null, isRolling: false, forcedDiceValues: null });
      useAppStore.getState().navigate('menu');
    },

    toggleChat: () => set((s) => ({ showChat: !s.showChat })),
    toggleVoiceMute: () => set((s) => ({ voiceMuted: !s.voiceMuted })),
  };
});

// Dev-only handle so the game can be driven from the console / e2e scripts.
// (Each store exposes only itself — reaching across here would dereference a
// circular import while it's still in its temporal dead zone.)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__gameStore = useGameStore;
}
