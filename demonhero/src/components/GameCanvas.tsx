import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LevelData, BlockType } from '../types';
import { motion } from 'motion/react';
import { SPRITES, ANIM } from '../sprites';
import { TOWER_COLS, TOWER_ROWS } from '../utils';

interface Props {
  level: LevelData;
  onWin: () => void;
  onLose: () => void;
}

interface Ember {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string;
}

// Tile size in world coordinates
const T = 48;
// Canvas internal resolution (portrait — fits mobile perfectly)
const GAME_W = TOWER_COLS * T; // 480
const GAME_H = 720;
// World height for one floor
const WORLD_H = TOWER_ROWS * T; // 1200

export function GameCanvas({ level, onWin, onLose }: Props) {
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
      ? window.innerHeight - 140
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
    let cameraY = 0; // vertical camera offset (world coords)

    let embers: Ember[] = [];
    let slashTrails: { x: number; y: number; angle: number; life: number; size: number }[] = [];

    // Player — collision box fits in 1 tile, sprite renders bigger
    const PLAYER_DRAW_W = 56;
    const PLAYER_DRAW_H = 68;
    let player = {
      x: 2 * T, y: (TOWER_ROWS - 3) * T - 68,
      w: T - 4, h: 68, // collision width fits in 1 tile gap (44px < 48px)
      vx: 0, vy: 0,
      hp: 5,
      isGrounded: false,
      facingRight: true,
      attackTimer: 0,
      invulnTimer: 0
    };

    let walls: { x: number; y: number; w: number; h: number }[] = [];
    let spikes: { x: number; y: number; w: number; h: number }[] = [];
    let enemies: any[] = [];
    let door: { x: number; y: number; w: number; h: number } | null = null;

    const loadRoom = (idx: number) => {
      walls = [];
      spikes = [];
      enemies = [];
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
          if (val === BlockType.SPIKE) spikes.push({ x, y: y + 12, w: T, h: T - 12 });
          if (val === BlockType.MOB_PATROL) enemies.push({
            x, y: y - 8, w: 56, h: 56,
            type: val, hp: 2, maxHp: 2, vx: 2, vy: 0, startX: x, hitFlash: 0
          });
          if (val === BlockType.MOB_STATIONARY) enemies.push({
            x, y: y - 8, w: 56, h: 56,
            type: val, hp: 3, maxHp: 3, vx: 0, vy: 0, hitFlash: 0
          });
          if (val === BlockType.BOSS) enemies.push({
            x: x - 32, y: y - 64, w: 112, h: 112,
            type: val, hp: 10, maxHp: 10, vx: 0, vy: 0, timer: 0, weak: false, hitFlash: 0
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
      frameCount++;

      // === PHYSICS ===
      player.vy += 0.7;

      if (keys.ArrowLeft) { player.vx = -5; player.facingRight = false; }
      else if (keys.ArrowRight) { player.vx = 5; player.facingRight = true; }
      else { player.vx = 0; }

      if (keys.ArrowUp && player.isGrounded) {
        player.vy = -14; // Stronger jump for vertical gameplay
        player.isGrounded = false;
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
          x: player.facingRight ? player.x + player.w : player.x - 40,
          y: player.y,
          w: 40,
          h: player.h
        };

        spawnSlash(
          player.facingRight ? player.x + player.w + 15 : player.x - 15,
          player.y + player.h / 2,
          player.facingRight
        );

        for (const e of enemies) {
          if (checkCol(hitBox, e)) {
            if (e.type === BlockType.BOSS) {
              if (e.weak) {
                e.hp -= 1;
                e.hitFlash = 8;
                for (let i = 0; i < 8; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
              }
            } else {
              e.hp -= 1;
              e.hitFlash = 8;
              e.x += player.facingRight ? 12 : -12;
              for (let i = 0; i < 5; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
            }
          }
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

        // Gravity for ground-based enemies (not stationary mage — it floats)
        if (e.type !== BlockType.MOB_STATIONARY) {
          e.vy += 0.5;
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
        }

        if (e.type === BlockType.MOB_PATROL) {
          e.x += e.vx;
          // Reverse at patrol range OR if about to walk off a platform edge
          if (Math.abs(e.x - e.startX) > 80) e.vx *= -1;
          // Wall collision for horizontal movement
          for (const w of walls) {
            if (checkCol(e, w)) {
              if (e.vx > 0) e.x = w.x - e.w;
              else if (e.vx < 0) e.x = w.x + w.w;
              e.vx *= -1;
            }
          }
        }
        if (e.type === BlockType.BOSS) {
          e.timer++;
          if (e.timer > 120) { e.weak = !e.weak; e.timer = 0; }
        }
      }

      // Damage
      if (player.invulnTimer <= 0) {
        let hit = false;
        for (const s of spikes) if (checkCol(player, s)) hit = true;
        for (const e of enemies) if (checkCol(player, e)) hit = true;
        if (hit) {
          player.hp -= 1;
          player.invulnTimer = 60;
          player.vy = -8;
          player.vx = player.facingRight ? -5 : 5;
          for (let i = 0; i < 8; i++) spawnEmber(player.x + player.w / 2, player.y + player.h / 2, '#cc2200');
        }
      }
      if (player.invulnTimer > 0) player.invulnTimer--;

      // Door — next floor
      if (door && checkCol(player, door)) {
        if (currentRoomIdx < level.rooms.length - 1) {
          currentRoomIdx++;
          loadRoom(currentRoomIdx);
        } else {
          onWin();
          return;
        }
      }

      if (player.hp <= 0) { onLose(); return; }

      // === CAMERA ===
      // Smooth vertical follow — player stays in upper-middle of screen
      const targetCamY = player.y - GAME_H * 0.4;
      cameraY += (targetCamY - cameraY) * 0.1;
      cameraY = Math.max(0, Math.min(worldH - GAME_H, cameraY));

      // === RENDER ===
      ctx.save();
      ctx.fillStyle = '#0d0a07';
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      ctx.translate(0, -cameraY);

      // Floor tiles (only visible rows for performance)
      const grid = level.rooms[currentRoomIdx].grid;
      const rows = grid.length;
      const cols = grid[0].length;
      const startRow = Math.max(0, Math.floor(cameraY / T) - 1);
      const endRow = Math.min(rows, Math.ceil((cameraY + GAME_H) / T) + 1);

      for (let r = startRow; r < endRow; r++) {
        for (let c = 0; c < cols; c++) {
          const val = grid[r][c];
          if (val === BlockType.EMPTY || val === BlockType.MOB_PATROL || val === BlockType.MOB_STATIONARY || val === BlockType.BOSS || val === BlockType.SPAWN) {
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
          const cf = Math.floor(frameCount / 20) % 2;
          ctx.drawImage(ANIM.stationary.cast[cf], e.x, e.y + floatY, e.w, e.h);
        }
        if (e.type === BlockType.BOSS) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = e.weak ? '#fca5a5' : '#8b0000';
          if (e.weak) ctx.filter = e.hitFlash > 0 ? 'brightness(3) saturate(0)' : 'brightness(1.3) hue-rotate(60deg)';
          const bf = Math.floor(frameCount / 30) % 2;
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
      <div className="mb-1 md:mb-4 text-center relative z-10 mt-1 md:mt-0">
        <h2 className="text-lg md:text-3xl font-display font-black text-[#d4a017] tracking-widest glow-gold">{level.name}</h2>
        <p className="text-[#8b7355] font-medieval tracking-wide text-[10px] md:text-sm">
          제작자: <span className="text-[#e8dcc8]">{level.creator}</span>
          <span className="mx-1.5 md:mx-3 text-[#3d3630]">|</span>
          악명: <span className="text-[#7c3aed]">{level.infamy}</span>
        </p>
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
        <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end px-3 z-50 pointer-events-none select-none"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-1.5 items-end pointer-events-auto">
            <button
              className="w-[56px] h-[56px] rounded-2xl btn-medieval text-[#d4a017] text-xl font-bold active:scale-90 transition-all flex items-center justify-center opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = false; }}
              onTouchCancel={() => { keysRef.current.ArrowLeft = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >←</button>
            <button
              className="w-[56px] h-[56px] rounded-2xl btn-medieval text-[#d4a017] text-xl font-bold active:scale-90 transition-all flex items-center justify-center opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowRight = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowRight = false; }}
              onTouchCancel={() => { keysRef.current.ArrowRight = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >→</button>
          </div>
          <div className="flex gap-1.5 items-end pointer-events-auto">
            <button
              className="w-[56px] h-[56px] rounded-2xl btn-medieval text-[#38bdf8] text-[10px] font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-70 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowUp = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowUp = false; }}
              onTouchCancel={() => { keysRef.current.ArrowUp = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >JUMP</button>
            <button
              className="w-[56px] h-[56px] rounded-2xl btn-medieval text-[#cc2200] text-[10px] font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-70 active:opacity-100"
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
