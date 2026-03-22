import { BlockType, MapOrientation } from './types';
import { TOWER_COLS, TOWER_ROWS, HORIZ_COLS, HORIZ_ROWS } from './utils';

export type Difficulty = 'easy' | 'normal' | 'hard';

/**
 * Procedurally generates a playable vertical tower room.
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
      platformGap: 5,
      minPlatLen: 6,
      maxPlatLen: 10,
      spikeChance: 0.08,
      patrolChance: 0.2,
      mageChance: 0.05,
      potionChance: 0.35,
      useOneWay: 0.3,
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
  const platformRows: { row: number; startCol: number; endCol: number; isOneWay: boolean }[] = [];
  let side: 'left' | 'right' | 'center' = 'left';

  const startRow = TOWER_ROWS - 3 - config.platformGap;
  const endRow = 3;

  for (let row = startRow; row > endRow; row -= config.platformGap) {
    const platLen = rand(config.minPlatLen, config.maxPlatLen);
    const isOneWay = chance(config.useOneWay);
    let startCol: number;
    let endCol: number;

    if (side === 'left') {
      startCol = rand(1, 3);
      endCol = Math.min(startCol + platLen, TOWER_COLS - 2);
      side = 'right';
    } else if (side === 'right') {
      endCol = rand(TOWER_COLS - 4, TOWER_COLS - 2);
      startCol = Math.max(endCol - platLen, 1);
      side = chance(0.3) ? 'center' : 'left';
    } else {
      const mid = Math.floor(TOWER_COLS / 2);
      startCol = Math.max(mid - Math.floor(platLen / 2), 1);
      endCol = Math.min(startCol + platLen, TOWER_COLS - 2);
      side = chance(0.5) ? 'left' : 'right';
    }

    platformRows.push({ row, startCol, endCol, isOneWay });

    for (let c = startCol; c <= endCol; c++) {
      grid[row][c] = isOneWay ? BlockType.PLATFORM : BlockType.WALL;
    }
  }

  // Stepping stones between main platforms
  for (let i = 0; i < platformRows.length - 1; i++) {
    const upper = platformRows[i];
    const lower = platformRows[i + 1] || { row: TOWER_ROWS - 3 };
    const midRow = Math.floor((upper.row + lower.row) / 2);

    if (chance(0.4) && midRow > upper.row + 2) {
      const len = rand(2, 3);
      const sc = rand(2, TOWER_COLS - 3 - len);
      for (let c = sc; c < sc + len; c++) {
        grid[midRow][c] = BlockType.PLATFORM;
      }
    }
  }

  // SPAWN
  const spawnCol = rand(2, 5);
  grid[TOWER_ROWS - 3][spawnCol] = BlockType.SPAWN;

  // DOOR
  if (platformRows.length > 0) {
    const topPlat = platformRows[0];
    const doorCol = rand(topPlat.startCol, topPlat.endCol);
    grid[topPlat.row - 1][doorCol] = BlockType.DOOR;
  } else {
    grid[2][Math.floor(TOWER_COLS / 2)] = BlockType.DOOR;
  }

  // ENEMIES
  for (const plat of platformRows) {
    const platWidth = plat.endCol - plat.startCol + 1;
    if (platWidth >= 4 && chance(config.patrolChance)) {
      const ec = rand(plat.startCol + 1, plat.endCol - 1);
      if (grid[plat.row - 1][ec] === BlockType.EMPTY) {
        grid[plat.row - 1][ec] = BlockType.MOB_PATROL;
      }
    }
    if (platWidth >= 3 && chance(config.mageChance)) {
      const ec = rand(plat.startCol, plat.endCol);
      if (grid[plat.row - 1][ec] === BlockType.EMPTY) {
        grid[plat.row - 1][ec] = BlockType.MOB_STATIONARY;
      }
    }
  }
  if (chance(config.patrolChance)) {
    const ec = rand(6, TOWER_COLS - 4);
    if (grid[TOWER_ROWS - 3][ec] === BlockType.EMPTY) {
      grid[TOWER_ROWS - 3][ec] = BlockType.MOB_PATROL;
    }
  }

  // SPIKES
  for (const plat of platformRows) {
    for (let c = plat.startCol; c <= plat.endCol; c++) {
      if (chance(config.spikeChance) && grid[plat.row - 1][c] === BlockType.EMPTY) {
        grid[plat.row - 1][c] = BlockType.SPIKE;
      }
    }
  }
  for (let c = 2; c < TOWER_COLS - 2; c++) {
    if (chance(config.spikeChance * 0.5) && grid[TOWER_ROWS - 3][c] === BlockType.EMPTY) {
      grid[TOWER_ROWS - 3][c] = BlockType.SPIKE;
    }
  }

  // POTIONS
  for (const plat of platformRows) {
    if (chance(config.potionChance)) {
      const pc = rand(plat.startCol, plat.endCol);
      if (grid[plat.row - 1][pc] === BlockType.EMPTY) {
        grid[plat.row - 1][pc] = BlockType.POTION;
      }
    }
  }

  // WALL OBSTACLES
  if (difficulty !== 'easy') {
    const numObstacles = rand(1, 3);
    for (let i = 0; i < numObstacles; i++) {
      const obsRow = rand(5, TOWER_ROWS - 6);
      const fromLeft = chance(0.5);
      const obsLen = rand(1, 3);
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
 * Procedurally generates a playable horizontal dungeon room.
 * Guarantees: SPAWN on left, DOOR on right, traversable path.
 */
