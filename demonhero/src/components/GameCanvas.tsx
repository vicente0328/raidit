import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LevelData, BlockType } from '../types';
import { motion } from 'motion/react';
import { SPRITES, ANIM } from '../sprites';
import { TOWER_COLS, TOWER_ROWS } from '../utils';

interface Props {
  level: LevelData;
  onWin: () => void;
  onLose: () => void;
  onQuit?: () => void;
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
// World height for one floor
const WORLD_H = TOWER_ROWS * T; // 1200

export function GameCanvas({ level, onWin, onLose, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, Space: false });
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
    const WORLD_W = TOWER_COLS * T; // full world width

    let transitionTimer = 0;
    let embers: Ember[] = [];
    let slashTrails: { x: number; y: number; angle: number; life: number; size: number }[] = [];

    // Juice systems
    let coyoteTimer = 0;        // frames since leaving ground (coyote time)
    let jumpBufferTimer = 0;    // frames since jump was pressed in air
    let hitStopTimer = 0;       // freeze frames on hit
    let screenShakeTimer = 0;   // screen shake duration
    let screenShakeIntensity = 0;
    let damageFlashTimer = 0;   // red vignette on damage
    const COYOTE_FRAMES = 8;    // ~0.13s at 60fps
    const JUMP_BUFFER_FRAMES = 8;

    // Player — collision box is tight body (1 tile wide, ~1.5 tiles tall), sprite renders at 2 tiles
    const PLAYER_DRAW_W = 2 * T;
    const PLAYER_DRAW_H = 2 * T + 16;
    let player = {
      x: 3 * T, y: (TOWER_ROWS - 3) * T - (T + T / 2),
      w: T - 8, h: T + T / 2, // collision: narrow body (40px wide, 72px tall) — no sword/arm overlap
      vx: 0, vy: 0,
      hp: 5,
      isGrounded: false,
      facingRight: true,
      attackTimer: 0,
      invulnTimer: 0
    };

    let walls: { x: number; y: number; w: number; h: number }[] = [];
    let platforms: { x: number; y: number; w: number; h: number }[] = []; // one-way platforms
    let spikes: { x: number; y: number; w: number; h: number }[] = [];
    let enemies: any[] = [];
    let projectiles: { x: number; y: number; vx: number; vy: number; w: number; h: number; life: number }[] = [];
    let door: { x: number; y: number; w: number; h: number } | null = null;

