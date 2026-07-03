import { useGameStore } from '@/stores/gameStore';
import { GameScene } from '@/scenes/GameScene';
import { TopBar } from './TopBar';
import { BottomBar } from './BottomBar';
import { PlayerCard } from './PlayerCard';
import { PrizePool } from './PrizePool';
import { LastRoll } from './LastRoll';
import { ActivityFeed } from './ActivityFeed';
import { EmoteBar } from '../social/EmoteBar';
import { ReactionOverlay } from '../social/ReactionOverlay';

export function GameScreen() {
  const players = useGameStore((s) => s.ludo.players);

  const localPlayer = players.find((p) => p.isLocalPlayer)!;
  // Opponents ordered: top-left, top-right, right-side
  const opponents = players.filter((p) => !p.isLocalPlayer);
  const topLeft = opponents[0];
  const topRight = opponents[1];
  const rightSide = opponents[2];

  return (
    <div className="relative h-full w-full overflow-hidden bg-game-bg">
      {/* 3D scene */}
      <GameScene />

      {/* Subtle vignette edges */}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(10,8,18,0.35)_100%)]" />

      {/* HUD layer */}
      <div className="pointer-events-none absolute inset-0 z-[3]">

        {/* TOP-LEFT: Room info + prize pool */}
        <div className="pointer-events-auto absolute left-5 top-5">
          <PrizePool />
        </div>

        {/* TOP-CENTER: Two opponent player cards */}
        <div className="pointer-events-auto absolute left-1/2 top-5 flex -translate-x-1/2 items-start gap-3">
          <PlayerCard player={topLeft} index={1} />
          <PlayerCard player={topRight} index={2} />
        </div>

        {/* TOP-RIGHT: Status bar + branding */}
        <div className="pointer-events-auto absolute right-5 top-5">
          <TopBar />
        </div>

        {/* LEFT-MIDDLE: Local player */}
        <div className="pointer-events-auto absolute left-5 top-1/2 -translate-y-1/2">
          <PlayerCard player={localPlayer} index={0} />
        </div>

        {/* RIGHT-UPPER: Fourth player */}
        <div className="pointer-events-auto absolute right-5 top-[28%]">
          <PlayerCard player={rightSide} index={3} />
        </div>

        {/* RIGHT-MIDDLE: Emote grid */}
        <div className="pointer-events-auto absolute right-5 top-[48%]">
          <EmoteBar />
        </div>

        {/* BOTTOM-LEFT: Activity feed */}
        <div className="absolute bottom-[96px] left-5 w-64">
          <ActivityFeed />
        </div>

        {/* BOTTOM-RIGHT: Last roll */}
        <div className="absolute bottom-[96px] right-5">
          <LastRoll />
        </div>

        {/* Floating reactions */}
        <ReactionOverlay />

        {/* BOTTOM: Action bar */}
        <div className="pointer-events-auto absolute bottom-0 left-0 right-0">
          <BottomBar />
        </div>
      </div>
    </div>
  );
}
