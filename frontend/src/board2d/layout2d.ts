/**
 * Flat-table geometry: maps the shared 15x15 logical grid into SVG user units.
 *
 * The 3D scene maps `col → +x, row → -z` with the camera looking down -z, so
 * high rows read as "top of screen". SVG y grows downward, hence the
 * `(14 - row)` flip — both renderers must agree or the two boards would
 * mirror each other.
 */
import type { GameRules, LudoColor, TokenLocation } from '@/ludo/types';
import {
  BASE_SLOTS,
  CENTER_CELLS,
  HOME_PATHS,
  MAIN_PATH,
  START_INDEX,
} from '@/ludo/constants';
import { homeLaneColor } from '@shared/ludo/gameLogic';

/** SVG units per grid cell; the playfield is exactly 15 cells square. */
export const CELL = 40;
export const BOARD = CELL * 15;

export function cellCenter(row: number, col: number): [number, number] {
  return [(col + 0.5) * CELL, (14 - row + 0.5) * CELL];
}

/** Where a token sits on the flat board, in SVG units. */
export function tokenPoint2D(
  location: TokenLocation,
  color: LudoColor,
  rules: GameRules
): [number, number] {
  if (location.kind === 'base') {
    const [row, col] = BASE_SLOTS[color][location.slot];
    return cellCenter(row, col);
  }
  if (location.kind === 'track') {
    const globalIndex = (START_INDEX[color] + location.index) % MAIN_PATH.length;
    const [row, col] = MAIN_PATH[globalIndex];
    return cellCenter(row, col);
  }
  if (location.kind === 'home') {
    const lane = HOME_PATHS[homeLaneColor(color, rules)];
    const [row, col] = lane[location.index];
    return cellCenter(row, col);
  }
  const [row, col] = CENTER_CELLS[homeLaneColor(color, rules)];
  return cellCenter(row, col);
}

/** Stable key for "which cell is this token on" — used to fan out stacks. */
export function locationKey(location: TokenLocation, color: LudoColor, rules: GameRules): string {
  const [x, y] = tokenPoint2D(location, color, rules);
  return `${x}:${y}`;
}

/** Unit direction from board center toward each house's finished-token rack. */
export const LANE_DIRECTION: Record<LudoColor, [number, number]> = {
  yellow: [-1, 0], // left arm
  blue: [0, -1], // top arm
  red: [1, 0], // right arm
  green: [0, 1], // bottom arm
};

/** The 6x6 base quadrant of each house, as an SVG-space bounding box. */
export const POD_BOUNDS: Record<LudoColor, { x: number; y: number; w: number; h: number }> = {
  yellow: { x: 0, y: 0, w: 6 * CELL, h: 6 * CELL }, // top-left
  blue: { x: 9 * CELL, y: 0, w: 6 * CELL, h: 6 * CELL }, // top-right
  green: { x: 0, y: 9 * CELL, w: 6 * CELL, h: 6 * CELL }, // bottom-left
  red: { x: 9 * CELL, y: 9 * CELL, w: 6 * CELL, h: 6 * CELL }, // bottom-right
};

/** Direction of travel leaving each start square, as an SVG-space angle (deg). */
export const START_HEADING_DEG: Record<LudoColor, number> = {
  yellow: 0, // moving right along the left arm's top row... (row 8, cols 0→5)
  blue: 90, // moving down the top arm's right column
  red: 180, // moving left along the right arm's bottom row
  green: -90, // moving up the bottom arm's left column
};
