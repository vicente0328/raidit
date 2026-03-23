import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LevelData, BlockType, PlayerStats, InventoryItem, EquipSlot, Equipment } from '../types';
import { motion } from 'motion/react';
import { SPRITES, ANIM } from '../sprites';
// Grid dimensions are read dynamically from level data
import { getItem } from '../items';
import { rollDrop } from '../lootTables';
import { InventoryPanel } from './InventoryPanel';

interface Props {
  level: LevelData;
  stats: PlayerStats;
  onWin: (pickedUpItems: InventoryItem[]) => void;
  onLose: (pickedUpItems: InventoryItem[]) => void;
  onQuit?: () => void;
  onSaveInventory: (inv: InventoryItem[], equip?: Equipment) => Promise<void>;
}

interface Ember {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string;
}

// Tile size in world coordinates
const T = 48;
// Canvas internal resolution — zoomed in (7 tiles wide view)
const GAME_W = 7 * T; // 336
const GAME_H = 10 * T; // 480 (portrait)
// World dimensions are computed dynamically per level

export function GameCanvas({ level, stats, onWin, onLose, onQuit, onSaveInventory }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const pausedRef = useRef(false);
  const useItemRef = useRef<((itemId: string) => void) | null>(null);
  const pickedUpItemsRef = useRef<InventoryItem[]>([]);
  const [inGameInventory, setInGameInventory] = useState<InventoryItem[]>(() =>
    stats.inventory.filter(i => getItem(i.itemId)?.type === 'consumable').map(i => ({ ...i }))
  );
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, Space: false });
  const equipmentRef = useRef(stats.equipment);
  useEffect(() => { equipmentRef.current = stats.equipment; }, [stats.equipment]);
  // Store callbacks in refs so useEffect doesn't restart when App re-renders
  const onWinRef = useRef(onWin);
  useEffect(() => { onWinRef.current = onWin; }, [onWin]);
  const onLoseRef = useRef(onLose);
  useEffect(() => { onLoseRef.current = onLose; }, [onLose]);
  const [isMobile, setIsMobile] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: GAME_W, h: GAME_H });

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const updateCanvasSize = useCallback(() => {
    const mobile = window.innerWidth < 768;
    const maxW = mobile ? window.innerWidth - 8 : Math.min(window.innerWidth - 48, 480);
    const maxH = mobile
      ? window.innerHeight - 180
      : window.innerHeight - 160;
    const aspect = GAME_W / GAME_H;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    setCanvasSize({ w: Math.floor(w), h: Math.floor(h) });
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let currentRoomIdx = 0;
    let frameCount = 0;
    let cameraX = 0; // horizontal camera offset (world coords)
    let cameraY = 0; // vertical camera offset (world coords)
    // Compute world dimensions from actual grid
    const gridRows = level.rooms[0].grid.length;
    const gridCols = level.rooms[0].grid[0]?.length ?? 16;
    const WORLD_W = gridCols * T;
    const worldH = gridRows * T;

    let transitionTimer = 0;
    let embers: Ember[] = [];
    let slashTrails: { x: number; y: number; angle: number; life: number; size: number }[] = [];
    let hitSparks: { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string }[] = [];

    // Juice systems
    let coyoteTimer = 0;        // frames since leaving ground (coyote time)
    let jumpBufferTimer = 0;    // frames since jump was pressed in air
    let hitStopTimer = 0;       // freeze frames on hit
    let screenShakeTimer = 0;   // screen shake duration
    let screenShakeIntensity = 0;
    let damageFlashTimer = 0;   // red vignette on damage
    const COYOTE_FRAMES = 8;    // ~0.13s at 60fps
    const JUMP_BUFFER_FRAMES = 8;

    // Compute equipment bonuses
    let bonusAtk = 0, bonusDef = 0, bonusSpeed = 0, bonusMaxHp = 0;
    let lifesteal = 0, freezeChance = 0, aoeRadius = 0, thornsDmg = 0, regenRate = 0;
    for (const slot of ['weapon', 'armor', 'boots', 'accessory'] as EquipSlot[]) {
      const id = stats.equipment[slot];
      if (id) {
        const item = getItem(id);
        if (item) {
          bonusAtk += item.atk || 0;
          bonusDef += item.def || 0;
          bonusSpeed += item.speed || 0;
          bonusMaxHp += item.maxHp || 0;
          lifesteal += item.lifesteal || 0;
          freezeChance += item.freezeChance || 0;
          aoeRadius += item.aoeRadius || 0;
          thornsDmg += item.thornsDmg || 0;
          regenRate += item.regenRate || 0;
        }
      }
    }

    // Player — collision box is tight body (1 tile wide, ~1.5 tiles tall), sprite renders at 2 tiles
    const PLAYER_DRAW_W = 2 * T;
    const PLAYER_DRAW_H = 2 * T + 16;
    const BASE_MAX_HP = 100;
    const MAX_HP = BASE_MAX_HP + bonusMaxHp;
    const MOVE_SPEED = 5 + bonusSpeed;
    const ATK_DAMAGE = 1 + bonusAtk;
    let player = {
      x: 3 * T, y: (gridRows - 3) * T - (T + T / 2),
      w: T - 8, h: T + T / 2,
      vx: 0, vy: 0,
      hp: MAX_HP,
      isGrounded: false,
      facingRight: true,
      attackTimer: 0,
      invulnTimer: 0,
      wallSlideDir: 0 as -1 | 0 | 1, // -1 = sliding left wall, 1 = right wall, 0 = not sliding
      wallJumpCooldown: 0, // frames to ignore horizontal input after wall jump
      wallKickVx: 0, // horizontal velocity to maintain during wall kick
    };

    let walls: { x: number; y: number; w: number; h: number }[] = [];
    let platforms: { x: number; y: number; w: number; h: number }[] = []; // one-way platforms
    let spikes: { x: number; y: number; w: number; h: number }[] = [];
    let potions: { x: number; y: number; w: number; h: number }[] = [];
    let enemies: any[] = [];
    let projectiles: { x: number; y: number; vx: number; vy: number; w: number; h: number; life: number }[] = [];
    let droppedItems: { x: number; y: number; w: number; h: number; vy: number; itemId: string; life: number; grounded: boolean }[] = [];
    let door: { x: number; y: number; w: number; h: number } | null = null;
    let regenTimer = 0;
    let itemMessages: { text: string; color: string; life: number; maxLife: number }[] = [];

    const loadRoom = (idx: number) => {
      walls = [];
      platforms = [];
      spikes = [];
      potions = [];
      enemies = [];
      projectiles = [];
      droppedItems = [];
      door = null;
      embers = [];
      const grid = level.rooms[idx].grid;
      const rows = grid.length;
      const cols = grid[0]?.length ?? 0;
      // Debug: count non-empty cells
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = grid[r][c];
          const x = c * T;
          const y = r * T;
          if (val === BlockType.WALL) walls.push({ x, y, w: T, h: T });
          if (val === BlockType.PLATFORM) platforms.push({ x, y: y + Math.floor(T * 0.7), w: T, h: Math.floor(T * 0.3) });
          if (val === BlockType.SPIKE) spikes.push({ x, y: y + T * 0.25, w: T, h: T * 0.75 });
          if (val === BlockType.MOB_PATROL) enemies.push({
            x, y: y - T, w: 2 * T, h: 2 * T,
            type: val, hp: 2, maxHp: 2, vx: 2, vy: 0, startX: x, hitFlash: 0
          });
          if (val === BlockType.MOB_STATIONARY) enemies.push({
            x, y: y - T, w: 2 * T, h: 2 * T,
            type: val, hp: 3, maxHp: 3, vx: 0, vy: 0, hitFlash: 0,
            shootTimer: 0, telegraphing: false
          });
          if (val === BlockType.BOSS) enemies.push({
            x: x - T, y: y - 2 * T, w: 3 * T, h: 3 * T,
            type: val, hp: 10, maxHp: 10, vx: 0, vy: 0, timer: 0, weak: false, hitFlash: 0,
            homeX: x - T, homeY: y - 2 * T
          });
          if (val === BlockType.MOB_GARGOYLE) enemies.push({
            x, y: y - T, w: 2 * T, h: 2 * T,
            type: val, hp: 6, maxHp: 6, vx: 0, vy: 0, hitFlash: 0,
            dormant: true, awakenTimer: 0, defBonus: 10 // high def while dormant
          });
          if (val === BlockType.MOB_SLIME) enemies.push({
            x, y: y - T, w: 2 * T, h: 2 * T,
            type: val, hp: 4, maxHp: 4, vx: 1.5, vy: 0, hitFlash: 0,
            slimeSize: 2, splitDone: false // 2=big, 1=small
          });
          if (val === BlockType.MOB_IMP) enemies.push({
            x, y: y - 2 * T, w: T * 1.5, h: T * 1.5,
            type: val, hp: 2, maxHp: 2, vx: 0, vy: 0, hitFlash: 0,
            flyTimer: 0, shootTimer: 0, homeX: x, homeY: y - 2 * T
          });
          if (val === BlockType.MOB_SKELETON) enemies.push({
            x, y: y - T, w: 2 * T, h: 2 * T,
            type: val, hp: 8, maxHp: 8, vx: 1, vy: 0, hitFlash: 0,
            facingRight: true, shieldUp: true, attackTimer: 0, attackCooldown: 90
          });
          if (val === BlockType.POTION) potions.push({ x, y, w: T, h: T });
          if (val === BlockType.DOOR) door = { x, y, w: T, h: T };
          if (val === BlockType.SPAWN) {
            player.x = x + (T - player.w) / 2;
            player.y = y - player.h;
          }
        }
      }
    };

    loadRoom(0);
    // Set initial camera to show player
    cameraY = Math.max(0, player.y - GAME_H * 0.6);
    cameraX = Math.max(0, player.x - GAME_W * 0.4);

    const keys = keysRef.current;

    let prevArrowUp = false;
    // useItemRef: allow React overlay to heal player
    useItemRef.current = (itemId: string) => {
      const item = getItem(itemId);
      if (item && item.healAmount) {
        player.hp = Math.min(MAX_HP, player.hp + item.healAmount);
        for (let i = 0; i < 6; i++) spawnEmber(player.x + player.w / 2, player.y + player.h / 2, '#4ade80');
        tryVibrate(15);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') keys.ArrowRight = true;
      if (e.code === 'ArrowUp') keys.ArrowUp = true;
      if (e.code === 'Space') keys.Space = true;
      if (e.code === 'KeyI' || e.code === 'Escape') {
        setInventoryOpen(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
      if (e.code === 'ArrowRight') keys.ArrowRight = false;
      if (e.code === 'ArrowUp') keys.ArrowUp = false;
      if (e.code === 'Space') keys.Space = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const checkCol = (r1: any, r2: any) =>
      r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;

    const spawnEmber = (x: number, y: number, color?: string) => {
      embers.push({
        x, y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2 - 0.5,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        size: 1.5 + Math.random() * 2.5,
        color: color || (Math.random() > 0.5 ? '#d4a017' : '#c2410c')
      });
    };

    const spawnSlash = (x: number, y: number, facingRight: boolean) => {
      for (let i = 0; i < 5; i++) {
        slashTrails.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 25,
          angle: facingRight ? Math.random() * 0.8 - 0.4 : Math.PI + Math.random() * 0.8 - 0.4,
          life: 8 + Math.random() * 6,
          size: 20 + Math.random() * 20
        });
      }
    };

    const spawnHitSparks = (x: number, y: number, count: number = 8) => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
        const speed = 3 + Math.random() * 5;
        hitSparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 10 + Math.random() * 10,
          size: 2 + Math.random() * 3,
          color: Math.random() > 0.4 ? '#22d3ee' : '#ffffff'
        });
      }
    };

    const tryVibrate = (pattern: number | number[]) => {
      try { navigator?.vibrate?.(pattern); } catch (_) {}
    };

    const update = () => {
      // Pause when inventory is open
      if (pausedRef.current) {
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      const frozen = hitStopTimer > 0;
      if (frozen) {
        hitStopTimer--;
      }

      frameCount++;

      if (frozen) {
        // Skip physics — jump straight to render
      } else {

      // === PHYSICS ===
      const WALL_SLIDE_SPEED = 2;    // max fall speed while wall sliding
      const WALL_JUMP_VY = -15;      // vertical kick off wall
      const WALL_JUMP_VX = 8;        // horizontal kick off wall (reduced 30%)
      const WALL_JUMP_LOCK = 60;     // frames to lock horizontal input (cleared on landing)

      player.vy += 1.0;

      // Variable jump: cut jump short when key released
      if (!keys.ArrowUp && player.vy < -4) {
        player.vy = -4; // cap upward velocity for short hops
      }

      // Wall jump cooldown — lock horizontal input and maintain kick velocity until landing
      if (player.wallJumpCooldown > 0) {
        if (player.isGrounded) {
          player.wallJumpCooldown = 0;
        } else {
          player.wallJumpCooldown--;
          player.vx = player.wallKickVx;
        }
      }
      if (player.wallJumpCooldown <= 0) {
        if (keys.ArrowLeft) { player.vx = -MOVE_SPEED; player.facingRight = false; }
        else if (keys.ArrowRight) { player.vx = MOVE_SPEED; player.facingRight = true; }
        else { player.vx = 0; }
      }

      // Coyote time tracking
      if (player.isGrounded) {
        coyoteTimer = COYOTE_FRAMES;
      } else {
        if (coyoteTimer > 0) coyoteTimer--;
      }

      // Jump buffer: set on fresh press, decay over time
      const freshJumpPress = keys.ArrowUp && !prevArrowUp;
      if (freshJumpPress) jumpBufferTimer = JUMP_BUFFER_FRAMES;
      if (jumpBufferTimer > 0) jumpBufferTimer--;

      // Jump: works with coyote time OR jump buffer
      const canJump = player.isGrounded || coyoteTimer > 0;
      const wantsJump = keys.ArrowUp && jumpBufferTimer > 0;
      if ((keys.ArrowUp && canJump) || (wantsJump && player.isGrounded)) {
        player.vy = -15;
        player.isGrounded = false;
        coyoteTimer = 0;
        jumpBufferTimer = 0;
        player.wallSlideDir = 0;
      }

      // Horizontal movement + collision
      player.x += player.vx;
      let touchingWallDir: -1 | 0 | 1 = 0;
      for (const w of walls) {
        if (checkCol(player, w)) {
          if (player.vx > 0) {
            player.x = w.x - player.w;
            touchingWallDir = 1; // touching wall on right
          } else if (player.vx < 0) {
            player.x = w.x + w.w;
            touchingWallDir = -1; // touching wall on left
          }
          player.vx = 0;
        }
      }

      // Vertical movement + collision
      const prevPlayerY = player.y;
      player.y += player.vy;
      player.isGrounded = false;
      for (const w of walls) {
        if (checkCol(player, w)) {
          if (player.vy > 0) {
            player.y = w.y - player.h;
            player.isGrounded = true;
          } else if (player.vy < 0) {
            player.y = w.y + w.h;
          }
          player.vy = 0;
        }
      }
      // One-way platform collision (only from above, only when falling)
      for (const p of platforms) {
        if (player.vy >= 0 && checkCol(player, p)) {
          const prevBottom = prevPlayerY + player.h;
          if (prevBottom <= p.y + 4) { // was above platform
            player.y = p.y - player.h;
            player.vy = 0;
            player.isGrounded = true;
          }
        }
      }

      // === WALL SLIDE & WALL JUMP ===
      // Detect wall slide: airborne + falling + pressing toward wall + touching wall
      const pressingTowardWall =
        (touchingWallDir === 1 && keys.ArrowRight) ||
        (touchingWallDir === -1 && keys.ArrowLeft);

      if (!player.isGrounded && touchingWallDir !== 0 && pressingTowardWall && player.vy > 0) {
        // Wall slide: slow the fall
        player.wallSlideDir = touchingWallDir;
        player.vy = Math.min(player.vy, WALL_SLIDE_SPEED);
        // Spawn occasional slide particles
        if (frameCount % 4 === 0) {
          spawnEmber(
            touchingWallDir === 1 ? player.x + player.w : player.x,
            player.y + player.h * 0.6 + Math.random() * 10,
            '#a1a1aa'
          );
        }
      } else {
        player.wallSlideDir = 0;
      }

      // Wall jump: press jump while wall sliding
      if (player.wallSlideDir !== 0 && freshJumpPress) {
        const kickDir = player.wallSlideDir; // save before clearing
        player.vy = WALL_JUMP_VY;
        player.vx = -kickDir * WALL_JUMP_VX; // kick away from wall
        player.wallKickVx = player.vx; // preserve kick velocity during cooldown
        player.facingRight = kickDir < 0; // face away from wall
        player.wallJumpCooldown = WALL_JUMP_LOCK;
        player.wallSlideDir = 0;
        coyoteTimer = 0;
        jumpBufferTimer = 0;
        // Wall kick particles burst
        const sparkX = kickDir === 1 ? player.x + player.w + 4 : player.x - 4;
        spawnHitSparks(sparkX, player.y + player.h * 0.5, 5);
        for (let i = 0; i < 4; i++) {
          spawnEmber(sparkX, player.y + player.h * 0.3 + Math.random() * player.h * 0.4, '#71717a');
        }
        tryVibrate(10);
      }

      // Update prevArrowUp AFTER wall jump check so freshJumpPress works correctly
      prevArrowUp = keys.ArrowUp;

      // Fall off bottom = damage + respawn at last ground
      if (player.y > worldH + 50) {
        player.hp -= Math.max(5, 25 - bonusDef * 3);
        player.invulnTimer = 60;
        // Respawn at bottom of current room
        const grid = level.rooms[currentRoomIdx].grid;
        for (let r = grid.length - 1; r >= 0; r--) {
          for (let c = 0; c < grid[0].length; c++) {
            if (grid[r][c] === BlockType.SPAWN) {
              player.x = c * T + (T - player.w) / 2;
              player.y = r * T - player.h;
              player.vy = 0;
              player.vx = 0;
            }
          }
        }
        for (let i = 0; i < 8; i++) spawnEmber(player.x + player.w / 2, player.y + player.h / 2, '#cc2200');
      }

      // Attack — generous hitbox for mobile forgiveness (+20% range)
      if (keys.Space && player.attackTimer <= 0) {
        player.attackTimer = 20;
        const atkW = 72; // generous attack range
        const hitBox = {
          x: player.facingRight ? player.x + player.w - 4 : player.x - atkW + 4,
          y: player.y - 6,
          w: atkW,
          h: player.h + 12
        };

        spawnSlash(
          player.facingRight ? player.x + player.w + 15 : player.x - 15,
          player.y + player.h / 2,
          player.facingRight
        );

        let didHitEnemy = false;
        for (const e of enemies) {
          if (checkCol(hitBox, e)) {
            const knockDir = player.facingRight ? 1 : -1;
            const hitX = player.facingRight ? e.x : e.x + e.w;
            const hitY = e.y + e.h * 0.4;
            if (e.type === BlockType.BOSS) {
              if (e.weak) {
                e.hp -= ATK_DAMAGE;
                e.hitFlash = 8;
                e.x += knockDir * 8;
                // Resolve horizontal wall collision after knockback
                for (const w of walls) {
                  if (checkCol(e, w)) {
                    if (knockDir > 0) e.x = w.x - e.w;
                    else e.x = w.x + w.w;
                  }
                }
                e.vy = -3;
                spawnHitSparks(hitX, hitY, 10);
                for (let i = 0; i < 8; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
                didHitEnemy = true;
              }
            } else {
              // Gargoyle: high defense while dormant
              if (e.type === BlockType.MOB_GARGOYLE && e.dormant) {
                // Blocked — spark but no damage
                spawnHitSparks(hitX, hitY, 4);
                spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#a1a1aa');
                didHitEnemy = true;
                // Awaken immediately when attacked
                e.awakenTimer = 31;
              }
              // Skeleton Knight: shield blocks frontal attacks
              else if (e.type === BlockType.MOB_SKELETON && e.shieldUp) {
                const attackFromFront = (player.facingRight && e.facingRight === false) ||
                  (!player.facingRight && e.facingRight === true);
                // Actually: shield faces toward player, so block if attack comes from the direction skeleton faces
                const skeletonFacingAttacker =
                  (e.facingRight && player.x < e.x) || (!e.facingRight && player.x > e.x + e.w);
                if (!skeletonFacingAttacker) {
                  // Shield block!
                  spawnHitSparks(hitX, hitY, 3);
                  spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#facc15');
                  e.x += knockDir * 3;
                  didHitEnemy = true;
                } else {
                  // Hit from behind — takes damage
                  e.hp -= ATK_DAMAGE;
                  e.hitFlash = 8;
                  e.x += knockDir * 10;
                  for (const w of walls) { if (checkCol(e, w)) { if (knockDir > 0) e.x = w.x - e.w; else e.x = w.x + w.w; } }
                  e.vy = -3;
                  spawnHitSparks(hitX, hitY, 8);
                  for (let i = 0; i < 5; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
                  didHitEnemy = true;
                }
              } else {
                // Default damage for all other enemies
                e.hp -= ATK_DAMAGE;
                e.hitFlash = 8;
                const kb = e.type === BlockType.MOB_SKELETON ? 10 : 20;
                e.x += knockDir * kb;
                // Resolve horizontal wall collision after knockback
                for (const w of walls) {
                  if (checkCol(e, w)) {
                    if (knockDir > 0) e.x = w.x - e.w;
                    else e.x = w.x + w.w;
                  }
                }
                e.vy = e.type === BlockType.MOB_IMP ? -2 : -4;
                spawnHitSparks(hitX, hitY, 8);
                for (let i = 0; i < 5; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
                didHitEnemy = true;

                // Freeze chance (Frostbow)
                if (freezeChance > 0 && Math.random() < freezeChance) {
                  e.frozenTimer = 120; // 2 seconds at 60fps
                  for (let i = 0; i < 6; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#38bdf8');
                }
              }

              // Lifesteal (Vampiric Blade)
              if (lifesteal > 0 && didHitEnemy && !(e.type === BlockType.MOB_GARGOYLE && e.dormant) &&
                  !(e.type === BlockType.MOB_SKELETON && e.shieldUp)) {
                const healAmt = Math.ceil(ATK_DAMAGE * lifesteal);
                player.hp = Math.min(MAX_HP, player.hp + healAmt);
                spawnEmber(player.x + player.w / 2, player.y + player.h / 3, '#4ade80');
              }
            }
          }
        }

        // AOE (Earthshaker Hammer) — damage all enemies in radius
        if (didHitEnemy && aoeRadius > 0) {
          const aoeCx = player.facingRight ? player.x + player.w + 15 : player.x - 15;
          const aoeCy = player.y + player.h / 2;
          for (const ae of enemies) {
            if (ae.hitFlash > 0) continue; // already hit this frame
            const aeDx = (ae.x + ae.w / 2) - aoeCx;
            const aeDy = (ae.y + ae.h / 2) - aoeCy;
            if (Math.sqrt(aeDx * aeDx + aeDy * aeDy) < aoeRadius) {
              if (ae.type === BlockType.BOSS && !ae.weak) continue;
              if (ae.type === BlockType.MOB_GARGOYLE && ae.dormant) continue;
              ae.hp -= Math.max(1, Math.floor(ATK_DAMAGE * 0.5));
              ae.hitFlash = 8;
              ae.vy = -2;
              spawnEmber(ae.x + ae.w / 2, ae.y + ae.h / 2, '#c084fc');
            }
          }
          // AOE visual shockwave
          screenShakeIntensity = 6;
        }

        // Hit-stop + screen shake + haptic on successful hit
        if (didHitEnemy) {
          hitStopTimer = 5; // ~0.08s freeze for impact
          screenShakeTimer = 6;
          screenShakeIntensity = Math.max(screenShakeIntensity, 4);
          tryVibrate(20); // short haptic tap
        }
      }
      if (player.attackTimer > 0) player.attackTimer--;

      // Enemy updates
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hp <= 0) {
          for (let j = 0; j < 15; j++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#7c3aed');

          // Slime splitting: big slime spawns 2 small slimes
          if (e.type === BlockType.MOB_SLIME && e.slimeSize === 2) {
            for (let s = 0; s < 2; s++) {
              enemies.push({
                x: e.x + (s === 0 ? -T * 0.5 : T * 0.5), y: e.y,
                w: T * 1.2, h: T * 1.2,
                type: BlockType.MOB_SLIME, hp: 2, maxHp: 2,
                vx: s === 0 ? -2.5 : 2.5, vy: -5,
                hitFlash: 0, slimeSize: 1, splitDone: true
              });
            }
            for (let j = 0; j < 6; j++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#22c55e');
          }

          // Item drop
          const droppedItemId = rollDrop(e.type);
          if (droppedItemId) {
            droppedItems.push({
              x: e.x + e.w / 2 - T / 4,
              y: e.y,
              w: T * 0.5, h: T * 0.5,
              vy: -4,
              itemId: droppedItemId,
              life: 600, // 10 seconds to pick up
              grounded: false
            });
          }

          enemies.splice(i, 1);
          continue;
        }
        if (e.hitFlash > 0) e.hitFlash--;

        // Freeze: skip AI update while frozen
        if (e.frozenTimer > 0) {
          e.frozenTimer--;
          continue;
        }

        // Gravity for enemies (skip for stationary mage when grounded, skip for flying imp)
        if (e.type === BlockType.MOB_IMP) {
          // Imp handles its own Y via flying AI — skip gravity
        } else if (e.type !== BlockType.MOB_STATIONARY || e.vy !== 0) {
          e.vy += 0.5;
          const prevEY = e.y;
          e.y += e.vy;
          for (const w of walls) {
            if (checkCol(e, w)) {
              if (e.vy > 0) {
                e.y = w.y - e.h;
                e.vy = 0;
              } else if (e.vy < 0) {
                e.y = w.y + w.h;
                e.vy = 0;
              }
            }
          }
          // Enemies also land on platforms
          if (e.vy >= 0) {
            for (const p of platforms) {
              if (checkCol(e, p) && prevEY + e.h <= p.y + 4) {
                e.y = p.y - e.h;
                e.vy = 0;
              }
            }
          }
        }

        if (e.type === BlockType.MOB_PATROL) {
          e.x += e.vx;
          // Wall collision
          for (const w of walls) {
            if (checkCol(e, w)) {
              if (e.vx > 0) e.x = w.x - e.w;
              else if (e.vx < 0) e.x = w.x + w.w;
              e.vx *= -1;
            }
          }
          // Edge detection: check if ground exists ahead (walls + platforms)
          const checkX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
          const checkY = e.y + e.h + 4;
          let hasFloor = false;
          for (const w of walls) {
            if (checkX >= w.x && checkX <= w.x + w.w && checkY >= w.y && checkY <= w.y + w.h) {
              hasFloor = true;
              break;
            }
          }
          if (!hasFloor) {
            for (const p of platforms) {
              if (checkX >= p.x && checkX <= p.x + p.w && checkY >= p.y && checkY <= p.y + p.h) {
                hasFloor = true;
                break;
              }
            }
          }
          if (!hasFloor && e.vy === 0) {
            e.vx *= -1; // turn at edge
          }
        }

        // Stationary mage: projectile firing
        if (e.type === BlockType.MOB_STATIONARY) {
          e.shootTimer++;
          // Telegraph 30 frames before firing
          if (e.shootTimer >= 90) {
            e.telegraphing = true;
          }
          if (e.shootTimer >= 120) {
            e.shootTimer = 0;
            e.telegraphing = false;
            // Fire toward player
            const dx = player.x - e.x;
            const dy = player.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 4;
            projectiles.push({
              x: e.x + e.w / 2 - 6,
              y: e.y + e.h / 2 - 6,
              vx: (dx / dist) * speed,
              vy: (dy / dist) * speed,
              w: 12, h: 12,
              life: 180
            });
            for (let i = 0; i < 4; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#9333ea');
          }
        }

        if (e.type === BlockType.BOSS) {
          // Enrage: shorter cycles when HP <= 5
          const cycleLen = e.hp <= 5 ? 80 : 120;
          const telegraphStart = cycleLen - 30;
          e.timer++;

          // Telegraph before state change
          if (e.timer > telegraphStart && e.timer <= cycleLen) {
            const intensity = (e.timer - telegraphStart) / 30;
            e.x += Math.sin(e.timer * 1.5) * intensity * 3;
          }
          if (e.timer > cycleLen) { e.weak = !e.weak; e.timer = 0; }

          // Invulnerable phase: charge toward player
          if (!e.weak) {
            const dx = player.x + player.w / 2 - (e.x + e.w / 2);
            const chargeSpeed = e.hp <= 5 ? 3 : 2;
            if (Math.abs(dx) > 20) {
              e.x += dx > 0 ? chargeSpeed : -chargeSpeed;
            }
            // Wall collision during charge
            for (const w of walls) {
              if (checkCol(e, w)) {
                if (dx > 0) e.x = w.x - e.w;
                else e.x = w.x + w.w;
              }
            }
          } else {
            // Weak: drift back toward home position
            const homeDx = e.homeX - e.x;
            if (Math.abs(homeDx) > 2) e.x += homeDx > 0 ? 1 : -1;
          }
        }

        // === GARGOYLE AI ===
        if (e.type === BlockType.MOB_GARGOYLE) {
          const dx = player.x - e.x;
          const dy = player.y - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (e.dormant) {
            // Awaken when player is within 4 tiles
            if (dist < T * 4) {
              e.awakenTimer++;
              if (e.awakenTimer > 30) {
                e.dormant = false;
                e.defBonus = 0;
                // Awaken burst particles
                for (let j = 0; j < 10; j++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#a1a1aa');
              }
            }
          } else {
            // Active: charge toward player aggressively
            const chaseSpeed = 2.5;
            if (Math.abs(dx) > 15) {
              e.vx = dx > 0 ? chaseSpeed : -chaseSpeed;
            } else {
              e.vx = 0;
            }
            // Edge detection: don't walk off platforms
            if (e.vx !== 0 && e.vy === 0) {
              const gCheckX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
              const gCheckY = e.y + e.h + 4;
              let gHasFloor = false;
              for (const w of walls) {
                if (gCheckX >= w.x && gCheckX <= w.x + w.w && gCheckY >= w.y && gCheckY <= w.y + w.h) { gHasFloor = true; break; }
              }
              if (!gHasFloor) {
                for (const p of platforms) {
                  if (gCheckX >= p.x && gCheckX <= p.x + p.w && gCheckY >= p.y && gCheckY <= p.y + p.h) { gHasFloor = true; break; }
                }
              }
              if (!gHasFloor) e.vx = 0;
            }
            e.x += e.vx;
            // Wall collision
            for (const w of walls) {
              if (checkCol(e, w)) {
                if (e.vx > 0) e.x = w.x - e.w;
                else if (e.vx < 0) e.x = w.x + w.w;
                e.vx = 0;
              }
            }
          }
        }

        // === SLIME AI ===
        if (e.type === BlockType.MOB_SLIME) {
          // Patrol like MOB_PATROL but slower
          e.x += e.vx;
          for (const w of walls) {
            if (checkCol(e, w)) {
              if (e.vx > 0) e.x = w.x - e.w;
              else if (e.vx < 0) e.x = w.x + w.w;
              e.vx *= -1;
            }
          }
          // Edge detection
          const sCheckX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
          const sCheckY = e.y + e.h + 4;
          let sHasFloor = false;
          for (const w of walls) {
            if (sCheckX >= w.x && sCheckX <= w.x + w.w && sCheckY >= w.y && sCheckY <= w.y + w.h) {
              sHasFloor = true; break;
            }
          }
          if (!sHasFloor) {
            for (const p of platforms) {
              if (sCheckX >= p.x && sCheckX <= p.x + p.w && sCheckY >= p.y && sCheckY <= p.y + p.h) {
                sHasFloor = true; break;
              }
            }
          }
          if (!sHasFloor && e.vy === 0) e.vx *= -1;
          // Bouncy hop every 60 frames
          if (frameCount % 60 === 0 && e.vy === 0) e.vy = -6;
        }

        // === IMP AI ===
        if (e.type === BlockType.MOB_IMP) {
          e.flyTimer++;
          // Erratic flying pattern — sinusoidal with random offsets
          const flyX = e.homeX + Math.sin(e.flyTimer * 0.03) * T * 3;
          const flyY = e.homeY + Math.cos(e.flyTimer * 0.05) * T * 1.5;
          e.x += (flyX - e.x) * 0.05;
          e.y += (flyY - e.y) * 0.05;
          e.vy = 0; // override gravity for flying enemy

          // Shoot at player every 90 frames
          e.shootTimer++;
          if (e.shootTimer >= 90) {
            e.shootTimer = 0;
            const pdx = player.x - e.x;
            const pdy = player.y - e.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
            const speed = 3.5;
            projectiles.push({
              x: e.x + e.w / 2 - 6, y: e.y + e.h / 2 - 6,
              vx: (pdx / pdist) * speed, vy: (pdy / pdist) * speed,
              w: 10, h: 10, life: 150
            });
            for (let j = 0; j < 3; j++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#f97316');
          }
        }

        // === SKELETON KNIGHT AI ===
        if (e.type === BlockType.MOB_SKELETON) {
          const skDx = player.x + player.w / 2 - (e.x + e.w / 2);
          const skDist = Math.abs(skDx);
          e.facingRight = skDx > 0;

          // Attack cooldown cycle
          e.attackCooldown--;
          if (e.attackCooldown <= 0) {
            // Shield down during attack wind-up
            e.shieldUp = false;
            e.attackTimer++;
            if (e.attackTimer >= 30) {
              // Lunge attack toward player
              e.vx = e.facingRight ? 6 : -6;
              e.vy = -3;
              e.attackTimer = 0;
              e.attackCooldown = 90;
              e.shieldUp = true;
            }
          } else {
            e.shieldUp = true;
            // Slow walk toward player
            if (skDist > T * 2) {
              e.vx = skDx > 0 ? 1 : -1;
            } else {
              e.vx = 0;
            }
          }

          // Edge detection: don't walk off platforms
          if (e.vx !== 0 && e.vy === 0) {
            const skCheckX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
            const skCheckY = e.y + e.h + 4;
            let skHasFloor = false;
            for (const w of walls) {
              if (skCheckX >= w.x && skCheckX <= w.x + w.w && skCheckY >= w.y && skCheckY <= w.y + w.h) { skHasFloor = true; break; }
            }
            if (!skHasFloor) {
              for (const p of platforms) {
                if (skCheckX >= p.x && skCheckX <= p.x + p.w && skCheckY >= p.y && skCheckY <= p.y + p.h) { skHasFloor = true; break; }
              }
            }
            if (!skHasFloor) e.vx = 0;
          }
          e.x += e.vx;
          // Friction on lunge
          if (Math.abs(e.vx) > 1.5) e.vx *= 0.92;
          // Wall collision
          for (const w of walls) {
            if (checkCol(e, w)) {
              if (e.vx > 0) e.x = w.x - e.w;
              else if (e.vx < 0) e.x = w.x + w.w;
              e.vx = 0;
            }
          }
        }
      }

      // Projectile updates
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        // Remove if expired or hits a wall
        let hitWall = false;
        for (const w of walls) {
          if (checkCol(p, w)) { hitWall = true; break; }
        }
        if (p.life <= 0 || hitWall) {
          if (hitWall) {
            for (let j = 0; j < 3; j++) spawnEmber(p.x + p.w / 2, p.y + p.h / 2, '#9333ea');
          }
          projectiles.splice(i, 1);
        }
      }

      // Damage — hurtbox is ~15% smaller than collision for mobile forgiveness
      if (player.invulnTimer <= 0) {
        const shrink = 4;
        const hurtBox = {
          x: player.x + shrink,
          y: player.y + shrink,
          w: player.w - shrink * 2,
          h: player.h - shrink
        };
        let hit = false;
        let hitByEnemy: any = null;
        for (const s of spikes) if (checkCol(hurtBox, s)) hit = true;
        for (const e of enemies) { if (checkCol(hurtBox, e)) { hit = true; hitByEnemy = e; } }
        for (const p of projectiles) if (checkCol(hurtBox, p)) hit = true;
        if (hit) {
          const dmg = Math.max(5, 20 - bonusDef * 3);
          player.hp -= dmg;
          player.invulnTimer = 60;
          player.vy = -8;
          player.vx = player.facingRight ? -5 : 5;
          damageFlashTimer = 20;
          screenShakeTimer = 8;
          screenShakeIntensity = 6;
          tryVibrate([100, 50, 100]); // strong haptic on damage
          for (let i = 0; i < 8; i++) spawnEmber(player.x + player.w / 2, player.y + player.h / 2, '#cc2200');

          // Thornmail: reflect damage back to attacker
          if (thornsDmg > 0 && hitByEnemy) {
            const reflected = Math.ceil(dmg * thornsDmg);
            hitByEnemy.hp -= reflected;
            hitByEnemy.hitFlash = 8;
            for (let i = 0; i < 4; i++) spawnEmber(hitByEnemy.x + hitByEnemy.w / 2, hitByEnemy.y + hitByEnemy.h / 2, '#facc15');
          }
        }
      }
      if (player.invulnTimer > 0) player.invulnTimer--;

      // Potion pickup → instant HP heal
      for (let i = potions.length - 1; i >= 0; i--) {
        if (checkCol(player, potions[i])) {
          const pt = potions[i];
          for (let j = 0; j < 8; j++) spawnEmber(pt.x + pt.w / 2, pt.y + pt.h / 2, '#4ade80');
          spawnHitSparks(pt.x + pt.w / 2, pt.y + pt.h / 2, 6);
          potions.splice(i, 1);
          tryVibrate(15);
          // Heal HP instantly (30 HP per potion)
          player.hp = Math.min(player.hp + 30, MAX_HP);
        }
      }

      // Dropped item physics & pickup
      for (let i = droppedItems.length - 1; i >= 0; i--) {
        const di = droppedItems[i];
        di.life--;
        if (di.life <= 0) { droppedItems.splice(i, 1); continue; }

        // Gravity
        if (!di.grounded) {
          di.vy += 0.5;
          di.y += di.vy;
          // Land on walls
          for (const w of walls) {
            if (checkCol(di, w) && di.vy > 0) {
              di.y = w.y - di.h;
              di.vy = 0;
              di.grounded = true;
            }
          }
          // Land on platforms
          for (const p of platforms) {
            if (checkCol(di, p) && di.vy > 0) {
              di.y = p.y - di.h;
              di.vy = 0;
              di.grounded = true;
            }
          }
        }

        // Pickup
        if (checkCol(player, di)) {
          const item = getItem(di.itemId);
          if (item) {
            // Add to pickedUpItems
            const existing = pickedUpItemsRef.current.find(pi => pi.itemId === di.itemId);
            if (existing) existing.quantity++;
            else pickedUpItemsRef.current.push({ itemId: di.itemId, quantity: 1 });

            // Immediately reflect in in-game inventory (bag UI)
            if (item.type === 'consumable') {
              setInGameInventory(prev => {
                const copy = prev.map(i => ({ ...i }));
                const ex = copy.find(i => i.itemId === di.itemId);
                if (ex) { ex.quantity++; return copy; }
                return [...copy, { itemId: di.itemId, quantity: 1 }];
              });
            }

            // Particle feedback
            const rarityColor = item.rarity === 'epic' ? '#c084fc' : item.rarity === 'rare' ? '#38bdf8' : '#a1a1aa';
            for (let j = 0; j < 8; j++) spawnEmber(di.x + di.w / 2, di.y + di.h / 2, rarityColor);
            spawnHitSparks(di.x + di.w / 2, di.y + di.h / 2, 6);
            tryVibrate(15);
            // Show item pickup message
            itemMessages.push({ text: `${item.nameKo} 획득!`, color: rarityColor, life: 120, maxLife: 120 });
          }
          droppedItems.splice(i, 1);
        }
      }

      // Regen Ring: heal over time
      if (regenRate > 0) {
        regenTimer++;
        if (regenTimer >= 300) { // 5 seconds at 60fps
          regenTimer = 0;
          const healAmt = Math.max(1, Math.ceil(MAX_HP * regenRate));
          if (player.hp < MAX_HP) {
            player.hp = Math.min(MAX_HP, player.hp + healAmt);
            spawnEmber(player.x + player.w / 2, player.y + player.h / 3, '#4ade80');
          }
        }
      }

      // Door — next floor
      if (door && checkCol(player, door)) {
        if (currentRoomIdx < level.rooms.length - 1) {
          currentRoomIdx++;
          loadRoom(currentRoomIdx);
          transitionTimer = 40;
          cameraY = worldH - GAME_H; // start camera at bottom
        } else {
          onWinRef.current(pickedUpItemsRef.current);
          return;
        }
      }

      if (player.hp <= 0) { onLoseRef.current(pickedUpItemsRef.current); return; }

      } // end of !frozen physics block

      // === CAMERA ===
      // Smooth horizontal follow
      const targetCamX = player.x + player.w / 2 - GAME_W / 2;
      cameraX += (targetCamX - cameraX) * 0.12;
      cameraX = Math.max(0, Math.min(WORLD_W - GAME_W, cameraX));

      // Smooth vertical follow — player stays in upper-middle of screen
      const targetCamY = player.y - GAME_H * 0.4;
      cameraY += (targetCamY - cameraY) * 0.1;
      cameraY = Math.max(0, Math.min(worldH - GAME_H, cameraY));

      // Decay timers
      if (screenShakeTimer > 0) screenShakeTimer--;
      if (damageFlashTimer > 0) damageFlashTimer--;

      // === RENDER ===
      ctx.save();
      ctx.fillStyle = '#0d0a07';
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // Screen shake offset
      let shakeX = 0, shakeY = 0;
      if (screenShakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * screenShakeIntensity * 2;
        shakeY = (Math.random() - 0.5) * screenShakeIntensity * 2;
      }

      ctx.translate(-cameraX + shakeX, -cameraY + shakeY);

      // Floor tiles (only visible rows for performance)
      const grid = level.rooms[currentRoomIdx].grid;
      const rows = grid.length;
      const cols = grid[0].length;
      const startRow = Math.max(0, Math.floor(cameraY / T) - 1);
      const endRow = Math.min(rows, Math.ceil((cameraY + GAME_H) / T) + 1);

      for (let r = startRow; r < endRow; r++) {
        for (let c = 0; c < cols; c++) {
          const val = grid[r][c];
          if (val === BlockType.EMPTY || val === BlockType.MOB_PATROL || val === BlockType.MOB_STATIONARY || val === BlockType.BOSS || val === BlockType.SPAWN || val === BlockType.PLATFORM || val === BlockType.POTION || val === BlockType.MOB_GARGOYLE || val === BlockType.MOB_SLIME || val === BlockType.MOB_IMP || val === BlockType.MOB_SKELETON) {
            ctx.globalAlpha = 0.15;
            ctx.drawImage(SPRITES.floor, c * T, r * T, T, T);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Tower wall torch glow (fixed positions along walls)
      const visibleTorches = [];
      for (let ty = 2; ty < rows; ty += 5) {
        visibleTorches.push({ x: T * 0.7, y: ty * T + T / 2 });
        visibleTorches.push({ x: (cols - 1) * T + T * 0.3, y: ty * T + T / 2 });
      }
      for (const torch of visibleTorches) {
        if (torch.y < cameraY - 150 || torch.y > cameraY + GAME_H + 150) continue;
        const flicker = 0.6 + Math.sin(frameCount * 0.05 + torch.x + torch.y) * 0.15;
        const g = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, 100);
        g.addColorStop(0, `rgba(194, 65, 12, ${0.1 * flicker})`);
        g.addColorStop(0.5, `rgba(212, 160, 23, ${0.04 * flicker})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(torch.x - 100, torch.y - 100, 200, 200);

        if (frameCount % 20 === 0 && Math.random() > 0.6) {
          spawnEmber(torch.x + (Math.random() - 0.5) * 15, torch.y);
        }
      }

      // Walls
      for (const w of walls) {
        if (w.y + w.h < cameraY - 10 || w.y > cameraY + GAME_H + 10) continue;
        ctx.drawImage(SPRITES.wall, w.x, w.y, w.w, w.h);
      }

      // Platforms
      for (const p of platforms) {
        if (p.y + p.h < cameraY - 10 || p.y > cameraY + GAME_H + 10) continue;
        // Draw the platform sprite at the full tile position (visual is full tile, collision is bottom only)
        ctx.drawImage(SPRITES.platform, p.x, p.y - Math.floor(T * 0.7), T, T);
      }

      // Spikes
      for (const s of spikes) {
        if (s.y + s.h < cameraY - 10 || s.y > cameraY + GAME_H + 10) continue;
        ctx.drawImage(SPRITES.spike, s.x, s.y, s.w, s.h);
      }

      // Potions — floating with glow
      for (const pt of potions) {
        if (pt.y + pt.h < cameraY - 10 || pt.y > cameraY + GAME_H + 10) continue;
        const floatY = Math.sin(frameCount * 0.05 + pt.x) * 3;
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#4ade80';
        ctx.drawImage(SPRITES.potion, pt.x, pt.y + floatY, pt.w, pt.h);
        ctx.restore();
      }

      // Enemies
      for (const e of enemies) {
        if (e.y + e.h < cameraY - 20 || e.y > cameraY + GAME_H + 20) continue;
        ctx.save();
        if (e.hitFlash > 0) ctx.filter = 'brightness(3) saturate(0)';

        if (e.type === BlockType.MOB_PATROL) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#7c3aed';
          const pf = Math.floor(frameCount / 12) % 2;
          const ps = ANIM.patrol.walk[pf];
          if (e.vx < 0) {
            ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(e.x + e.w / 2), -(e.y + e.h / 2));
          }
          ctx.drawImage(ps, e.x, e.y, e.w, e.h);
        }
        if (e.type === BlockType.MOB_STATIONARY) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#9333ea';
          const floatY = Math.sin(frameCount * 0.04) * 4;
          // Telegraph glow before firing
          if (e.telegraphing) {
            const pulse = (e.shootTimer - 90) / 30;
            ctx.shadowBlur = 25 + pulse * 20;
            ctx.shadowColor = '#e879f9';
            // Pulsing glow
            const tg = ctx.createRadialGradient(e.x + e.w/2, e.y + e.h/2 + floatY, 5, e.x + e.w/2, e.y + e.h/2 + floatY, 50);
            tg.addColorStop(0, `rgba(232, 121, 249, ${pulse * 0.5})`);
            tg.addColorStop(1, 'rgba(232, 121, 249, 0)');
            ctx.fillStyle = tg;
            ctx.fillRect(e.x - 30, e.y - 30 + floatY, e.w + 60, e.h + 60);
          }
          const cf = Math.floor(frameCount / 20) % 2;
          ctx.drawImage(ANIM.stationary.cast[cf], e.x, e.y + floatY, e.w, e.h);
        }
        if (e.type === BlockType.BOSS) {
          // Telegraph glow before state change
          const bossCycle = e.hp <= 5 ? 80 : 120;
          const bossTelegraphStart = bossCycle - 30;
          if (e.timer > bossTelegraphStart) {
            const pulse = (e.timer - bossTelegraphStart) / 30;
            const telegraphColor = e.weak ? 'rgba(139,0,0,' : 'rgba(252,165,165,';
            const tg = ctx.createRadialGradient(e.x + e.w/2, e.y + e.h/2, 10, e.x + e.w/2, e.y + e.h/2, 80);
            tg.addColorStop(0, telegraphColor + (pulse * 0.4) + ')');
            tg.addColorStop(1, telegraphColor + '0)');
            ctx.fillStyle = tg;
            ctx.fillRect(e.x - 40, e.y - 40, e.w + 80, e.h + 80);
          }
          ctx.shadowBlur = 25;
          ctx.shadowColor = e.weak ? '#fca5a5' : '#8b0000';
          if (e.hitFlash > 0) {
            ctx.filter = 'brightness(3) saturate(0)';
          } else if (e.weak) {
            ctx.filter = 'brightness(1.3) hue-rotate(60deg)';
          } else {
            // Invuln + charging: angry red glow
            ctx.filter = 'brightness(1.1) saturate(1.5)';
            ctx.shadowBlur = 35;
            ctx.shadowColor = '#ff0000';
          }
          const bf = Math.floor(frameCount / (e.weak ? 30 : 15)) % 2; // faster animation when charging
          ctx.drawImage(ANIM.boss.idle[bf], e.x, e.y, e.w, e.h);
        }

        // === GARGOYLE RENDERING ===
        if (e.type === BlockType.MOB_GARGOYLE) {
          if (e.dormant) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#52525b';
            ctx.filter = e.hitFlash > 0 ? 'brightness(3) saturate(0)' : 'saturate(0) brightness(0.7)';
          } else {
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#ef4444';
            ctx.filter = e.hitFlash > 0 ? 'brightness(3) saturate(0)' : 'brightness(1.2)';
          }
          const gf = e.dormant ? 0 : Math.floor(frameCount / 20) % ANIM.gargoyle.idle.length;
          ctx.drawImage(ANIM.gargoyle.idle[gf], e.x, e.y, e.w, e.h);
        }

        // === SLIME RENDERING ===
        if (e.type === BlockType.MOB_SLIME) {
          const bounce = Math.sin(frameCount * 0.1) * 3;
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#22c55e';
          if (e.slimeSize === 1) ctx.filter = e.hitFlash > 0 ? 'brightness(3) saturate(0)' : 'brightness(1.3)';
          const sf = Math.floor(frameCount / 18) % ANIM.slime.idle.length;
          ctx.drawImage(ANIM.slime.idle[sf], e.x, e.y + bounce, e.w, e.h);
        }

        // === IMP RENDERING ===
        if (e.type === BlockType.MOB_IMP) {
          const floatY = Math.sin(frameCount * 0.08) * 4;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#f97316';
          const imf = Math.floor(frameCount / 15) % ANIM.imp.idle.length;
          ctx.drawImage(ANIM.imp.idle[imf], e.x, e.y + floatY, e.w, e.h);
        }

        // === SKELETON KNIGHT RENDERING ===
        if (e.type === BlockType.MOB_SKELETON) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = e.shieldUp ? '#a1a1aa' : '#ef4444';
          if (!e.facingRight) {
            ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(e.x + e.w / 2), -(e.y + e.h / 2));
          }
          const skf = Math.floor(frameCount / 22) % ANIM.skeletonKnight.idle.length;
          ctx.drawImage(ANIM.skeletonKnight.idle[skf], e.x, e.y, e.w, e.h);
        }

        // Frozen overlay for any enemy
        if (e.frozenTimer > 0) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
          ctx.fillRect(e.x, e.y, e.w, e.h);
          // Ice crystals
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          for (let ic = 0; ic < 3; ic++) {
            const ix = e.x + e.w * (0.2 + ic * 0.3);
            const iy = e.y + e.h * 0.3;
            ctx.beginPath();
            ctx.moveTo(ix, iy);
            ctx.lineTo(ix - 4, iy + 10);
            ctx.moveTo(ix, iy);
            ctx.lineTo(ix + 4, iy + 10);
            ctx.moveTo(ix, iy);
            ctx.lineTo(ix, iy + 12);
            ctx.stroke();
          }
        }

        ctx.restore();

        // HP bar
        if (e.hp < e.maxHp) {
          const barW = e.w;
          const barH = 5;
          const barX = e.x;
          const barY = e.y - 12;
          ctx.fillStyle = '#1a1510';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = e.type === BlockType.BOSS ? '#8b0000' : '#7c3aed';
          ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
          ctx.strokeStyle = '#5a4d3e';
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barW, barH);
        }

        if (e.type === BlockType.BOSS && e.weak) {
          ctx.fillStyle = '#d4a017';
          ctx.font = 'bold 16px "Cinzel", serif';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#d4a017';
          ctx.fillText('VULNERABLE', e.x + e.w / 2, e.y - 18);
          ctx.shadowBlur = 0;
          ctx.textAlign = 'start';
        }
      }

      // Dropped items
      for (const di of droppedItems) {
        if (di.y + di.h < cameraY - 20 || di.y > cameraY + GAME_H + 20) continue;
        const item = getItem(di.itemId);
        if (!item) continue;
        ctx.save();
        const floatY = Math.sin(frameCount * 0.08 + di.x) * 3;
        const rarityColor = item.rarity === 'epic' ? '#c084fc' : item.rarity === 'rare' ? '#38bdf8' : '#a1a1aa';
        // Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = rarityColor;
        // Background circle
        ctx.fillStyle = rarityColor;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(di.x + di.w / 2, di.y + di.h / 2 + floatY, di.w * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        // Item icon (small colored square with rarity border)
        ctx.fillStyle = '#18181b';
        ctx.fillRect(di.x + 2, di.y + 2 + floatY, di.w - 4, di.h - 4);
        ctx.strokeStyle = rarityColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(di.x + 2, di.y + 2 + floatY, di.w - 4, di.h - 4);
        // Item type icon
        ctx.fillStyle = rarityColor;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const typeChar = item.type === 'weapon' ? '⚔' : item.type === 'armor' ? '🛡' : item.type === 'boots' ? '👢' : item.type === 'accessory' ? '💍' : '✦';
        ctx.fillText(typeChar, di.x + di.w / 2, di.y + di.h / 2 + 4 + floatY);
        ctx.textAlign = 'start';
        // Blink when about to expire
        if (di.life < 120 && Math.floor(di.life / 8) % 2 === 0) {
          ctx.globalAlpha = 0.3;
        }
        ctx.restore();
      }

      // Projectiles
      for (const p of projectiles) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#9333ea';
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        // Inner glow
        ctx.fillStyle = '#e879f9';
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Door
      if (door) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#d4a017';
        ctx.drawImage(SPRITES.door, door.x, door.y, door.w, door.h);
        ctx.shadowBlur = 0;

        const doorPulse = 0.3 + Math.sin(frameCount * 0.03) * 0.15;
        const dg = ctx.createRadialGradient(door.x + T / 2, door.y + T / 2, 5, door.x + T / 2, door.y + T / 2, 60);
        dg.addColorStop(0, `rgba(212, 160, 23, ${doorPulse})`);
        dg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = dg;
        ctx.fillRect(door.x - 40, door.y - 40, T + 80, T + 80);

        // Arrow indicator pointing up
        ctx.fillStyle = '#d4a017';
        ctx.globalAlpha = 0.5 + Math.sin(frameCount * 0.06) * 0.3;
        ctx.font = 'bold 20px serif';
        ctx.textAlign = 'center';
        ctx.fillText('▲', door.x + T / 2, door.y - 10);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'start';
      }

      // Player
      if (player.invulnTimer % 10 < 5) {
        ctx.save();
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#38bdf8';

        // Draw sprite centered on collision box, but bigger
        const drawX = player.x + player.w / 2 - PLAYER_DRAW_W / 2;
        const drawY = player.y + player.h - PLAYER_DRAW_H;

        // During wall slide, face toward the wall (sprite faces wall)
        const renderFacingRight = player.wallSlideDir !== 0
          ? player.wallSlideDir > 0   // on right wall → face right (toward wall)
          : player.facingRight;

        if (!renderFacingRight) {
          const cx = drawX + PLAYER_DRAW_W / 2;
          const cy = drawY + PLAYER_DRAW_H / 2;
          ctx.translate(cx, cy);
          ctx.scale(-1, 1);
          ctx.translate(-cx, -cy);
        }

        let heroSprite: HTMLImageElement;
        if (player.wallSlideDir !== 0) {
          heroSprite = ANIM.hero.wallslide[0];
        } else if (player.attackTimer > 12) {
          heroSprite = ANIM.hero.attack[0];
        } else if (Math.abs(player.vx) > 0) {
          heroSprite = ANIM.hero.run[Math.floor(frameCount / 8) % 2];
        } else {
          heroSprite = ANIM.hero.idle[0];
        }
        ctx.drawImage(heroSprite, drawX, drawY, PLAYER_DRAW_W, PLAYER_DRAW_H);
        ctx.restore();
      }

      // Slash trails
      for (let i = slashTrails.length - 1; i >= 0; i--) {
        const s = slashTrails[i];
        s.life--;
        if (s.life <= 0) { slashTrails.splice(i, 1); continue; }
        const alpha = s.life / 14;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.beginPath();
        ctx.arc(0, 0, s.size, -0.6, 0.6);
        ctx.lineWidth = 3 * alpha;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 0.8, -0.4, 0.4);
        ctx.lineWidth = 2 * alpha;
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.5})`;
        ctx.stroke();
        ctx.restore();
      }

      // Hit sparks — cyan/white burst on enemy hit
      for (let i = hitSparks.length - 1; i >= 0; i--) {
        const sp = hitSparks[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.9; // friction
        sp.vy *= 0.9;
        sp.life--;
        if (sp.life <= 0) { hitSparks.splice(i, 1); continue; }
        const alpha = sp.life / 20;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = sp.color;
        ctx.fillStyle = sp.color;
        // Draw cross/star shape
        const sz = sp.size * alpha;
        ctx.fillRect(sp.x - sz, sp.y - 1, sz * 2, 2);
        ctx.fillRect(sp.x - 1, sp.y - sz, 2, sz * 2);
        ctx.restore();
      }

      // Ember particles
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.x += e.vx;
        e.y += e.vy;
        e.life--;
        if (e.life <= 0) { embers.splice(i, 1); continue; }
        const alpha = e.life / e.maxLife;
        ctx.fillStyle = e.color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      ctx.restore(); // Undo camera translation

      // === HUD (screen space, not world space) ===

      // Vignette
      const vignette = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 200, GAME_W / 2, GAME_H / 2, 500);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.7, 'rgba(13,10,7,0.35)');
      vignette.addColorStop(1, 'rgba(13,10,7,0.8)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // Damage flash — red vignette on hit
      if (damageFlashTimer > 0) {
        const flashAlpha = (damageFlashTimer / 20) * 0.6;
        const dmgVig = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 100, GAME_W / 2, GAME_H / 2, 400);
        dmgVig.addColorStop(0, 'rgba(204, 34, 0, 0)');
        dmgVig.addColorStop(0.6, `rgba(204, 34, 0, ${flashAlpha * 0.3})`);
        dmgVig.addColorStop(1, `rgba(204, 34, 0, ${flashAlpha})`);
        ctx.fillStyle = dmgVig;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
      }

      // Floor indicator
      ctx.fillStyle = '#d4a017';
      ctx.font = 'bold 18px "Cinzel", serif';
      ctx.textAlign = 'right';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#d4a017';
      ctx.fillText(`${currentRoomIdx + 1}F / ${level.rooms.length}F`, GAME_W - 20, 36);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'start';

      // HP gauge bar
      const hpBarX = 16;
      const hpBarY = 24;
      const hpBarW = 120;
      const hpBarH = 10;
      const hpRatio = Math.max(0, player.hp / MAX_HP);
      // Background
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
      // HP fill — color shifts from green to yellow to red
      const hpColor = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#facc15' : '#ef4444';
      ctx.fillStyle = hpColor;
      ctx.shadowBlur = 6;
      ctx.shadowColor = hpColor;
      ctx.fillRect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
      ctx.shadowBlur = 0;
      // Border
      ctx.strokeStyle = '#5a4d3e';
      ctx.lineWidth = 1;
      ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);
      // HP text
      ctx.fillStyle = '#e8dcc8';
      ctx.font = 'bold 9px "Cinzel", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.ceil(player.hp)} / ${MAX_HP}`, hpBarX + 2, hpBarY + 9);
      ctx.textAlign = 'start';

      // Height indicator bar (right side)
      const barX = GAME_W - 10;
      const barH = GAME_H - 80;
      const barTop = 50;
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(barX, barTop, 6, barH);
      ctx.strokeStyle = '#3d3630';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barTop, 6, barH);
      // Player position on bar (vertical: Y progress bottom-to-top, horizontal: X progress left-to-right)
      const isHoriz = gridCols > gridRows;
      const progress = isHoriz
        ? player.x / WORLD_W
        : 1 - (player.y / worldH);
      const dotY = barTop + barH * (1 - progress);
      ctx.fillStyle = '#38bdf8';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#38bdf8';
      ctx.beginPath();
      ctx.arc(barX + 3, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Door marker
      if (door) {
        const doorProgress = isHoriz
          ? door.x / WORLD_W
          : 1 - (door.y / worldH);
        const doorDotY = barTop + barH * (1 - doorProgress);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(barX - 2, doorDotY - 2, 10, 4);
      }

      // Item pickup messages (screen-space, stacked from bottom)
      for (let i = itemMessages.length - 1; i >= 0; i--) {
        const msg = itemMessages[i];
        msg.life--;
        if (msg.life <= 0) { itemMessages.splice(i, 1); continue; }
        const alpha = Math.min(1, msg.life / 30); // fade out in last 30 frames
        const yOffset = (itemMessages.length - 1 - i) * 22;
        const msgY = GAME_H - 60 - yOffset;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 11px "Cinzel", sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(msg.text, GAME_W / 2, msgY);
        ctx.fillStyle = msg.color;
        ctx.fillText(msg.text, GAME_W / 2, msgY);
        ctx.textAlign = 'start';
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Floor transition overlay
      if (transitionTimer > 0) {
        transitionTimer--;
        const alpha = transitionTimer / 40;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        ctx.fillRect(0, 0, GAME_W, GAME_H);
      }

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Sync pause state
  useEffect(() => {
    pausedRef.current = inventoryOpen;
  }, [inventoryOpen]);

  const handleUseItemInGame = (itemId: string) => {
    // Apply heal via ref
    useItemRef.current?.(itemId);
    // Decrement from in-game inventory
    setInGameInventory(prev => {
      const copy = prev.map(i => ({ ...i }));
      const item = copy.find(i => i.itemId === itemId);
      if (item) item.quantity--;
      return copy.filter(i => i.quantity > 0);
    });
    // Also decrement from persistent inventory
    const newInv = stats.inventory.map(i => {
      if (i.itemId === itemId) return { ...i, quantity: i.quantity - 1 };
      return { ...i };
    }).filter(i => i.quantity > 0);
    onSaveInventory(newInv);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-start md:justify-center min-h-[100dvh] bg-[#0d0a07] p-1 md:p-4 relative"
    >
      <div className="mb-1 md:mb-4 text-center relative z-10 mt-1 md:mt-0 flex items-start justify-center gap-3">
        <div>
          <h2 className="text-lg md:text-3xl font-display font-black text-[#d4a017] tracking-widest glow-gold">{level.name}</h2>
          <p className="text-[#8b7355] font-medieval tracking-wide text-[10px] md:text-sm">
            제작자: <span className="text-[#e8dcc8]">{level.creator}</span>
            <span className="mx-1.5 md:mx-3 text-[#3d3630]">|</span>
            악명: <span className="text-[#7c3aed]">{level.infamy}</span>
          </p>
        </div>
        {onQuit && (
          <button
            onClick={onQuit}
            className="px-3 py-1.5 rounded-lg text-xs font-medieval text-[#8b7355] border border-[#3d3630]/50 hover:border-[#5a4d3e] hover:text-[#d4a017] transition-all bg-[#1a1510]/80"
          >
            포기
          </button>
        )}
      </div>

      <div className="relative z-10 rounded-lg border border-[#3d3630]/50 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={GAME_W}
          height={GAME_H}
          className="bg-[#0d0a07] block"
          style={{
            touchAction: 'none',
            width: canvasSize.w,
            height: canvasSize.h,
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {!isMobile && (
        <p className="mt-2 text-[#5a4d3e] font-medieval text-xs tracking-wide z-10">
          이동: ← → | 점프: ↑ | 공격: Space | 보관함: I
        </p>
      )}

      {/* Inventory button (top-right, both mobile and desktop) */}
      <button
        onClick={() => setInventoryOpen(true)}
        className="fixed top-3 right-3 z-50 w-10 h-10 rounded-lg bg-[#1a1510]/80 border border-[#3d3630]/50 flex items-center justify-center text-[#d4a017] text-lg hover:border-[#5a4d3e] transition-all"
      >
        🎒
      </button>

      {isMobile && (
        <>
          {/* Left D-pad: single touch zone with slide support */}
          <div
            className="fixed z-50 select-none flex gap-0 items-end"
            style={{ left: '4px', bottom: 'max(8px, calc(env(safe-area-inset-bottom) + 4px))' }}
            onTouchStart={(e) => {
              e.preventDefault();
              const touch = e.changedTouches[0];
              const rect = e.currentTarget.getBoundingClientRect();
              const mid = rect.left + rect.width / 2;
              keysRef.current.ArrowLeft = touch.clientX < mid;
              keysRef.current.ArrowRight = touch.clientX >= mid;
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const mid = rect.left + rect.width / 2;
              // Find touch within this element's bounds
              let found = false;
              for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];
                if (t.clientX >= rect.left && t.clientX <= rect.right &&
                    t.clientY >= rect.top && t.clientY <= rect.bottom) {
                  keysRef.current.ArrowLeft = t.clientX < mid;
                  keysRef.current.ArrowRight = t.clientX >= mid;
                  found = true;
                  break;
                }
              }
              if (!found) {
                keysRef.current.ArrowLeft = false;
                keysRef.current.ArrowRight = false;
              }
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              // Check if any remaining touch is still in this element
              const rect = e.currentTarget.getBoundingClientRect();
              let stillTouching = false;
              for (let i = 0; i < e.touches.length; i++) {
                const t = e.touches[i];
                if (t.clientX >= rect.left && t.clientX <= rect.right &&
                    t.clientY >= rect.top && t.clientY <= rect.bottom) {
                  const mid = rect.left + rect.width / 2;
                  keysRef.current.ArrowLeft = t.clientX < mid;
                  keysRef.current.ArrowRight = t.clientX >= mid;
                  stillTouching = true;
                  break;
                }
              }
              if (!stillTouching) {
                keysRef.current.ArrowLeft = false;
                keysRef.current.ArrowRight = false;
              }
            }}
            onTouchCancel={() => {
              keysRef.current.ArrowLeft = false;
              keysRef.current.ArrowRight = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="w-[80px] h-[80px] rounded-2xl btn-medieval text-[#d4a017] text-3xl font-bold flex items-center justify-center opacity-70 pointer-events-none">←</div>
            <div className="w-[80px] h-[80px] rounded-2xl btn-medieval text-[#d4a017] text-3xl font-bold flex items-center justify-center opacity-70 pointer-events-none">→</div>
          </div>

          {/* Right action buttons: fixed to bottom-right corner */}
          <div className="fixed z-50 select-none flex gap-1 items-end"
            style={{ right: '4px', bottom: 'max(8px, calc(env(safe-area-inset-bottom) + 4px))' }}
          >
            <button
              className="w-[72px] h-[72px] rounded-2xl btn-medieval text-[#cc2200] text-sm font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.Space = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.Space = false; }}
              onTouchCancel={() => { keysRef.current.Space = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >ATK</button>
            <button
              className="w-[92px] h-[92px] rounded-2xl btn-medieval text-[#38bdf8] text-sm font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowUp = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowUp = false; }}
              onTouchCancel={() => { keysRef.current.ArrowUp = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >JUMP</button>
          </div>
        </>
      )}

      {/* Inventory overlay */}
      {inventoryOpen && (
        <InventoryPanel
          inventory={inGameInventory}
          equipment={stats.equipment}
          onUseItem={handleUseItemInGame}
          onClose={() => setInventoryOpen(false)}
          mode="ingame"
        />
      )}
    </motion.div>
  );
}
