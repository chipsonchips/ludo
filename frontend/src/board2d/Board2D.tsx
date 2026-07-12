/**
 * The flat table — LuduChips's own take on a Ludo board, drawn as a
 * top-down casino table rather than a paper game:
 *
 *   · ebony frame with a brass pinstripe around midnight felt
 *   · each house is a "pit pod" of four recessed wells; when a pawn leaves,
 *     its well keeps a ghost silhouette (dashed = out on the felt,
 *     gold inlay = retired home)
 *   · smoked-glass track tiles, house-lit start & home lanes
 *   · the classic center pinwheel converges on a POT medallion where the
 *     table's chips ride
 *
 * Reads the exact same LudoState + shared grid as the 3D lounge, so the two
 * arenas can never disagree about a position.
 */
import { Fragment, useMemo } from 'react';
import { buildBoardCells, codeToColor, getColorHex, type RenderCell } from '@/ludo/boardLayout';
import { BASE_SLOTS, LUDO_COLORS } from '@/ludo/constants';
import { homeLaneColor } from '@shared/ludo/gameLogic';
import type { LudoColor, LudoState } from '@/ludo/types';
import {
  BOARD,
  CELL,
  cellCenter,
  LANE_DIRECTION,
  locationKey,
  POD_BOUNDS,
  START_HEADING_DEG,
  tokenPoint2D,
} from './layout2d';
import { GhostPawn, Token2D } from './Token2D';

const HOUSE_ORDER: LudoColor[] = ['yellow', 'blue', 'green', 'red'];
const FRAME = 26; // ebony frame width outside the playfield
const CENTER = BOARD / 2;
const HUB = 1.5 * CELL; // half-size of the 3x3 center hub

function starPath(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return pts.join(' ') + ' Z';
}

/** Track tile (main path, safe stars, start squares, home lanes). */
function Tile({ row, col, code }: RenderCell) {
  const [cx, cy] = cellCenter(row, col);
  const size = CELL - 5.5;
  const half = size / 2;
  const color = codeToColor(code);
  const isStart = code.startsWith('S');
  const isHome = code.startsWith('H');
  const isStar = code === '*';

  let fill = 'rgba(255,255,255,0.05)';
  let stroke = 'rgba(246,183,60,0.16)';
  let strokeWidth = 1;

  if (isStart && color) {
    fill = getColorHex(color);
    stroke = 'rgba(255,255,255,0.35)';
    strokeWidth = 1.4;
  } else if (isHome && color) {
    // Strong fill — at low opacity the house colors go muddy on the dark felt
    fill = `${getColorHex(color)}B8`;
    stroke = getColorHex(color);
  } else if (isStar) {
    fill = 'rgba(246,183,60,0.07)';
    stroke = 'rgba(246,183,60,0.3)';
  }

  return (
    <g>
      <rect x={cx - half} y={cy - half} width={size} height={size} rx={7} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {isStar && (
        <path d={starPath(cx, cy, 9.5, 4)} fill="none" stroke="#F6B73C" strokeWidth={1.3} opacity={0.75} strokeLinejoin="round" />
      )}
      {isStart && color && (
        <g transform={`translate(${cx} ${cy}) rotate(${START_HEADING_DEG[color]})`}>
          <path d="M -6 -6.5 L 4.5 0 L -6 6.5 Z" fill="rgba(255,255,255,0.9)" />
        </g>
      )}
    </g>
  );
}

/** One house's pit pod: tinted felt pad, brass pinstripe, four recessed wells. */
function Pod({ color, ludo }: { color: LudoColor; ludo: LudoState }) {
  const { x, y, w, h } = POD_BOUNDS[color];
  const hex = getColorHex(color);
  const seated = ludo.players.some((p) => p.color === color);

  return (
    <g opacity={seated ? 1 : 0.35}>
      <rect x={x + 9} y={y + 9} width={w - 18} height={h - 18} rx={20} fill={`${hex}12`} stroke={`${hex}55`} strokeWidth={1.6} />
      <rect x={x + 17} y={y + 17} width={w - 34} height={h - 34} rx={14} fill="none" stroke="rgba(246,183,60,0.14)" strokeWidth={1} />

      {BASE_SLOTS[color].map(([row, col], slot) => {
        const [cx, cy] = cellCenter(row, col);
        const token = ludo.tokens.find((t) => t.id === `${color}-${slot}`);
        const away = !!token && token.location.kind !== 'base';
        const finished = !!token && token.location.kind === 'finished';
        return (
          <Fragment key={slot}>
            {/* Recessed well */}
            <circle cx={cx} cy={cy} r={16.5} fill="rgba(0,0,0,0.5)" />
            <circle cx={cx} cy={cy} r={16.5} fill="none" stroke={`${hex}66`} strokeWidth={1.5} />
            <circle cx={cx} cy={cy} r={12.5} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
            {/* The placeholder: every token that isn't sitting here leaves its silhouette */}
            {seated && away && <GhostPawn color={color} x={cx} y={cy} finished={finished} />}
          </Fragment>
        );
      })}
    </g>
  );
}

