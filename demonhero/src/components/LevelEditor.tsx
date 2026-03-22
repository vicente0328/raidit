import React, { useState } from 'react';
import { BlockType, RoomData } from '../types';
import { createFloorGrid } from '../utils';
import { Save, X, Layers, Play } from 'lucide-react';
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

  const handleCellAction = (r: number, c: number) => {
    const newRooms = [...rooms];
    const newGrid = newRooms[currentRoom].grid.map(row => [...row]);
    newGrid[r][c] = selectedBlock;
    newRooms[currentRoom].grid = newGrid;
    setRooms(newRooms);
    setHasClearedTest(false);
    setMessage(null);
  };

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
          className="absolute top-6 right-6 btn-medieval text-[#e8dcc8] px-6 py-3 rounded-xl font-medieval font-bold flex items-center gap-2 z-50"
        >
          <X className="w-5 h-5" /> 테스트 종료
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex h-screen bg-[#0d0a07] text-[#e8dcc8] font-sans overflow-hidden"
    >
      {/* Sidebar */}
      <div className="w-72 md:w-80 border-r border-[#3d3630]/50 bg-gradient-to-b from-[#1a1510] to-[#0d0a07] p-5 flex flex-col z-10 relative">
        {/* Decorative top line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent"></div>

        <h2 className="text-xl font-display font-black text-[#7c3aed] mb-6 flex items-center gap-3 tracking-widest glow-royal">
          <Layers className="w-5 h-5" /> 마왕성 설계
        </h2>

        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          <p className="text-[10px] font-bold text-[#5a4d3e] uppercase tracking-[0.2em] mb-3 font-medieval">건축 자재</p>
          {Object.entries(BLOCK_NAMES).map(([type, name]) => {
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
        {/* Subtle grid bg */}
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
          style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 40px)' }}
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
                className={`w-[40px] h-[40px] border-r border-b border-[#2a2520]/40 cursor-crosshair transition-colors duration-75 ${
                  cell === BlockType.EMPTY ? 'bg-transparent hover:bg-[#2a2520]/40' : 'bg-center bg-no-repeat bg-cover'
                }`}
                style={cell !== BlockType.EMPTY ? { backgroundImage: `url(${BLOCK_IMAGES[cell as BlockType]})` } : undefined}
              />
            ))
          )}
        </motion.div>
        <p className="mt-6 text-[#5a4d3e] font-medieval text-sm tracking-wide z-10">드래그하여 여러 블록을 연속으로 배치할 수 있습니다.</p>
      </div>
    </motion.div>
  );
}
