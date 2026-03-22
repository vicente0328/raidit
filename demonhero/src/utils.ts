import { BlockType, RoomData } from './types';

// Tower grid: 16 columns x 40 rows (vertical, larger map)
export const TOWER_COLS = 16;
export const TOWER_ROWS = 40;

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

  // Platforms at various heights
  for (let c = 3; c <= 8; c++) grid[34][c] = BlockType.WALL;
  for (let c = 8; c <= 13; c++) grid[28][c] = BlockType.WALL;
  for (let c = 2; c <= 7; c++) grid[22][c] = BlockType.WALL;
  for (let c = 7; c <= 13; c++) grid[16][c] = BlockType.WALL;
  for (let c = 3; c <= 9; c++) grid[10][c] = BlockType.WALL;
  for (let c = 4; c <= 11; c++) grid[5][c] = BlockType.WALL;

  // Top ceiling
  for (let c = 0; c < TOWER_COLS; c++) {
    grid[0][c] = BlockType.WALL;
  }

  // Spawn at bottom
  grid[TOWER_ROWS - 3][3] = BlockType.SPAWN;

  // Door at top
  grid[4][7] = BlockType.DOOR;

  return grid;
};
