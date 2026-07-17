import { motion } from 'framer-motion';
import type { LudoColor } from '@/ludo/types';
import { getColorDark, getColorHex } from '@/ludo/boardLayout';

/**
 * Pawn silhouette shared by live tokens and the ghost placeholders left
 * behind in a base well. Drawn around (0,0) = the point the pawn "stands on";
 * roughly 26 units wide and 34 tall.
 */
export function PawnShape({ fill, stroke, ...rest }: { fill: string; stroke?: string } & React.SVGProps<SVGPathElement>) {
  return (
    <path
      d="M -6.5 -24
         a 6.5 6.5 0 1 1 13 0
         a 6.5 6.5 0 1 1 -13 0
         M -4.5 -18.5
         C -4 -14.5 -6 -10 -8.8 -5.5
         Q -11.5 -2 -11.5 -0.5
         Q -11.5 2 -8 2.2
         L 8 2.2
         Q 11.5 2 11.5 -0.5
         Q 11.5 -2 8.8 -5.5
         C 6 -10 4 -14.5 4.5 -18.5
         Z"
      fill={fill}
      stroke={stroke}
      {...rest}
    />
  );
}

interface Token2DProps {
  color: LudoColor;
  x: number;
  y: number;
  /** Fan-out when several tokens share a cell. */
  stackIndex: number;
  stackSize: number;
  isSelectable: boolean;
  isSelected: boolean;
  onSelect?: () => void;
}

export function Token2D({ color, x, y, stackIndex, stackSize, isSelectable, isSelected, onSelect }: Token2DProps) {
  const hex = getColorHex(color);
  const dark = getColorDark(color);
  const fanX = stackSize > 1 ? (stackIndex - (stackSize - 1) / 2) * 9 : 0;
  const fanY = stackSize > 1 ? -stackIndex * 3 : 0;
  const scale = stackSize > 1 ? 0.82 : 1;

  return (
    <motion.g
      initial={false}
      animate={{ x: x + fanX, y: y + fanY, scale: isSelected ? scale * 1.12 : scale }}
      transition={{ type: 'spring', stiffness: 380, damping: 26, mass: 0.7 }}
      style={{ cursor: isSelectable ? 'pointer' : 'default' }}
      onClick={(e) => {
        e.stopPropagation();
        if (isSelectable) onSelect?.();
      }}
      role={isSelectable ? 'button' : undefined}
      aria-label={isSelectable ? `Move ${color} token` : undefined}
    >
      {/* Selectable pulse ring on the felt under the pawn */}
      {isSelectable && (
        <motion.circle
          cx={0}
          cy={4}
          r={15}
          fill="none"
          stroke="#F6B73C"
          strokeWidth={2.5}
          initial={{ opacity: 0.9, scale: 0.85 }}
          animate={{ opacity: [0.9, 0.25, 0.9], scale: [0.85, 1.15, 0.85] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Contact shadow */}
      <ellipse cx={0} cy={4} rx={11} ry={3.6} fill="rgba(0,0,0,0.45)" />

      {/* Body — dark rim behind, bright face on top for a lacquered read */}
      <g transform="translate(0 2)">
        <PawnShape fill={dark} transform="translate(0.9 1.4)" />
        <PawnShape fill={`url(#pawn-${color})`} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
        {/* Specular sliver */}
        <path
          d="M -2.6 -29 a 4.5 4.5 0 0 1 1 -1.6 q 2.4-1.4 4.4 0.4"
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </g>

      {/* Selected halo */}
      {isSelected && (
        <circle cx={0} cy={-10} r={20} fill="none" stroke={hex} strokeWidth={1.5} opacity={0.7} />
      )}
    </motion.g>
  );
}

/**
 * Ghost pawn: the placeholder engraved in a base well while its token is out
 * on the felt (dashed outline) or retired after finishing (gold inlay).
 */
export function GhostPawn({ color, x, y, finished }: { color: LudoColor; x: number; y: number; finished: boolean }) {
  const hex = getColorHex(color);
  return (
    <g transform={`translate(${x} ${y + 12}) scale(0.78)`} pointerEvents="none">
      <PawnShape
        fill={finished ? 'rgba(246,183,60,0.28)' : 'transparent'}
        stroke={finished ? '#F6B73C' : hex}
        strokeWidth={1.6}
        strokeDasharray={finished ? undefined : '4 3.2'}
        opacity={finished ? 0.85 : 0.4}
      />
    </g>
  );
}
