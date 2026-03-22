import React, { useState } from 'react';
import { BlockType, RoomData } from '../types';
import { createFloorGrid } from '../utils';
import { Save, X, Layers, Play } from 'lucide-react';
import { motion } from 'motion/react';
import { SPRITES, heroSvg, patrolSvg, stationarySvg, bossSvg, wallSvg, spikeSvg, doorSvg } from '../sprites';
import { GameCanvas } from './GameCanvas';

const BLOCK_SPRITES = {
  [BlockType.EMPTY]: '',
  [BlockType.WALL]: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(wallSvg)}')`,
  [BlockType.SPIKE]: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(spikeSvg)}')`,
  [BlockType.MOB_PATROL]: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(patrolSvg)}')`,
  [BlockType.MOB_STATIONARY]: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(stationarySvg)}')`,
  [BlockType.BOSS]: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(bossSvg)}')`,
  [BlockType.DOOR]: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(doorSvg)}')`,
  [BlockType.SPAWN]: `url('data:image/svg+xml;charset=utf-8,${encodeURIComponent(heroSvg)}')`,
};

const BLOCK_COLORS = {
  [BlockType.EMPTY]: 'bg-[#050505]',
  [BlockType.WALL]: 'bg-zinc-600 border-t-zinc-500 border-l-zinc-500 border-b-zinc-800 border-r-zinc-800 border-2',
  [BlockType.SPIKE]: 'bg-red-900 border-red-500 border',
  [BlockType.MOB_PATROL]: 'bg-purple-900 border-purple-500 border shadow-[inset_0_0_10px_rgba(168,85,247,0.5)]',
  [BlockType.MOB_STATIONARY]: 'bg-fuchsia-900 border-fuchsia-500 border shadow-[inset_0_0_10px_rgba(217,70,239,0.5)]',
  [BlockType.BOSS]: 'bg-pink-950 border-pink-500 border-2 shadow-[inset_0_0_15px_rgba(236,72,153,0.8)]',
  [BlockType.DOOR]: 'bg-yellow-900 border-yellow-500 border shadow-[inset_0_0_10px_rgba(234,179,8,0.5)]',
  [BlockType.SPAWN]: 'bg-emerald-900 border-emerald-500 border shadow-[inset_0_0_10px_rgba(16,185,129,0.5)]',
};

const BLOCK_NAMES = {
  [BlockType.EMPTY]: '지우개',
  [BlockType.WALL]: '벽/바닥',
  [BlockType.SPIKE]: '가시 함정',
  [BlockType.MOB_PATROL]: '순찰 몹',
  [BlockType.MOB_STATIONARY]: '고정 몹',
  [BlockType.BOSS]: '보스 (약점형)',
  [BlockType.DOOR]: '다음 방 문',
  [BlockType.SPAWN]: '시작 지점',
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
      setMessage({ text: '용사 시작점(SPAWN)이 최소 1개 필요합니다!', type: 'error' });
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
      <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex flex-col items-center justify-center">
        <GameCanvas 
          level={{ id: 'test', name: '테스트 플레이', creator: '마왕 (테스트)', infamy: 0, clears: 0, attempts: 0, rooms }}
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
          className="absolute top-6 right-6 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 z-50 backdrop-blur-md transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        >
          <X className="w-5 h-5" /> 테스트 종료
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex h-screen bg-[#050505] bg-noise text-white font-sans overflow-hidden"
    >
      {/* Sidebar */}
      <div className="w-80 border-r border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl p-6 flex flex-col shadow-2xl z-10 relative">
        <h2 className="text-2xl font-display font-black text-purple-500 mb-8 flex items-center gap-3 tracking-widest drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
          <Layers className="w-6 h-6" /> 마왕성 설계
        </h2>
        
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">건축 자재</p>
          {Object.entries(BLOCK_NAMES).map(([type, name]) => (
            <button 
              key={type}
              onClick={() => setSelectedBlock(Number(type))}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
                selectedBlock === Number(type) 
                  ? 'bg-purple-900/20 border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                  : 'bg-zinc-900/40 border border-transparent hover:border-zinc-700/50'
              }`}
            >
              <div 
                className={`w-8 h-8 rounded-md shadow-inner ${Number(type) === BlockType.EMPTY ? 'border border-dashed border-zinc-600' : 'bg-center bg-no-repeat bg-contain'}`}
                style={{ backgroundImage: BLOCK_SPRITES[Number(type) as BlockType] }}
              ></div>
              <span className="font-bold text-zinc-300 tracking-wide">{name}</span>
            </button>
          ))}
        </div>
        
        <div className="mt-8 space-y-3 pt-6 border-t border-zinc-800/50">
          {message && (
            <div className={`p-3 rounded-xl text-sm font-bold text-center mb-4 ${message.type === 'error' ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-green-900/30 text-green-400 border border-green-500/30'}`}>
              {message.text}
            </div>
          )}
          <button 
            onClick={handleTestPlay} 
            className="w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
          >
            <Play className="w-5 h-5" /> 테스트 플레이
          </button>
          <button 
            onClick={handleSave} 
            disabled={!hasClearedTest}
            className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              hasClearedTest 
                ? 'bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                : 'bg-zinc-900/50 border border-zinc-800 text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Save className="w-5 h-5" /> 저장 및 오픈
          </button>
          <button 
            onClick={onCancel} 
            className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <X className="w-5 h-5" /> 취소
          </button>
        </div>
      </div>
      
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-2 bg-zinc-950/80 backdrop-blur-md p-2 rounded-2xl border border-zinc-800/50 shadow-2xl z-10">
          {[0, 1, 2].map(i => (
            <button 
              key={i}
              onClick={() => setCurrentRoom(i)}
              className={`px-8 py-3 rounded-xl font-bold tracking-widest transition-all duration-200 ${
                currentRoom === i 
                  ? 'bg-purple-600/20 border border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                  : 'bg-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              방 {i + 1}
            </button>
          ))}
        </div>
        
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
          className="border border-purple-500/30 bg-[#050505]/80 backdrop-blur-sm rounded-lg overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.1)] mt-16 relative z-10" 
          style={{ display: 'grid', gridTemplateColumns: `repeat(20, 40px)` }}
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
                onMouseEnter={(e) => {
                  if (isDragging) handleCellAction(r, c);
                }}
                onDragStart={(e) => e.preventDefault()}
                className={`w-[40px] h-[40px] border-r border-b border-zinc-800/30 cursor-crosshair transition-colors duration-75 ${cell === BlockType.EMPTY ? 'bg-transparent hover:bg-zinc-800/50' : 'bg-center bg-no-repeat bg-contain'}`}
                style={{ backgroundImage: BLOCK_SPRITES[cell as BlockType] }}
              />
            ))
          )}
        </motion.div>
        <p className="mt-8 text-zinc-600 font-medium tracking-wide z-10">드래그하여 여러 블록을 연속으로 배치할 수 있습니다.</p>
      </div>
    </motion.div>
  );
}
