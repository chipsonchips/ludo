import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, MeshReflectorMaterial, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import { LUDO_COLORS } from '@/ludo/constants';
import type { LudoColor } from '@/ludo/types';

function FloatingDust() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 300;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20; // x
      pos[i * 3 + 1] = Math.random() * 10; // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.2;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#F6B73C" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

// Board footprint is ~7x7 units (frame corner-to-corner ~5); size the table/room to match.
const TABLE_RADIUS = 5.6;
// Board's wood frame bottoms out at y=-0.13 (see LudoBoard.tsx); the tabletop sits just beneath it.
const TABLE_TOP_Y = -0.16;
const TABLE_THICKNESS = 0.3;
const FLOOR_Y = -1.2;
const LEG_COUNT = 6;
const LEG_RADIUS = 0.16;
const LEG_INSET = 0.85; // legs sit inward from the table's rim

const TABLE_BOTTOM_Y = TABLE_TOP_Y - TABLE_THICKNESS;
const LEG_HEIGHT = TABLE_BOTTOM_Y - FLOOR_Y;
const LEG_CENTER_Y = TABLE_BOTTOM_Y - LEG_HEIGHT / 2;
const LEG_POSITION_RADIUS = TABLE_RADIUS * LEG_INSET;

// The room: four paneled walls, open to the night sky above.
// Camera maxDistance in GameScene must stay below ROOM_HALF so the view never clips through.
const ROOM_HALF = 15;
const WALL_HEIGHT = 8;
const CARPET_RADIUS = 9;

const GOLD = '#C9A84C';
const WALL_COLOR = '#332032';
const WAINSCOT_COLOR = '#3d281a';
const TRIM_DARK = '#1a0f0c';

