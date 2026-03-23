import { BlockType, MapOrientation } from './types';
import { TOWER_COLS, TOWER_ROWS, HORIZ_COLS, HORIZ_ROWS } from './utils';

export type Difficulty = 'easy' | 'normal' | 'hard';

// === PHYSICS CONSTRAINTS (from GameCanvas) ===
// gravity=1.0, jumpVy=-15, moveSpeed=5
// Max jump height: ~120px = 2.5 tiles
// Max jump horizontal: ~150px = 3.1 tiles (during full arc)
// Conservative limits for guaranteed reachability:
const MAX_JUMP_UP = 2;       // max rows upward the player can jump
const MAX_JUMP_HORIZ = 3;    // max horizontal tiles during jump

// === HELPERS ===
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (pct: number) => Math.random() < pct;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// === DIFFICULTY CONFIG ===
interface DiffConfig {
  minPlatLen: number;
  maxPlatLen: number;
  stepUpRows: number;       // rows to climb per step (≤ MAX_JUMP_UP)
  spikeChance: number;
  patrolChance: number;
  mageChance: number;
  gargoyleChance: number;
  slimeChance: number;
  impChance: number;
  skeletonChance: number;
  potionEvery: number;
  extraBranches: number;
  wallObstacles: number;
}

function getConfig(d: Difficulty): DiffConfig {
  switch (d) {
    case 'easy': return {
      minPlatLen: 5, maxPlatLen: 10, stepUpRows: 2,
      spikeChance: 0.04, patrolChance: 0.15, mageChance: 0.03,
      gargoyleChance: 0.02, slimeChance: 0.05, impChance: 0.02, skeletonChance: 0,
      potionEvery: 3, extraBranches: 4, wallObstacles: 0,
    };
    case 'normal': return {
      minPlatLen: 4, maxPlatLen: 8, stepUpRows: 2,
      spikeChance: 0.1, patrolChance: 0.3, mageChance: 0.1,
      gargoyleChance: 0.08, slimeChance: 0.12, impChance: 0.08, skeletonChance: 0.06,
      potionEvery: 5, extraBranches: 3, wallObstacles: 1,
    };
    case 'hard': return {
      minPlatLen: 3, maxPlatLen: 6, stepUpRows: 2,
      spikeChance: 0.18, patrolChance: 0.4, mageChance: 0.2,
      gargoyleChance: 0.15, slimeChance: 0.18, impChance: 0.15, skeletonChance: 0.12,
      potionEvery: 7, extraBranches: 2, wallObstacles: 1,
    };
  }
}

// === WAYPOINT ===
interface Waypoint {
  row: number;
  colStart: number;
  colEnd: number;
}

// ============================================================
// VERTICAL MAP GENERATOR
// ============================================================

function buildVerticalSpine(cfg: DiffConfig): Waypoint[] {
  const COLS = TOWER_COLS;
  const ROWS = TOWER_ROWS;
  const floorRow = ROWS - 3;
  const waypoints: Waypoint[] = [];

  // Floor: full width walkable
  waypoints.push({ row: floorRow, colStart: 1, colEnd: COLS - 2 });

  let curRow = floorRow;
  let curCol = rand(3, COLS - 4); // approx player position
  let goRight = chance(0.5);

  // Climb upward, one safe step at a time
  while (curRow > 4) {
    const step = cfg.stepUpRows; // always ≤ MAX_JUMP_UP
    const nextRow = Math.max(2, curRow - step);

    // Pick platform length
    const platLen = rand(cfg.minPlatLen, cfg.maxPlatLen);

    // Determine horizontal position — must overlap with player's jump reach
    let colStart: number, colEnd: number;
    if (goRight) {
      // Shift rightward but stay within jump range
      const target = clamp(curCol + rand(0, MAX_JUMP_HORIZ - 1), 1, COLS - 2 - platLen);
      colStart = target;
      colEnd = Math.min(target + platLen - 1, COLS - 2);
    } else {
      // Shift leftward
      const target = clamp(curCol - rand(0, MAX_JUMP_HORIZ - 1) - platLen + 1, 1, COLS - 2);
      colStart = Math.max(target, 1);
      colEnd = Math.min(colStart + platLen - 1, COLS - 2);
    }

    // Ensure reachability: player at curCol ± reach must overlap with [colStart, colEnd]
    const reachLeft = curCol - MAX_JUMP_HORIZ;
    const reachRight = curCol + MAX_JUMP_HORIZ;
    if (colStart > reachRight || colEnd < reachLeft) {
      // Force overlap
      colStart = clamp(curCol - Math.floor(platLen / 2), 1, COLS - 2 - platLen);
      colEnd = Math.min(colStart + platLen - 1, COLS - 2);
    }

    waypoints.push({ row: nextRow, colStart, colEnd });
    curRow = nextRow;
    curCol = Math.floor((colStart + colEnd) / 2);
    goRight = !goRight; // zigzag
  }

  return waypoints;
}

