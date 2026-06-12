import { useMemo } from 'react';
import { Text } from '@react-three/drei';
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
    const isCenter = code === 'CY' || code === 'CB' || code === 'CG' || code === 'CR';
    const isStart = code.startsWith('S');
    const isBaseEdge = code.length === 1; // Y, B, G, R
    const isBaseInner = code === 'y' || code === 'b' || code === 'g' || code === 'r';

    if (isBaseEdge) return { color: BASE_COLORS[ludoColor], height: 0.06, y: 0.08 };
    if (isBaseInner) return { color: BASE_INNER_COLORS[ludoColor], height: 0.05, y: 0.07 };
    if (isCenter) return { color: BASE_COLORS[ludoColor], height: 0.10, y: 0.12 };
    if (isHome) return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
    if (isStart) return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
    return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
  }

  return { color: cream, height: 0.04, y: 0.06 };
}

function BOARD_CORNER_COLOR(row: number, col: number): LudoColor {
  if (row < 6 && col < 6) return 'yellow';
  if (row < 6 && col > 8) return 'blue';
  if (row > 8 && col < 6) return 'green';
  return 'red';
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
      {/* Start arrow */}
      {(code === 'SY' || code === 'SB' || code === 'SG' || code === 'SR') && (
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
      )}
    </group>
  );
}

export function LudoBoard({ ludo, selectedTokenId, onSelectToken }: LudoBoardProps) {
  const cells = useMemo(() => buildBoardCells(), []);

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
        <meshStandardMaterial color="#2a1810" roughness={0.9} />
      </mesh>

      {/* All grid cells */}
      {cells.map((cell) => (
        <BoardCellMesh key={`${cell.row}-${cell.col}`} {...cell} />
      ))}

      {/* Center dice platform */}
      <mesh receiveShadow castShadow position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.04, 32]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Center circle top */}
      <mesh position={[0, 0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#FFFEF5" roughness={0.4} emissive="#f59e0b" emissiveIntensity={0.05} />
      </mesh>
      {/* Center decorative ring */}
      <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 32]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Inner ring */}
      <mesh position={[0, 0.146, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 32]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Center LUDO text */}
      <Text
        position={[0, 0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.12}
        color="#8B6914"
        anchorX="center"
        anchorY="middle"
      >
        LUDO
      </Text>

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
    </group>
  );
}
