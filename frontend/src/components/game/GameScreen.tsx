import { AnimatePresence, motion } from 'framer-motion';
import { GameScene } from '@/scenes/GameScene';
import { useGameStore } from '@/stores/gameStore';
import { useRoomStore } from '@/stores/roomStore';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { RoundInfo } from './RoundInfo';
import { WinnerOverlay } from './WinnerOverlay';
import { ReactionOverlay } from '../social/ReactionOverlay';
import { TutorialCoach } from '../onboarding/TutorialCoach';
import { IconSpinner, IconWifiOff } from '../icons';

/** Online only: the opponent dropped and the server is holding their seat. */
function OpponentDisconnectedBanner() {
  const session = useGameStore((s) => s.session);
  const gameOver = useGameStore((s) => s.gameOver);
  const disconnected = useRoomStore((s) => s.opponentDisconnected);

  const show = session?.mode === 'online' && !gameOver && disconnected !== null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-20 z-[15] -translate-x-1/2"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <div className="glass-panel flex items-center gap-3 border-game-red/40 px-5 py-3">
            <span className="text-game-red">
              <IconWifiOff size={18} />
            </span>
            <div>
              <div className="text-sm font-bold text-white">Opponent disconnected</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-game-secondary">
                <IconSpinner size={11} className="animate-spin" />
                Holding their seat for {disconnected?.graceSeconds ?? 90}s — the game resumes if they return.
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function GameScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1410_0%,#0a0a12_70%)]">
      <GameScene />

      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.3)_100%)]" />

      <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col justify-between">
        <TopBar />
        <RoundInfo />
        <ReactionOverlay />
        <BottomBar />
      </div>

      <OpponentDisconnectedBanner />
      <TutorialCoach />
      <WinnerOverlay />

      <div className="pointer-events-none absolute bottom-28 left-1/2 z-[2] -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-white/40 backdrop-blur-sm md:bottom-32">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
