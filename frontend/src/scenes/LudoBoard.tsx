import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  buildBoardCells,
  codeToColor,
  getColorHex,
  getTokenWorldPosition,
  gridToWorld,
  type RenderCell,
} from '@/ludo/boardLayout';
import { CELL_SIZE } from '@/ludo/constants';
import type { LudoColor, LudoState } from '@/ludo/types';
import { LudoTokenMesh } from './LudoToken';
import { PlayerBaseLabel } from './PlayerBaseLabel';

interface LudoBoardProps {
  ludo: LudoState;
  selectedTokenId: string | null;
  onSelectToken: (tokenId: string) => void;
}

/** Vivid base-area colors matching a classic physical Ludo board */
const BASE_COLORS: Record<LudoColor, string> = {
  yellow: '#FDD835',
  blue:   '#1565C0',
  green:  '#2E7D32',
  red:    '#D32F2F',
};

const BASE_INNER_COLORS: Record<LudoColor, string> = {
  yellow: '#FFF9C4',
  blue:   '#BBDEFB',
  green:  '#C8E6C9',
  red:    '#FFCDD2',
};

function cellStyle(code: RenderCell['code']): { color: string; height: number; y: number } {
  const white = '#FFFEF5';
  const cream = '#F5F0E8';

  if (code === 'W') return { color: white, height: 0.06, y: 0.08 };
  if (code === '*') return { color: white, height: 0.07, y: 0.09 };
  if (code === 'CC') return { color: white, height: 0.1, y: 0.12 };

  // Token slot cells inside base areas — use the inner (lighter) base color
  if (code === 's') return { color: cream, height: 0.05, y: 0.07 };

  const ludoColor = codeToColor(code);
  if (ludoColor) {
    const isHome = code.startsWith('H');
    const isStart = code.startsWith('S');
    const isBaseEdge = code.length === 1; // Y, B, G, R
    const isBaseInner = code === 'y' || code === 'b' || code === 'g' || code === 'r';

    if (isBaseEdge) return { color: BASE_COLORS[ludoColor], height: 0.06, y: 0.08 };
    if (isBaseInner) return { color: BASE_INNER_COLORS[ludoColor], height: 0.05, y: 0.07 };
    if (isHome) return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
    if (isStart) return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
    return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
  }

  return { color: cream, height: 0.04, y: 0.06 };
}

/** Half-size of the 3x3 center hub square, in world units */
const HUB_H = 1.5 * CELL_SIZE;

function makeTriShape(p1: [number, number], p2: [number, number], p3: [number, number]) {
  const shape = new THREE.Shape();
  shape.moveTo(p1[0], p1[1]);
  shape.lineTo(p2[0], p2[1]);
  shape.lineTo(p3[0], p3[1]);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
}

/** Classic Ludo pinwheel: each color's wedge points toward that color's home lane */
const PINWHEEL_GEOMETRY: Record<LudoColor, THREE.ExtrudeGeometry> = {
  yellow: makeTriShape([0, 0], [-HUB_H, -HUB_H], [-HUB_H, HUB_H]), // -X
  red: makeTriShape([0, 0], [HUB_H, -HUB_H], [HUB_H, HUB_H]), // +X
  green: makeTriShape([0, 0], [-HUB_H, -HUB_H], [HUB_H, -HUB_H]), // +Z
  blue: makeTriShape([0, 0], [-HUB_H, HUB_H], [HUB_H, HUB_H]), // -Z
};

/** World-space heading (yaw, around Y) that each color's start arrow should point along the track */
const START_ARROW_YAW: Record<LudoColor, number> = {
  yellow: 0,
  blue: -Math.PI / 2,
  green: Math.PI / 2,
  red: Math.PI,
};

function BOARD_CORNER_COLOR(row: number, col: number): LudoColor {
  if (row > 8 && col < 6) return 'yellow'; // Top-Left visual
  if (row > 8 && col > 8) return 'blue'; // Top-Right visual
  if (row < 6 && col < 6) return 'green'; // Bottom-Left visual
  return 'red'; // Bottom-Right visual
}