export function generateRoom(difficulty: Difficulty): number[][] {
  const cfg = getConfig(difficulty);
  const COLS = TOWER_COLS;
  const ROWS = TOWER_ROWS;

  const grid: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(BlockType.EMPTY)
  );

  // === BORDERS ===
  for (let r = 0; r < ROWS; r++) {
    grid[r][0] = BlockType.WALL;
    grid[r][COLS - 1] = BlockType.WALL;
  }
  for (let c = 0; c < COLS; c++) {
    grid[0][c] = BlockType.WALL;
    grid[ROWS - 1][c] = BlockType.WALL;
    grid[ROWS - 2][c] = BlockType.WALL;
  }

  // === SPINE ===
  const spine = buildVerticalSpine(cfg);

  // Place spine platforms (skip first = floor) — always one-way platforms, never walls
  for (let i = 1; i < spine.length; i++) {
    const wp = spine[i];
    for (let c = wp.colStart; c <= wp.colEnd; c++) {
      grid[wp.row][c] = BlockType.PLATFORM;
    }
  }

  // === SPAWN (bottom) ===
  const spawnCol = rand(2, 5);
  grid[ROWS - 3][spawnCol] = BlockType.SPAWN;

  // === DOOR (top of highest platform) ===
  const topWp = spine[spine.length - 1];
  const doorCol = clamp(rand(topWp.colStart, topWp.colEnd), topWp.colStart, topWp.colEnd);
  grid[topWp.row - 1][doorCol] = BlockType.DOOR;

  // === BRANCH PLATFORMS (extra variety) ===
  for (let b = 0; b < cfg.extraBranches; b++) {
    const idx = rand(1, Math.max(1, spine.length - 2));
    const lower = spine[idx];
    const upper = spine[Math.min(idx + 1, spine.length - 1)];
    const midRow = Math.floor((lower.row + upper.row) / 2);
    if (midRow <= 1 || midRow >= ROWS - 2) continue;

    const len = rand(2, 4);
    const sc = rand(1, COLS - 2 - len);
    for (let c = sc; c < sc + len && c <= COLS - 2; c++) {
      if (grid[midRow][c] === BlockType.EMPTY) {
        grid[midRow][c] = BlockType.PLATFORM;
      }
    }
  }

  // === EXTRA SIDE PLATFORMS (replaces wall obstacles) ===
  for (let w = 0; w < cfg.wallObstacles; w++) {
    const obsRow = rand(4, ROWS - 6);
    if (spine.some(wp => Math.abs(wp.row - obsRow) <= 1)) continue;
    const fromLeft = chance(0.5);
    const obsLen = rand(1, 3);
    for (let j = 0; j < obsLen; j++) {
      const c = fromLeft ? 1 + j : COLS - 2 - j;
      if (grid[obsRow][c] === BlockType.EMPTY) grid[obsRow][c] = BlockType.PLATFORM;
    }
  }

  // === ENEMIES (round-robin to ensure variety) ===
  const mobPool = [
    { type: BlockType.MOB_PATROL, minW: 4, inset: 1 },
    { type: BlockType.MOB_STATIONARY, minW: 1, inset: 0 },
    { type: BlockType.MOB_GARGOYLE, minW: 1, inset: 0 },
    { type: BlockType.MOB_SLIME, minW: 3, inset: 1 },
    { type: BlockType.MOB_IMP, minW: 1, inset: 0 },
    { type: BlockType.MOB_SKELETON, minW: 4, inset: 1 },
  ];
  let mobIdx = rand(0, mobPool.length - 1); // random start
  const mobChance = (cfg.patrolChance + cfg.mageChance + cfg.gargoyleChance +
    cfg.slimeChance + cfg.impChance + cfg.skeletonChance) / 6; // average spawn rate
  for (let i = 1; i < spine.length; i++) {
    const wp = spine[i];
    const pw = wp.colEnd - wp.colStart + 1;
    const above = wp.row - 1;

    if (chance(mobChance)) {
      // Try up to mobPool.length times to find a fitting mob
      for (let t = 0; t < mobPool.length; t++) {
        const mob = mobPool[(mobIdx + t) % mobPool.length];
        if (pw >= mob.minW) {
          const ecMin = wp.colStart + mob.inset;
          const ecMax = wp.colEnd - mob.inset;
          const ec = rand(ecMin, Math.max(ecMin, ecMax));
          if (grid[above][ec] === BlockType.EMPTY) {
            grid[above][ec] = mob.type;
            mobIdx = (mobIdx + t + 1) % mobPool.length; // advance past used mob
            break;
          }
        }
      }
    }
  }
  // Ground patrol (random type)
  if (chance(mobChance * 1.5)) {
    const groundMob = pick(mobPool.filter(m => m.minW <= (COLS - 8)));
    const ec = rand(6, COLS - 4);
    if (grid[ROWS - 3][ec] === BlockType.EMPTY) grid[ROWS - 3][ec] = groundMob.type;
  }

  // === SPIKES (never block only landing path) ===
  for (let i = 1; i < spine.length; i++) {
    const wp = spine[i];
    for (let c = wp.colStart; c <= wp.colEnd; c++) {
      if (chance(cfg.spikeChance) && grid[wp.row - 1][c] === BlockType.EMPTY) {
        const hasAlt = (c > wp.colStart && grid[wp.row - 1][c - 1] === BlockType.EMPTY) ||
                       (c < wp.colEnd && grid[wp.row - 1][c + 1] === BlockType.EMPTY);
        if (hasAlt) grid[wp.row - 1][c] = BlockType.SPIKE;
      }
    }
  }
  for (let c = 3; c < COLS - 3; c++) {
    if (chance(cfg.spikeChance * 0.3) && grid[ROWS - 3][c] === BlockType.EMPTY) {
      grid[ROWS - 3][c] = BlockType.SPIKE;
    }
  }

  // === POTIONS ===
  for (let i = 1; i < spine.length; i++) {
    if (i % cfg.potionEvery === 0) {
      const wp = spine[i];
      const pc = rand(wp.colStart, wp.colEnd);
      if (grid[wp.row - 1][pc] === BlockType.EMPTY) grid[wp.row - 1][pc] = BlockType.POTION;
    }
  }

  return grid;
}

