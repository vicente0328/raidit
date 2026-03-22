import React, { useRef, useEffect, useCallback, useState } from 'react';
import { LevelData, BlockType } from '../types';
import { motion } from 'motion/react';
import { SPRITES } from '../sprites';

interface Props {
  level: LevelData;
  onWin: () => void;
  onLose: () => void;
}

export function GameCanvas({ level, onWin, onLose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, Space: false });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    check();
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
      const grid = level.rooms[idx].grid;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let val = grid[r][c];
          let x = c * TILE_SIZE;
          let y = r * TILE_SIZE;
          if (val === BlockType.WALL) walls.push({ x, y, w: TILE_SIZE, h: TILE_SIZE });
          if (val === BlockType.SPIKE) spikes.push({ x, y: y + 20, w: TILE_SIZE, h: 20 });
          if (val === BlockType.MOB_PATROL) enemies.push({ x, y: y + 8, w: 32, h: 32, type: val, hp: 2, vx: 2, vy: 0, startX: x });
          if (val === BlockType.MOB_STATIONARY) enemies.push({ x, y: y + 8, w: 32, h: 32, type: val, hp: 3, vx: 0, vy: 0 });
          if (val === BlockType.BOSS) enemies.push({ x, y: y - 24, w: 64, h: 64, type: val, hp: 10, vx: 0, vy: 0, timer: 0, weak: false });
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

    const update = () => {
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
        
        for (let e of enemies) {
          if (checkCol(hitBox, e)) {
            if (e.type === BlockType.BOSS) {
              if (e.weak) e.hp -= 1;
            } else {
              e.hp -= 1;
              e.x += player.facingRight ? 10 : -10;
            }
          }
        }
      }
      if (player.attackTimer > 0) player.attackTimer--;

      for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        if (e.hp <= 0) {
          enemies.splice(i, 1);
          continue;
        }
        
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

      // Draw Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, 800, 480);

      // Draw Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for(let i=0; i<=800; i+=40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 480); ctx.stroke(); }
      for(let i=0; i<=480; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke(); }

      // Reset shadow
      ctx.shadowBlur = 0;

      // Walls
      for (let w of walls) {
        ctx.drawImage(SPRITES.wall, w.x, w.y, w.w, w.h);
      }

      // Spikes
      for (let s of spikes) {
        ctx.drawImage(SPRITES.spike, s.x, s.y, s.w, s.h);
      }

      // Enemies
      for (let e of enemies) {
        if (e.type === BlockType.MOB_PATROL) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#a855f7';
          ctx.drawImage(SPRITES.patrol, e.x, e.y, e.w, e.h);
        }
        if (e.type === BlockType.MOB_STATIONARY) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#d946ef';
          ctx.drawImage(SPRITES.stationary, e.x, e.y, e.w, e.h);
        }
        if (e.type === BlockType.BOSS) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = e.weak ? '#fca5a5' : '#be185d';
          if (e.weak) ctx.filter = 'brightness(1.5) hue-rotate(90deg)';
          ctx.drawImage(SPRITES.boss, e.x, e.y, e.w, e.h);
          ctx.filter = 'none';
        }
        
        ctx.shadowBlur = 0; // reset
        
        if (e.type === BlockType.BOSS) {
          if (e.weak) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px "Cinzel", serif';
            ctx.fillText('WEAK!', e.x + 8, e.y - 10);
          }
        }
      }

      // Door
      if (door) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#eab308';
        ctx.drawImage(SPRITES.door, door.x, door.y, door.w, door.h);
        ctx.shadowBlur = 0;
      }

      // Player
      if (player.invulnTimer % 10 < 5) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#38bdf8';
        
        ctx.save();
        if (!player.facingRight) {
          ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
          ctx.scale(-1, 1);
          ctx.translate(-(player.x + player.w / 2), -(player.y + player.h / 2));
        }
        ctx.drawImage(SPRITES.hero, player.x, player.y, player.w, player.h);
        ctx.restore();
        
        ctx.shadowBlur = 0;
        
        // Attack visual
        if (player.attackTimer > 10) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#fff';
          ctx.beginPath();
          if (player.facingRight) {
            ctx.arc(player.x + player.w, player.y + player.h/2, 24, -Math.PI/3, Math.PI/3);
          } else {
            ctx.arc(player.x, player.y + player.h/2, 24, Math.PI - Math.PI/3, Math.PI + Math.PI/3);
          }
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Vignette Overlay
      const gradient = ctx.createRadialGradient(400, 240, 100, 400, 240, 500);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 800, 480);

      // HUD
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px "Inter", sans-serif';
      ctx.fillText(`HP: ${'♥'.repeat(player.hp)}${'♡'.repeat(5 - player.hp)}`, 20, 40);
      ctx.font = 'bold 18px "Cinzel", serif';
      ctx.fillText(`Room: ${currentRoomIdx + 1} / ${level.rooms.length}`, 20, 75);

      ctx.font = '14px "Inter", sans-serif';
      ctx.fillStyle = '#a1a1aa';
      ctx.fillText(`이동: 방향키 | 점프: ↑ | 공격: Space`, 20, 460);

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
      className="flex flex-col items-center justify-center min-h-screen bg-[#050505] bg-noise p-4 relative"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-yellow-900/5 pointer-events-none"></div>
      
      <div className="mb-6 text-center relative z-10">
        <h2 className="text-4xl font-display font-black text-yellow-500 tracking-widest drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] mb-2">{level.name}</h2>
        <p className="text-zinc-400 font-medium tracking-wide">제작자: <span className="text-zinc-200">{level.creator}</span> | 악명: <span className="text-purple-400">{level.infamy}</span></p>
      </div>
      
      <div className="relative z-10 p-2 rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800/50 shadow-[0_0_50px_rgba(234,179,8,0.1)]">
        <canvas
          ref={canvasRef}
          width={800}
          height={480}
          className="rounded-xl shadow-2xl bg-[#050505] max-w-full"
          style={{ touchAction: 'none' }}
        />
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 flex justify-between items-end p-4 pb-6 z-50 pointer-events-none select-none">
          {/* D-Pad (Left side) */}
          <div className="flex gap-2 items-end pointer-events-auto">
            <button
              className="w-16 h-16 rounded-2xl bg-zinc-800/80 backdrop-blur border border-zinc-700/50 text-zinc-300 text-2xl font-bold active:bg-zinc-600 active:scale-95 transition-all flex items-center justify-center"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowLeft = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >
              ←
            </button>
            <button
              className="w-16 h-16 rounded-2xl bg-zinc-800/80 backdrop-blur border border-zinc-700/50 text-zinc-300 text-2xl font-bold active:bg-zinc-600 active:scale-95 transition-all flex items-center justify-center"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowRight = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowRight = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >
              →
            </button>
          </div>

          {/* Action buttons (Right side) */}
          <div className="flex gap-2 items-end pointer-events-auto">
            <button
              className="w-16 h-16 rounded-2xl bg-yellow-600/60 backdrop-blur border border-yellow-500/50 text-yellow-200 text-sm font-bold active:bg-yellow-500/80 active:scale-95 transition-all flex items-center justify-center"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.ArrowUp = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.ArrowUp = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >
              JUMP
            </button>
            <button
              className="w-16 h-16 rounded-2xl bg-red-600/60 backdrop-blur border border-red-500/50 text-red-200 text-sm font-bold active:bg-red-500/80 active:scale-95 transition-all flex items-center justify-center"
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.Space = true; }}
              onTouchEnd={(e) => { e.preventDefault(); keysRef.current.Space = false; }}
              onContextMenu={(e) => e.preventDefault()}
            >
              ATK
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