function BoardCellMesh({ row, col, code }: RenderCell) {
  const [x, , z] = gridToWorld(row, col, 0);
  const size = CELL_SIZE * 0.94;
  const { color, height, y } = cellStyle(code);
  const slotColor = code === 's' ? BOARD_CORNER_COLOR(row, col) : null;

  return (
    <group position={[x, y, z]}>
      <mesh receiveShadow castShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Token slot ring */}
      {code === 's' && slotColor && (
        <>
          {/* Slot background */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height / 2 + 0.003, 0]}>
            <circleGeometry args={[size * 0.3, 24]} />
            <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.05} />
          </mesh>
          {/* Slot ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height / 2 + 0.006, 0]}>
            <ringGeometry args={[size * 0.18, size * 0.32, 24]} />
            <meshStandardMaterial color={BASE_COLORS[slotColor]} roughness={0.3} metalness={0.2} />
          </mesh>
        </>
      )}
      {/* Safe star */}
      {code === '*' && (
        <Text
          position={[0, height / 2 + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.2}
          color="#1a1a2e"
          anchorX="center"
          anchorY="middle"
        >
          ★
        </Text>
      )}
      {/* Center HOME label */}
      {code.startsWith('C') && code !== 'CC' && (
        <Text
          position={[0, height / 2 + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.09}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          HOME
        </Text>
      )}
      {/* Start arrow — points along the direction of travel for that color */}
      {(code === 'SY' || code === 'SB' || code === 'SG' || code === 'SR') && (
        <group rotation={[0, START_ARROW_YAW[codeToColor(code)!], 0]}>
          <Text
            position={[0, height / 2 + 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.14}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            ▶
          </Text>
        </group>
      )}
    </group>
  );
}

/** The classic pinwheel HOME hub + raised dice dais, replacing the plain center cells */
function CenterHub() {
  const colors: LudoColor[] = ['yellow', 'blue', 'green', 'red'];

  return (
    <group>
      {/* Colored pinwheel wedges, each pointing toward its color's home lane */}
      {colors.map((color) => (
        <mesh
          key={color}
          receiveShadow
          castShadow
          geometry={PINWHEEL_GEOMETRY[color]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.08, 0]}
        >
          <meshStandardMaterial color={BASE_COLORS[color]} roughness={0.5} metalness={0.08} />
        </mesh>
      ))}

      {/* Gold inlay marking the wedge seams */}
      <mesh position={[0, 0.141, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[HUB_H * 2 * Math.SQRT2, 0.01, 0.025]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.141, 0]} rotation={[0, -Math.PI / 4, 0]}>
        <boxGeometry args={[HUB_H * 2 * Math.SQRT2, 0.01, 0.025]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Raised dice dais — top surface matches BOARD_CENTER's physics floor height */}
      <mesh receiveShadow castShadow position={[0, 0.165, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.05, 32]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Dais top */}
      <mesh position={[0, 0.192, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#FFFEF5" roughness={0.4} emissive="#f59e0b" emissiveIntensity={0.05} />
      </mesh>
      {/* Decorative ring */}
      <mesh position={[0, 0.193, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 32]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Inner ring */}
      <mesh position={[0, 0.194, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 32]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* LUDO text */}
      <Text
        position={[0, 0.195, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.12}
        color="#8B6914"
        anchorX="center"
        anchorY="middle"
      >
        LUDO
      </Text>
    </group>
  );
}

const CENTER_CODES = new Set(['CY', 'CB', 'CG', 'CR', 'CC']);

export function LudoBoard({ ludo, selectedTokenId, onSelectToken }: LudoBoardProps) {
  const cells = useMemo(() => buildBoardCells().filter((c) => !CENTER_CODES.has(c.code)), []);

  return (
    <group>
      {/* Wood frame */}
      <mesh receiveShadow castShadow position={[0, -0.06, 0]}>
        <boxGeometry args={[7.0, 0.14, 7.0]} />
        <meshStandardMaterial color="#8B6914" roughness={0.85} metalness={0.02} />
      </mesh>
      {/* Frame bevel/border */}
      <mesh receiveShadow castShadow position={[0, -0.01, 0]}>
        <boxGeometry args={[6.7, 0.04, 6.7]} />
        <meshStandardMaterial color="#A07D28" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Board backing */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[6.5, 6.5]} />
        <meshStandardMaterial color="#C9BFA8" roughness={0.9} />
      </mesh>

      {/* All grid cells */}
      {cells.map((cell) => (
        <BoardCellMesh key={`${cell.row}-${cell.col}`} {...cell} />
      ))}

      <CenterHub />

      {/* Tokens */}
      {ludo.tokens.map((token) => {
        if (token.location.kind === 'finished') return null;
        const pos = getTokenWorldPosition(token.location, token.color);
        const isSelectable = ludo.selectableTokenIds.includes(token.id);
        return (
          <LudoTokenMesh
            key={token.id}
            color={token.color}
            position={pos}
            isSelectable={isSelectable}
            isSelected={selectedTokenId === token.id}
            onClick={() => onSelectToken(token.id)}
          />
        );
      })}

      {ludo.tokens
        .filter((t) => t.location.kind === 'finished')
        .map((token, i) => {
          const pos = getTokenWorldPosition(token.location, token.color);
          return (
            <LudoTokenMesh
              key={token.id}
              color={token.color}
              position={[pos[0] + (i % 2) * 0.06, pos[1] + Math.floor(i / 2) * 0.05, pos[2]]}
              isSelectable={false}
              isSelected={false}
            />
          );
        })}

      {/* Player nameplates, floating beside each player's own base */}
      {ludo.players.map((player) => (
        <PlayerBaseLabel key={player.id} player={player} />
      ))}
    </group>
  );
}
