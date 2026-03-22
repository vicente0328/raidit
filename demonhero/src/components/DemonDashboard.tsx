import React from 'react';
import { LevelData, PlayerStats } from '../types';
import { Skull, Plus, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  levels: LevelData[];
  stats: PlayerStats;
  userId: string;
  onEdit: () => void;
  onBack: () => void;
}

export function DemonDashboard({ levels, stats, userId, onEdit, onBack }: Props) {
  const myLevels = levels.filter(l => l.creatorId === userId);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#050505] bg-noise text-zinc-100 p-8 font-sans relative"
    >
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-purple-500 mb-12 transition-colors font-medium uppercase tracking-widest text-sm">
          <ArrowLeft className="w-4 h-4" /> Return to Faction
        </button>

        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800/50 pb-8">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <h1 className="text-5xl md:text-6xl font-display font-black text-purple-500 mb-4 flex items-center gap-4 tracking-wider drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Skull className="w-12 h-12" /> 마왕성 관리소
            </h1>
            <p className="text-zinc-400 text-lg font-light tracking-wide">치명적인 함정과 몬스터를 배치하여 용사들을 절망에 빠뜨리세요.</p>
          </motion.div>
          <motion.div 
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-6 min-w-[240px] shadow-2xl"
          >
            <p className="text-zinc-500 font-medium mb-1 uppercase tracking-widest text-xs">나의 총 악명</p>
            <p className="text-4xl font-display font-black text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]">{stats.infamy.toLocaleString()}</p>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h2 className="text-2xl font-display font-bold flex items-center gap-4 tracking-widest text-zinc-200">
            <div className="w-1 h-8 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
            내 마왕성 목록
          </h2>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEdit}
            className="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            <Plus className="w-5 h-5" /> 새 마왕성 설계
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myLevels.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="col-span-full text-center py-32 text-zinc-500 border border-dashed border-zinc-800/50 rounded-3xl bg-zinc-900/20 backdrop-blur-sm"
            >
              <Skull className="w-16 h-16 mx-auto mb-6 text-zinc-700" />
              <p className="text-xl font-display font-bold mb-2 tracking-wider text-zinc-400">아직 설계한 마왕성이 없습니다.</p>
              <p className="text-zinc-600 font-light">새로운 마왕성을 만들어 용사들을 시험하세요!</p>
            </motion.div>
          ) : myLevels.map((l, i) => (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i }}
              key={l.id} 
              className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-3xl p-8 hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.2)]"
            >
              <h3 className="text-2xl font-display font-bold mb-8 tracking-wide text-zinc-100">{l.name}</h3>
              
              <div className="space-y-4 text-sm bg-[#050505]/50 border border-zinc-800/30 p-5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">현재 악명</span>
                  <span className="text-purple-400 font-black text-lg drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]">{l.infamy.toLocaleString()}</span>
                </div>
                <div className="h-px w-full bg-zinc-800/50"></div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">방어 성공</span>
                  <span className="text-zinc-200 font-bold text-lg">{l.attempts - l.clears} 회</span>
                </div>
                <div className="h-px w-full bg-zinc-800/50"></div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">돌파 허용</span>
                  <span className="text-red-400 font-bold text-lg">{l.clears} 회</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