    const loadRoom = (idx: number) => {
      walls = [];
      platforms = [];
      spikes = [];
      enemies = [];
      projectiles = [];
      door = null;
      embers = [];
      const grid = level.rooms[idx].grid;
      const rows = grid.length;
      const cols = grid[0].length;
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
          if (val === BlockType.DOOR) door = { x, y, w: T, h: T };
          if (val === BlockType.SPAWN) {
            player.x = x + (T - player.w) / 2;
            player.y = y - player.h;
          }
        }
      }
    };

    loadRoom(0);

    const keys = keysRef.current;

    let prevArrowUp = false;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
      if (e.code === 'ArrowRight') keys.ArrowRight = true;
      if (e.code === 'ArrowUp') keys.ArrowUp = true;
      if (e.code === 'Space') keys.Space = true;
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

    const worldH = level.rooms[0].grid.length * T;

    const update = () => {
      // Hit-stop: freeze game for impact feel
      if (hitStopTimer > 0) {
        hitStopTimer--;
        // Still render, just don't update game state
        animationFrameId = requestAnimationFrame(update);
        return;
      }

      frameCount++;

      // === PHYSICS ===
      player.vy += 1.0;

      // Variable jump: cut jump short when key released
      if (!keys.ArrowUp && player.vy < -4) {
        player.vy = -4; // cap upward velocity for short hops
      }

      if (keys.ArrowLeft) { player.vx = -5; player.facingRight = false; }
      else if (keys.ArrowRight) { player.vx = 5; player.facingRight = true; }
      else { player.vx = 0; }

      // Coyote time tracking
      if (player.isGrounded) {
        coyoteTimer = COYOTE_FRAMES;
      } else {
        if (coyoteTimer > 0) coyoteTimer--;
      }

      // Jump buffer: set on fresh press, decay over time
      if (keys.ArrowUp && !prevArrowUp) jumpBufferTimer = JUMP_BUFFER_FRAMES;
      if (jumpBufferTimer > 0) jumpBufferTimer--;
      prevArrowUp = keys.ArrowUp;

      // Jump: works with coyote time OR jump buffer
      const canJump = player.isGrounded || coyoteTimer > 0;
      const wantsJump = keys.ArrowUp && jumpBufferTimer > 0;
      if ((keys.ArrowUp && canJump) || (wantsJump && player.isGrounded)) {
        player.vy = -15;
        player.isGrounded = false;
        coyoteTimer = 0;
        jumpBufferTimer = 0;
      }

      // Horizontal movement + collision
      player.x += player.vx;
      for (const w of walls) {
        if (checkCol(player, w)) {
          if (player.vx > 0) player.x = w.x - player.w;
          else if (player.vx < 0) player.x = w.x + w.w;
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

      // Fall off bottom = damage + respawn at last ground
      if (player.y > worldH + 50) {
        player.hp -= 1;
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

      // Attack
      if (keys.Space && player.attackTimer <= 0) {
        player.attackTimer = 20;
        const hitBox = {
          x: player.facingRight ? player.x + player.w : player.x - 60,
          y: player.y,
          w: 60,
          h: player.h
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
            if (e.type === BlockType.BOSS) {
              if (e.weak) {
                e.hp -= 1;
                e.hitFlash = 8;
                e.x += knockDir * 8;
                e.vy = -3;
                for (let i = 0; i < 8; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
                didHitEnemy = true;
              }
            } else {
              e.hp -= 1;
              e.hitFlash = 8;
              e.x += knockDir * 20;
              e.vy = -4;
              for (let i = 0; i < 5; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
              didHitEnemy = true;
            }
          }
        }
        // Hit-stop + screen shake on successful hit
        if (didHitEnemy) {
          hitStopTimer = 3; // ~0.05s freeze
          screenShakeTimer = 6;
          screenShakeIntensity = 4;
        }
      }
      if (player.attackTimer > 0) player.attackTimer--;

      // Enemy updates
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.hp <= 0) {
          for (let j = 0; j < 15; j++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#7c3aed');
          enemies.splice(i, 1);
          continue;
        }
        if (e.hitFlash > 0) e.hitFlash--;

        // Gravity for enemies (stationary mage only when knocked back)
        if (e.type !== BlockType.MOB_STATIONARY || e.vy !== 0) {
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

      // Damage
      if (player.invulnTimer <= 0) {
        let hit = false;
        for (const s of spikes) if (checkCol(player, s)) hit = true;
        for (const e of enemies) if (checkCol(player, e)) hit = true;
        for (const p of projectiles) if (checkCol(player, p)) hit = true;
        if (hit) {
          player.hp -= 1;
          player.invulnTimer = 60;
          player.vy = -8;
          player.vx = player.facingRight ? -5 : 5;
          damageFlashTimer = 20;
          screenShakeTimer = 8;
          screenShakeIntensity = 6;
          for (let i = 0; i < 8; i++) spawnEmber(player.x + player.w / 2, player.y + player.h / 2, '#cc2200');
        }
      }
      if (player.invulnTimer > 0) player.invulnTimer--;

      // Door — next floor
      if (door && checkCol(player, door)) {
        if (currentRoomIdx < level.rooms.length - 1) {
          currentRoomIdx++;
          loadRoom(currentRoomIdx);
          transitionTimer = 40;
          cameraY = worldH - GAME_H; // start camera at bottom
        } else {
          onWin();
          return;
        }
      }

      if (player.hp <= 0) { onLose(); return; }

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
          if (val === BlockType.EMPTY || val === BlockType.MOB_PATROL || val === BlockType.MOB_STATIONARY || val === BlockType.BOSS || val === BlockType.SPAWN || val === BlockType.PLATFORM) {
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

        if (!player.facingRight) {
          const cx = drawX + PLAYER_DRAW_W / 2;
          const cy = drawY + PLAYER_DRAW_H / 2;
          ctx.translate(cx, cy);
          ctx.scale(-1, 1);
          ctx.translate(-cx, -cy);
        }

        let heroSprite: HTMLImageElement;
        if (player.attackTimer > 12) {
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

      // HP hearts
      ctx.shadowBlur = 0;
      for (let i = 0; i < 5; i++) {
        const hx = 16 + i * 30;
        if (i < player.hp) {
          ctx.fillStyle = '#cc2200';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#cc2200';
        } else {
          ctx.fillStyle = '#3d3630';
          ctx.shadowBlur = 0;
        }
        ctx.font = '22px serif';
        ctx.fillText('\u2665', hx, 36);
      }
      ctx.shadowBlur = 0;

      // Height indicator bar (right side)
      const barX = GAME_W - 10;
      const barH = GAME_H - 80;
      const barTop = 50;
      ctx.fillStyle = '#1a1510';
      ctx.fillRect(barX, barTop, 6, barH);
      ctx.strokeStyle = '#3d3630';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barTop, 6, barH);
      // Player position on bar
      const progress = 1 - (player.y / worldH);
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
        const doorProgress = 1 - (door.y / worldH);
        const doorDotY = barTop + barH * (1 - doorProgress);
        ctx.fillStyle = '#d4a017';
        ctx.fillRect(barX - 2, doorDotY - 2, 10, 4);
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
  }, [level, onWin, onLose]);

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
          이동: ← → | 점프: ↑ | 공격: Space
        </p>
      )}

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end px-4 z-50 pointer-events-none select-none"
          style={{ paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 16px))' }}
        >
          <div className="flex gap-3 items-end pointer-events-auto">
            <button
              className="w-[88px] h-[88px] rounded-2xl btn-medieval text-[#d4a017] text-3xl font-bold active:scale-90 transition-all flex items-center justify-center opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = false; }}
              onTouchCancel={() => { keysRef.current.ArrowLeft = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >←</button>
            <button
              className="w-[88px] h-[88px] rounded-2xl btn-medieval text-[#d4a017] text-3xl font-bold active:scale-90 transition-all flex items-center justify-center opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowRight = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowRight = false; }}
              onTouchCancel={() => { keysRef.current.ArrowRight = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >→</button>
          </div>
          <div className="flex gap-3 items-end pointer-events-auto">
            <button
              className="w-[88px] h-[88px] rounded-2xl btn-medieval text-[#38bdf8] text-sm font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowUp = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowUp = false; }}
              onTouchCancel={() => { keysRef.current.ArrowUp = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >JUMP</button>
            <button
              className="w-[88px] h-[88px] rounded-2xl btn-medieval text-[#cc2200] text-sm font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.Space = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.Space = false; }}
              onTouchCancel={() => { keysRef.current.Space = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >ATK</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