/** Vintage-poster style portrait of a pawn, painted onto a canvas texture. */
function makePawnPortrait(color: LudoColor): THREE.CanvasTexture {
  const { hex, dark, label } = LUDO_COLORS[color];
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const g = c.getContext('2d')!;

  // Moody backdrop
  const bg = g.createLinearGradient(0, 0, 0, 320);
  bg.addColorStop(0, '#241a2c');
  bg.addColorStop(1, '#0e0a13');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 320);

  // Soft glow behind the pawn in its own color
  const glow = g.createRadialGradient(128, 160, 10, 128, 160, 140);
  glow.addColorStop(0, hex);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.28;
  g.fillStyle = glow;
  g.fillRect(0, 0, 256, 320);
  g.globalAlpha = 1;

  // Pawn silhouette
  g.fillStyle = hex;
  g.beginPath();
  g.arc(128, 108, 34, 0, Math.PI * 2); // head
  g.fill();
  g.beginPath(); // tapered body
  g.moveTo(112, 136);
  g.quadraticCurveTo(94, 196, 68, 238);
  g.lineTo(188, 238);
  g.quadraticCurveTo(162, 196, 144, 136);
  g.closePath();
  g.fill();
  g.beginPath(); // base
  g.ellipse(128, 242, 62, 17, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = dark;
  g.beginPath();
  g.ellipse(128, 248, 62, 15, 0, 0, Math.PI * 2);
  g.fill();

  // Specular highlight on the head
  g.globalAlpha = 0.3;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(116, 96, 12, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;

  // Caption
  g.fillStyle = GOLD;
  g.font = 'bold 20px Georgia, serif';
  g.textAlign = 'center';
  g.fillText(label.toUpperCase(), 128, 300);
  g.fillRect(64, 278, 128, 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Round parlor carpet: deep burgundy field, gold border rings, center medallion. */
function makeCarpetTexture(): THREE.CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  const cx = S / 2;

  // Field
  const field = g.createRadialGradient(cx, cx, 0, cx, cx, cx);
  field.addColorStop(0, '#6e2231');
  field.addColorStop(0.7, '#591a26');
  field.addColorStop(1, '#40131f');
  g.fillStyle = field;
  g.fillRect(0, 0, S, S);

  const ring = (r: number, w: number, color: string, alpha = 1) => {
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.arc(cx, cx, r, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  };

  // Border bands and inner guides
  ring(cx - 14, 6, GOLD, 0.9);
  ring(cx - 30, 14, '#2a0d15');
  ring(cx - 44, 3, GOLD, 0.6);
  ring(cx * 0.55, 2, GOLD, 0.35);
  ring(cx * 0.5, 8, '#2a0d15', 0.8);

  // Center medallion: eight-point star
  g.save();
  g.translate(cx, cx);
  g.globalAlpha = 0.55;
  g.fillStyle = GOLD;
  for (let i = 0; i < 8; i++) {
    g.rotate(Math.PI / 4);
    g.beginPath();
    g.moveTo(0, -90);
    g.lineTo(14, -22);
    g.lineTo(-14, -22);
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 0.8;
  g.beginPath();
  g.arc(0, 0, 20, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // Pile speckle so the weave doesn't read as flat plastic
  g.fillStyle = '#000000';
  for (let i = 0; i < 2600; i++) {
    g.globalAlpha = Math.random() * 0.08;
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Carpet() {
  const texture = useMemo(() => makeCarpetTexture(), []);
  return (
    <mesh receiveShadow position={[0, FLOOR_Y + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[CARPET_RADIUS, 64]} />
      <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
    </mesh>
  );
}

function WallPortrait({ color }: { color: LudoColor }) {
  const texture = useMemo(() => makePawnPortrait(color), [color]);
  return (
    <group position={[0, FLOOR_Y + 4.1, 0.16]}>
      {/* Outer wooden frame */}
      <mesh castShadow>
        <boxGeometry args={[2.35, 2.95, 0.12]} />
        <meshStandardMaterial color="#3a2414" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Gold fillet */}
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[2.08, 2.68, 0.13]} />
        <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.5} />
      </mesh>
      {/* The artwork */}
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[1.9, 2.5]} />
        <meshStandardMaterial map={texture} roughness={0.85} />
      </mesh>
      {/* Picture light bar above the frame */}
      <mesh position={[0, 1.62, 0.12]}>
        <boxGeometry args={[1.0, 0.07, 0.07]} />
        <meshStandardMaterial color={GOLD} emissive="#F6B73C" emissiveIntensity={0.9} roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Sconce({ x }: { x: number }) {
  return (
    <group position={[x, FLOOR_Y + 4.6, 0.14]}>
      <mesh>
        <cylinderGeometry args={[0.05, 0.08, 0.5, 12]} />
        <meshStandardMaterial color={GOLD} roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#FFE8B0" emissive="#F6B73C" emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

/**
 * One paneled wall, built facing +Z (toward the room center) and placed by yaw:
 * yaw 0 → back (-Z), PI/2 → left (-X), PI → front (+Z), -PI/2 → right (+X).
 */
function Wall({ yaw, portraitColor }: { yaw: number; portraitColor: LudoColor }) {
  const width = ROOM_HALF * 2 + 0.6;
  const pilasterXs = [-11, -5.5, 5.5, 11, -ROOM_HALF + 0.2, ROOM_HALF - 0.2];

  return (
    <group rotation={[0, yaw, 0]}>
      <group position={[0, 0, -ROOM_HALF]}>
        {/* Wall slab */}
        <mesh receiveShadow position={[0, FLOOR_Y + WALL_HEIGHT / 2, -0.15]}>
          <boxGeometry args={[width, WALL_HEIGHT, 0.3]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.9} metalness={0.02} />
        </mesh>

        {/* Wainscot band */}
        <mesh receiveShadow position={[0, FLOOR_Y + 0.95, 0.04]}>
          <boxGeometry args={[width, 1.9, 0.1]} />
          <meshStandardMaterial color={WAINSCOT_COLOR} roughness={0.75} metalness={0.04} />
        </mesh>
        {/* Chair rail */}
        <mesh position={[0, FLOOR_Y + 1.94, 0.08]}>
          <boxGeometry args={[width, 0.07, 0.08]} />
          <meshStandardMaterial color={GOLD} roughness={0.4} metalness={0.5} />
        </mesh>
        {/* Baseboard */}
        <mesh position={[0, FLOOR_Y + 0.14, 0.09]}>
          <boxGeometry args={[width, 0.28, 0.08]} />
          <meshStandardMaterial color={TRIM_DARK} roughness={0.8} />
        </mesh>
        {/* Crown strip along the top edge */}
        <mesh position={[0, FLOOR_Y + WALL_HEIGHT - 0.1, 0.06]}>
          <boxGeometry args={[width, 0.2, 0.12]} />
          <meshStandardMaterial color={WAINSCOT_COLOR} roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh position={[0, FLOOR_Y + WALL_HEIGHT - 0.24, 0.09]}>
          <boxGeometry args={[width, 0.05, 0.06]} />
          <meshStandardMaterial color={GOLD} roughness={0.4} metalness={0.5} />
        </mesh>

        {/* Pilasters */}
        {pilasterXs.map((x) => (
          <mesh key={x} receiveShadow position={[x, FLOOR_Y + WALL_HEIGHT / 2, 0.02]}>
            <boxGeometry args={[0.35, WALL_HEIGHT, 0.14]} />
            <meshStandardMaterial color={WAINSCOT_COLOR} roughness={0.75} metalness={0.04} />
          </mesh>
        ))}

        <WallPortrait color={portraitColor} />
        <Sconce x={-5.5} />
        <Sconce x={5.5} />
      </group>
    </group>
  );
}

function GameRoom() {
  return (
    <group>
      {/* Floor stretching to the walls */}
      <mesh receiveShadow position={[0, FLOOR_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_HALF * 2 + 2, ROOM_HALF * 2 + 2]} />
        <meshStandardMaterial color="#120b09" roughness={0.85} />
      </mesh>

      <Carpet />

      {/* Walls — each player color gets a portrait on one wall */}
      <Wall yaw={0} portraitColor="blue" />
      <Wall yaw={Math.PI / 2} portraitColor="yellow" />
      <Wall yaw={Math.PI} portraitColor="green" />
      <Wall yaw={-Math.PI / 2} portraitColor="red" />
    </group>
  );
}

/** Round wooden table the board rests on, with short stubby legs down to the floor. */
function RoundTable() {
  const legAngles = useMemo(
    () => Array.from({ length: LEG_COUNT }, (_, i) => (i / LEG_COUNT) * Math.PI * 2),
    [],
  );

  return (
    <group>
      {/* Wooden tabletop */}
      <mesh receiveShadow castShadow position={[0, TABLE_BOTTOM_Y + TABLE_THICKNESS / 2, 0]}>
        <cylinderGeometry args={[TABLE_RADIUS, TABLE_RADIUS, TABLE_THICKNESS, 64]} />
        <meshStandardMaterial color="#6b4226" roughness={0.4} metalness={0.1} />
      </mesh>

      {/* Gold edge trim so the rim reads clearly against the dark room */}
      <mesh position={[0, TABLE_TOP_Y + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[TABLE_RADIUS - 0.12, TABLE_RADIUS, 64]} />
        <meshStandardMaterial color={GOLD} roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Short legs */}
      {legAngles.map((angle) => (
        <mesh
          key={angle}
          receiveShadow
          castShadow
          position={[Math.cos(angle) * LEG_POSITION_RADIUS, LEG_CENTER_Y, Math.sin(angle) * LEG_POSITION_RADIUS]}
        >
          <cylinderGeometry args={[LEG_RADIUS, LEG_RADIUS * 1.1, LEG_HEIGHT, 16]} />
          <meshStandardMaterial color="#4a3018" roughness={0.5} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

export function LoungeEnvironment() {
  return (
    <group>
      {/* Isolated so a slow/failed HDRI load can never block the lights below from mounting */}
      <Suspense fallback={null}>
        <Environment preset="night" background backgroundIntensity={0.25} blur={0.6} />
      </Suspense>

      <GameRoom />

      <RoundTable />

      {/* Inlaid reflective glass, inset from the tabletop's wood rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TABLE_TOP_Y + 0.005, 0]}>
        <circleGeometry args={[TABLE_RADIUS - 0.3, 64]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={1024}
          mirror={0.9}
          mixBlur={1.5}
          mixStrength={50}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0A0812"
          metalness={0.6}
        />
      </mesh>

      {/* Ambient Lounge Lighting */}
      <ambientLight intensity={0.55} color="#ffffff" />
      <hemisphereLight args={['#5a6b9c', '#2a2118', 0.7]} />

      {/* Warm god ray spotlight above the table */}
      <SpotLight
        position={[0, 9, 0]}
        angle={0.6}
        penumbra={0.7}
        intensity={3.5}
        color="#F6B73C"
        castShadow
        shadow-mapSize={[2048, 2048]}
        distance={18}
        attenuation={5}
        anglePower={4}
        volumetric={true}
      />

      {/* Cool neon rim lights */}
      <pointLight position={[-7, 3, -7]} intensity={2.5} color="#3B82F6" distance={16} />
      <pointLight position={[7, 3, -7]} intensity={2.5} color="#22C55E" distance={16} />
      <pointLight position={[0, 2, 7]} intensity={1.8} color="#EF4444" distance={14} />
      {/* Warm wash so the walls and portraits read from across the room */}
      <pointLight position={[0, 5.5, 0]} intensity={2.4} color="#F6B73C" distance={34} decay={1.5} />
      {/* Wall-wash accents near each wall's portrait (physical falloff needs the high intensity) */}
      <pointLight position={[0, 4, -11.5]} intensity={9} color="#F2C877" distance={14} decay={2} />
      <pointLight position={[0, 4, 11.5]} intensity={9} color="#F2C877" distance={14} decay={2} />
      <pointLight position={[-11.5, 4, 0]} intensity={9} color="#F2C877" distance={14} decay={2} />
      <pointLight position={[11.5, 4, 0]} intensity={9} color="#F2C877" distance={14} decay={2} />

      {/* Ambient dust */}
      <FloatingDust />

      <fog attach="fog" args={['#0A0812', 20, 55]} />
    </group>
  );
}