export function generateHorizontalRoom(difficulty: Difficulty): number[][] {
  const COLS = HORIZ_COLS;
  const ROWS = HORIZ_ROWS;
  const grid: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(BlockType.EMPTY)
  );

  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const chance = (pct: number) => Math.random() < pct;

  const config = {
    easy: {
      pitChance: 0.15,
      wallHeight: 3,
      spikeChance: 0.06,
      patrolChance: 0.15,
      mageChance: 0.05,
      potionChance: 0.25,
      platformChance: 0.35,
    },
    normal: {
      pitChance: 0.25,
      wallHeight: 4,
      spikeChance: 0.12,
      patrolChance: 0.3,
      mageChance: 0.12,
      potionChance: 0.15,
      platformChance: 0.3,
    },
    hard: {
      pitChance: 0.35,
      wallHeight: 5,
      spikeChance: 0.2,
      patrolChance: 0.4,
      mageChance: 0.2,
      potionChance: 0.08,
      platformChance: 0.25,
    },
  }[difficulty];

  // === BORDERS ===
  for (let c = 0; c < COLS; c++) {
    grid[0][c] = BlockType.WALL; // ceiling
    grid[ROWS - 1][c] = BlockType.WALL; // floor
    grid[ROWS - 2][c] = BlockType.WALL; // floor (2 thick)
  }
  for (let r = 0; r < ROWS; r++) {
    grid[r][0] = BlockType.WALL; // left wall
    grid[r][COLS - 1] = BlockType.WALL; // right wall
  }

  const floorRow = ROWS - 3; // row above 2-thick floor

  // === TERRAIN GENERATION ===
  // Generate sections left to right
  const sectionWidth = rand(4, 6);
  type Section = { startCol: number; endCol: number; type: 'flat' | 'pit' | 'raised' | 'wall' };
  const sections: Section[] = [];

  let col = 2; // start after left wall + 1 buffer for spawn
  // First section is always flat (spawn area)
  sections.push({ startCol: col, endCol: col + 3, type: 'flat' });
  col += 4;

  while (col < COLS - 5) {
    const w = rand(3, sectionWidth);
    const endCol = Math.min(col + w, COLS - 5);

    let type: Section['type'];
    const r = Math.random();
    if (r < config.pitChance) {
      type = 'pit';
    } else if (r < config.pitChance + 0.15) {
      type = 'raised';
    } else if (r < config.pitChance + 0.25) {
      type = 'wall';
    } else {
      type = 'flat';
    }

    sections.push({ startCol: col, endCol, type });
    col = endCol + 1;
  }

  // Last section is always flat (door area)
  sections.push({ startCol: Math.max(col, COLS - 5), endCol: COLS - 2, type: 'flat' });

  // === BUILD TERRAIN ===
  for (const sec of sections) {
    for (let c = sec.startCol; c <= sec.endCol; c++) {
      if (c <= 0 || c >= COLS - 1) continue;

      if (sec.type === 'flat') {
        // Nothing extra — floor already exists
      } else if (sec.type === 'pit') {
        // Remove floor to create pit (deadly fall)
        grid[ROWS - 2][c] = BlockType.EMPTY;
        grid[ROWS - 1][c] = BlockType.EMPTY;
        // Add spikes at bottom or leave as death pit
        if (chance(0.5)) {
          grid[ROWS - 1][c] = BlockType.WALL;
          grid[ROWS - 2][c] = BlockType.SPIKE;
        }
      } else if (sec.type === 'raised') {
        // Raise floor by 2-3 blocks
        const height = rand(2, 3);
        for (let h = 0; h < height; h++) {
          const r = ROWS - 3 - h;
          if (r > 1) grid[r][c] = BlockType.WALL;
        }
      } else if (sec.type === 'wall') {
        // Vertical wall obstacle (ceiling to partway down)
        const wallH = rand(2, config.wallHeight);
        for (let h = 0; h < wallH; h++) {
          const r = 1 + h;
          if (r < ROWS - 3) grid[r][c] = BlockType.WALL;
        }
      }
    }
  }

  // === PLATFORMS (floating, one-way) ===
  for (const sec of sections) {
    if (sec.type === 'pit' && chance(0.7)) {
      // Bridge over pit
      const bridgeRow = ROWS - 4;
      for (let c = sec.startCol; c <= sec.endCol; c++) {
        grid[bridgeRow][c] = BlockType.PLATFORM;
      }
    }
    if ((sec.type === 'flat' || sec.type === 'raised') && chance(config.platformChance)) {
      // Floating platform above ground
      const platRow = rand(ROWS - 7, ROWS - 5);
      const platStart = rand(sec.startCol, Math.max(sec.startCol, sec.endCol - 2));
      const platEnd = Math.min(platStart + rand(2, 4), sec.endCol);
      for (let c = platStart; c <= platEnd; c++) {
        if (grid[platRow][c] === BlockType.EMPTY) {
          grid[platRow][c] = BlockType.PLATFORM;
        }
      }
    }
  }

  // === ENEMIES ===
  for (const sec of sections) {
    if (sec.type === 'flat' || sec.type === 'raised') {
      const groundRow = sec.type === 'raised' ? floorRow - rand(2, 3) : floorRow;
      if (chance(config.patrolChance) && sec.endCol - sec.startCol >= 3) {
        const ec = rand(sec.startCol + 1, sec.endCol - 1);
        if (ec > 0 && ec < COLS - 1 && grid[groundRow][ec] === BlockType.EMPTY) {
          grid[groundRow][ec] = BlockType.MOB_PATROL;
        }
      }
      if (chance(config.mageChance)) {
        const ec = rand(sec.startCol, sec.endCol);
        if (ec > 0 && ec < COLS - 1 && grid[groundRow][ec] === BlockType.EMPTY) {
          grid[groundRow][ec] = BlockType.MOB_STATIONARY;
        }
      }
    }
  }

  // === SPIKES on ground ===
  for (let c = 4; c < COLS - 4; c++) {
    if (chance(config.spikeChance) && grid[floorRow][c] === BlockType.EMPTY &&
        grid[ROWS - 2][c] === BlockType.WALL) {
      grid[floorRow][c] = BlockType.SPIKE;
    }
  }

  // === POTIONS ===
  for (const sec of sections) {
    if (chance(config.potionChance) && sec.type !== 'pit') {
      const pc = rand(sec.startCol, sec.endCol);
      if (pc > 0 && pc < COLS - 1 && grid[floorRow][pc] === BlockType.EMPTY) {
        grid[floorRow][pc] = BlockType.POTION;
      }
    }
  }

  // === SPAWN (left) ===
  grid[floorRow][2] = BlockType.SPAWN;

  // === DOOR (right) ===
  grid[floorRow][COLS - 3] = BlockType.DOOR;

  return grid;
}

/**
 * Generate a room for the given orientation and difficulty.
 */
export function generateRoomForOrientation(
  orientation: MapOrientation,
  difficulty: Difficulty
): number[][] {
  return orientation === 'horizontal'
    ? generateHorizontalRoom(difficulty)
    : generateRoom(difficulty);
}
