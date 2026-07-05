import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { useRoomStore } from '@/stores/roomStore';
import { ScreenShell } from './ScreenShell';
import { Button, FieldLabel, TextInput } from '@/components/ui';
import { IconPlus, IconWifi, IconX } from '@/components/icons';

export function OnlineScreen() {
  const navigate = useAppStore((s) => s.navigate);
  const identity = useAppStore((s) => s.identity);
  const setIdentity = useAppStore((s) => s.setIdentity);
  const consumePendingJoinCode = useAppStore((s) => s.consumePendingJoinCode);
  const { createRoom, joinRoom, pending, lastError, clearError, roomClosedReason, clearClosedReason } =
    useRoomStore();

  const [code, setCode] = useState('');
  const [invitePrefilled, setInvitePrefilled] = useState(false);
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    const invite = consumePendingJoinCode();
    if (invite) {
      setCode(invite);
      setInvitePrefilled(true);
    }
  }, [consumePendingJoinCode]);

  const canAct = identity.name.trim().length > 0;
  const notice = lastError ?? roomClosedReason;

  return (
    <ScreenShell onBack={() => navigate('menu')}>
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-xl border border-game-blue/30 bg-game-blue/10 p-2.5 text-game-blue">
          <IconWifi size={22} />
        </span>
        <div>
          <h2 className="font-display text-lg font-black uppercase tracking-[0.2em] text-white">Play Online</h2>
          <p className="text-[12px] text-game-secondary">Private rooms for two — winner takes the bragging rights.</p>
        </div>
      </div>

      <AnimatePresence>
        {notice && (
          <motion.div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-game-red/30 bg-game-red/10 px-4 py-2.5 text-[12px] text-game-red"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {notice}
            <button
              aria-label="Dismiss"
              className="rounded p-1 hover:bg-white/10"
              onClick={() => {
                clearError();
                clearClosedReason();
              }}
            >
              <IconX size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-panel mb-4 p-5">
        <FieldLabel>Your name</FieldLabel>
        <TextInput
          value={identity.name}
          maxLength={20}
          placeholder="Shown to your opponent"
          aria-label="Your name"
          onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Create */}
        <div className="glass-panel flex flex-col gap-3 p-5">
          <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">Host a room</div>
          <p className="min-h-[32px] text-[12px] leading-snug text-game-secondary">
            You pick the rules and get an invite code to share.
          </p>
          <Button
            variant="primary"
            icon={<IconPlus size={16} />}
            loading={pending === 'create'}
            disabled={!canAct}
            onClick={() => createRoom()}
          >
            Create Room
          </Button>
        </div>

        {/* Join */}
        <div className="glass-panel flex flex-col gap-3 p-5">
          <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">Join with a code</div>
          {invitePrefilled ? (
            <p className="min-h-[32px] text-[12px] leading-snug text-game-gold">
              Invite detected — confirm your name and jump in.
            </p>
          ) : (
            <p className="min-h-[32px] text-[12px] leading-snug text-game-secondary">
              Got an invite? Enter the six-character room code.
            </p>
          )}
          <div className="flex gap-2">
            <TextInput
              value={code}
              maxLength={6}
              placeholder="ABC123"
              aria-label="Room code"
              className="font-display uppercase tracking-[0.35em]"
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length >= 4 && canAct) joinRoom(code);
              }}
            />
            <Button
              variant="ghost"
              loading={pending === 'join'}
              disabled={code.length < 4 || !canAct}
              onClick={() => joinRoom(code)}
            >
              Join
            </Button>
          </div>
        </div>
      </div>

      {!canAct && (
        <p className="mt-4 text-center text-[11px] text-game-secondary">Enter a name to host or join a room.</p>
      )}
    </ScreenShell>
  );
}
