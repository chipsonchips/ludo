import { GameScene } from '@/scenes/GameScene';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { PlayerPanel } from './PlayerPanel';
import { RoundInfo } from './RoundInfo';
import { ReactionOverlay } from '../social/ReactionOverlay';
import { ActivityFeed } from './ActivityFeed';

export function GameScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-game-bg">
      <GameScene />

      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(10,8,18,0.6)_100%)]" />

      <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col justify-between">
        {/* Top Area */}
        <div className="flex flex-col">
          <TopBar />
          <PlayerPanel />
        </div>

        {/* Middle Area */}
        <div className="relative flex-1">
          <RoundInfo />
          <ReactionOverlay />
          <ActivityFeed />
        </div>

        {/* Bottom Area */}
        <div className="flex flex-col items-center pb-2 md:pb-4">
          <div className="pointer-events-none rounded-full border border-white/5 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/50 backdrop-blur-md mb-2 md:mb-4">
            Drag to rotate · Scroll to zoom
          </div>
          <BottomBar />
        </div>
      </div>
    </div>
  );
}
