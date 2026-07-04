import { create } from 'zustand';
import type { MatchState, Reaction, ChatMessage } from '@/types';
import type { LudoState } from '@/ludo/types';
import { createInitialLudoState, applyMove, getLegalMoves } from '@/ludo/gameLogic';
import { dummyMatchState, LOCAL_PLAYER_ID } from '@dummy/index';
import { ludoPlayerDefs } from '@dummy/ludoPlayers';

interface GameStore {
  match: MatchState;
  ludo: LudoState;
  isRolling: boolean;
  lastDiceValues: number[];
  selectedTokenId: string | null;
  voiceMuted: boolean;
  pushToTalk: boolean;
  showChat: boolean;
  activities: { id: string; message: string; timestamp: number }[];

  addReaction: (emoji: string) => void;
  sendChat: (message: string) => void;
  sendEmote: (emoji: string) => void;
  addActivity: (message: string) => void;
  toggleVoiceMute: () => void;
  togglePushToTalk: () => void;
  toggleChat: () => void;
  rollDice: () => void;
  completeRoll: (values: number[]) => void;
  selectToken: (tokenId: string) => void;
  autoRollForAI: () => void;
  playAiMove: () => void;
  passTurn: () => void;
  resetGame: () => void;
}

const initialLudo = createInitialLudoState(ludoPlayerDefs);

