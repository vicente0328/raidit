import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockType, RoomData } from '../types';
import { createFloorGrid } from '../utils';
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
  onSave: (rooms: RoomData[]) => void;
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
        // Calculate cell size to fit 20 columns in screen width with some padding
        const availW = window.innerWidth - 8; // 4px padding each side
        setCellSize(Math.floor(availW / 20));
      } else {
        setCellSize(40);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleCellAction = useCallback((r: number, c: number) => {
    setRooms(prev => {
      const newRooms = [...prev];
      const newGrid = newRooms[currentRoom].grid.map(row => [...row]);
      newGrid[r][c] = selectedBlock;
      newRooms[currentRoom] = { ...newRooms[currentRoom], grid: newGrid };
      return newRooms;
    });
    setHasClearedTest(false);
    setMessage(null);
  }, [currentRoom, selectedBlock]);

  // Touch handling for grid drawing on mobile
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const grid = gridContainerRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r >= 0 && r < 12 && c >= 0 && c < 20) {
      handleCellAction(r, c);
    }
  }, [cellSize, handleCellAction]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const grid = gridContainerRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const c = Math.floor(x / cellSize);
    const r = Math.floor(y / cellSize);
    if (r >= 0 && r < 12 && c >= 0 && c < 20) {
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

    if (!hasSpawn) {
      setMessage({ text: '소환진(SPAWN)이 최소 1개 필요합니다!', type: 'error' });
      return false;
    }
    if (!hasBoss) {
      setMessage({ text: '마왕(BOSS)이 최소 1명 필요합니다!', type: 'error' });
      return false;
    }
    setMessage(null);
    return true;
  };

  const handleSave = () => {
    if (!hasClearedTest) {
      setMessage({ text: '테스트 플레이를 클리어해야 저장할 수 있습니다.', type: 'error' });
      return;
    }
    if (validateLevel()) {
      onSave(rooms);
    }
  };

  const handleTestPlay = () => {
    if (validateLevel()) {
      setIsTesting(true);
    }
  };

  if (isTesting) {
    return (
      <div className="relative w-full h-screen bg-[#0d0a07] overflow-hidden flex flex-col items-center justify-center">
        <GameCanvas
          level={{ id: 'test', name: '테스트 플레이', creator: '마왕 (테스트)', creatorId: 'test', infamy: 0, clears: 0, attempts: 0, rooms }}
          onWin={() => {
            setHasClearedTest(true);
            setIsTesting(false);
            setMessage({ text: '테스트 클리어! 이제 저장할 수 있습니다.', type: 'success' });
          }}
          onLose={() => {
            setIsTesting(false);
            setMessage({ text: '테스트 실패... 난이도를 조절해보세요.', type: 'error' });
          }}
        />
        <button
          onClick={() => setIsTesting(false)}
          className="absolute top-3 right-3 md:top-6 md:right-6 btn-medieval text-[#e8dcc8] px-4 py-2 md:px-6 md:py-3 rounded-xl font-medieval font-bold flex items-center gap-2 z-50 text-sm"
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
        className="flex flex-col h-[100dvh] bg-[#0d0a07] text-[#e8dcc8] font-sans overflow-hidden"
      >
        {/* Top bar: Room tabs + actions */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#3d3630]/50 bg-[#1a1510] shrink-0">
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <button
                key={i}
                onClick={() => setCurrentRoom(i)}
                className={`px-3 py-1.5 rounded-lg font-medieval font-bold text-xs tracking-wider transition-all ${
                  currentRoom === i
                    ? 'bg-[#4c1d95]/30 border border-[#7c3aed]/40 text-[#a78bfa]'
                    : 'text-[#5a4d3e]'
                }`}
              >
                방{i + 1}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={handleTestPlay}
              className="btn-medieval text-[#38bdf8] px-3 py-1.5 rounded-lg font-medieval font-bold text-xs flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" /> 테스트
            </button>
            <button
              onClick={handleSave}
              disabled={!hasClearedTest}
              className={`px-3 py-1.5 rounded-lg font-medieval font-bold text-xs flex items-center gap-1 ${
                hasClearedTest
                  ? 'btn-medieval text-[#7c3aed]'
                  : 'bg-[#1a1510] border border-[#2a2520] text-[#3d3630]'
              }`}
            >
              <Save className="w-3.5 h-3.5" /> 저장
            </button>
            <button
              onClick={onCancel}
              className="btn-medieval text-[#8b7355] px-2 py-1.5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mx-3 mt-2 p-2 rounded-lg text-xs font-medieval font-bold text-center ${
            message.type === 'error'
              ? 'bg-[#8b0000]/15 text-[#cc2200] border border-[#8b0000]/30'
              : 'bg-[#166534]/15 text-[#4ade80] border border-[#166534]/30'
          }`}>
            {message.text}
          </div>
        )}

        {/* Grid area - takes remaining space */}
        <div className="flex-1 flex items-center justify-center overflow-hidden px-1 py-2">
          <div
            ref={gridContainerRef}
            className="border border-[#3d3630]/50 bg-[#0d0a07]/80 rounded-lg overflow-hidden"
            style={{ display: 'grid', gridTemplateColumns: `repeat(20, ${cellSize}px)`, touchAction: 'none' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            {rooms[currentRoom].grid.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`border-r border-b border-[#2a2520]/30 ${
                    cell === BlockType.EMPTY ? 'bg-transparent' : 'bg-center bg-no-repeat bg-cover'
                  }`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    ...(cell !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[cell as BlockType]})` } : {}),
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Bottom palette toolbar */}
        <div className="shrink-0 border-t border-[#3d3630]/50 bg-[#1a1510]"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {/* Expandable palette */}
          <button
            onClick={() => setShowPalette(!showPalette)}
            className="w-full flex items-center justify-center gap-2 py-1.5 text-[#5a4d3e] text-xs font-medieval"
          >
            {showPalette ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            {BLOCK_NAMES[selectedBlock]} 선택됨
          </button>

          {showPalette && (
            <div className="grid grid-cols-4 gap-1.5 px-3 pb-2">
              {Object.entries(BLOCK_NAMES).map(([type, name]) => {
                const typeNum = Number(type);
                const isSelected = selectedBlock === typeNum;
                return (
                  <button
                    key={type}
                    onClick={() => { setSelectedBlock(typeNum); setShowPalette(false); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-[#4c1d95]/30 border border-[#7c3aed]/50'
                        : 'bg-[#0d0a07]/50 border border-[#3d3630]/30'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-md flex-shrink-0 ${typeNum === BlockType.EMPTY ? 'border border-dashed border-[#5a4d3e]' : 'bg-center bg-no-repeat bg-cover'}`}
                      style={typeNum !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[typeNum]})` } : undefined}
                    />
                    <span className="font-medieval text-[10px] text-[#c4a882] leading-tight">{name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick palette strip (always visible) */}
          {!showPalette && (
            <div className="flex gap-1 px-2 pb-1 overflow-x-auto">
              {Object.entries(BLOCK_NAMES).map(([type]) => {
                const typeNum = Number(type);
                const isSelected = selectedBlock === typeNum;
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedBlock(typeNum)}
                    className={`flex-shrink-0 w-10 h-10 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-[#4c1d95]/30 border-2 border-[#7c3aed]/60 scale-110'
                        : 'bg-[#0d0a07]/50 border border-[#3d3630]/30'
                    } ${typeNum === BlockType.EMPTY ? '' : 'bg-center bg-no-repeat bg-cover'}`}
                    style={typeNum !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[typeNum]})` } : undefined}
                  >
                    {typeNum === BlockType.EMPTY && (
                      <span className="text-[#5a4d3e] text-lg">✕</span>
                    )}
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
      className="flex h-screen bg-[#0d0a07] text-[#e8dcc8] font-sans overflow-hidden"
    >
      {/* Sidebar */}
      <div className="w-72 md:w-80 border-r border-[#3d3630]/50 bg-gradient-to-b from-[#1a1510] to-[#0d0a07] p-5 flex flex-col z-10 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent"></div>

        <h2 className="text-xl font-display font-black text-[#7c3aed] mb-6 flex items-center gap-3 tracking-widest glow-royal">
          <Layers className="w-5 h-5" /> 마왕성 설계
        </h2>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <p className="text-[10px] font-bold text-[#5a4d3e] uppercase tracking-[0.2em] mb-3 font-medieval">건축 자재</p>
          {Object.entries(BLOCK_NAMES_FULL).map(([type, name]) => {
            const typeNum = Number(type);
            const isSelected = selectedBlock === typeNum;
            return (
              <button
                key={type}
                onClick={() => setSelectedBlock(typeNum)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#4c1d95]/20 border border-[#7c3aed]/50 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
                    : 'bg-transparent border border-transparent hover:border-[#3d3630]/50 hover:bg-[#1a1510]'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-md shadow-inner flex-shrink-0 ${typeNum === BlockType.EMPTY ? 'border border-dashed border-[#5a4d3e]' : 'bg-center bg-no-repeat bg-cover'}`}
                  style={typeNum !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[typeNum]})` } : undefined}
                ></div>
                <span className="font-medieval font-bold text-sm text-[#c4a882] tracking-wide">{name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-2 pt-5 border-t border-[#3d3630]/50">
          {message && (
            <div className={`p-3 rounded-xl text-xs font-medieval font-bold text-center mb-3 ${
              message.type === 'error'
                ? 'bg-[#8b0000]/15 text-[#cc2200] border border-[#8b0000]/30'
                : 'bg-[#166534]/15 text-[#4ade80] border border-[#166534]/30'
            }`}>
              {message.text}
            </div>
          )}
          <button
            onClick={handleTestPlay}
            className="w-full btn-medieval text-[#38bdf8] py-3.5 rounded-xl font-medieval font-bold text-sm flex items-center justify-center gap-2 transition-all"
          >
            <Play className="w-4 h-4" /> 테스트 플레이
          </button>
          <button
            onClick={handleSave}
            disabled={!hasClearedTest}
            className={`w-full py-3.5 rounded-xl font-medieval font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              hasClearedTest
                ? 'btn-medieval text-[#7c3aed]'
                : 'bg-[#1a1510] border-2 border-[#2a2520] text-[#3d3630] cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" /> 저장 및 오픈
          </button>
          <button
            onClick={onCancel}
            className="w-full btn-medieval text-[#8b7355] py-3.5 rounded-xl font-medieval font-bold text-sm flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> 취소
          </button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-dungeon">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(90,77,62,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(90,77,62,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

        {/* Room tabs */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-1 card-stone p-1.5 rounded-xl z-10">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => setCurrentRoom(i)}
              className={`px-6 py-2.5 rounded-lg font-medieval font-bold text-sm tracking-widest transition-all duration-200 ${
                currentRoom === i
                  ? 'bg-[#4c1d95]/20 border border-[#7c3aed]/40 text-[#a78bfa] shadow-[0_0_8px_rgba(124,58,237,0.2)]'
                  : 'bg-transparent text-[#5a4d3e] hover:text-[#8b7355] hover:bg-[#1a1510]'
              }`}
            >
              방 {i + 1}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="border border-[#3d3630]/50 bg-[#0d0a07]/80 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.5)] mt-14 relative z-10"
          style={{ display: 'grid', gridTemplateColumns: `repeat(20, ${cellSize}px)` }}
          onMouseLeave={() => setIsDragging(false)}
          onMouseUp={() => setIsDragging(false)}
        >
          {rooms[currentRoom].grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                  handleCellAction(r, c);
                }}
                onMouseEnter={() => {
                  if (isDragging) handleCellAction(r, c);
                }}
                onDragStart={(e) => e.preventDefault()}
                className={`border-r border-b border-[#2a2520]/40 cursor-crosshair transition-colors duration-75 ${
                  cell === BlockType.EMPTY ? 'bg-transparent hover:bg-[#2a2520]/40' : 'bg-center bg-no-repeat bg-cover'
                }`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  ...(cell !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[cell as BlockType]})` } : {}),
                }}
              />
            ))
          )}
        </motion.div>
        <p className="mt-6 text-[#5a4d3e] font-medieval text-sm tracking-wide z-10">드래그하여 여러 블록을 연속으로 배치할 수 있습니다.</p>
      </div>
    </motion.div>
  );
}
