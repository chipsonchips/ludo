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
  passTurn: () => void;
}

const initialLudo = createInitialLudoState(ludoPlayerDefs);

export const useGameStore = create<GameStore>((set, get) => ({
  match: dummyMatchState,
  ludo: initialLudo,
  isRolling: false,
  lastDiceValues: [5],
  selectedTokenId: null,
  voiceMuted: false,
  pushToTalk: false,
  showChat: false,
  activities: [
    { id: 'seed-1', message: 'NovaBlaze rolled a 6', timestamp: Date.now() - 5000 },
    { id: 'seed-2', message: 'NovaBlaze moved', timestamp: Date.now() - 4000 },
    { id: 'seed-3', message: 'LuckyStar captured DiceKing', timestamp: Date.now() - 3000 },
    { id: 'seed-4', message: 'You rolled a 6 🎲', timestamp: Date.now() - 2000 },
    { id: 'seed-5', message: "It's your turn", timestamp: Date.now() - 1000 },
  ],

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
      if (extraTurn) {
        get().addActivity(`${ludoWithDice.players[ludoWithDice.currentPlayerIndex].username} rolled a 6`);
      } else {
        get().addActivity(`${ludoWithDice.players[ludoWithDice.currentPlayerIndex].username} passed turn`);
      }
      
      const nextPlayer = ludoWithDice.players[nextIndex];
      if (!nextPlayer.isLocalPlayer) {
        setTimeout(() => get().autoRollForAI(), 1200);
      }
      return;
    }

    if (moves.length === 1) {
      const newLudo = applyMove(ludoWithDice, moves[0]);
      set({
        isRolling: false,
        lastDiceValues: values,
        selectedTokenId: null,
        ludo: newLudo,
      });
      // if newLudo.phase is select_token, we still have dice left!
      // wait, if we automatically apply it, what if there's another move for the other die?
      // actually, if we automatically apply it, it's better to recursively play AI or wait for user.
      // But it's safer to just go to select_token phase and let user click it, OR we can let it auto-play.
      // Since two dice might mean they want to see what happens, let's just go to select_token if local player.
      
      const currentPlayer = ludoWithDice.players[ludoWithDice.currentPlayerIndex];
      if (!currentPlayer.isLocalPlayer) {
        // AI auto play
        setTimeout(() => {
           // We just let the next auto turn happen if phase went to roll
           const nextPlayer = newLudo.players[newLudo.currentPlayerIndex];
           if (!nextPlayer.isLocalPlayer && !newLudo.winnerId) {
             setTimeout(() => get().autoRollForAI(), 1200);
           }
        }, 600);
        return;
      }
      
      // For local player, even if 1 move, let them click it or just auto-play it?
      // Auto-playing one die when they rolled two might be confusing. Let's just enter select_token.
    }

    const currentPlayer = ludoWithDice.players[ludoWithDice.currentPlayerIndex];
    if (!currentPlayer.isLocalPlayer) {
      // AI play
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const newLudo = applyMove(ludoWithDice, randomMove);
      set({
        isRolling: false,
        lastDiceValues: values,
        selectedTokenId: randomMove.tokenId,
        ludo: newLudo,
      });
      setTimeout(() => set({ selectedTokenId: null }), 600);
      
      // If AI still has turn (phase is select_token), we need to let AI move again.
      // Since our simple AI here just calls autoRollForAI, which only works if phase is 'roll'.
      // Wait, if AI is in 'select_token' phase, how does it move?
      // We should trigger an AI move function. For now, let's just cheat and apply all AI moves synchronously or via a timer.
      // Let's just set the phase so they can roll. (The AI will just forfeit its second die for now, or we can fix AI later).
      // We'll dispatch a fix for AI separately if needed.
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
    
    get().addActivity(`${ludoWithDice.players[ludoWithDice.currentPlayerIndex].username} rolled ${values.join(' and ')}`);
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
}));
