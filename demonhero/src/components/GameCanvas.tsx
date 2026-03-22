import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LevelData, BlockType } from '../types';
import { motion } from 'motion/react';
import { SPRITES, ANIM } from '../sprites';

interface Props {
  level: LevelData;
  onWin: () => void;
  onLose: () => void;
}

// Ember particle system
interface Ember {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string;
}

// Internal game resolution (logic runs at this size, then scales to fit screen)
const GAME_W = 800;
const GAME_H = 480;

export function GameCanvas({ level, onWin, onLose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, Space: false });
  const [isMobile, setIsMobile] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: GAME_W, h: GAME_H });

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Responsive canvas sizing
  const updateCanvasSize = useCallback(() => {
    const mobile = window.innerWidth < 768;
    const maxW = mobile ? window.innerWidth : Math.min(window.innerWidth - 48, 800);
    const maxH = mobile
      ? window.innerHeight - 180 // leave room for controls + header
      : window.innerHeight - 200;
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

    const TILE_SIZE = 40;
    const ROWS = 12;
    const COLS = 20;

    let animationFrameId: number;
    let currentRoomIdx = 0;
    let frameCount = 0;

    // Ember particles
    let embers: Ember[] = [];

    // Slash trail particles (Dead Cells style)
    let slashTrails: { x: number; y: number; angle: number; life: number; size: number }[] = [];

    // Bigger player sprite (was 24x32, now 36x44)
    let player = {
      x: 40, y: 40, w: 36, h: 44,
      vx: 0, vy: 0,
      hp: 5,
      isGrounded: false,
      facingRight: true,
      attackTimer: 0,
      invulnTimer: 0
    };

    let walls: any[] = [];
    let spikes: any[] = [];
    let enemies: any[] = [];
    let door: any = null;

    const loadRoom = (idx: number) => {
      walls = [];
      spikes = [];
      enemies = [];
      door = null;
      embers = [];
      const grid = level.rooms[idx].grid;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let val = grid[r][c];
          let x = c * TILE_SIZE;
          let y = r * TILE_SIZE;
          if (val === BlockType.WALL) walls.push({ x, y, w: TILE_SIZE, h: TILE_SIZE });
          if (val === BlockType.SPIKE) spikes.push({ x, y: y + 10, w: TILE_SIZE, h: 30 });
          // Bigger enemies (was 32x32, now 40x40 for mobs)
          if (val === BlockType.MOB_PATROL) enemies.push({ x, y: y, w: 40, h: 40, type: val, hp: 2, maxHp: 2, vx: 2, vy: 0, startX: x, hitFlash: 0 });
          if (val === BlockType.MOB_STATIONARY) enemies.push({ x, y: y, w: 40, h: 40, type: val, hp: 3, maxHp: 3, vx: 0, vy: 0, hitFlash: 0 });
          // Boss even bigger (was 64x64, now 80x80)
          if (val === BlockType.BOSS) enemies.push({ x: x - 8, y: y - 40, w: 80, h: 80, type: val, hp: 10, maxHp: 10, vx: 0, vy: 0, timer: 0, weak: false, hitFlash: 0 });
          if (val === BlockType.DOOR) door = { x, y, w: TILE_SIZE, h: TILE_SIZE };
          if (val === BlockType.SPAWN) { player.x = x + 2; player.y = y - 4; }
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

    const checkCol = (r1: any, r2: any) => {
      return r1.x < r2.x + r2.w &&
             r1.x + r1.w > r2.x &&
             r1.y < r2.y + r2.h &&
             r1.y + r1.h > r2.y;
    };

    // Spawn ember particles
    const spawnEmber = (x: number, y: number, color?: string) => {
      embers.push({
        x, y,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2 - 0.5,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        size: 1 + Math.random() * 2,
        color: color || (Math.random() > 0.5 ? '#d4a017' : '#c2410c')
      });
    };

    // Spawn slash effect (Dead Cells style)
    const spawnSlash = (x: number, y: number, facingRight: boolean) => {
      for (let i = 0; i < 5; i++) {
        slashTrails.push({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 20,
          angle: facingRight ? Math.random() * 0.8 - 0.4 : Math.PI + Math.random() * 0.8 - 0.4,
          life: 8 + Math.random() * 6,
          size: 15 + Math.random() * 15
        });
      }
    };

    const update = () => {
      frameCount++;

      player.vy += 0.6;

      if (keys.ArrowLeft) { player.vx = -5; player.facingRight = false; }
      else if (keys.ArrowRight) { player.vx = 5; player.facingRight = true; }
      else { player.vx = 0; }

      if (keys.ArrowUp && player.isGrounded) {
        player.vy = -12;
        player.isGrounded = false;
      }

      player.x += player.vx;
      for (let w of walls) {
        if (checkCol(player, w)) {
          if (player.vx > 0) player.x = w.x - player.w;
          else if (player.vx < 0) player.x = w.x + w.w;
          player.vx = 0;
        }
      }

      player.y += player.vy;
      player.isGrounded = false;
      for (let w of walls) {
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

      if (player.y > GAME_H) player.hp = 0;

      if (keys.Space && player.attackTimer <= 0) {
        player.attackTimer = 20;
        let hitBox = {
          x: player.facingRight ? player.x + player.w : player.x - 35,
          y: player.y,
          w: 35,
          h: player.h
        };

        // Spawn slash visual
        spawnSlash(
          player.facingRight ? player.x + player.w + 10 : player.x - 10,
          player.y + player.h / 2,
          player.facingRight
        );

        for (let e of enemies) {
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
              e.x += player.facingRight ? 10 : -10;
              for (let i = 0; i < 5; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
            }
          }
        }
      }
      if (player.attackTimer > 0) player.attackTimer--;

      for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (e.hp <= 0) {
          for (let j = 0; j < 15; j++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#7c3aed');
          enemies.splice(i, 1);
          continue;
        }

        if (e.hitFlash > 0) e.hitFlash--;

        if (e.type === BlockType.MOB_PATROL) {
          e.x += e.vx;
          if (Math.abs(e.x - e.startX) > 80) e.vx *= -1;
        }

        if (e.type === BlockType.BOSS) {
          e.timer++;
          if (e.timer > 120) {
            e.weak = !e.weak;
            e.timer = 0;
          }
        }
      }

      if (player.invulnTimer <= 0) {
        let hit = false;
        for (let s of spikes) if (checkCol(player, s)) hit = true;
        for (let e of enemies) if (checkCol(player, e)) hit = true;

        if (hit) {
          player.hp -= 1;
          player.invulnTimer = 60;
          player.vy = -6;
          player.vx = player.facingRight ? -5 : 5;
          for (let i = 0; i < 8; i++) spawnEmber(player.x + player.w / 2, player.y + player.h / 2, '#cc2200');
        }
      }
      if (player.invulnTimer > 0) player.invulnTimer--;

      if (door && checkCol(player, door)) {
        if (currentRoomIdx < level.rooms.length - 1) {
          currentRoomIdx++;
          loadRoom(currentRoomIdx);
        } else {
          onWin();
          return;
        }
      }

      if (player.hp <= 0) {
        onLose();
        return;
      }

      // === RENDER ===
      ctx.fillStyle = '#0d0a07';
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // Draw stone floor tiles
      const grid = level.rooms[currentRoomIdx].grid;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const val = grid[r][c];
          if (val === BlockType.EMPTY || val === BlockType.MOB_PATROL || val === BlockType.MOB_STATIONARY || val === BlockType.BOSS || val === BlockType.SPAWN) {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(SPRITES.floor, c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Ambient torch glow spots
      const torchPositions = [
        { x: 60, y: 60 }, { x: 740, y: 60 },
        { x: 400, y: 40 }
      ];
      for (const torch of torchPositions) {
        const flicker = 0.6 + Math.sin(frameCount * 0.05 + torch.x) * 0.15;
        const gradient = ctx.createRadialGradient(torch.x, torch.y, 0, torch.x, torch.y, 120);
        gradient.addColorStop(0, `rgba(194, 65, 12, ${0.08 * flicker})`);
        gradient.addColorStop(0.5, `rgba(212, 160, 23, ${0.03 * flicker})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(torch.x - 120, torch.y - 120, 240, 240);

        if (frameCount % 15 === 0 && Math.random() > 0.5) {
          spawnEmber(torch.x + (Math.random() - 0.5) * 20, torch.y);
        }
      }

      // Walls
      for (let w of walls) {
        ctx.drawImage(SPRITES.wall, w.x, w.y, w.w, w.h);
      }

      // Spikes (bigger render)
      for (let s of spikes) {
        ctx.drawImage(SPRITES.spike, s.x, s.y, s.w, s.h);
      }

      // Enemies
      for (let e of enemies) {
        ctx.save();

        if (e.hitFlash > 0) {
          ctx.filter = 'brightness(3) saturate(0)';
        }

        if (e.type === BlockType.MOB_PATROL) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#7c3aed';
          const patrolFrame = Math.floor(frameCount / 12) % 2;
          const patrolSprite = ANIM.patrol.walk[patrolFrame];
          if (e.vx < 0) {
            ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(e.x + e.w / 2), -(e.y + e.h / 2));
          }
          ctx.drawImage(patrolSprite, e.x, e.y, e.w, e.h);
        }
        if (e.type === BlockType.MOB_STATIONARY) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#9333ea';
          const floatY = Math.sin(frameCount * 0.04) * 3;
          const castFrame = Math.floor(frameCount / 20) % 2;
          const stationarySprite = ANIM.stationary.cast[castFrame];
          ctx.drawImage(stationarySprite, e.x, e.y + floatY, e.w, e.h);
        }
        if (e.type === BlockType.BOSS) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = e.weak ? '#fca5a5' : '#8b0000';
          if (e.weak) ctx.filter = e.hitFlash > 0 ? 'brightness(3) saturate(0)' : 'brightness(1.3) hue-rotate(60deg)';
          const bossFrame = Math.floor(frameCount / 30) % 2;
          const bossSprite = ANIM.boss.idle[bossFrame];
          ctx.drawImage(bossSprite, e.x, e.y, e.w, e.h);
        }

        ctx.restore();

        // HP bar
        if (e.hp < e.maxHp) {
          const barW = e.w;
          const barH = 5;
          const barX = e.x;
          const barY = e.y - 10;
          ctx.fillStyle = '#1a1510';
          ctx.fillRect(barX, barY, barW, barH);
          ctx.fillStyle = e.type === BlockType.BOSS ? '#8b0000' : '#7c3aed';
          ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
          ctx.strokeStyle = '#5a4d3e';
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barW, barH);
        }

        // Boss weak indicator
        if (e.type === BlockType.BOSS && e.weak) {
          ctx.fillStyle = '#d4a017';
          ctx.font = 'bold 14px "Cinzel", serif';
          ctx.textAlign = 'center';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#d4a017';
          ctx.fillText('VULNERABLE', e.x + e.w / 2, e.y - 16);
          ctx.shadowBlur = 0;
          ctx.textAlign = 'start';
        }
      }

      // Door with golden glow
      if (door) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#d4a017';
        ctx.drawImage(SPRITES.door, door.x, door.y, door.w, door.h);
        ctx.shadowBlur = 0;

        const doorPulse = 0.3 + Math.sin(frameCount * 0.03) * 0.15;
        const doorGlow = ctx.createRadialGradient(door.x + 20, door.y + 20, 5, door.x + 20, door.y + 20, 50);
        doorGlow.addColorStop(0, `rgba(212, 160, 23, ${doorPulse})`);
        doorGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = doorGlow;
        ctx.fillRect(door.x - 30, door.y - 30, 100, 100);
      }

      // Player with animation
      if (player.invulnTimer % 10 < 5) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#38bdf8';

        if (!player.facingRight) {
          ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
          ctx.scale(-1, 1);
          ctx.translate(-(player.x + player.w / 2), -(player.y + player.h / 2));
        }

        let heroSprite: HTMLImageElement;
        if (player.attackTimer > 12) {
          heroSprite = ANIM.hero.attack[0];
        } else if (Math.abs(player.vx) > 0) {
          const runFrame = Math.floor(frameCount / 8) % 2;
          heroSprite = ANIM.hero.run[runFrame];
        } else {
          heroSprite = ANIM.hero.idle[0];
        }
        ctx.drawImage(heroSprite, player.x, player.y, player.w, player.h);
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

      // Vignette
      const vignette = ctx.createRadialGradient(GAME_W / 2, GAME_H / 2, 150, GAME_W / 2, GAME_H / 2, 500);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.7, 'rgba(13,10,7,0.4)');
      vignette.addColorStop(1, 'rgba(13,10,7,0.85)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // HUD
      ctx.shadowBlur = 0;

      // HP hearts
      const heartY = 30;
      for (let i = 0; i < 5; i++) {
        const hx = 24 + i * 28;
        if (i < player.hp) {
          ctx.fillStyle = '#cc2200';
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#cc2200';
        } else {
          ctx.fillStyle = '#3d3630';
          ctx.shadowBlur = 0;
        }
        ctx.font = '20px serif';
        ctx.fillText('\u2665', hx, heartY);
      }
      ctx.shadowBlur = 0;

      // Room counter
      ctx.fillStyle = '#d4a017';
      ctx.font = 'bold 16px "Cinzel", serif';
      ctx.fillText(`Room ${currentRoomIdx + 1} / ${level.rooms.length}`, 24, 58);

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
      className="flex flex-col items-center justify-start md:justify-center min-h-screen bg-dungeon p-2 md:p-4 relative"
    >
      <div className="mb-2 md:mb-6 text-center relative z-10 mt-2 md:mt-0">
        <h2 className="text-xl md:text-4xl font-display font-black text-[#d4a017] tracking-widest glow-gold mb-1">{level.name}</h2>
        <p className="text-[#8b7355] font-medieval tracking-wide text-xs md:text-base">
          제작자: <span className="text-[#e8dcc8]">{level.creator}</span>
          <span className="mx-2 md:mx-3 text-[#3d3630]">|</span>
          악명: <span className="text-[#7c3aed]">{level.infamy}</span>
        </p>
      </div>

      <div className="relative z-10 p-0.5 md:p-1 rounded-lg border-medieval">
        <canvas
          ref={canvasRef}
          width={GAME_W}
          height={GAME_H}
          className="rounded bg-[#0d0a07]"
          style={{
            touchAction: 'none',
            width: canvasSize.w,
            height: canvasSize.h,
            imageRendering: 'pixelated',
          }}
        />
      </div>

      {!isMobile && (
        <p className="mt-3 text-[#5a4d3e] font-medieval text-xs md:text-sm tracking-wide z-10">
          이동: ← → | 점프: ↑ | 공격: Space
        </p>
      )}

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end px-3 pb-4 z-50 pointer-events-none select-none"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex gap-1.5 items-end pointer-events-auto">
            <button
              className="w-[60px] h-[60px] rounded-2xl btn-medieval text-[#d4a017] text-2xl font-bold active:scale-90 transition-all flex items-center justify-center opacity-80 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = false; }}
              onTouchCancel={() => { keysRef.current.ArrowLeft = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >←</button>
            <button
              className="w-[60px] h-[60px] rounded-2xl btn-medieval text-[#d4a017] text-2xl font-bold active:scale-90 transition-all flex items-center justify-center opacity-80 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowRight = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowRight = false; }}
              onTouchCancel={() => { keysRef.current.ArrowRight = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >→</button>
          </div>
          <div className="flex gap-1.5 items-end pointer-events-auto">
            <button
              className="w-[60px] h-[60px] rounded-2xl btn-medieval text-[#38bdf8] text-xs font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-80 active:opacity-100"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowUp = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowUp = false; }}
              onTouchCancel={() => { keysRef.current.ArrowUp = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >JUMP</button>
            <button
              className="w-[60px] h-[60px] rounded-2xl btn-medieval text-[#cc2200] text-xs font-bold active:scale-90 transition-all flex items-center justify-center font-medieval opacity-80 active:opacity-100"
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
