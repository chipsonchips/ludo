import { GameScene } from '@/scenes/GameScene';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { PlayerPanel } from './PlayerPanel';
import { RoundInfo } from './RoundInfo';
import { ReactionOverlay } from '../social/ReactionOverlay';

export function GameScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1410_0%,#0a0a12_70%)]">
      <GameScene />

      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.3)_100%)]" />

      <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col justify-between">
        <TopBar />
        <PlayerPanel />
        <RoundInfo />
        <ReactionOverlay />
        <BottomBar />
      </div>

      <div className="pointer-events-none absolute bottom-28 left-1/2 z-[2] -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-widest text-white/40 backdrop-blur-sm md:bottom-32">
        Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}
