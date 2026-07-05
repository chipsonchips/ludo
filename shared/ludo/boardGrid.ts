import type { LudoColor } from './types';

export type CellCode =
  | '.'
  | 'W'
  | '*'
  | 'Y' | 'B' | 'G' | 'R'
  | 'y' | 'b' | 'g' | 'r'
  | 's'
  | 'HY' | 'HB' | 'HG' | 'HR'
  | 'SY' | 'SB' | 'SG' | 'SR'
  | 'CY' | 'CB' | 'CG' | 'CR'
  | 'CC';

const SIZE = 15;
const grid: CellCode[][] = Array.from({ length: SIZE }, () =>
  Array.from({ length: SIZE }, () => '.' as CellCode)
);

function set(row: number, col: number, code: CellCode) {
  if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) grid[row][col] = code;
}

// ── Corner bases (logical 6x6, rendering is done as solid meshes in LudoBoard)
function fillBase(_color: LudoColor, r0: number, c0: number, code: 'Y' | 'B' | 'G' | 'R', inner: 'y' | 'b' | 'g' | 'r') {
  for (let r = r0; r < r0 + 6; r++) {
    for (let c = c0; c < c0 + 6; c++) {
      const edge = r === r0 || r === r0 + 5 || c === c0 || c === c0 + 5;
      set(r, c, edge ? code : inner);
    }
  }
}

// Mapped correctly for Three.js visual orientation (+Z is Bottom, +X is Right)
fillBase('yellow', 9, 0, 'Y', 'y'); // Visually Top-Left (-X, -Z)
fillBase('blue', 9, 9, 'B', 'b'); // Visually Top-Right (+X, -Z)
fillBase('red', 0, 9, 'R', 'r'); // Visually Bottom-Right (+X, +Z)
fillBase('green', 0, 0, 'G', 'g'); // Visually Bottom-Left (-X, +Z)

// ── Main path (52 cells, Clockwise) ──────────────────────────────
const MAIN_PATH: [number, number][] = [
  // Visual Left arm, top row (moving right)
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  // Visual Top arm, left col (moving up / -Z)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  // Visual Top edge
  [14, 7],
  // Visual Top arm, right col (moving down / +Z)
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  // Visual Right arm, top row (moving right)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  // Visual Right edge
  [7, 14],
  // Visual Right arm, bottom row (moving left)
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  // Visual Bottom arm, right col (moving down / +Z)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  // Visual Bottom edge
  [0, 7],
  // Visual Bottom arm, left col (moving up / -Z)
  [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // Visual Left arm, bottom row (moving left)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  // Visual Left edge
  [7, 0]
];

const SAFE_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

MAIN_PATH.forEach(([r, c], i) => {
  if (grid[r][c] === '.') set(r, c, SAFE_INDICES.has(i) ? '*' : 'W');
});

// ── Colored start squares ───────────────────────────────────────
const START_CELLS: Record<LudoColor, [number, number]> = {
  yellow: MAIN_PATH[1],
  blue: MAIN_PATH[14],
  red: MAIN_PATH[27],
  green: MAIN_PATH[40],
};
(Object.entries(START_CELLS) as [LudoColor, [number, number]][]).forEach(([color, [r, c]]) => {
  set(r, c, `S${color[0].toUpperCase()}` as CellCode);
});

// ── Home columns (5 cells each) ───────────────────────────────
const HOME_PATHS: Record<LudoColor, [number, number][]> = {
  yellow: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // Visual Left arm
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // Visual Top arm
  red: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Visual Right arm
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], // Visual Bottom arm
};

(Object.entries(HOME_PATHS) as [LudoColor, [number, number][]][]).forEach(([color, cells]) => {
  const prefix = `H${color[0].toUpperCase()}` as CellCode;
  cells.forEach(([r, c]) => set(r, c, prefix));
});

// ── Center hub (logical cells) ──────────────────────────────────
set(7, 6, 'CY'); // Left
set(8, 7, 'CB'); // Top (Visually Top is row 8... wait, row 8 is above row 7? No, row > 7 is Top!)
// Let's ensure center logical mappings are roughly correct, they are ignored in rendering anyway
set(7, 8, 'CR'); // Right
set(6, 7, 'CG'); // Bottom
set(7, 7, 'CC'); // Center

export const BOARD_GRID = grid;

export const SLOT_POSITIONS: Record<LudoColor, [number, number][]> = {
  yellow: [[10, 1], [10, 4], [13, 1], [13, 4]], // Top-Left visually
  blue: [[10, 10], [10, 13], [13, 10], [13, 13]], // Top-Right visually
  red: [[1, 10], [1, 13], [4, 10], [4, 13]], // Bottom-Right visually
  green: [[1, 1], [1, 4], [4, 1], [4, 4]], // Bottom-Left visually
};

export { MAIN_PATH, HOME_PATHS, SAFE_INDICES, START_CELLS };
