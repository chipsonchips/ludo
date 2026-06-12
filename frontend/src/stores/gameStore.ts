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
  lastDiceValue: number | null;
  selectedTokenId: string | null;
  voiceMuted: boolean;
  pushToTalk: boolean;
  showChat: boolean;

  addReaction: (emoji: string) => void;
  sendChat: (message: string) => void;
  sendEmote: (emoji: string) => void;
  toggleVoiceMute: () => void;
  togglePushToTalk: () => void;
  toggleChat: () => void;
  rollDice: () => void;
  completeRoll: (value: number) => void;
  selectToken: (tokenId: string) => void;
  autoRollForAI: () => void;
  passTurn: () => void;
}

const initialLudo = createInitialLudoState(ludoPlayerDefs);

export const useGameStore = create<GameStore>((set, get) => ({
  match: dummyMatchState,
  ludo: initialLudo,
  isRolling: false,
  lastDiceValue: null,
  selectedTokenId: null,
  voiceMuted: false,
  pushToTalk: false,
  showChat: true,

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

  completeRoll: (value) => {
    const { ludo } = get();
    const moves = getLegalMoves(ludo, value);

    if (moves.length === 0) {
      const nextIndex = (ludo.currentPlayerIndex + 1) % ludo.players.length;
      set({
        isRolling: false,
        lastDiceValue: value,
        ludo: {
          ...ludo,
          diceValue: value,
          phase: 'roll',
          isRolling: false,
          players: ludo.players.map((p, i) => ({ ...p, isCurrentTurn: i === nextIndex })),
          currentPlayerIndex: nextIndex,
          message: 'No legal move — turn passed.',
        },
      });
      // Trigger AI auto-roll if next player is not local
      const nextPlayer = ludo.players[nextIndex];
      if (!nextPlayer.isLocalPlayer) {
        setTimeout(() => get().autoRollForAI(), 1200);
      }
      return;
    }

    if (moves.length === 1) {
      const newLudo = applyMove(
        { ...ludo, diceValue: value, isRolling: false },
        moves[0]
      );
      set({
        isRolling: false,
        lastDiceValue: value,
        selectedTokenId: null,
        ludo: newLudo,
      });
      // Trigger AI auto-roll if next player is not local
      const nextPlayer = newLudo.players[newLudo.currentPlayerIndex];
      if (!nextPlayer.isLocalPlayer && !newLudo.winnerId) {
        setTimeout(() => get().autoRollForAI(), 1200);
      }
      return;
    }

    // If it's an AI player with multiple moves, auto-select randomly
    const currentPlayer = ludo.players[ludo.currentPlayerIndex];
    if (!currentPlayer.isLocalPlayer) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const newLudo = applyMove({ ...ludo, diceValue: value, isRolling: false }, randomMove);
      set({
        isRolling: false,
        lastDiceValue: value,
        selectedTokenId: randomMove.tokenId,
        ludo: newLudo,
      });
      setTimeout(() => set({ selectedTokenId: null }), 600);
      const nextPlayer = newLudo.players[newLudo.currentPlayerIndex];
      if (!nextPlayer.isLocalPlayer && !newLudo.winnerId) {
        setTimeout(() => get().autoRollForAI(), 1200);
      }
      return;
    }

    set({
      isRolling: false,
      lastDiceValue: value,
      ludo: {
        ...ludo,
        diceValue: value,
        phase: 'select_token',
        isRolling: false,
        selectableTokenIds: moves.map((m) => m.tokenId),
        message: `Rolled ${value} — select a token to move`,
      },
    });
  },

  selectToken: (tokenId) => {
    const { ludo, lastDiceValue } = get();
    if (ludo.phase !== 'select_token' || lastDiceValue === null) return;
    const moves = getLegalMoves(ludo, lastDiceValue);
    const move = moves.find((m) => m.tokenId === tokenId);
    if (!move) return;

    const newLudo = applyMove({ ...ludo, diceValue: lastDiceValue }, move);
    set({ ludo: newLudo, selectedTokenId: tokenId });
    setTimeout(() => set({ selectedTokenId: null }), 600);
    // Trigger AI auto-roll if next player is not local
    const nextPlayer = newLudo.players[newLudo.currentPlayerIndex];
    if (!nextPlayer.isLocalPlayer && !newLudo.winnerId) {
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
        diceValue: null,
        message: '',
      },
    });
    // Trigger AI auto-roll if next player is not local
    const nextPlayer = ludo.players[nextIndex];
    if (!nextPlayer.isLocalPlayer) {
      setTimeout(() => get().autoRollForAI(), 1200);
    }
  },
}));
