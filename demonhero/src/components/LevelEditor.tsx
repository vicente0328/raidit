import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockType, RoomData } from '../types';
import { createFloorGrid, TOWER_COLS, TOWER_ROWS } from '../utils';
import { Save, X, Layers, Play, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { SPRITE_URLS } from '../sprites';
import { GameCanvas } from './GameCanvas';

const BLOCK_IMAGES: Record<number, string> = {
  [BlockType.EMPTY]: '',
  [BlockType.WALL]: SPRITE_URLS.wall,
  [BlockType.SPIKE]: SPRITE_URLS.spike,
  [BlockType.MOB_PATROL]: SPRITE_URLS.patrol,
  [BlockType.MOB_STATIONARY]: SPRITE_URLS.stationary,
  [BlockType.BOSS]: SPRITE_URLS.boss,
  [BlockType.DOOR]: SPRITE_URLS.door,
  [BlockType.SPAWN]: SPRITE_URLS.spawn,
};

const BLOCK_NAMES: Record<number, string> = {
  [BlockType.EMPTY]: '지우개',
  [BlockType.WALL]: '석벽',
  [BlockType.SPIKE]: '함정',
  [BlockType.MOB_PATROL]: '해골',
  [BlockType.MOB_STATIONARY]: '마법사',
  [BlockType.BOSS]: '마왕',
  [BlockType.DOOR]: '문',
  [BlockType.SPAWN]: '소환진',
};

const BLOCK_NAMES_FULL: Record<number, string> = {
  [BlockType.EMPTY]: '지우개',
  [BlockType.WALL]: '석벽',
  [BlockType.SPIKE]: '철가시 함정',
  [BlockType.MOB_PATROL]: '해골 전사',
  [BlockType.MOB_STATIONARY]: '어둠 마법사',
  [BlockType.BOSS]: '마왕 (약점형)',
  [BlockType.DOOR]: '고대의 문',
  [BlockType.SPAWN]: '소환진',
};

interface Props {
  onSave: (rooms: RoomData[]) => Promise<void> | void;
  onCancel: () => void;
}

export function LevelEditor({ onSave, onCancel }: Props) {
  const [rooms, setRooms] = useState<RoomData[]>([
    { grid: createFloorGrid() },
    { grid: createFloorGrid() },
    { grid: createFloorGrid() }
  ]);
  const [currentRoom, setCurrentRoom] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(BlockType.WALL);
  const [isDragging, setIsDragging] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasClearedTest, setHasClearedTest] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        const availW = window.innerWidth - 16;
        setCellSize(Math.floor(availW / TOWER_COLS));
      } else {
        setCellSize(36);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleCellAction = useCallback((r: number, c: number) => {
    setRooms(prev => {
      const oldVal = prev[currentRoom].grid[r][c];
      if (oldVal === selectedBlock) return prev; // no change
      const newRooms = [...prev];
      const newGrid = newRooms[currentRoom].grid.map(row => [...row]);
      newGrid[r][c] = selectedBlock;
      newRooms[currentRoom] = { ...newRooms[currentRoom], grid: newGrid };
      setHasClearedTest(false);
      setMessage(null);
      return newRooms;
    });
  }, [currentRoom, selectedBlock]);

  // 1 finger = draw, 2 fingers = scroll (browser handles pan-y)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length >= 2) return; // let browser handle 2-finger scroll
    e.preventDefault();
    const touch = e.touches[0];
    const grid = gridContainerRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top + grid.scrollTop;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r >= 0 && r < TOWER_ROWS && c >= 0 && c < TOWER_COLS) {
      handleCellAction(r, c);
    }
  }, [cellSize, handleCellAction]);

  const validateLevel = () => {
    let hasSpawn = false;
    let hasBoss = false;
    rooms.forEach(room => {
      room.grid.forEach(row => {
        row.forEach(cell => {
          if (cell === BlockType.SPAWN) hasSpawn = true;
          if (cell === BlockType.BOSS) hasBoss = true;
        });
      });
    });
    if (!hasSpawn) { setMessage({ text: '소환진(SPAWN)이 최소 1개 필요합니다!', type: 'error' }); return false; }
    if (!hasBoss) { setMessage({ text: '마왕(BOSS)이 최소 1명 필요합니다!', type: 'error' }); return false; }
    setMessage(null);
    return true;
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!hasClearedTest) { setMessage({ text: '테스트 플레이를 클리어해야 저장할 수 있습니다.', type: 'error' }); return; }
    if (!validateLevel()) return;
    setSaving(true);
    try {
      await onSave(rooms);
    } catch (err) {
      setMessage({ text: 'Save failed. Please try again.', type: 'error' });
      setSaving(false);
    }
  };

  const handleTestPlay = () => {
    if (validateLevel()) setIsTesting(true);
  };

  if (isTesting) {
    return (
      <div className="relative w-full h-[100dvh] bg-[#09090b] overflow-hidden flex flex-col items-center justify-center">
        <GameCanvas
          level={{ id: 'test', name: '테스트 플레이', creator: '마왕 (테스트)', creatorId: 'test', infamy: 0, clears: 0, attempts: 0, rooms }}
          onWin={() => { setHasClearedTest(true); setIsTesting(false); setMessage({ text: '테스트 클리어! 이제 저장할 수 있습니다.', type: 'success' }); }}
          onLose={() => { setIsTesting(false); setMessage({ text: '테스트 실패... 난이도를 조절해보세요.', type: 'error' }); }}
        />
        <button
          onClick={() => setIsTesting(false)}
          className="absolute top-3 right-3 md:top-6 md:right-6 bg-[#18181b] border border-[#27272a] text-[#a1a1aa] px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold flex items-center gap-2 z-50 text-sm hover:border-[#3f3f46] transition-colors"
        >
          <X className="w-4 h-4" /> 종료
        </button>
      </div>
    );
  }

  // === MOBILE LAYOUT ===
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col h-[100dvh] bg-[#09090b] text-[#e4e4e7] font-sans overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a] bg-[#111114] shrink-0">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <button key={i} onClick={() => setCurrentRoom(i)}
                className={`px-3 py-1.5 rounded-md font-semibold text-xs tracking-wider transition-all ${
                  currentRoom === i ? 'bg-[#c084fc]/10 border border-[#c084fc]/25 text-[#c084fc]' : 'text-[#52525b]'
                }`}
              >{i + 1}F</button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleTestPlay} className="btn-surface text-[#22d3ee] px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1">
              <Play className="w-3.5 h-3.5" /> Test
            </button>
            <button onClick={handleSave} disabled={!hasClearedTest || saving}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs flex items-center gap-1 ${hasClearedTest && !saving ? 'btn-surface text-[#4ade80]' : 'bg-[#111114] border border-[#1f1f23] text-[#27272a]'}`}
            ><Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}</button>
            <button onClick={onCancel} className="btn-surface text-[#71717a] px-2 py-1.5 rounded-md"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {message && (
          <div className={`mx-3 mt-2 p-2 rounded-md text-xs font-semibold text-center ${
            message.type === 'error' ? 'bg-[#f87171]/[0.08] text-[#f87171] border border-[#f87171]/20' : 'bg-[#4ade80]/[0.08] text-[#4ade80] border border-[#4ade80]/20'
          }`}>{message.text}</div>
        )}

        {/* Grid */}
        <div ref={gridContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center py-2">
          <div
            className="border border-[#27272a] bg-[#09090b]"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${TOWER_COLS}, ${cellSize}px)`,
              touchAction: 'pan-y',
            }}
            onTouchStart={handleTouchStart}
          >
            {rooms[currentRoom].grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`border-r border-b border-[#1f1f23] ${cell === BlockType.EMPTY ? 'bg-transparent' : 'bg-center bg-no-repeat bg-cover'}`}
                  style={{
                    width: cellSize, height: cellSize,
                    ...(cell !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[cell as BlockType]})` } : {}),
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Bottom palette */}
        <div className="shrink-0 border-t border-[#27272a] bg-[#111114]" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
          <div className="flex items-center px-3 py-1.5 gap-2">
            <span className="flex-shrink-0 text-[10px] text-[#3f3f46]">1-tap: draw / 2-finger: scroll</span>
            <button onClick={() => setShowPalette(!showPalette)}
              className="flex-1 flex items-center justify-center gap-2 text-[#52525b] text-xs"
            >
              {showPalette ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              {BLOCK_NAMES[selectedBlock]}
            </button>
          </div>

          {showPalette && (
            <div className="grid grid-cols-4 gap-1.5 px-3 pb-2">
              {Object.entries(BLOCK_NAMES).map(([type, name]) => {
                const typeNum = Number(type);
                const isSelected = selectedBlock === typeNum;
                return (
                  <button key={type} onClick={() => { setSelectedBlock(typeNum); setShowPalette(false); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${isSelected ? 'bg-[#c084fc]/10 border border-[#c084fc]/30' : 'bg-[#18181b] border border-[#27272a]'}`}
                  >
                    <div className={`w-8 h-8 rounded flex-shrink-0 ${typeNum === BlockType.EMPTY ? 'border border-dashed border-[#3f3f46]' : 'bg-center bg-no-repeat bg-cover'}`}
                      style={typeNum !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[typeNum]})` } : undefined} />
                    <span className="text-[10px] text-[#71717a] leading-tight">{name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {!showPalette && (
            <div className="flex gap-1 px-2 pb-1 overflow-x-auto">
              {Object.entries(BLOCK_NAMES).map(([type]) => {
                const typeNum = Number(type);
                const isSelected = selectedBlock === typeNum;
                return (
                  <button key={type} onClick={() => setSelectedBlock(typeNum)}
                    className={`flex-shrink-0 w-10 h-10 rounded-md transition-all ${
                      isSelected ? 'bg-[#c084fc]/10 border-2 border-[#c084fc]/40 scale-110' : 'bg-[#18181b] border border-[#27272a]'
                    } ${typeNum === BlockType.EMPTY ? '' : 'bg-center bg-no-repeat bg-cover'}`}
                    style={typeNum !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[typeNum]})` } : undefined}
                  >
                    {typeNum === BlockType.EMPTY && <span className="text-[#52525b] text-lg">+</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // === DESKTOP LAYOUT ===
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex h-screen bg-[#09090b] text-[#e4e4e7] font-sans overflow-hidden"
    >
      {/* Sidebar */}
      <div className="w-64 md:w-72 border-r border-[#27272a] bg-[#111114] p-5 flex flex-col z-10">
        <h2 className="text-lg font-display font-black text-[#fafafa] mb-5 flex items-center gap-2.5 tracking-wider">
          <Layers className="w-4.5 h-4.5 text-[#c084fc]" /> Tower Editor
        </h2>

        <div className="space-y-1 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-[0.15em] mb-2">Blocks</p>
          {Object.entries(BLOCK_NAMES_FULL).map(([type, name]) => {
            const typeNum = Number(type);
            const isSelected = selectedBlock === typeNum;
            return (
              <button key={type} onClick={() => setSelectedBlock(typeNum)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-150 ${
                  isSelected ? 'bg-[#c084fc]/10 border border-[#c084fc]/25' : 'bg-transparent border border-transparent hover:bg-[#18181b] hover:border-[#27272a]'
                }`}
              >
                <div className={`w-7 h-7 rounded flex-shrink-0 ${typeNum === BlockType.EMPTY ? 'border border-dashed border-[#3f3f46]' : 'bg-center bg-no-repeat bg-cover'}`}
                  style={typeNum !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[typeNum]})` } : undefined} />
                <span className="font-medium text-sm text-[#a1a1aa]">{name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-2 pt-4 border-t border-[#27272a]">
          {message && (
            <div className={`p-2.5 rounded-lg text-xs font-semibold text-center mb-2 ${
              message.type === 'error' ? 'bg-[#f87171]/[0.08] text-[#f87171] border border-[#f87171]/20' : 'bg-[#4ade80]/[0.08] text-[#4ade80] border border-[#4ade80]/20'
            }`}>{message.text}</div>
          )}
          <button onClick={handleTestPlay} className="w-full bg-[#22d3ee]/[0.08] hover:bg-[#22d3ee]/[0.15] border border-[#22d3ee]/15 hover:border-[#22d3ee]/30 text-[#22d3ee] py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all">
            <Play className="w-4 h-4" /> Test Play
          </button>
          <button onClick={handleSave} disabled={!hasClearedTest || saving}
            className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              hasClearedTest && !saving ? 'bg-[#4ade80]/[0.08] hover:bg-[#4ade80]/[0.15] border border-[#4ade80]/15 hover:border-[#4ade80]/30 text-[#4ade80]' : 'bg-[#111114] border border-[#1f1f23] text-[#27272a] cursor-not-allowed'
            }`}
          ><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Publish'}</button>
          <button onClick={onCancel} className="w-full bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-[#3f3f46] text-[#71717a] py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col items-center relative bg-[#09090b] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(39,39,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(39,39,42,0.06)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none"></div>

        {/* Floor tabs */}
        <div className="mt-4 flex gap-1 bg-[#111114] border border-[#27272a] p-1 rounded-lg z-10 shrink-0">
          {[0, 1, 2].map(i => (
            <button key={i} onClick={() => setCurrentRoom(i)}
              className={`px-5 py-2 rounded-md font-semibold text-sm tracking-wider transition-all duration-150 ${
                currentRoom === i ? 'bg-[#c084fc]/10 border border-[#c084fc]/25 text-[#c084fc]' : 'bg-transparent text-[#52525b] hover:text-[#71717a]'
              }`}
            >{i + 1}F</button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 z-10 custom-scrollbar">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}
            className="border border-[#27272a] bg-[#09090b] rounded-md overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.4)]"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${TOWER_COLS}, ${cellSize}px)` }}
            onMouseLeave={() => setIsDragging(false)}
            onMouseUp={() => setIsDragging(false)}
          >
            {rooms[currentRoom].grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); handleCellAction(r, c); }}
                  onMouseEnter={() => { if (isDragging) handleCellAction(r, c); }}
                  onDragStart={(e) => e.preventDefault()}
                  className={`border-r border-b border-[#1f1f23] cursor-crosshair transition-colors duration-75 ${
                    cell === BlockType.EMPTY ? 'bg-transparent hover:bg-[#18181b]' : 'bg-center bg-no-repeat bg-cover'
                  }`}
                  style={{
                    width: cellSize, height: cellSize,
                    ...(cell !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[cell as BlockType]})` } : {}),
                  }}
                />
              ))
            )}
          </motion.div>
        </div>

        <p className="pb-4 text-[#3f3f46] text-sm z-10 shrink-0">Drag to place blocks</p>
      </div>
    </motion.div>
  );
}
