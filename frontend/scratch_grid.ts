import { CellCode } from './src/ludo/boardGrid';
type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

const SIZE = 15;
const grid: string[][] = Array.from({ length: SIZE }, () =>
  Array.from({ length: SIZE }, () => '.')
);

function set(row: number, col: number, code: string) {
  if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) grid[row][col] = code;
}

function fillBase(color: string, r0: number, c0: number, code: string, inner: string) {
  for (let r = r0; r < r0 + 6; r++) {
    for (let c = c0; c < c0 + 6; c++) {
      const edge = r === r0 || r === r0 + 5 || c === c0 || c === c0 + 5;
      set(r, c, edge ? code : inner);
    }
  }
  const slots: [number, number][] = [
    [r0 + 1, c0 + 1], [r0 + 1, c0 + 3],
    [r0 + 3, c0 + 1], [r0 + 3, c0 + 3],
  ];
  slots.forEach(([r, c]) => set(r, c, 's'));
}

fillBase('red', 0, 0, 'R', 'r');
fillBase('green', 0, 9, 'G', 'g');
fillBase('yellow', 9, 9, 'Y', 'y');
fillBase('blue', 9, 0, 'B', 'b');

const MAIN_PATH: [number, number][] = [
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0]
];

const SAFE_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

MAIN_PATH.forEach(([r, c], i) => {
  if (grid[r][c] === '.') set(r, c, SAFE_INDICES.has(i) ? '*' : 'W');
});

const START_CELLS: Record<string, [number, number]> = {
  red: MAIN_PATH[1],
  green: MAIN_PATH[14],
  yellow: MAIN_PATH[27],
  blue: MAIN_PATH[40],
};
Object.entries(START_CELLS).forEach(([color, [r, c]]) => {
  set(r, c, `S${color[0].toUpperCase()}`);
});

const HOME_PATHS: Record<string, [number, number][]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], // Left arm
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], // Top arm
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]], // Right arm
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], // Bottom arm
};
Object.entries(HOME_PATHS).forEach(([color, cells]) => {
  const prefix = `H${color[0].toUpperCase()}`;
  cells.forEach(([r, c]) => set(r, c, prefix));
});

set(6, 7, 'CG');
set(7, 8, 'CY');
set(8, 7, 'CB');
set(7, 6, 'CR');
set(7, 7, 'CC');

for (let r = 0; r < SIZE; r++) {
  console.log(grid[r].map(c => c.padEnd(2)).join(' '));
}