/** Center pinwheel + pot medallion, with finished pawns racked along each lane. */
function CenterHub2D({ ludo, pot }: { ludo: LudoState; pot: number }) {
  const wedges: Record<LudoColor, string> = {
    yellow: `M ${CENTER} ${CENTER} L ${CENTER - HUB} ${CENTER - HUB} L ${CENTER - HUB} ${CENTER + HUB} Z`,
    blue: `M ${CENTER} ${CENTER} L ${CENTER - HUB} ${CENTER - HUB} L ${CENTER + HUB} ${CENTER - HUB} Z`,
    red: `M ${CENTER} ${CENTER} L ${CENTER + HUB} ${CENTER - HUB} L ${CENTER + HUB} ${CENTER + HUB} Z`,
    green: `M ${CENTER} ${CENTER} L ${CENTER - HUB} ${CENTER + HUB} L ${CENTER + HUB} ${CENTER + HUB} Z`,
  };

  const finishedByLane = useMemo(() => {
    const map = new Map<LudoColor, LudoColor[]>();
    for (const t of ludo.tokens) {
      if (t.location.kind !== 'finished') continue;
      const lane = homeLaneColor(t.color, ludo.rules);
      map.set(lane, [...(map.get(lane) ?? []), t.color]);
    }
    return map;
  }, [ludo.tokens, ludo.rules]);

  return (
    <g>
      {HOUSE_ORDER.map((c) => (
        <path key={c} d={wedges[c]} fill={getColorHex(c)} opacity={0.85} stroke="rgba(0,0,0,0.35)" strokeWidth={1} />
      ))}
      {/* Brass seams on the diagonals */}
      <path
        d={`M ${CENTER - HUB} ${CENTER - HUB} L ${CENTER + HUB} ${CENTER + HUB} M ${CENTER + HUB} ${CENTER - HUB} L ${CENTER - HUB} ${CENTER + HUB}`}
        stroke="#C9A84C"
        strokeWidth={2}
        opacity={0.9}
      />

      {/* Finished pawns rack up along their lane, riding the medallion rim */}
      {HOUSE_ORDER.map((lane) => {
        const pawns = finishedByLane.get(lane) ?? [];
        const [dx, dy] = LANE_DIRECTION[lane];
        return pawns.map((tokenColor, i) => {
          const along = 44; // distance from center toward the lane mouth
          const spread = (i - (pawns.length - 1) / 2) * 13;
          const px = CENTER + dx * along + -dy * spread;
          const py = CENTER + dy * along + dx * spread;
          return (
            <g key={`${lane}-${i}`} transform={`translate(${px} ${py + 8}) scale(0.5)`}>
              <circle cx={0} cy={-10} r={22} fill="rgba(0,0,0,0.35)" />
              <GhostPawnFill color={tokenColor} />
            </g>
          );
        });
      })}

      {/* POT medallion */}
      <circle cx={CENTER} cy={CENTER} r={34} fill="#171123" stroke="#C9A84C" strokeWidth={2.5} />
      <circle cx={CENTER} cy={CENTER} r={28.5} fill="none" stroke="rgba(201,168,76,0.45)" strokeWidth={1} strokeDasharray="3 4" />
      {pot > 0 ? (
        <>
          <text
            x={CENTER}
            y={CENTER - 6}
            textAnchor="middle"
            fill="#C9A84C"
            style={{ font: '700 8.5px Orbitron, sans-serif', letterSpacing: '0.25em' }}
          >
            POT
          </text>
          <text
            x={CENTER}
            y={CENTER + 10}
            textAnchor="middle"
            fill="#F6B73C"
            style={{ font: '900 15px Orbitron, sans-serif' }}
          >
            {pot.toLocaleString()}
          </text>
        </>
      ) : (
        <text
          x={CENTER}
          y={CENTER + 4}
          textAnchor="middle"
          fill="#C9A84C"
          style={{ font: '700 11px Orbitron, sans-serif', letterSpacing: '0.3em' }}
        >
          LUDO
        </text>
      )}
    </g>
  );
}

