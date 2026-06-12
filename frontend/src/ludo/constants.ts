import type { LudoColor } from './types';
import { BOARD_GRID, MAIN_PATH, HOME_PATHS, SAFE_INDICES, SLOT_POSITIONS } from './boardGrid';

export const CELL_SIZE = 0.42;
export const BOARD_HALF = (15 * CELL_SIZE) / 2;

export const LUDO_COLORS: Record<LudoColor, { hex: string; dark: string; label: string }> = {
  yellow: { hex: '#FBC02D', dark: '#F9A825', label: 'Yellow' },
  blue: { hex: '#1565C0', dark: '#0D47A1', label: 'Blue' },
  green: { hex: '#2E7D32', dark: '#1B5E20', label: 'Green' },
  red: { hex: '#C62828', dark: '#B71C1C', label: 'Red' },
};

export const PLAYER_ORDER: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

export { MAIN_PATH, HOME_PATHS, BOARD_GRID };

export const START_INDEX: Record<LudoColor, number> = {
  yellow: 1,
  blue: 14,
  red: 27,
  green: 40,
};

export const SAFE_TRACK_INDICES = SAFE_INDICES;

export const BASE_SLOTS: Record<LudoColor, [number, number][]> = {
  yellow: SLOT_POSITIONS.yellow,
  blue: SLOT_POSITIONS.blue,
  green: SLOT_POSITIONS.green,
  red: SLOT_POSITIONS.red,
};

export const CENTER_CELLS: Record<LudoColor, [number, number]> = {
  yellow: [7, 6],
  blue: [6, 7],
  red: [7, 8],
  green: [8, 7],
};

/** Board center for dice rolling arena */
export const BOARD_CENTER: [number, number, number] = [0, 0.15, 0];
