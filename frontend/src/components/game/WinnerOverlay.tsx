import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { formatChips } from '@/stores/chipsStore';
import { getColorHex } from '@/ludo/boardLayout';
import { AvatarBadge, IconChip, IconHome, IconTrophy, IconUsers } from '../icons';
import { Button } from '../ui';

export function WinnerOverlay() {
  const ludo = useGameStore((s) => s.ludo);
  const gameOver = useGameStore((s) => s.gameOver);
  const session = useGameStore((s) => s.session);
  const playAgain = useGameStore((s) => s.playAgain);
  const leaveMatch = useGameStore((s) => s.leaveMatch);

  // winnerId is an OWNER id; in 1v1 the winner holds two seats — show the first
  const winner = gameOver ? ludo.players.find((p) => p.ownerId === gameOver.winnerId) : null;

  const subtitle = !gameOver
    ? ''
    : gameOver.reason === 'finished'
      ? winner?.kind === 'human'
        ? 'All four tokens home. Take a bow.'
        : 'All four tokens made it home.'
      : 'The opponent left the table — victory by forfeit.';

  return (
    <AnimatePresence>
      {winner && gameOver && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-[20] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-panel flex flex-col items-center gap-4 rounded-3xl px-10 py-8 text-center shadow-[0_0_60px_rgba(246,183,60,0.25)]"
            style={{ borderColor: getColorHex(winner.color) }}
            initial={{ scale: 0.7, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <motion.span
              className="text-game-gold drop-shadow-[0_0_24px_rgba(246,183,60,0.45)]"
              animate={{ rotate: [0, -6, 6, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 0.6 }}
            >
              <IconTrophy size={56} />
            </motion.span>
            <div className="font-display text-xs font-bold uppercase tracking-[0.3em] text-game-gold">Winner</div>
            <div className="flex items-center gap-3">
              <AvatarBadge avatarId={winner.avatarId} size={40} color={getColorHex(winner.color)} />
              <span
                className="font-display text-3xl font-black drop-shadow-md"
                style={{ color: getColorHex(winner.color) }}
              >
                {winner.username}
              </span>
            </div>
            <div className="max-w-[280px] text-sm text-game-secondary">{subtitle}</div>
            {session && session.stake > 0 && (
              <motion.div
                className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-display text-sm font-black tracking-wide ${
                  winner?.kind === 'human'
                    ? 'border-game-gold/50 bg-game-gold/15 text-game-gold shadow-[0_0_24px_rgba(246,183,60,0.3)]'
                    : 'border-white/10 bg-white/5 text-game-secondary'
                }`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 16 }}
              >
                <IconChip size={16} />
                {winner?.kind === 'human'
                  ? `You rake the pot · +${formatChips(session.pot)} chips`
                  : `Your ${formatChips(session.stake)}-chip buy-in goes to the house`}
              </motion.div>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button
                variant="primary"
                icon={session?.mode === 'online' ? <IconUsers size={14} /> : undefined}
                onClick={playAgain}
              >
                {session?.mode === 'online' ? 'Back to lobby' : 'Play again'}
              </Button>
              <Button variant="ghost" icon={<IconHome size={14} />} onClick={leaveMatch}>
                Main menu
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
