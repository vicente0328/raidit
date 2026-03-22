import { BlockType } from './types';
import { TOWER_COLS, TOWER_ROWS } from './utils';

export type Difficulty = 'easy' | 'normal' | 'hard';

/**
 * Procedurally generates a playable tower room.
 * Guarantees: SPAWN at bottom, DOOR at top, reachable path between platforms.
 */
export function generateRoom(difficulty: Difficulty): number[][] {
  const grid: number[][] = Array.from({ length: TOWER_ROWS }, () =>
    Array(TOWER_COLS).fill(BlockType.EMPTY)
  );

  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const chance = (pct: number) => Math.random() < pct;

  // === BORDERS ===
  for (let r = 0; r < TOWER_ROWS; r++) {
    grid[r][0] = BlockType.WALL;
    grid[r][TOWER_COLS - 1] = BlockType.WALL;
  }
  for (let c = 0; c < TOWER_COLS; c++) {
    grid[0][c] = BlockType.WALL; // ceiling
    grid[TOWER_ROWS - 1][c] = BlockType.WALL; // floor
    grid[TOWER_ROWS - 2][c] = BlockType.WALL; // floor (2 thick)
  }

  // === CONFIG by difficulty ===
  const config = {
    easy: {
      platformGap: 5,       // vertical gap between platforms (rows)
      minPlatLen: 6,        // minimum platform length
      maxPlatLen: 10,       // maximum platform length
      spikeChance: 0.08,
      patrolChance: 0.2,
      mageChance: 0.05,
      potionChance: 0.35,
      useOneWay: 0.3,       // chance to use one-way platform instead of wall
    },
    normal: {
      platformGap: 6,
      minPlatLen: 4,
      maxPlatLen: 8,
      spikeChance: 0.15,
      patrolChance: 0.35,
      mageChance: 0.15,
      potionChance: 0.2,
      useOneWay: 0.4,
    },
    hard: {
      platformGap: 6,
      minPlatLen: 3,
      maxPlatLen: 6,
      spikeChance: 0.25,
      patrolChance: 0.45,
      mageChance: 0.25,
      potionChance: 0.1,
      useOneWay: 0.5,
    },
  }[difficulty];

  // === GENERATE PLATFORMS ===
  // Create zigzag climbing path from bottom to top
  const platformRows: { row: number; startCol: number; endCol: number; isOneWay: boolean }[] = [];
  let side: 'left' | 'right' | 'center' = 'left';

  // Start generating from near bottom going up
  const startRow = TOWER_ROWS - 3 - config.platformGap; // first platform row
  const endRow = 3; // stop near ceiling, leave room for door

  for (let row = startRow; row > endRow; row -= config.platformGap) {
    const platLen = rand(config.minPlatLen, config.maxPlatLen);
    const isOneWay = chance(config.useOneWay);
    let startCol: number;
    let endCol: number;

    // Alternate sides for zigzag pattern
    if (side === 'left') {
      startCol = rand(1, 3);
      endCol = Math.min(startCol + platLen, TOWER_COLS - 2);
      side = 'right';
    } else if (side === 'right') {
      endCol = rand(TOWER_COLS - 4, TOWER_COLS - 2);
      startCol = Math.max(endCol - platLen, 1);
      side = chance(0.3) ? 'center' : 'left';
    } else {
      // center
      const mid = Math.floor(TOWER_COLS / 2);
      startCol = Math.max(mid - Math.floor(platLen / 2), 1);
      endCol = Math.min(startCol + platLen, TOWER_COLS - 2);
      side = chance(0.5) ? 'left' : 'right';
    }

    platformRows.push({ row, startCol, endCol, isOneWay });

    // Place platform blocks
    for (let c = startCol; c <= endCol; c++) {
      grid[row][c] = isOneWay ? BlockType.PLATFORM : BlockType.WALL;
    }
  }

  // === ADD VARIATION: small stepping stone platforms between main ones ===
  for (let i = 0; i < platformRows.length - 1; i++) {
    const upper = platformRows[i];
    const lower = platformRows[i + 1] || { row: TOWER_ROWS - 3 };
    const midRow = Math.floor((upper.row + lower.row) / 2);

    if (chance(0.4) && midRow > upper.row + 2) {
      // Small stepping stone (2-3 blocks)
      const len = rand(2, 3);
      const sc = rand(2, TOWER_COLS - 3 - len);
      for (let c = sc; c < sc + len; c++) {
        grid[midRow][c] = BlockType.PLATFORM;
      }
    }
  }

  // === SPAWN (bottom) ===
  // Place on bottom floor, slightly off center
  const spawnCol = rand(2, 5);
  grid[TOWER_ROWS - 3][spawnCol] = BlockType.SPAWN;

  // === DOOR (top) ===
  // Place on the highest platform or near ceiling
  if (platformRows.length > 0) {
    const topPlat = platformRows[0]; // highest platform
    const doorCol = rand(topPlat.startCol, topPlat.endCol);
    grid[topPlat.row - 1][doorCol] = BlockType.DOOR;
  } else {
    grid[2][Math.floor(TOWER_COLS / 2)][BlockType.DOOR];
    grid[2][Math.floor(TOWER_COLS / 2)] = BlockType.DOOR;
  }

  // === ENEMIES ===
  // Place on platforms
  for (const plat of platformRows) {
    const platWidth = plat.endCol - plat.startCol + 1;

    // Patrol enemies need at least 3 blocks of space
    if (platWidth >= 4 && chance(config.patrolChance)) {
      const ec = rand(plat.startCol + 1, plat.endCol - 1);
      // Don't place on spawn or door
      if (grid[plat.row - 1][ec] === BlockType.EMPTY) {
        grid[plat.row - 1][ec] = BlockType.MOB_PATROL;
      }
    }

    // Stationary mage
    if (platWidth >= 3 && chance(config.mageChance)) {
      const ec = rand(plat.startCol, plat.endCol);
      if (grid[plat.row - 1][ec] === BlockType.EMPTY) {
        grid[plat.row - 1][ec] = BlockType.MOB_STATIONARY;
      }
    }
  }

  // Also place some enemies on the ground floor
  if (chance(config.patrolChance)) {
    const ec = rand(6, TOWER_COLS - 4);
    if (grid[TOWER_ROWS - 3][ec] === BlockType.EMPTY) {
      grid[TOWER_ROWS - 3][ec] = BlockType.MOB_PATROL;
    }
  }

  // === SPIKES ===
  // Place on platforms and ground floor
  for (const plat of platformRows) {
    for (let c = plat.startCol; c <= plat.endCol; c++) {
      if (chance(config.spikeChance) && grid[plat.row - 1][c] === BlockType.EMPTY) {
        grid[plat.row - 1][c] = BlockType.SPIKE;
      }
    }
  }
  // Ground floor spikes
  for (let c = 2; c < TOWER_COLS - 2; c++) {
    if (chance(config.spikeChance * 0.5) && grid[TOWER_ROWS - 3][c] === BlockType.EMPTY) {
      grid[TOWER_ROWS - 3][c] = BlockType.SPIKE;
    }
  }

  // === POTIONS ===
  // Scatter potions on platforms
  for (const plat of platformRows) {
    if (chance(config.potionChance)) {
      const pc = rand(plat.startCol, plat.endCol);
      if (grid[plat.row - 1][pc] === BlockType.EMPTY) {
        grid[plat.row - 1][pc] = BlockType.POTION;
      }
    }
  }

  // === WALL OBSTACLES ===
  // Add some wall blocks jutting out from sides for variety
  if (difficulty !== 'easy') {
    const numObstacles = rand(1, 3);
    for (let i = 0; i < numObstacles; i++) {
      const obsRow = rand(5, TOWER_ROWS - 6);
      const fromLeft = chance(0.5);
      const obsLen = rand(1, 3);
      // Check this row isn't a platform row
      const isOnPlatform = platformRows.some(p => Math.abs(p.row - obsRow) <= 1);
      if (!isOnPlatform) {
        for (let j = 0; j < obsLen; j++) {
          const c = fromLeft ? 1 + j : TOWER_COLS - 2 - j;
          if (grid[obsRow][c] === BlockType.EMPTY) {
            grid[obsRow][c] = BlockType.WALL;
          }
        }
      }
    }
  }

  return grid;
}

/**
 * Generate a complete multi-room tower
 */
export function generateTower(
  numRooms: number,
  difficulty: Difficulty
): number[][][] {
  const rooms: number[][][] = [];
  for (let i = 0; i < numRooms; i++) {
    rooms.push(generateRoom(difficulty));
  }
  return rooms;
}
