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
  getBoostMoves,
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
import { useChipsStore } from './chipsStore';

export type GameMode = 'single' | 'local' | 'online';

/** Which arena hosts the match: the flat casino table (normal play) or the 3D lounge (tournament tables). */
export type ArenaMode = 'table' | 'lounge';

export interface MatchSession {
  mode: GameMode;
  rules: GameRules;
  difficulty: AiDifficulty;
  /** Index into ludo.players that this device's primary player holds (-1 = every seat is local). */
  mySeatIndex: number;
  arena: ArenaMode;
  /** Chips each player bought in with (0 = friendly table). */
  stake: number;
  /** Total chips riding on the table — stake × players, winner takes it. */
  pot: number;
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
  /** Offline modes: the next token pick spends BOTH dice on one move. */
  boostMode: boolean;
  chat: ChatEntry[];
  reactions: ReactionEntry[];
  elapsedSeconds: number;
  gameOver: GameOverInfo | null;
  showChat: boolean;

  startSinglePlayer: (opts: { bots: number; difficulty: AiDifficulty; rules: GameRules; stake?: number }) => void;
  startLocal: (opts: { names: [string, string]; rules: GameRules }) => void;
  startOnlineGame: (state: LudoState, seat: Seat) => void;

  rollDice: () => void;
  completeRoll: (values: number[]) => void;
  selectToken: (tokenId: string) => void;
  toggleBoost: () => void;

  applyServerState: (state: LudoState) => void;
  onServerRoll: (seat: Seat, values: number[]) => void;
  onServerGameOver: (winnerSeat: Seat, reason: GameOverReason, state?: LudoState) => void;
  receiveChat: (author: string, text: string) => void;
  receiveReaction: (icon: string) => void;

  sendChatMessage: (text: string) => void;
  sendReactionIcon: (icon: string) => void;

