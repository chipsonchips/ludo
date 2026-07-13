/**
 * Room lifecycle: create → waiting (host alone) → lobby (both seats filled,
 * agreeing on rules) → playing → back to lobby (rematch) or closed.
 *
 * Disconnects get a reconnect grace window (seat is held, opponent is told).
 * When the grace expires: waiting rooms die, a lobby guest frees the seat,
 * a lobby host closes the room, and a live game is forfeited.
 */
import { randomInt, randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { ServerGame } from './game';
import { DEFAULT_RULES, sanitizeRules, type GameRules } from '../../shared/ludo/rules';
import { RAKE_BPS, STAKE_TIERS_USDC, usdcToUnits } from '../../shared/stakes';
import * as bank from './bank';
import {
  RECONNECT_GRACE_MS,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  type ErrorCode,
  type RoomSnapshot,
  type RoomStatus,
  type Seat,
  type ServerMessage,
  type VoiceSignal,
} from '../../shared/protocol';

export class RoomError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
}

interface Occupant {
  token: string;
  name: string;
  avatarId: string;
  ready: boolean;
  ws: WebSocket | null;
  graceTimer: ReturnType<typeof setTimeout> | null;
  /** Verified hub wallet address, set by `authenticate`. */
  wallet: `0x${string}` | null;
}

export interface Room {
  code: string;
  status: RoomStatus;
  rules: GameRules;
  /** USDC ante per seat; 0 = Friendly. */
  stake: number;
  /** Has any roll happened yet this match? Governs the abort-vs-forfeit refund rule. */
  hasRolled: boolean;
  seats: (Occupant | null)[];
  createdAt: number;
  expiresAt: number;
  game: ServerGame | null;
}

type SettlementOutcome = { kind: 'win'; winnerSeat: Seat } | { kind: 'refund' };

interface Session {
  code: string;
  seat: Seat;
}

const MAX_NAME_LENGTH = 20;

/** Overridable for tests (GRACE_MS=500 node …). */
const GRACE_MS = Number(process.env.GRACE_MS ?? RECONNECT_GRACE_MS);

function cleanName(name: unknown, fallback: string): string {
  const s = String(name ?? '').trim().slice(0, MAX_NAME_LENGTH);
  return s.length > 0 ? s : fallback;
}

function cleanAvatarId(avatarId: unknown): string {
  const s = String(avatarId ?? '').trim().slice(0, 32);
  return /^[a-z0-9-]+$/.test(s) ? s : 'pawn';
}

export class RoomManager {
  private rooms = new Map<string, Room>();
  private sessions = new Map<WebSocket, Session>();

  constructor(private log: (msg: string) => void = () => {}) {}

