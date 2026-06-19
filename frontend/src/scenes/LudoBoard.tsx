import { useMemo, useRef, useState, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
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

function cellStyle(code: RenderCell['code']): { color: string; height: number; y: number } {
  const white = '#FFFEF5';
  const cream = '#F5F0E8';

  if (code === 'W') return { color: white, height: 0.06, y: 0.08 };
  if (code === '*') return { color: white, height: 0.07, y: 0.09 };

  const ludoColor = codeToColor(code);
  if (ludoColor) {
    const isHome = code.startsWith('H');
    const isStart = code.startsWith('S');

    if (isHome) return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
    if (isStart) return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
    return { color: getColorHex(ludoColor), height: 0.07, y: 0.09 };
  }

  return { color: cream, height: 0.04, y: 0.06 };
}

function SafeZoneEffect() {
  const ringRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  return (
    <group ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[CELL_SIZE * 0.35, CELL_SIZE * 0.45, 32]} />
      <meshStandardMaterial color="#F6B73C" roughness={0.2} metalness={0.8} side={THREE.DoubleSide} transparent opacity={0.8} />
    </group>
  );
}

function BoardCellMesh({ row, col, code }: RenderCell) {
  const [x, , z] = gridToWorld(row, col, 0);
  const size = CELL_SIZE * 0.94;
  const { color, height, y } = cellStyle(code);

  return (
    <group position={[x, y, z]}>
      <mesh receiveShadow castShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[size, height, size]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Safe star */}
      {code === '*' && (
        <>
          <Text
            position={[0, height / 2 + 0.02, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.2}
            color="#F6B73C"
            anchorX="center"
            anchorY="middle"
          >
            ★
          </Text>
          <SafeZoneEffect />
        </>
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

function SolidBase({ color, centerRow, centerCol }: { color: LudoColor; centerRow: number; centerCol: number }) {
  const [x, , z] = gridToWorld(centerRow, centerCol, 0);
  const baseSize = 6 * CELL_SIZE;
  const innerSize = 4 * CELL_SIZE;
  const slotRadius = CELL_SIZE * 0.35;
  const slotOffset = 1.5 * CELL_SIZE;
  
  return (
    <group position={[x, 0, z]}>
      {/* Outer colored square */}
      <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
        <boxGeometry args={[baseSize * 0.98, 0.06, baseSize * 0.98]} />
        <meshStandardMaterial color={BASE_COLORS[color]} roughness={0.55} metalness={0.05} />
      </mesh>
      {/* Inner white square */}
      <mesh position={[0, 0.082, 0]} receiveShadow>
        <boxGeometry args={[innerSize, 0.06, innerSize]} />
        <meshStandardMaterial color="#FFFEF5" roughness={0.55} metalness={0.05} />
      </mesh>
      
      {/* 4 Token slots */}
      {[-1, 1].map((dx) =>
        [-1, 1].map((dz) => (
          <group key={`${dx}-${dz}`} position={[dx * slotOffset, 0.083, dz * slotOffset]}>
            {/* Slot background */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
              <circleGeometry args={[slotRadius, 32]} />
              <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.05} />
            </mesh>
            {/* Slot ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
              <ringGeometry args={[slotRadius * 0.7, slotRadius * 1.1, 32]} />
              <meshStandardMaterial color={BASE_COLORS[color]} roughness={0.3} metalness={0.2} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

function CenterTriangle({ color, rotation }: { color: string; rotation: number }) {
  const size = 1.5 * CELL_SIZE;
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-size, size);
    s.lineTo(size, size);
    s.lineTo(0, 0);
    s.lineTo(-size, size);
    return s;
  }, [size]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, rotation]} position={[0, 0.11, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
    </mesh>
  );
}

function CenterTrophy() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
      groupRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <group ref={groupRef} scale={1.5}>
      <mesh castShadow position={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.2, 0.2, 16]} />
        <meshStandardMaterial color="#F6B73C" roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.2, 0]}>
        <coneGeometry args={[0.35, 0.3, 16]} />
        <meshStandardMaterial color="#F6B73C" roughness={0.1} metalness={0.9} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshPhysicalMaterial color="#EF4444" roughness={0.1} transmission={0.9} thickness={0.5} clearcoat={1} />
      </mesh>
      <pointLight color="#F6B73C" intensity={1} distance={2} />
    </group>
  );
}

function CenterHome({ gameStarted }: { gameStarted: boolean }) {
  const [x, , z] = gridToWorld(7, 7, 0);
  return (
    <group position={[x, 0, z]}>
      <CenterTriangle color={BASE_COLORS.blue} rotation={0} />
      <CenterTriangle color={BASE_COLORS.red} rotation={-Math.PI / 2} />
      <CenterTriangle color={BASE_COLORS.green} rotation={Math.PI} />
      <CenterTriangle color={BASE_COLORS.yellow} rotation={Math.PI / 2} />

      {!gameStarted && <CenterTrophy />}
    </group>
  );
}

export function LudoBoard({ ludo, selectedTokenId, onSelectToken }: LudoBoardProps) {
  const [gameStarted, setGameStarted] = useState(false);
  useEffect(() => {
    if (!gameStarted && (ludo.isRolling || ludo.diceValues.length > 0 || ludo.phase !== 'roll')) {
      setGameStarted(true);
    }
  }, [ludo.isRolling, ludo.diceValues.length, ludo.phase, gameStarted]);

  const allCells = useMemo(() => buildBoardCells(), []);
  
  // Filter out base squares and center squares since they are now drawn solid
  const renderCells = useMemo(() => {
    return allCells.filter(cell => {
      // Filter out bases (6x6)
      if (cell.row < 6 && cell.col < 6) return false;
      if (cell.row < 6 && cell.col > 8) return false;
      if (cell.row > 8 && cell.col > 8) return false;
      if (cell.row > 8 && cell.col < 6) return false;
      // Filter out center hub (3x3)
      if (cell.row >= 6 && cell.row <= 8 && cell.col >= 6 && cell.col <= 8) return false;
      return true;
    });
  }, [allCells]);

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

      {/* Solid Bases */}
      <SolidBase color="yellow" centerRow={11.5} centerCol={2.5} />
      <SolidBase color="blue" centerRow={11.5} centerCol={11.5} />
      <SolidBase color="red" centerRow={2.5} centerCol={11.5} />
      <SolidBase color="green" centerRow={2.5} centerCol={2.5} />

      {/* Center Home */}
      <CenterHome gameStarted={gameStarted} />

      {/* Grid cells (paths) */}
      {renderCells.map((cell) => (
        <BoardCellMesh key={`${cell.row}-${cell.col}`} {...cell} />
      ))}

      {/* Center dice platform */}
      <mesh receiveShadow castShadow position={[0, 0.115, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.04, 32]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Center circle top */}
      <mesh position={[0, 0.135, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#FFFEF5" roughness={0.4} emissive="#f59e0b" emissiveIntensity={0.05} />
      </mesh>
      {/* Center decorative ring */}
      <mesh position={[0, 0.136, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.48, 32]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Inner ring */}
      <mesh position={[0, 0.137, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 32]} />
        <meshStandardMaterial color="#C9A84C" roughness={0.3} metalness={0.3} />
      </mesh>

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