  playAgain: () => void;
  leaveMatch: () => void;
  setArena: (arena: ArenaMode) => void;
  toggleChat: () => void;
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
      boostMode: false,
      chat: [],
      reactions: [],
      gameOver: null,
    });
    startTimer();
    useAppStore.getState().navigate('game');
  };

  const finishMatch = (info: GameOverInfo) => {
    stopTimer();
    // Staked tables settle here: the winning player's owner rakes the pot.
    // Only single-player runs a real (practice-chip) economy today — online
    // stakes settle server-side once ChipsBank escrow lands (docs/CHIPS.md).
    const { session, ludo } = get();
    if (session && session.mode === 'single' && session.stake > 0) {
      const humanWon = ludo.players.some((p) => p.ownerId === info.winnerId && p.kind === 'human');
      if (humanWon) useChipsStore.getState().credit(session.pot);
    }
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
      // No single-die move — a combined boost move may still save the turn
      const boostMoves = roller.kind === 'human' ? getBoostMoves(withDice) : [];
      if (boostMoves.length > 0) {
        set({
          isRolling: false,
          lastDiceValues: values,
          boostMode: true,
          ludo: {
            ...withDice,
            selectableTokenIds: Array.from(new Set(boostMoves.map((m) => m.tokenId))),
            message: `No single move fits — boost a token ${values.reduce((a, b) => a + b, 0)} steps!`,
          },
        });
        return;
      }
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
      boostMode: false,
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
    boostMode: false,
    chat: [],
    reactions: [],
    elapsedSeconds: 0,
    gameOver: null,
    // Chat starts open where there's room for it; on phones it floats over
    // the board, so it starts closed and lives behind the chat button.
    showChat: typeof window === 'undefined' || window.matchMedia('(min-width: 768px)').matches,

    // ── Match setup ─────────────────────────────────────────────

    startSinglePlayer: ({ bots, difficulty, rules, stake = 0 }) => {
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
        // Buy-in happens inside setup so "Play again" antes up again.
        const wantedStake = Math.max(0, Math.floor(stake));
        const paidStake = wantedStake > 0 && useChipsStore.getState().debit(wantedStake) ? wantedStake : 0;
        const owners = new Set(defs.map((d) => d.ownerId ?? d.id)).size;
        const pot = paidStake * owners;
        beginMatch(
          { mode: 'single', rules, difficulty, mySeatIndex: 0, arena: 'table', stake: paidStake, pot },
          createInitialLudoState(defs, rules)
        );
        systemMessage(
          botCount === 1
            ? `Head-to-head vs ${BOT_ROSTER[0].username} (${difficulty}) — two houses each.`
            : `Match started against ${botCount} ${difficulty} bots.`
        );
        if (paidStake > 0) {
          systemMessage(`You bought in for ${paidStake} chips — the house matched every seat. ${pot} chips ride on this table.`);
        } else if (wantedStake > 0) {
          systemMessage('Bankroll too small for that buy-in — playing a friendly table instead.');
        }
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
        beginMatch(
          { mode: 'local', rules, difficulty: 'medium', mySeatIndex: -1, arena: 'table', stake: 0, pot: 0 },
          createInitialLudoState(defs, rules)
        );
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
      beginMatch(
        { mode: 'online', rules: state.rules, difficulty: 'medium', mySeatIndex: seat, arena: 'table', stake: 0, pot: 0 },
        localized
      );
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
      set({ isRolling: true, selectedTokenId: null, boostMode: false });
    },

    toggleBoost: () => {
      const { ludo, session, gameOver, boostMode } = get();
      if (!session || session.mode === 'online' || gameOver) return;
      if (ludo.phase !== 'select_token' || ludo.diceValues.length < 2) return;
      const current = ludo.players[ludo.currentPlayerIndex];
      if (current.kind !== 'human') return;

      if (boostMode) {
        // Back to spending dice one at a time
        const moves = getLegalMoves(ludo);
        set({
          boostMode: false,
          ludo: {
            ...ludo,
            selectableTokenIds: Array.from(new Set(moves.map((m) => m.tokenId))),
            message: `Rolled ${ludo.diceValues.join(' & ')} — pick a token`,
          },
        });
        return;
      }

      const boostMoves = getBoostMoves(ludo);
      if (boostMoves.length === 0) return;
      const total = ludo.diceValues.reduce((a, b) => a + b, 0);
      set({
        boostMode: true,
        ludo: {
          ...ludo,
          selectableTokenIds: Array.from(new Set(boostMoves.map((m) => m.tokenId))),
          message: `Boost — one token charges ${total} steps!`,
        },
      });
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

      const moves = get().boostMode ? getBoostMoves(ludo) : getLegalMoves(ludo);
      const move = moves.find((m) => m.tokenId === tokenId);
      if (!move) return;

      if (move.usesAllDice) systemMessage(`${current.username} boosted a token ${move.dieValueUsed} steps.`);
      if (move.capture) {
        systemMessage(`${current.username} captured a token.`);
        // Staked tables pay a capture bounty from the house — instant gratification
        if (session.mode === 'single' && session.stake > 0) {
          const bounty = Math.max(5, Math.round(session.stake * 0.1));
          useChipsStore.getState().credit(bounty);
          systemMessage(`Capture bounty: +${bounty} chips.`);
        }
      }
      if (move.newLocation.kind === 'finished') systemMessage(`${current.username} brought a token home.`);

      let next = applyMove(ludo, move);
      if (next.phase === 'select_token') {
        const remaining = getLegalMoves(next);
        if (remaining.length === 0) next = passTurn(next, next.extraTurn);
        else next = { ...next, selectableTokenIds: Array.from(new Set(remaining.map((m) => m.tokenId))) };
      }

      set({ ludo: next, selectedTokenId: tokenId, boostMode: false });
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

    setArena: (arena) =>
      set((s) => (s.session ? { session: { ...s.session, arena } } : {})),

    toggleChat: () => set((s) => ({ showChat: !s.showChat })),
  };
});

// Dev-only handle so the game can be driven from the console / e2e scripts.
// (Each store exposes only itself — reaching across here would dereference a
// circular import while it's still in its temporal dead zone.)
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__gameStore = useGameStore;
}