  get roomCount(): number {
    return this.rooms.size;
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private generateCode(): string {
    for (;;) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
  }

  private send(ws: WebSocket | null, msg: ServerMessage) {
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }

  private broadcast(room: Room, msg: ServerMessage, exceptSeat?: Seat) {
    room.seats.forEach((occ, seat) => {
      if (occ && seat !== exceptSeat) this.send(occ.ws, msg);
    });
  }

  snapshot(room: Room): RoomSnapshot {
    return {
      code: room.code,
      status: room.status,
      rules: room.rules,
      stake: room.stake,
      players: room.seats.map((occ, seat) =>
        occ
          ? {
              seat: seat as Seat,
              name: occ.name,
              avatarId: occ.avatarId,
              ready: occ.ready,
              connected: occ.ws !== null,
              wallet: occ.wallet,
            }
          : null
      ),
      createdAt: room.createdAt,
      expiresAt: room.expiresAt,
    };
  }

  private broadcastRoom(room: Room) {
    this.broadcast(room, { t: 'room_update', room: this.snapshot(room) });
  }

  private requireSession(ws: WebSocket): { room: Room; seat: Seat; occ: Occupant } {
    const session = this.sessions.get(ws);
    const room = session ? this.rooms.get(session.code) : undefined;
    const occ = session && room ? room.seats[session.seat] : null;
    if (!session || !room || !occ) throw new RoomError('room_not_found', 'You are not in a room.');
    return { room, seat: session.seat, occ };
  }

  private closeRoom(room: Room, reason: string) {
    for (const occ of room.seats) {
      if (occ?.graceTimer) clearTimeout(occ.graceTimer);
      if (occ?.ws) {
        this.send(occ.ws, { t: 'room_closed', reason });
        this.sessions.delete(occ.ws);
      }
    }
    room.status = 'closed';
    this.rooms.delete(room.code);
    this.log(`room ${room.code} closed: ${reason}`);
  }

  // ── Joining / leaving ───────────────────────────────────────────

  create(ws: WebSocket, name: unknown, avatarId: unknown): void {
    if (this.sessions.has(ws)) throw new RoomError('already_in_room', 'Leave your current room first.');
    const room: Room = {
      code: this.generateCode(),
      status: 'waiting',
      rules: { ...DEFAULT_RULES },
      stake: 0,
      hasRolled: false,
      seats: [
        {
          token: randomUUID(),
          name: cleanName(name, 'Host'),
          avatarId: cleanAvatarId(avatarId),
          ready: false,
          ws,
          graceTimer: null,
          wallet: null,
        },
        null,
      ],
      createdAt: Date.now(),
      expiresAt: Date.now() + ROOM_TTL_MS,
      game: null,
    };
    this.rooms.set(room.code, room);
    this.sessions.set(ws, { code: room.code, seat: 0 });
    this.send(ws, { t: 'joined', seat: 0, playerToken: room.seats[0]!.token, room: this.snapshot(room) });
    this.log(`room ${room.code} created by ${room.seats[0]!.name}`);
  }

  join(ws: WebSocket, code: unknown, name: unknown, avatarId: unknown): void {
    if (this.sessions.has(ws)) throw new RoomError('already_in_room', 'Leave your current room first.');
    const room = this.rooms.get(String(code ?? '').trim().toUpperCase());
    if (!room) throw new RoomError('room_not_found', 'No room with that code. Check it and try again.');
    if (Date.now() > room.expiresAt && room.status !== 'playing') {
      this.closeRoom(room, 'This invitation has expired.');
      throw new RoomError('room_expired', 'That invitation has expired.');
    }
    if (room.seats[1] || room.status === 'playing') {
      throw new RoomError('room_full', 'That room is already full.');
    }

    room.seats[1] = {
      token: randomUUID(),
      name: cleanName(name, 'Guest'),
      avatarId: cleanAvatarId(avatarId),
      ready: false,
      ws,
      graceTimer: null,
      wallet: null,
    };
    room.status = 'lobby';
    room.expiresAt = Date.now() + ROOM_TTL_MS;
    // A new opponent means the previous agreement no longer stands
    room.seats[0]!.ready = false;

    this.sessions.set(ws, { code: room.code, seat: 1 });
    this.send(ws, { t: 'joined', seat: 1, playerToken: room.seats[1]!.token, room: this.snapshot(room) });
    this.broadcastRoom(room);
    this.log(`room ${room.code}: ${room.seats[1]!.name} joined`);
  }

  rejoin(ws: WebSocket, code: unknown, playerToken: unknown): void {
    const room = this.rooms.get(String(code ?? '').trim().toUpperCase());
    if (!room) throw new RoomError('room_not_found', 'That room no longer exists.');
    const seat = room.seats.findIndex((occ) => occ?.token === playerToken) as Seat;
    const occ = seat >= 0 ? room.seats[seat] : null;
    if (!occ) throw new RoomError('room_not_found', 'Your seat in that room no longer exists.');

    if (occ.graceTimer) {
      clearTimeout(occ.graceTimer);
      occ.graceTimer = null;
    }
    if (occ.ws && occ.ws !== ws) {
      // A newer connection supersedes the old one
      this.sessions.delete(occ.ws);
      occ.ws.close();
    }
    occ.ws = ws;
    this.sessions.set(ws, { code: room.code, seat });

    this.send(ws, { t: 'joined', seat, playerToken: occ.token, room: this.snapshot(room) });
    if (room.game) {
      this.send(ws, { t: 'game_state', state: room.game.state });
    }
    this.broadcast(room, { t: 'opponent_connection', seat, connected: true }, seat);
    this.broadcastRoom(room);
    this.log(`room ${room.code}: seat ${seat} reconnected`);
  }

  leave(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    if (!session) return;
    const room = this.rooms.get(session.code);
    this.sessions.delete(ws);
    if (!room) return;
    const occ = room.seats[session.seat];
    if (occ) {
      occ.ws = null;
      if (occ.graceTimer) clearTimeout(occ.graceTimer);
    }
    this.removeOccupant(room, session.seat, 'left');
  }

  onSocketClosed(ws: WebSocket): void {
    const session = this.sessions.get(ws);
    if (!session) return;
    this.sessions.delete(ws);
    const room = this.rooms.get(session.code);
    const occ = room?.seats[session.seat];
    if (!room || !occ || occ.ws !== ws) return;

    occ.ws = null;
    const graceSeconds = Math.round(GRACE_MS / 1000);
    this.broadcast(room, { t: 'opponent_connection', seat: session.seat, connected: false, graceSeconds }, session.seat);
    this.broadcastRoom(room);

    occ.graceTimer = setTimeout(() => {
      occ.graceTimer = null;
      this.removeOccupant(room, session.seat, 'timeout');
    }, GRACE_MS);
    this.log(`room ${room.code}: seat ${session.seat} disconnected (grace ${graceSeconds}s)`);
  }

  /** A seat is gone for good — resolve what happens to the room. */
  private removeOccupant(room: Room, seat: Seat, cause: 'left' | 'timeout') {
    const other = room.seats[1 - seat];

    if (room.status === 'playing' && room.game) {
      // Captured before any seat mutation below — a leaving seat gets nulled.
      const stake = room.stake;
      const wallets = { host: room.seats[0]?.wallet ?? null, guest: room.seats[1]?.wallet ?? null };
      // Abort before the first roll refunds both stakes (CHIPS.md); any
      // other removal of a live staked game — a disconnect timeout, or a
      // leave after play has started — is a normal forfeit to the other seat.
      const preRollAbort = cause === 'left' && !room.hasRolled;

      // Live game: the remaining player wins by forfeit
      if (other) {
        this.broadcast(room, {
          t: 'game_over',
          winnerSeat: (1 - seat) as Seat,
          reason: cause === 'left' ? 'left' : 'forfeit',
          state: room.game.state,
        });
        this.finishGame(room);
        room.seats[seat] = null;
        if (seat === 0) this.promoteGuest(room);
        else room.status = 'waiting';
        this.broadcastRoom(room);
        const outcome: SettlementOutcome = preRollAbort
          ? { kind: 'refund' }
          : { kind: 'win', winnerSeat: (1 - seat) as Seat };
        void this.settleStake(room, stake, wallets, outcome);
        return;
      }
      // Both seats already gone — nobody left to pay a pot to; refund whatever was escrowed.
      void this.settleStake(room, stake, wallets, { kind: 'refund' });
      this.closeRoom(room, 'Both players left.');
      return;
    }

    room.seats[seat] = null;
    if (!other || other.ws === null) {
      this.closeRoom(room, 'Room abandoned.');
      return;
    }

    if (seat === 0) this.promoteGuest(room);
    else {
      room.status = 'waiting';
      room.seats[0]!.ready = false;
    }
    this.broadcastRoom(room);
    this.log(`room ${room.code}: seat ${seat} removed (${cause})`);
  }

  /** Host left — the guest inherits the room so their lobby isn't torn down. */
  private promoteGuest(room: Room) {
    const guest = room.seats[1];
    if (!guest) {
      this.closeRoom(room, 'Host left.');
      return;
    }
    room.seats[0] = guest;
    room.seats[1] = null;
    guest.ready = false;
    room.status = 'waiting';
    if (guest.ws) {
      const session = this.sessions.get(guest.ws);
      if (session) session.seat = 0;
      // Seat change invalidates the client's cached seat — resend identity
      this.send(guest.ws, { t: 'joined', seat: 0, playerToken: guest.token, room: this.snapshot(room) });
    }
  }

  // ── Lobby actions ───────────────────────────────────────────────

  setRules(ws: WebSocket, rules: unknown): void {
    const { room, seat } = this.requireSession(ws);
    if (seat !== 0) throw new RoomError('not_host', 'Only the host can change the rules.');
    if (room.status === 'playing') throw new RoomError('invalid_message', 'Rules are locked during a game.');
    room.rules = sanitizeRules(rules);
    // Rule changes void any prior agreement
    for (const occ of room.seats) if (occ) occ.ready = false;
    this.broadcastRoom(room);
  }

  setStake(ws: WebSocket, stake: unknown): void {
    const { room, seat } = this.requireSession(ws);
    if (seat !== 0) throw new RoomError('not_host', 'Only the host can change the stake.');
    if (room.status === 'playing') throw new RoomError('invalid_message', 'The stake is locked during a game.');
    const n = Number(stake);
    if (!STAKE_TIERS_USDC.includes(n as (typeof STAKE_TIERS_USDC)[number])) {
      throw new RoomError('invalid_message', 'Not a valid stake tier.');
    }
    if (n > 0 && !bank.bankAvailable) {
      throw new RoomError('stake_unavailable', 'Real-money stakes are not available on this server yet.');
    }
    room.stake = n;
    // A stake change is a material change both must agree to again
    for (const occ of room.seats) if (occ) occ.ready = false;
    this.broadcastRoom(room);
  }

  async authenticate(ws: WebSocket, address: unknown, message: unknown, signature: unknown): Promise<void> {
    const { room, occ } = this.requireSession(ws);
    const addr = String(address ?? '');
    const ok = await bank.verifyWallet(addr, String(message ?? ''), String(signature ?? ''));
    if (!ok) throw new RoomError('invalid_message', 'Wallet verification failed.');
    occ.wallet = addr as `0x${string}`;
    this.send(ws, { t: 'authenticated', address: addr });
    this.broadcastRoom(room);
  }

  setReady(ws: WebSocket, ready: unknown): void {
    const { room, occ } = this.requireSession(ws);
    if (room.status !== 'lobby') throw new RoomError('invalid_message', 'Nothing to ready up for yet.');
    occ.ready = ready === true;
    this.broadcastRoom(room);
  }

  async startGame(ws: WebSocket): Promise<void> {
    const { room, seat } = this.requireSession(ws);
    if (seat !== 0) throw new RoomError('not_host', 'Only the host can start the match.');
    if (room.status !== 'lobby' || !room.seats[0] || !room.seats[1]) {
      throw new RoomError('not_ready', 'Wait for an opponent to join.');
    }
    if (!room.seats.every((occ) => occ?.ready && occ.ws)) {
      throw new RoomError('not_ready', 'Both players must be connected and ready.');
    }

    const [hostOcc, guestOcc] = room.seats as [Occupant, Occupant];
    let postEscrowBalances: [number, number] | null = null;

    if (room.stake > 0) {
      if (!bank.bankAvailable) throw new RoomError('stake_unavailable', 'Real-money stakes are not available on this server yet.');
      if (!hostOcc.wallet || !guestOcc.wallet) {
        throw new RoomError('wallet_required', 'Both players need a verified hub wallet to start a staked match.');
      }
      const stakeUnits = usdcToUnits(room.stake);
      const [hostBalance, guestBalance] = await Promise.all([
        bank.playerBalanceUnits(hostOcc.wallet),
        bank.playerBalanceUnits(guestOcc.wallet),
      ]);
      if (hostBalance < stakeUnits) {
        throw new RoomError('insufficient_balance', `${hostOcc.name} doesn't have enough banked balance for this stake.`);
      }
      if (guestBalance < stakeUnits) {
        throw new RoomError('insufficient_balance', `${guestOcc.name} doesn't have enough banked balance for this stake.`);
      }

      const ref = `ludo:${room.code}:${Date.now()}`;
      await bank.debitFor(hostOcc.wallet, stakeUnits, ref);
      try {
        await bank.debitFor(guestOcc.wallet, stakeUnits, ref);
      } catch (err) {
        // Roll back the host's escrowed stake so a partial failure never
        // leaves one player short with no match to show for it.
        await bank.creditFor(hostOcc.wallet, stakeUnits, ref).catch((refundErr) =>
          this.log(`room ${room.code}: FAILED to refund host escrow after partial debit — ${String(refundErr)}`)
        );
        this.log(`room ${room.code}: escrow debit failed — ${String(err)}`);
        throw new RoomError('settlement_failed', 'Could not escrow the stake — try again.');
      }
      postEscrowBalances = [Number(hostBalance - stakeUnits) / 1e6, Number(guestBalance - stakeUnits) / 1e6];
    }

    room.game = new ServerGame(
      [room.seats[0].name, room.seats[1].name],
      [room.seats[0].avatarId, room.seats[1].avatarId],
      room.rules
    );
    room.status = 'playing';
    room.hasRolled = false;
    room.expiresAt = Date.now() + ROOM_TTL_MS;
    this.broadcast(room, { t: 'game_started', state: room.game.state });
    this.broadcastRoom(room);
    if (postEscrowBalances) {
      this.send(hostOcc.ws, { t: 'balance_update', seat: 0, balance: postEscrowBalances[0] });
      this.send(guestOcc.ws, { t: 'balance_update', seat: 1, balance: postEscrowBalances[1] });
    }
    this.log(`room ${room.code}: game started${room.stake > 0 ? ` (staked ${room.stake} USDC)` : ''}`);
  }

  // ── In-game actions ─────────────────────────────────────────────

  roll(ws: WebSocket): void {
    const { room, seat } = this.requireSession(ws);
    if (!room.game) throw new RoomError('invalid_message', 'No game in progress.');
    const outcome = room.game.roll(seat);
    if (!outcome) throw new RoomError('not_your_turn', 'It is not your turn to roll.');
    room.hasRolled = true;
    this.broadcast(room, { t: 'roll_result', seat, values: outcome.values });
    this.broadcast(room, { t: 'game_state', state: outcome.state });
  }

  move(ws: WebSocket, tokenId: unknown, dieValue: unknown): void {
    const { room, seat } = this.requireSession(ws);
    if (!room.game) throw new RoomError('invalid_message', 'No game in progress.');
    const dieValueNum = typeof dieValue === 'number' ? dieValue : undefined;
    const state = room.game.move(seat, String(tokenId ?? ''), dieValueNum);
    if (!state) throw new RoomError('invalid_move', 'That token cannot move right now.');
    this.broadcast(room, { t: 'game_state', state });

    const winnerSeat = room.game.winnerSeat;
    if (winnerSeat !== null) {
      this.broadcast(room, { t: 'game_over', winnerSeat, reason: 'finished', state });
      const stake = room.stake;
      const wallets = { host: room.seats[0]?.wallet ?? null, guest: room.seats[1]?.wallet ?? null };
      this.finishGame(room);
      this.broadcastRoom(room);
      // Best-effort/async: the result is already final, settlement never blocks the winner overlay.
      void this.settleStake(room, stake, wallets, { kind: 'win', winnerSeat });
    }
  }

  /** Reset a finished game so the pair can rematch from the lobby. */
  private finishGame(room: Room) {
    room.game = null;
    room.status = room.seats[0] && room.seats[1] ? 'lobby' : 'waiting';
    room.expiresAt = Date.now() + ROOM_TTL_MS;
    for (const occ of room.seats) if (occ) occ.ready = false;
  }

  /**
   * Pays out a settled staked match: winner takes the pot minus rake, or
   * both stakes are refunded if the match was aborted before the first
   * roll. Wallets are passed in explicitly (captured by the caller before
   * any seat mutation) since a forfeiting seat may already be nulled by the
   * time this runs. Runs after the game result is already broadcast — a
   * slow or failed settlement tx is logged for manual follow-up rather than
   * blocking the game-over UI (no funded operator exists yet regardless).
   */
  private async settleStake(
    room: Room,
    stakeUsdc: number,
    wallets: { host: `0x${string}` | null; guest: `0x${string}` | null },
    outcome: SettlementOutcome
  ): Promise<void> {
    if (stakeUsdc <= 0 || !bank.bankAvailable) return;
    const stakeUnits = usdcToUnits(stakeUsdc);
    const ref = `ludo:${room.code}:${Date.now()}:settle`;

    try {
      if (outcome.kind === 'refund') {
        const seats: [Seat, `0x${string}` | null][] = [
          [0, wallets.host],
          [1, wallets.guest],
        ];
        await Promise.all(seats.map(([, wallet]) => (wallet ? bank.creditFor(wallet, stakeUnits, ref) : null)));
        for (const [seat, wallet] of seats) if (wallet) await this.notifyBalance(room, seat, wallet);
        this.log(`room ${room.code}: stake refunded (${stakeUsdc} USDC each)`);
        return;
      }

      const potUnits = stakeUnits * 2n;
      const rakeUnits = (potUnits * BigInt(RAKE_BPS)) / 10000n;
      const payoutUnits = potUnits - rakeUnits;
      const winnerWallet = outcome.winnerSeat === 0 ? wallets.host : wallets.guest;
      if (!winnerWallet) return;
      await bank.creditFor(winnerWallet, payoutUnits, ref);
      await this.notifyBalance(room, outcome.winnerSeat, winnerWallet);
      this.log(`room ${room.code}: settled — seat ${outcome.winnerSeat} paid ${Number(payoutUnits) / 1e6} USDC`);
    } catch (err) {
      this.log(`room ${room.code}: settlement FAILED (${outcome.kind}) — needs manual reconciliation — ${String(err)}`);
    }
  }

  /** Best-effort UI nudge; the client's own on-chain read of ChipsBank is authoritative. */
  private async notifyBalance(room: Room, seat: Seat, wallet: `0x${string}`): Promise<void> {
    try {
      const units = await bank.playerBalanceUnits(wallet);
      this.send(room.seats[seat]?.ws ?? null, { t: 'balance_update', seat, balance: Number(units) / 1e6 });
    } catch {
      // ignore — nothing actionable client-side beyond its own periodic refetch
    }
  }

  // ── Social relay ────────────────────────────────────────────────

  chat(ws: WebSocket, text: unknown): void {
    const { room, seat, occ } = this.requireSession(ws);
    const clean = String(text ?? '').trim().slice(0, 200);
    if (!clean) return;
    this.broadcast(room, { t: 'chat', seat, name: occ.name, text: clean, ts: Date.now() });
  }

  reaction(ws: WebSocket, icon: unknown): void {
    const { room, seat } = this.requireSession(ws);
    const clean = String(icon ?? '').trim().slice(0, 32);
    if (!/^[a-z-]+$/.test(clean)) return;
    this.broadcast(room, { t: 'reaction', seat, icon: clean });
  }

  /**
   * WebRTC voice signaling: relay the payload verbatim to the other seat.
   * The server never parses SDP — it only checks the envelope shape.
   */
  voiceSignal(ws: WebSocket, signal: unknown): void {
    const { room, seat } = this.requireSession(ws);
    if (typeof signal !== 'object' || signal === null) return;
    const kind = (signal as { kind?: unknown }).kind;
    if (kind !== 'presence' && kind !== 'offer' && kind !== 'answer' && kind !== 'ice' && kind !== 'bye') return;
    const other = room.seats[1 - seat];
    if (!other) return;
    this.send(other.ws, { t: 'voice_signal', seat, signal: signal as VoiceSignal });
  }

  // ── Housekeeping ────────────────────────────────────────────────

  /** Reclaim expired invitations and rooms nobody is connected to. */
  sweep(): void {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      const anyoneConnected = room.seats.some((occ) => occ?.ws);
      if (!anyoneConnected && !room.seats.some((occ) => occ?.graceTimer)) {
        this.closeRoom(room, 'Room abandoned.');
        continue;
      }
      if (room.status !== 'playing' && now > room.expiresAt) {
        this.closeRoom(room, 'This invitation has expired.');
      }
    }
  }
}
