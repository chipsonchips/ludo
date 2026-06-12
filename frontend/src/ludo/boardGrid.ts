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

// ── Corner bases (6×6) ──────────────────────────────────────────
function fillBase(_color: LudoColor, r0: number, c0: number, code: 'Y' | 'B' | 'G' | 'R', inner: 'y' | 'b' | 'g' | 'r') {
  for (let r = r0; r < r0 + 6; r++) {
    for (let c = c0; c < c0 + 6; c++) {
      const edge = r === r0 || r === r0 + 5 || c === c0 || c === c0 + 5;
      set(r, c, edge ? code : inner);
    }
  }
  // Token slots (2×2 grid inside base)
  const slots: [number, number][] = [
    [r0 + 1, c0 + 1], [r0 + 1, c0 + 3],
    [r0 + 3, c0 + 1], [r0 + 3, c0 + 3],
  ];
  slots.forEach(([r, c]) => set(r, c, 's'));
}

fillBase('blue', 0, 0, 'B', 'b'); // Visual Bottom-Left
fillBase('yellow', 0, 9, 'Y', 'y'); // Visual Bottom-Right
fillBase('red', 9, 0, 'R', 'r'); // Visual Top-Left
fillBase('green', 9, 9, 'G', 'g'); // Visual Top-Right

// ── Main path (52 cells) ────────────────────────────────────────
const MAIN_PATH: [number, number][] = [
  // Visual Left arm, Top row (moving right)
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  // Visual Top arm, Left col (moving up)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  // Visual Top arm, Top row (moving right)
  [14, 7], [14, 8],
  // Visual Top arm, Right col (moving down)
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  // Visual Right arm, Top row (moving right)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  // Visual Right arm, Right col (moving down)
  [7, 14], [6, 14],
  // Visual Right arm, Bottom row (moving left)
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  // Visual Bottom arm, Right col (moving down)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  // Visual Bottom arm, Bottom row (moving left)
  [0, 7], [0, 6],
  // Visual Bottom arm, Left col (moving up)
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // Visual Left arm, Bottom row (moving left)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  // Visual Left arm, Left col (moving up)
  [7, 0]
];

const SAFE_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

MAIN_PATH.forEach(([r, c], i) => {
  if (grid[r][c] === '.') set(r, c, SAFE_INDICES.has(i) ? '*' : 'W');
});

// ── Colored start squares ───────────────────────────────────────
const START_CELLS: Record<LudoColor, [number, number]> = {
  red: MAIN_PATH[1],
  green: MAIN_PATH[14],
  yellow: MAIN_PATH[27],
  blue: MAIN_PATH[40],
};
(Object.entries(START_CELLS) as [LudoColor, [number, number]][]).forEach(([color, [r, c]]) => {
  set(r, c, `S${color[0].toUpperCase()}` as CellCode);
});

// ── Home columns (5 cells each) ───────────────────────────────
const HOME_PATHS: Record<LudoColor, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // Left arm
  green: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // Top arm
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Right arm
  blue: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], // Bottom arm
};

(Object.entries(HOME_PATHS) as [LudoColor, [number, number][]][]).forEach(([color, cells]) => {
  const prefix = `H${color[0].toUpperCase()}` as CellCode;
  cells.forEach(([r, c]) => set(r, c, prefix));
});

// ── Center hub (2×2 + triangles) ────────────────────────────────
set(8, 7, 'CG');
set(7, 8, 'CY');
set(6, 7, 'CB');
set(7, 6, 'CR');
set(7, 7, 'CC');

// Fill remaining cross arms (white) between path columns
for (let r = 6; r <= 8; r++) {
  for (let c = 6; c <= 8; c++) {
    if (grid[r][c] === '.') set(r, c, 'W');
  }
}
// Vertical arm white cells flanking home columns
for (let r = 1; r <= 5; r++) {
  if (grid[r][6] === '.') set(r, 6, 'W');
  if (grid[r][8] === '.') set(r, 8, 'W');
}
for (let c = 1; c <= 5; c++) {
  if (grid[6][c] === '.') set(6, c, 'W');
  if (grid[8][c] === '.') set(8, c, 'W');
}
for (let r = 9; r <= 13; r++) {
  if (grid[r][6] === '.') set(r, 6, 'W');
  if (grid[r][8] === '.') set(r, 8, 'W');
}
for (let c = 9; c <= 13; c++) {
  if (grid[6][c] === '.') set(6, c, 'W');
  if (grid[8][c] === '.') set(8, c, 'W');
}

export const BOARD_GRID = grid;

export const SLOT_POSITIONS: Record<LudoColor, [number, number][]> = {
  blue: [[1, 1], [1, 3], [3, 1], [3, 3]],
  yellow: [[1, 10], [1, 12], [3, 10], [3, 12]],
  red: [[10, 1], [10, 3], [12, 1], [12, 3]],
  green: [[10, 10], [10, 12], [12, 10], [12, 12]],
};

export { MAIN_PATH, HOME_PATHS, SAFE_INDICES, START_CELLS };
