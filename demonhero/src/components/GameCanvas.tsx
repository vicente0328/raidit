import React, { useRef, useEffect, useState } from 'react';
import { LevelData, BlockType } from '../types';
import { motion } from 'motion/react';
import { SPRITES } from '../sprites';

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

export function GameCanvas({ level, onWin, onLose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, Space: false });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

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

    let player = {
      x: 40, y: 40, w: 24, h: 32,
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
          if (val === BlockType.SPIKE) spikes.push({ x, y: y + 20, w: TILE_SIZE, h: 20 });
          if (val === BlockType.MOB_PATROL) enemies.push({ x, y: y + 8, w: 32, h: 32, type: val, hp: 2, maxHp: 2, vx: 2, vy: 0, startX: x, hitFlash: 0 });
          if (val === BlockType.MOB_STATIONARY) enemies.push({ x, y: y + 8, w: 32, h: 32, type: val, hp: 3, maxHp: 3, vx: 0, vy: 0, hitFlash: 0 });
          if (val === BlockType.BOSS) enemies.push({ x, y: y - 24, w: 64, h: 64, type: val, hp: 10, maxHp: 10, vx: 0, vy: 0, timer: 0, weak: false, hitFlash: 0 });
          if (val === BlockType.DOOR) door = { x, y, w: TILE_SIZE, h: TILE_SIZE };
          if (val === BlockType.SPAWN) { player.x = x + 8; player.y = y + 8; }
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

      if (player.y > 480) player.hp = 0;

      if (keys.Space && player.attackTimer <= 0) {
        player.attackTimer = 20;
        let hitBox = {
          x: player.facingRight ? player.x + player.w : player.x - 30,
          y: player.y,
          w: 30,
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
                // Hit sparks
                for (let i = 0; i < 8; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
              }
            } else {
              e.hp -= 1;
              e.hitFlash = 8;
              e.x += player.facingRight ? 10 : -10;
              // Hit sparks
              for (let i = 0; i < 5; i++) spawnEmber(e.x + e.w / 2, e.y + e.h / 2, '#ff6b35');
            }
          }
        }
      }
      if (player.attackTimer > 0) player.attackTimer--;

      for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (e.hp <= 0) {
          // Death burst particles
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
          // Blood particles
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

      // Dark dungeon background
      ctx.fillStyle = '#0d0a07';
      ctx.fillRect(0, 0, 800, 480);

      // Draw stone floor tiles for empty spaces
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

        // Spawn embers from torches occasionally
        if (frameCount % 15 === 0 && Math.random() > 0.5) {
          spawnEmber(torch.x + (Math.random() - 0.5) * 20, torch.y);
        }
      }

      // Walls - stone bricks
      for (let w of walls) {
        ctx.drawImage(SPRITES.wall, w.x, w.y, w.w, w.h);
      }

      // Spikes
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
          ctx.drawImage(SPRITES.patrol, e.x, e.y, e.w, e.h);
        }
        if (e.type === BlockType.MOB_STATIONARY) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#9333ea';
          // Floating animation
          const floatY = Math.sin(frameCount * 0.04) * 3;
          ctx.drawImage(SPRITES.stationary, e.x, e.y + floatY, e.w, e.h);
        }
        if (e.type === BlockType.BOSS) {
          ctx.shadowBlur = 25;
          ctx.shadowColor = e.weak ? '#fca5a5' : '#8b0000';
          if (e.weak) ctx.filter = e.hitFlash > 0 ? 'brightness(3) saturate(0)' : 'brightness(1.3) hue-rotate(60deg)';
          ctx.drawImage(SPRITES.boss, e.x, e.y, e.w, e.h);
        }

        ctx.restore();

        // HP bar for enemies
        if (e.hp < e.maxHp) {
          const barW = e.w;
          const barH = 4;
          const barX = e.x;
          const barY = e.y - 8;
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
          ctx.fillText('VULNERABLE', e.x + e.w / 2, e.y - 14);
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

        // Pulsing golden light from door
        const doorPulse = 0.3 + Math.sin(frameCount * 0.03) * 0.15;
        const doorGlow = ctx.createRadialGradient(door.x + 20, door.y + 20, 5, door.x + 20, door.y + 20, 50);
        doorGlow.addColorStop(0, `rgba(212, 160, 23, ${doorPulse})`);
        doorGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = doorGlow;
        ctx.fillRect(door.x - 30, door.y - 30, 100, 100);
      }

      // Player
      if (player.invulnTimer % 10 < 5) {
        ctx.save();
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#38bdf8';

        if (!player.facingRight) {
          ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
          ctx.scale(-1, 1);
          ctx.translate(-(player.x + player.w / 2), -(player.y + player.h / 2));
        }
        ctx.drawImage(SPRITES.hero, player.x, player.y, player.w, player.h);
        ctx.restore();
      }

      // Slash trails (Dead Cells style)
      for (let i = slashTrails.length - 1; i >= 0; i--) {
        const s = slashTrails[i];
        s.life--;
        if (s.life <= 0) { slashTrails.splice(i, 1); continue; }

        const alpha = s.life / 14;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);

        // Slash arc
        ctx.beginPath();
        ctx.arc(0, 0, s.size, -0.6, 0.6);
        ctx.lineWidth = 3 * alpha;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.stroke();

        // Inner glow
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

      // Vignette - warm dungeon feel
      const gradient = ctx.createRadialGradient(400, 240, 150, 400, 240, 500);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.7, 'rgba(13,10,7,0.4)');
      gradient.addColorStop(1, 'rgba(13,10,7,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 480);

      // HUD - Medieval style
      ctx.shadowBlur = 0;

      // HP hearts with warm glow
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
        ctx.fillText('♥', hx, heartY);
      }
      ctx.shadowBlur = 0;

      // Room counter
      ctx.fillStyle = '#d4a017';
      ctx.font = 'bold 16px "Cinzel", serif';
      ctx.fillText(`Room ${currentRoomIdx + 1} / ${level.rooms.length}`, 24, 58);

      // Controls hint
      ctx.font = '13px "Cinzel", serif';
      ctx.fillStyle = '#5a4d3e';
      ctx.fillText('이동: ← → | 점프: ↑ | 공격: Space', 24, 465);

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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen bg-dungeon p-4 relative"
    >
      <div className="mb-6 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-display font-black text-[#d4a017] tracking-widest glow-gold mb-2">{level.name}</h2>
        <p className="text-[#8b7355] font-medieval tracking-wide">
          제작자: <span className="text-[#e8dcc8]">{level.creator}</span>
          <span className="mx-3 text-[#3d3630]">|</span>
          악명: <span className="text-[#7c3aed]">{level.infamy}</span>
        </p>
      </div>

      <div className="relative z-10 p-1 rounded-lg border-medieval">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          className="rounded bg-[#0d0a07] max-w-full"
          style={{ touchAction: 'none' }}
        />
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end p-4 pb-6 z-50 pointer-events-none select-none">
          <div className="flex gap-2 items-end pointer-events-auto">
            <button
              className="w-16 h-16 rounded-xl btn-medieval text-[#d4a017] text-2xl font-bold active:scale-95 transition-all flex items-center justify-center"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >←</button>
            <button
              className="w-16 h-16 rounded-xl btn-medieval text-[#d4a017] text-2xl font-bold active:scale-95 transition-all flex items-center justify-center"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowRight = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowRight = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >→</button>
          </div>
          <div className="flex gap-2 items-end pointer-events-auto">
            <button
              className="w-16 h-16 rounded-xl btn-medieval text-[#d4a017] text-sm font-bold active:scale-95 transition-all flex items-center justify-center font-medieval"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowUp = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowUp = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >JUMP</button>
            <button
              className="w-16 h-16 rounded-xl btn-medieval text-[#cc2200] text-sm font-bold active:scale-95 transition-all flex items-center justify-center font-medieval"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.Space = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.Space = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >ATK</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
