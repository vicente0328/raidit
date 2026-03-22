import { BlockType, RoomData } from './types';

// Tower grid: 10 columns x 25 rows (vertical)
export const TOWER_COLS = 10;
export const TOWER_ROWS = 25;

export const createEmptyGrid = (cols = TOWER_COLS, rows = TOWER_ROWS) => {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
};

export const createFloorGrid = () => {
  const grid = createEmptyGrid();

  // Left and right walls
  for (let r = 0; r < TOWER_ROWS; r++) {
    grid[r][0] = BlockType.WALL;
    grid[r][TOWER_COLS - 1] = BlockType.WALL;
  }

  // Bottom floor (2 rows thick)
  for (let c = 0; c < TOWER_COLS; c++) {
    grid[TOWER_ROWS - 1][c] = BlockType.WALL;
    grid[TOWER_ROWS - 2][c] = BlockType.WALL;
  }

  // Platforms at various heights (MapleStory tower style)
  // Platform row 20 (near bottom)
  for (let c = 2; c <= 5; c++) grid[20][c] = BlockType.WALL;

  // Platform row 16
  for (let c = 4; c <= 8; c++) grid[16][c] = BlockType.WALL;

  // Platform row 12
  for (let c = 1; c <= 5; c++) grid[12][c] = BlockType.WALL;

  // Platform row 8
  for (let c = 4; c <= 8; c++) grid[8][c] = BlockType.WALL;

  // Platform row 4 (near top)
  for (let c = 2; c <= 6; c++) grid[4][c] = BlockType.WALL;

  // Top ceiling
  for (let c = 0; c < TOWER_COLS; c++) {
    grid[0][c] = BlockType.WALL;
  }

  // Spawn at bottom
  grid[TOWER_ROWS - 3][2] = BlockType.SPAWN;

  // Door at top
  grid[3][4] = BlockType.DOOR;

  return grid;
};
