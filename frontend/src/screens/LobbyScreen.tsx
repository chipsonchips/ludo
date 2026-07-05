import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RoomPlayerInfo } from '@shared/protocol';
import { buildInviteLink, useAppStore } from '@/stores/appStore';
import { useRoomStore } from '@/stores/roomStore';
import { ScreenShell } from './ScreenShell';
import { RulesEditor } from '@/components/lobby/RulesEditor';
import { Button, FieldLabel } from '@/components/ui';
import {
  AvatarBadge,
  IconCheck,
  IconCopy,
  IconCrown,
  IconLeave,
  IconLink,
  IconPlay,
  IconSpinner,
  IconWifi,
  IconWifiOff,
  IconX,
} from '@/components/icons';

function PlayerCard({ player, isHost, isMe }: { player: RoomPlayerInfo; isHost: boolean; isMe: boolean }) {
  return (
    <motion.div
      layout
      className={`glass-panel flex items-center gap-3 p-4 ${player.ready ? 'border-game-green/40' : ''}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <AvatarBadge avatarId={player.avatarId} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-white">{player.name}</span>
          {isHost && (
            <span className="text-game-gold" title="Host" aria-label="Host">
              <IconCrown size={14} />
            </span>
          )}
          {isMe && (
            <span className="rounded border border-game-blue/40 bg-game-blue/10 px-1 py-px font-display text-[8px] font-bold uppercase tracking-wider text-game-blue">
              You
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
          {player.connected ? (
            <span className="inline-flex items-center gap-1 text-game-green">
              <IconWifi size={12} /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-game-red">
              <IconWifiOff size={12} /> Reconnecting…
            </span>
          )}
        </div>
      </div>
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[9px] font-bold uppercase tracking-wider ${
          player.ready
            ? 'border-game-green/50 bg-game-green/10 text-game-green'
            : 'border-white/15 bg-white/5 text-game-secondary'
        }`}
      >
        {player.ready ? <IconCheck size={11} /> : <IconX size={11} />}
        {player.ready ? 'Ready' : 'Not ready'}
      </div>
    </motion.div>
  );
}

function EmptySeat() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-4">
      <motion.span
        className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-white/20 text-game-secondary"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <IconSpinner size={18} className="animate-spin" />
      </motion.span>
      <div>
        <div className="text-sm font-semibold text-white/70">Waiting for an opponent…</div>
        <div className="mt-0.5 text-[11px] text-game-secondary">Share the invite below to fill this seat.</div>
      </div>
    </div>
  );
}

export function LobbyScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const { room, seat, pending, lastError, clearError, setRules, toggleReady, startGame, leaveRoom, status } =
    useRoomStore();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  // Kicked back / room gone → return to the online screen
  useEffect(() => {
    if (!room) navigate('online');
  }, [room, navigate]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  if (!room || seat === null) return null;

  const me = room.players[seat];
  const isHost = seat === 0;
  const bothPresent = room.players.every((p) => p !== null);
  const everyoneReady = room.players.every((p) => p?.ready && p.connected);

  const copy = async (payload: string, which: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(which);
    } catch {
      // Clipboard unavailable (permissions); leave silently
    }
  };

  const share = async () => {
    const link = buildInviteLink(room.code);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'StellarDice', text: `Join my StellarDice room ${room.code}`, url: link });
        return;
      } catch {
        // fall through to copy
      }
    }
    copy(link, 'link');
  };

  return (
    <ScreenShell
      width="max-w-2xl"
      onBack={() => {
        leaveRoom();
        navigate('online');
      }}
    >
      {/* Room code header */}
      <div className="glass-panel mb-4 flex flex-col items-center gap-3 p-6 text-center">
        <FieldLabel>Room code</FieldLabel>
        <div
          className="font-display text-4xl font-black tracking-[0.45em] text-game-gold drop-shadow-[0_0_18px_rgba(246,183,60,0.35)]"
          aria-label={`Room code ${room.code.split('').join(' ')}`}
        >
          {room.code}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="ghost"
            icon={copied === 'code' ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={() => copy(room.code, 'code')}
          >
            {copied === 'code' ? 'Copied' : 'Copy code'}
          </Button>
          <Button
            variant="ghost"
            icon={copied === 'link' ? <IconCheck size={14} /> : <IconLink size={14} />}
            onClick={share}
          >
            {copied === 'link' ? 'Link copied' : 'Invite link'}
          </Button>
        </div>
        {status === 'reconnecting' && (
          <div className="inline-flex items-center gap-2 rounded-full border border-game-gold/40 bg-game-gold/10 px-3 py-1 text-[11px] text-game-gold">
            <IconSpinner size={12} className="animate-spin" /> Reconnecting to the server…
          </div>
        )}
      </div>

      <AnimatePresence>
        {lastError && (
          <motion.div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-game-red/30 bg-game-red/10 px-4 py-2.5 text-[12px] text-game-red"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {lastError}
            <button aria-label="Dismiss" className="rounded p-1 hover:bg-white/10" onClick={clearError}>
              <IconX size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Seats */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        {room.players.map((player, i) =>
          player ? (
            <PlayerCard key={i} player={player} isHost={i === 0} isMe={i === seat} />
          ) : (
            <EmptySeat key={i} />
          )
        )}
      </div>

      {/* Rules */}
      <div className="glass-panel mb-4 p-5">
        <RulesEditor rules={room.rules} onChange={isHost ? setRules : undefined} />
        {!isHost && (
          <p className="mt-3 text-[11px] leading-snug text-game-secondary">
            Toggling <span className="text-white/80">Ready</span> means you accept these rules. If the host changes
            them, everyone must accept again.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          variant={me?.ready ? 'ghost' : 'primary'}
          icon={me?.ready ? <IconX size={14} /> : <IconCheck size={14} />}
          disabled={!bothPresent}
          onClick={toggleReady}
        >
          {me?.ready ? 'Not ready' : 'Ready up'}
        </Button>
        {isHost && (
          <Button
            variant="primary"
            icon={<IconPlay size={14} />}
            loading={pending === 'start'}
            disabled={!everyoneReady}
            title={everyoneReady ? 'Start the match' : 'Both players must be connected and ready'}
            onClick={startGame}
          >
            Start Match
          </Button>
        )}
        <Button
          variant="danger"
          icon={<IconLeave size={14} />}
          onClick={() => {
            leaveRoom();
            navigate('online');
          }}
        >
          Leave
        </Button>
      </div>

      {!bothPresent && (
        <p className="mt-4 text-center text-[11px] text-game-secondary">
          The match can start once both seats are filled and ready.
        </p>
      )}
      {isHost && bothPresent && !everyoneReady && (
        <p className="mt-4 text-center text-[11px] text-game-secondary">
          Waiting for both players to accept the rules and ready up.
        </p>
      )}
    </ScreenShell>
  );
}