/** Small filled pawn used on the finished rack (no interaction, no motion). */
function GhostPawnFill({ color }: { color: LudoColor }) {
  return (
    <g>
      <path
        d="M -6.5 -24 a 6.5 6.5 0 1 1 13 0 a 6.5 6.5 0 1 1 -13 0
           M -4.5 -18.5 C -4 -14.5 -6 -10 -8.8 -5.5 Q -11.5 -2 -11.5 -0.5 Q -11.5 2 -8 2.2
           L 8 2.2 Q 11.5 2 11.5 -0.5 Q 11.5 -2 8.8 -5.5 C 6 -10 4 -14.5 4.5 -18.5 Z"
        fill={getColorHex(color)}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth={1}
      />
    </g>
  );
}

const BASE_CODES = new Set(['Y', 'B', 'G', 'R', 'y', 'b', 'g', 'r', 's', 'CY', 'CB', 'CG', 'CR', 'CC']);

interface Board2DProps {
  ludo: LudoState;
  pot: number;
  selectedTokenId: string | null;
  onSelectToken: (tokenId: string) => void;
}

export function Board2D({ ludo, pot, selectedTokenId, onSelectToken }: Board2DProps) {
  // Pods and the hub draw the base/center areas; only track-ish cells tile out
  const tiles = useMemo(() => buildBoardCells().filter((c) => !BASE_CODES.has(c.code)), []);

  // Fan out stacked tokens so a blockade reads as two pawns, not one
  const stacks = useMemo(() => {
    const byCell = new Map<string, string[]>();
    for (const t of ludo.tokens) {
      if (t.location.kind === 'finished') continue;
      const key = locationKey(t.location, t.color, ludo.rules);
      byCell.set(key, [...(byCell.get(key) ?? []), t.id]);
    }
    return byCell;
  }, [ludo.tokens, ludo.rules]);

  return (
    <svg
      viewBox={`${-FRAME} ${-FRAME} ${BOARD + FRAME * 2} ${BOARD + FRAME * 2}`}
      className="h-full w-full"
      role="img"
      aria-label="Ludo board"
    >
      <defs>
        <radialGradient id="felt" cx="50%" cy="42%" r="75%">
          <stop offset="0%" stopColor="#191430" />
          <stop offset="60%" stopColor="#120E22" />
          <stop offset="100%" stopColor="#0C0917" />
        </radialGradient>
        <linearGradient id="ebony" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2E2012" />
          <stop offset="45%" stopColor="#17100A" />
          <stop offset="100%" stopColor="#241808" />
        </linearGradient>
        {HOUSE_ORDER.map((c) => (
          <radialGradient key={c} id={`pawn-${c}`} cx="35%" cy="25%" r="90%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.85} />
            <stop offset="18%" stopColor={LUDO_COLORS[c].hex} />
            <stop offset="100%" stopColor={LUDO_COLORS[c].dark} />
          </radialGradient>
        ))}
      </defs>

      {/* Table frame: ebony + brass pinstripe */}
      <rect x={-FRAME} y={-FRAME} width={BOARD + FRAME * 2} height={BOARD + FRAME * 2} rx={30} fill="url(#ebony)" />
      <rect x={-FRAME / 2} y={-FRAME / 2} width={BOARD + FRAME} height={BOARD + FRAME} rx={22} fill="none" stroke="#C9A84C" strokeWidth={1.6} opacity={0.8} />
      <rect x={-FRAME / 2 + 4} y={-FRAME / 2 + 4} width={BOARD + FRAME - 8} height={BOARD + FRAME - 8} rx={19} fill="none" stroke="#C9A84C" strokeWidth={0.6} opacity={0.4} />

      {/* Felt */}
      <rect x={-4} y={-4} width={BOARD + 8} height={BOARD + 8} rx={14} fill="url(#felt)" />

      {/* Track + lanes */}
      {tiles.map((cell) => (
        <Tile key={`${cell.row}-${cell.col}`} {...cell} />
      ))}

      {/* House pods */}
      {HOUSE_ORDER.map((c) => (
        <Pod key={c} color={c} ludo={ludo} />
      ))}

      <CenterHub2D ludo={ludo} pot={pot} />

      {/* Live tokens */}
      {ludo.tokens
        .filter((t) => t.location.kind !== 'finished')
        .map((token) => {
          const [x, y] = tokenPoint2D(token.location, token.color, ludo.rules);
          const key = locationKey(token.location, token.color, ludo.rules);
          const stack = stacks.get(key) ?? [token.id];
          return (
            <Token2D
              key={token.id}
              color={token.color}
              x={x}
              y={y}
              stackIndex={stack.indexOf(token.id)}
              stackSize={stack.length}
              isSelectable={ludo.selectableTokenIds.includes(token.id)}
              isSelected={selectedTokenId === token.id}
              onSelect={() => onSelectToken(token.id)}
            />
          );
        })}
    </svg>
  );
}