// ============================================================
// HORIZONTAL MAP GENERATOR
// ============================================================

function buildHorizontalSpine(cfg: DiffConfig): Waypoint[] {
  const COLS = HORIZ_COLS;
  const ROWS = HORIZ_ROWS;
  const floorRow = ROWS - 3;
  const waypoints: Waypoint[] = [];

  // Start: spawn area
  waypoints.push({ row: floorRow, colStart: 1, colEnd: 4 });

  let curCol = 4;

  while (curCol < COLS - 6) {
    const sectionType = pick(['flat', 'pit', 'raised', 'elevated'] as const);
    const sectionW = rand(3, 6);

    switch (sectionType) {
      case 'flat': {
        const start = curCol + 1;
        const end = Math.min(start + sectionW - 1, COLS - 4);
        waypoints.push({ row: floorRow, colStart: start, colEnd: end });
        curCol = end;
        break;
      }
      case 'pit': {
        // Gap width ≤ MAX_JUMP_HORIZ to ensure jumpability
        const pitW = rand(1, Math.min(sectionW, MAX_JUMP_HORIZ));
        // Optional bridge
        if (pitW >= 2 && chance(0.5)) {
          const bRow = floorRow - rand(1, MAX_JUMP_UP);
          const bStart = curCol + Math.floor(pitW / 2);
          waypoints.push({ row: bRow, colStart: bStart, colEnd: Math.min(bStart + 1, COLS - 2) });
        }
        // Landing on far side
        const landStart = curCol + pitW + 1;
        const landEnd = Math.min(landStart + 2, COLS - 4);
        if (landStart < COLS - 4) {
          waypoints.push({ row: floorRow, colStart: landStart, colEnd: landEnd });
          curCol = landEnd;
        } else {
          curCol = landStart;
        }
        break;
      }
      case 'raised': {
        const h = rand(1, MAX_JUMP_UP);
        const start = curCol + 1;
        const end = Math.min(start + sectionW - 1, COLS - 4);
        waypoints.push({ row: floorRow - h, colStart: start, colEnd: end });
        curCol = end;
        break;
      }
      case 'elevated': {
        const h = rand(1, MAX_JUMP_UP);
        const start = curCol + 1;
        const end = Math.min(start + sectionW - 1, COLS - 4);
        waypoints.push({ row: floorRow - h, colStart: start, colEnd: end });
        curCol = end;
        break;
      }
    }
  }

  // Final: door area
  waypoints.push({ row: floorRow, colStart: COLS - 5, colEnd: COLS - 2 });
  return waypoints;
}

