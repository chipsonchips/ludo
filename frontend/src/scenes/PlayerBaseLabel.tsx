import { Html } from '@react-three/drei';
import { gridToWorld, getColorHex } from '@/ludo/boardLayout';
import { BASE_CENTER_CELLS } from '@/ludo/constants';
import type { LudoPlayer } from '@/ludo/types';

interface PlayerBaseLabelProps {
  player: LudoPlayer;
}

export function PlayerBaseLabel({ player }: PlayerBaseLabelProps) {
  const [row, col] = BASE_CENTER_CELLS[player.color];
  const position = gridToWorld(row, col, 0.9);
  const hex = getColorHex(player.color);

  return (
    <Html position={position} center distanceFactor={9} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div
        className={`glass-panel flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 ${
          player.isCurrentTurn ? 'ring-1 ring-white/40' : ''
        }`}
        style={{ borderColor: player.isCurrentTurn ? hex : undefined }}
      >
        <span className="text-base leading-none">{player.avatar}</span>
        <span className="text-xs font-bold text-white drop-shadow-md">{player.username}</span>
        {player.isLocalPlayer && (
          <span className="rounded border border-game-blue/30 bg-game-blue/10 px-1 py-0.5 font-display text-[7px] font-bold uppercase tracking-wider text-game-blue">
            YOU
          </span>
        )}
        <span className="font-display text-[10px] font-black" style={{ color: hex }}>
          {player.tokensFinished}/4
        </span>
      </div>
    </Html>
  );
}
