import type { LudoColor, TokenLocation } from './types';
import {
  BASE_SLOTS,
  CENTER_CELLS,
  CELL_SIZE,
  HOME_PATHS,
  LUDO_COLORS,
  MAIN_PATH,
  START_INDEX,
} from './constants';
import { BOARD_GRID, type CellCode } from './boardGrid';

export interface RenderCell {
  row: number;
  col: number;
  code: CellCode;
}

const CODE_COLOR: Partial<Record<CellCode, LudoColor>> = {
  Y: 'yellow', y: 'yellow', SY: 'yellow', HY: 'yellow', CY: 'yellow',
  B: 'blue', b: 'blue', SB: 'blue', HB: 'blue', CB: 'blue',
  G: 'green', g: 'green', SG: 'green', HG: 'green', CG: 'green',
  R: 'red', r: 'red', SR: 'red', HR: 'red', CR: 'red',
};

export function buildBoardCells(): RenderCell[] {
  const cells: RenderCell[] = [];
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      const code = BOARD_GRID[row][col];
      if (code !== '.') cells.push({ row, col, code });
    }
  }
  return cells;
}

export function gridToWorld(row: number, col: number, y = 0.14): [number, number, number] {
  const x = (col - 7) * CELL_SIZE;
  const z = (7 - row) * CELL_SIZE;
  return [x, y, z];
}

// Token group origin is the pawn's base (its bottom face), so these must match
// each cell type's actual top surface height in LudoBoard's cellStyle(), or the
// pawn visibly floats above the board instead of resting on it.
const BASE_SLOT_Y = 0.095; // 's' slot cells
const TRACK_Y = 0.11; // 'W' path cells (safe-star cells sit ~0.015 higher, close enough)
const HOME_LANE_Y = 0.125; // 'H*' cells
const CENTER_HUB_Y = 0.19; // dais top, matches BOARD_CENTER

export function getTokenWorldPosition(location: TokenLocation, color: LudoColor): [number, number, number] {
  if (location.kind === 'base') {
    const [row, col] = BASE_SLOTS[color][location.slot];
    return gridToWorld(row, col, BASE_SLOT_Y);
  }
  if (location.kind === 'track') {
    const globalIndex = (START_INDEX[color] + location.index) % MAIN_PATH.length;
    const [row, col] = MAIN_PATH[globalIndex];
    return gridToWorld(row, col, TRACK_Y);
  }
  if (location.kind === 'home') {
    const [row, col] = HOME_PATHS[color][location.index];
    return gridToWorld(row, col, HOME_LANE_Y);
  }
  const [row, col] = CENTER_CELLS[color];
  return gridToWorld(row, col, CENTER_HUB_Y);
}

export function getColorHex(color: LudoColor): string {
  return LUDO_COLORS[color].hex;
}

export function getColorDark(color: LudoColor): string {
  return LUDO_COLORS[color].dark;
}

export function codeToColor(code: CellCode): LudoColor | null {
  return CODE_COLOR[code] ?? null;
}

export { CELL_SIZE, LUDO_COLORS, MAIN_PATH, START_INDEX };