export function generateHorizontalRoom(difficulty: Difficulty): number[][] {
  const cfg = getConfig(difficulty);
  const COLS = HORIZ_COLS;
  const ROWS = HORIZ_ROWS;
  const floorRow = ROWS - 3;

  const grid: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(BlockType.EMPTY)
  );

  // === BORDERS ===
  for (let c = 0; c < COLS; c++) {
    grid[0][c] = BlockType.WALL;
    grid[ROWS - 1][c] = BlockType.WALL;
    grid[ROWS - 2][c] = BlockType.WALL;
  }
  for (let r = 0; r < ROWS; r++) {
    grid[r][0] = BlockType.WALL;
    grid[r][COLS - 1] = BlockType.WALL;
  }

  // === SPINE ===
  const spine = buildHorizontalSpine(cfg);

  // Track which cols have floor (to create pits)
  const floorCols = new Set<number>();

  for (const wp of spine) {
    if (wp.row === floorRow) {
      for (let c = wp.colStart; c <= wp.colEnd; c++) floorCols.add(c);
    } else {
      for (let c = wp.colStart; c <= wp.colEnd; c++) {
        if (grid[wp.row][c] === BlockType.EMPTY) {
          grid[wp.row][c] = BlockType.PLATFORM;
        }
      }
    }
  }

  // Remove floor at pit locations
  for (let c = 1; c < COLS - 1; c++) {
    if (!floorCols.has(c)) {
      grid[ROWS - 2][c] = BlockType.EMPTY;
      grid[ROWS - 1][c] = BlockType.EMPTY;
      if (chance(0.4)) {
        grid[ROWS - 1][c] = BlockType.WALL;
        grid[ROWS - 2][c] = BlockType.SPIKE;
      }
    }
  }

  // === WALL OBSTACLES (ceiling pillars) ===
  for (let w = 0; w < cfg.wallObstacles; w++) {
    const wc = rand(6, COLS - 6);
    if (spine.some(wp => wc >= wp.colStart && wc <= wp.colEnd)) continue;
    const wh = rand(2, 4);
    for (let h = 0; h < wh; h++) {
      const r = 1 + h;
      if (grid[r][wc] === BlockType.EMPTY) grid[r][wc] = BlockType.WALL;
    }
  }

  // === EXTRA PLATFORMS ===
  for (let b = 0; b < cfg.extraBranches; b++) {
    const pr = rand(ROWS - 7, ROWS - 4);
    const pl = rand(2, 4);
    const pc = rand(3, COLS - 4 - pl);
    for (let c = pc; c < pc + pl; c++) {
      if (grid[pr][c] === BlockType.EMPTY) grid[pr][c] = BlockType.PLATFORM;
    }
  }

  // === SPAWN & DOOR ===
  grid[floorRow][2] = BlockType.SPAWN;
  grid[floorRow][COLS - 3] = BlockType.DOOR;

  // === ENEMIES (round-robin for variety) ===
  const hMobPool = [
    { type: BlockType.MOB_PATROL, minW: 3, inset: 1 },
    { type: BlockType.MOB_STATIONARY, minW: 1, inset: 0 },
    { type: BlockType.MOB_GARGOYLE, minW: 1, inset: 0 },
    { type: BlockType.MOB_SLIME, minW: 3, inset: 1 },
    { type: BlockType.MOB_IMP, minW: 1, inset: 0 },
    { type: BlockType.MOB_SKELETON, minW: 4, inset: 1 },
  ];
  let hMobIdx = rand(0, hMobPool.length - 1);
  const hMobChance = (cfg.patrolChance + cfg.mageChance + cfg.gargoyleChance +
    cfg.slimeChance + cfg.impChance + cfg.skeletonChance) / 6;
  for (const wp of spine) {
    if (wp.colStart <= 4 || wp.colEnd >= COLS - 4) continue;
    const above = wp.row - 1;
    const width = wp.colEnd - wp.colStart + 1;

    if (chance(hMobChance)) {
      for (let t = 0; t < hMobPool.length; t++) {
        const mob = hMobPool[(hMobIdx + t) % hMobPool.length];
        if (width >= mob.minW) {
          const ecMin = wp.colStart + mob.inset;
          const ecMax = wp.colEnd - mob.inset;
          const ec = rand(ecMin, Math.max(ecMin, ecMax));
          if (above > 0 && grid[above][ec] === BlockType.EMPTY) {
            grid[above][ec] = mob.type;
            hMobIdx = (hMobIdx + t + 1) % hMobPool.length;
            break;
          }
        }
      }
    }
  }

  // === SPIKES ===
  for (let c = 4; c < COLS - 4; c++) {
    if (chance(cfg.spikeChance) && grid[floorRow][c] === BlockType.EMPTY &&
        grid[ROWS - 2][c] === BlockType.WALL) {
      grid[floorRow][c] = BlockType.SPIKE;
    }
  }

  // === POTIONS ===
  let potCount = 0;
  for (const wp of spine) {
    potCount++;
    if (potCount % cfg.potionEvery === 0) {
      const pc = rand(wp.colStart, wp.colEnd);
      const above = wp.row - 1;
      if (above > 0 && grid[above][pc] === BlockType.EMPTY) grid[above][pc] = BlockType.POTION;
    }
  }

  return grid;
}

