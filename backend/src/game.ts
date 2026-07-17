/**
 * Server-authoritative match for one room. The server owns the dice and the
 * state; clients only send intents ("roll", "move this token") which are
 * validated against the shared rules engine.
 */
import {
  applyMove,
  createInitialLudoState,
  getLegalMoves,
  grantsExtraTurn,
  passTurn,
  twoPlayerSeatDefs,
} from '../../shared/ludo/gameLogic';
import { diceCount, type GameRules } from '../../shared/ludo/rules';
import type { LudoState } from '../../shared/ludo/types';
import type { Seat } from '../../shared/protocol';

export interface RollOutcome {
  values: number[];
  state: LudoState;
  /** True when the roll produced no legal move and the turn auto-passed. */
  autoPassed: boolean;
}

export class ServerGame {
  state: LudoState;

  constructor(playerNames: [string, string], avatarIds: [string, string], rules: GameRules) {
    // One-on-one: each player runs two houses (crossed diagonals, or
    // same-side rows under the Side-by-Side rule)
    this.state = createInitialLudoState(
      twoPlayerSeatDefs(
        { id: 'seat-0', username: playerNames[0], avatarId: avatarIds[0], kind: 'remote' },
        { id: 'seat-1', username: playerNames[1], avatarId: avatarIds[1], kind: 'remote' },
        rules.sameLinePairs
      ),
      rules
    );
  }

  /** Which network seat owns the house whose turn it is. */
  get currentSeat(): Seat {
    const owner = this.state.players[this.state.currentPlayerIndex].ownerId;
    return (owner === 'seat-0' ? 0 : 1) as Seat;
  }

  get winnerSeat(): Seat | null {
    if (!this.state.winnerId) return null;
    return (this.state.winnerId === 'seat-0' ? 0 : 1) as Seat;
  }

  roll(seat: Seat): RollOutcome | null {
    if (this.state.phase !== 'roll' || this.currentSeat !== seat || this.state.winnerId) return null;

    const values = Array.from(
      { length: diceCount(this.state.rules) },
      () => 1 + Math.floor(Math.random() * 6)
    );
    const extraTurn = grantsExtraTurn(values, this.state.rules);
    const withDice: LudoState = {
      ...this.state,
      diceValues: values,
      extraTurn,
      phase: 'select_token',
    };

    const moves = getLegalMoves(withDice);
    if (moves.length === 0) {
      this.state = {
        ...passTurn(withDice, extraTurn),
        message: extraTurn ? 'No legal moves, but the double six grants another roll.' : 'No legal move — turn passed.',
      };
      return { values, state: this.state, autoPassed: true };
    }

    this.state = {
      ...withDice,
      selectableTokenIds: Array.from(new Set(moves.map((m) => m.tokenId))),
      message: `Rolled ${values.join(' & ')}`,
    };
    return { values, state: this.state, autoPassed: false };
  }

  move(seat: Seat, tokenId: string, dieValue?: number): LudoState | null {
    if (this.state.phase !== 'select_token' || this.currentSeat !== seat || this.state.winnerId) return null;

    const moves = getLegalMoves(this.state);
    const move = moves.find((m) => m.tokenId === tokenId && (dieValue === undefined || m.dieValueUsed === dieValue));
    if (!move) return null;

    let next = applyMove(this.state, move);

    if (next.phase === 'select_token') {
      const remaining = getLegalMoves(next);
      if (remaining.length === 0) {
        next = passTurn(next, next.extraTurn);
      } else {
        next = { ...next, selectableTokenIds: Array.from(new Set(remaining.map((m) => m.tokenId))) };
      }
    }

    this.state = next;
    return this.state;
  }
}
