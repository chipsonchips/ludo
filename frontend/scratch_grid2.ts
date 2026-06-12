import { BOARD_GRID } from './src/ludo/boardGrid';

for (let r = 0; r < 13; r++) {
  console.log(BOARD_GRID[r].map(c => c.padEnd(2)).join(' '));
}