// ============================================================
// REACHABILITY VERIFICATION (BFS)
// ============================================================

function verifyReachability(grid: number[][], ROWS: number, COLS: number): boolean {
  let spawn: [number, number] | null = null;
  let door: [number, number] | null = null;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === BlockType.SPAWN) spawn = [r, c];
      if (grid[r][c] === BlockType.DOOR) door = [r, c];
    }
  }
  if (!spawn || !door) return false;

  const canStand = (r: number, c: number): boolean => {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    const cell = grid[r][c];
    if (cell === BlockType.WALL) return false; // inside wall
    if (r + 1 >= ROWS) return false;
    const below = grid[r + 1][c];
    return below === BlockType.WALL || below === BlockType.PLATFORM;
  };

  const key = (r: number, c: number) => r * COLS + c;
  const visited = new Set<number>();
  const queue: [number, number][] = [];

  // Start from spawn and one row above
  for (const dr of [0, -1]) {
    const sr = spawn[0] + dr;
    if (canStand(sr, spawn[1])) {
      queue.push([sr, spawn[1]]);
      visited.add(key(sr, spawn[1]));
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;

    // Reached door?
    if (Math.abs(r - door[0]) <= 1 && c === door[1]) return true;

    const tryVisit = (nr: number, nc: number) => {
      if (canStand(nr, nc) && !visited.has(key(nr, nc))) {
        visited.add(key(nr, nc));
        queue.push([nr, nc]);
      }
    };

    // Walk left/right
    tryVisit(r, c - 1);
    tryVisit(r, c + 1);

    // Jump up (within physics limits)
    for (let dr = -1; dr >= -MAX_JUMP_UP; dr--) {
      for (let dc = -MAX_JUMP_HORIZ; dc <= MAX_JUMP_HORIZ; dc++) {
        tryVisit(r + dr, c + dc);
      }
    }

    // Fall down (check below within horizontal reach)
    for (let dc = -MAX_JUMP_HORIZ; dc <= MAX_JUMP_HORIZ; dc++) {
      const nc = c + dc;
      if (nc < 0 || nc >= COLS) continue;
      for (let nr = r + 1; nr < ROWS - 1; nr++) {
        if (grid[nr][nc] === BlockType.WALL) break; // blocked
        if (canStand(nr, nc)) {
          tryVisit(nr, nc);
          break;
        }
      }
    }
  }

  return false;
}

// ============================================================
// PUBLIC API
// ============================================================

export function generateRoomForOrientation(
  orientation: MapOrientation,
  difficulty: Difficulty
): number[][] {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = orientation === 'horizontal'
      ? generateHorizontalRoom(difficulty)
      : generateRoom(difficulty);

    const rows = grid.length;
    const cols = grid[0].length;
    if (verifyReachability(grid, rows, cols)) {
      return grid;
    }
  }
  // Fallback: return last attempt (spine-based should nearly always pass)
  return orientation === 'horizontal'
    ? generateHorizontalRoom(difficulty)
    : generateRoom(difficulty);
}
