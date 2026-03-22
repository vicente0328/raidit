import { BlockType, RoomData } from './types';

export const createEmptyGrid = (cols = 20, rows = 12) => {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
};

export const createFloorGrid = () => {
  const grid = createEmptyGrid();
  for (let c = 0; c < 20; c++) {
    grid[11][c] = 1;
    grid[10][c] = 1;
  }
  for (let r = 0; r < 12; r++) {
    grid[r][0] = 1;
    grid[r][19] = 1;
  }
  grid[9][2] = 7; // Spawn
  grid[9][17] = 6; // Door
  return grid;
};
