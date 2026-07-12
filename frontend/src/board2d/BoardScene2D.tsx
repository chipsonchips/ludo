/**
 * The flat table arena: Board2D + tossed dice + player plaques, sized to sit
 * between the game HUD bars. This is the default way to play; the 3D lounge
 * (GameScene) is reserved for tournament tables.
 */
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import type { LudoColor, LudoPlayer, LudoState } from '@/ludo/types';
import { getColorHex } from '@/ludo/boardLayout';
import { AvatarBadge } from '@/components/icons';
import { Board2D } from './Board2D';
import { Dice2D } from './Dice2D';
import { BOARD, POD_BOUNDS } from './layout2d';

const FRAME = 26;
const TOTAL = BOARD + FRAME * 2;

/** Percentage position (within the board square) of each pod's outer edge. */
function plateAnchor(color: LudoColor): { left: string; top: string } {
  const pod = POD_BOUNDS[color];
  const cx = ((pod.x + pod.w / 2 + FRAME) / TOTAL) * 100;
  const isTop = pod.y === 0;
  const edgeY = isTop ? pod.y + 6 : pod.y + pod.h - 6;
  const cy = ((edgeY + FRAME) / TOTAL) * 100;
  return { left: `${cx}%`, top: `${cy}%` };
}

function PlayerPlaque({ player, markHuman }: { player: LudoPlayer; markHuman: boolean }) {
  const hex = getColorHex(player.color);
  const active = player.isCurrentTurn;

  return (
    <div
      className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-1/2"
      style={plateAnchor(player.color)}
    >
      <motion.div
        className="flex items-center gap-1.5 rounded-full border bg-black/60 py-1 pl-1 pr-2.5 backdrop-blur-md"
        animate={{
          borderColor: active ? hex : 'rgba(255,255,255,0.12)',
          boxShadow: active ? `0 0 16px ${hex}66` : '0 0 0px rgba(0,0,0,0)',
          scale: active ? 1.06 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <AvatarBadge avatarId={player.avatarId} size={20} color={hex} />
        <span className="max-w-[80px] truncate text-[10px] font-bold text-white">{player.username}</span>
        {markHuman && player.kind === 'human' && (
          <span className="rounded-full bg-game-blue/80 px-1.5 text-[8px] font-black uppercase text-white">you</span>
        )}
        <span className="font-mono text-[9px] font-bold" style={{ color: hex }}>
          {player.tokensFinished}/4
        </span>
      </motion.div>
    </div>
  );
}

function Plaques({ ludo }: { ludo: LudoState }) {
  const markHuman =
    new Set(ludo.players.filter((p) => p.kind === 'human').map((p) => p.ownerId)).size === 1;
  return (
    <>
      {ludo.players.map((p) => (
        <PlayerPlaque key={p.id} player={p} markHuman={markHuman} />
      ))}
    </>
  );
}

export function BoardScene2D() {
  const ludo = useGameStore((s) => s.ludo);
  const selectedTokenId = useGameStore((s) => s.selectedTokenId);
  const selectToken = useGameStore((s) => s.selectToken);
  const pot = useGameStore((s) => s.session?.pot ?? 0);

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden px-2 pb-24 pt-14 md:pb-28 md:pt-16">
      {/* Table spotlight */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[90vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,183,60,0.10)_0%,transparent_62%)]" />

      <motion.div
        className="relative aspect-square"
        style={{ width: 'min(94vw, calc(100dvh - 200px))' }}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Board2D ludo={ludo} pot={pot} selectedTokenId={selectedTokenId} onSelectToken={selectToken} />
        <Plaques ludo={ludo} />
        <Dice2D />
      </motion.div>
    </div>
  );
}