export const useGameStore = create<GameStore>((set, get) => ({
  match: dummyMatchState,
  ludo: initialLudo,
  isRolling: false,
  lastDiceValues: [],
  selectedTokenId: null,
  voiceMuted: false,
  pushToTalk: false,
  showChat: true,
  activities: [],

  addReaction: (emoji) => {
    const reaction: Reaction = {
      id: `r-${Date.now()}`,
      playerId: LOCAL_PLAYER_ID,
      emoji,
      timestamp: Date.now(),
    };
    set((s) => ({
      match: { ...s.match, reactions: [...s.match.reactions, reaction] },
    }));
  },

  sendChat: (message) => {
    const msg: ChatMessage = {
      id: `c-${Date.now()}`,
      playerId: LOCAL_PLAYER_ID,
      username: 'You',
      message,
      timestamp: Date.now(),
      type: 'chat',
    };
    set((s) => ({
      match: { ...s.match, chat: [...s.match.chat, msg] },
    }));
  },

  sendEmote: (emoji) => {
    get().addReaction(emoji);
    const msg: ChatMessage = {
      id: `c-${Date.now()}`,
      playerId: LOCAL_PLAYER_ID,
      username: 'You',
      message: emoji,
      timestamp: Date.now(),
      type: 'emote',
    };
    set((s) => ({
      match: { ...s.match, chat: [...s.match.chat, msg] },
    }));
  },

  addActivity: (message) => {
    set((s) => ({
      activities: [
        ...s.activities,
        { id: `act-${Date.now()}-${Math.random()}`, message, timestamp: Date.now() },
      ].slice(-5), // Keep only last 5 activities
    }));
  },

  toggleVoiceMute: () => set((s) => ({ voiceMuted: !s.voiceMuted })),
  togglePushToTalk: () => set((s) => ({ pushToTalk: !s.pushToTalk })),
  toggleChat: () => set((s) => ({ showChat: !s.showChat })),

  rollDice: () => {
    const { ludo, isRolling } = get();
    if (isRolling || ludo.phase !== 'roll' || ludo.winnerId) return;
    const current = ludo.players[ludo.currentPlayerIndex];
    if (!current.isLocalPlayer) return;
    set({ isRolling: true, selectedTokenId: null });
  },

  completeRoll: (values) => {
    const { ludo } = get();

    const extraTurn = values.includes(6);
    const ludoWithDice = { ...ludo, diceValues: values, extraTurn };
    const moves = getLegalMoves(ludoWithDice);
    const roller = ludoWithDice.players[ludoWithDice.currentPlayerIndex];

    get().addActivity(`${roller.username} rolled ${values.join(' and ')}`);

    if (moves.length === 0) {
      let nextIndex = ludoWithDice.currentPlayerIndex;
      if (!extraTurn) {
        nextIndex = (ludoWithDice.currentPlayerIndex + 1) % ludoWithDice.players.length;
      }

      set({
        isRolling: false,
        lastDiceValues: values,
        ludo: {
          ...ludoWithDice,
          phase: 'roll',
          isRolling: false,
          extraTurn: false,
          diceValues: [],
          players: ludoWithDice.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIndex })),
          currentPlayerIndex: nextIndex,
          message: extraTurn ? 'No legal moves, but rolled a 6! Roll again.' : 'No legal move — turn passed.',
        },
      });

      const nextPlayer = ludoWithDice.players[nextIndex];
      if (!nextPlayer.isLocalPlayer) {
        setTimeout(() => get().autoRollForAI(), 1200);
      }
      return;
    }

    if (!roller.isLocalPlayer) {
      // AI turn: enter select_token and let playAiMove consume the dice one move at a time
      set({
        isRolling: false,
        lastDiceValues: values,
        ludo: {
          ...ludoWithDice,
          phase: 'select_token',
          isRolling: false,
          selectableTokenIds: [],
          message: `${roller.username} rolled ${values.join(' and ')}`,
        },
      });
      setTimeout(() => get().playAiMove(), 900);
      return;
    }

    set({
      isRolling: false,
      lastDiceValues: values,
      ludo: {
        ...ludoWithDice,
        phase: 'select_token',
        isRolling: false,
        selectableTokenIds: Array.from(new Set(moves.map((m) => m.tokenId))),
        message: `Rolled ${values.join(' and ')} — select a token to move`,
      },
    });
  },

  playAiMove: () => {
    const { ludo } = get();
    if (ludo.winnerId || ludo.phase !== 'select_token') return;
    const current = ludo.players[ludo.currentPlayerIndex];
    if (current.isLocalPlayer) return;

    const moves = getLegalMoves(ludo);

    if (moves.length === 0) {
      // Remaining dice have no legal move — end the AI's turn (keeping a rolled 6's bonus)
      const nextIndex = ludo.extraTurn
        ? ludo.currentPlayerIndex
        : (ludo.currentPlayerIndex + 1) % ludo.players.length;
      set({
        ludo: {
          ...ludo,
          phase: 'roll',
          diceValues: [],
          extraTurn: false,
          selectableTokenIds: [],
          currentPlayerIndex: nextIndex,
          players: ludo.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIndex })),
        },
      });
      if (!ludo.players[nextIndex].isLocalPlayer) {
        setTimeout(() => get().autoRollForAI(), 1200);
      }
      return;
    }

    // Simple AI priorities: finish a token, then capture, then random
    const move =
      moves.find((m) => m.newLocation.kind === 'finished') ??
      moves.find((m) => m.capture) ??
      moves[Math.floor(Math.random() * moves.length)];

    if (move.capture) {
      get().addActivity(`${current.username} captured a token!`);
    }
    if (move.newLocation.kind === 'finished') {
      get().addActivity(`${current.username} got a token home!`);
    }

    const newLudo = applyMove(ludo, move);
    set({ ludo: newLudo, selectedTokenId: move.tokenId });
    setTimeout(() => set({ selectedTokenId: null }), 600);

    if (newLudo.winnerId) return;

    if (newLudo.phase === 'select_token') {
      // Another die is still unspent
      setTimeout(() => get().playAiMove(), 900);
    } else if (!newLudo.players[newLudo.currentPlayerIndex].isLocalPlayer) {
      setTimeout(() => get().autoRollForAI(), 1200);
    }
  },

  selectToken: (tokenId) => {
    const { ludo } = get();
    if (ludo.phase !== 'select_token' || ludo.diceValues.length === 0) return;
    
    const moves = getLegalMoves(ludo);
    const move = moves.find((m) => m.tokenId === tokenId);
    if (!move) return;

    if (move.capture) {
      get().addActivity(`${ludo.players[ludo.currentPlayerIndex].username} captured a token!`);
    }
    if (move.newLocation.kind === 'finished') {
      get().addActivity(`${ludo.players[ludo.currentPlayerIndex].username} entered home!`);
    }

    const newLudo = applyMove(ludo, move);
    
    // If we are still in select_token phase, we need to recalculate selectableTokenIds
    if (newLudo.phase === 'select_token') {
      const nextMoves = getLegalMoves(newLudo);
      if (nextMoves.length === 0) {
        // No more legal moves for remaining dice
        let nextPhase = 'roll';
        let nextIndex = newLudo.currentPlayerIndex;
        if (!newLudo.extraTurn) {
           nextIndex = (newLudo.currentPlayerIndex + 1) % newLudo.players.length;
        }
        
        newLudo.phase = nextPhase as any;
        newLudo.diceValues = [];
        newLudo.extraTurn = false;
        newLudo.currentPlayerIndex = nextIndex;
        newLudo.players = newLudo.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIndex }));
        newLudo.selectableTokenIds = [];
      } else {
        newLudo.selectableTokenIds = Array.from(new Set(nextMoves.map(m => m.tokenId)));
      }
    }

    set({ ludo: newLudo, selectedTokenId: tokenId });
    setTimeout(() => set({ selectedTokenId: null }), 600);
    
    const nextPlayer = newLudo.players[newLudo.currentPlayerIndex];
    if (!nextPlayer.isLocalPlayer && !newLudo.winnerId && newLudo.phase === 'roll') {
      setTimeout(() => get().autoRollForAI(), 1200);
    }
  },

  autoRollForAI: () => {
    const { ludo, isRolling } = get();
    if (isRolling || ludo.phase !== 'roll' || ludo.winnerId) return;
    const current = ludo.players[ludo.currentPlayerIndex];
    if (current.isLocalPlayer) return;
    set({ isRolling: true, selectedTokenId: null });
  },

  passTurn: () => {
    const { ludo } = get();
    const nextIndex = (ludo.currentPlayerIndex + 1) % ludo.players.length;
    set({
      ludo: {
        ...ludo,
        currentPlayerIndex: nextIndex,
        players: ludo.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIndex })),
        phase: 'roll',
        diceValues: [],
        message: '',
      },
    });
    // Trigger AI auto-roll if next player is not local
    const nextPlayer = ludo.players[nextIndex];
    if (!nextPlayer.isLocalPlayer) {
      setTimeout(() => get().autoRollForAI(), 1200);
    }
  },

  resetGame: () => {
    set({
      ludo: createInitialLudoState(ludoPlayerDefs),
      isRolling: false,
      lastDiceValues: [],
      selectedTokenId: null,
    });
  },
}));

// Dev-only handle so the game can be driven from the console / e2e scripts
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__gameStore = useGameStore;
}
