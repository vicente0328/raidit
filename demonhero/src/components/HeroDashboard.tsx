import React from 'react';
import { LevelData, PlayerStats } from '../types';
import { Sword, ArrowLeft, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  levels: LevelData[];
  stats: PlayerStats;
  onPlay: (level: LevelData) => void;
  onBack: () => void;
}

export function HeroDashboard({ levels, stats, onPlay, onBack }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#050505] bg-noise text-zinc-100 p-8 font-sans relative"
    >
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-yellow-900/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-zinc-400 hover:text-yellow-500 mb-12 transition-colors font-medium uppercase tracking-widest text-sm">
          <ArrowLeft className="w-4 h-4" /> Return to Faction
        </button>

        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800/50 pb-8">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <h1 className="text-5xl md:text-6xl font-display font-black text-yellow-500 mb-4 flex items-center gap-4 tracking-wider drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              <Sword className="w-12 h-12" /> 용사 길드
            </h1>
            <p className="text-zinc-400 text-lg font-light tracking-wide">전 세계의 악명 높은 마왕성들이 당신의 도전을 기다립니다.</p>
          </motion.div>
          <motion.div 
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-6 min-w-[240px] shadow-2xl"
          >
            <p className="text-zinc-500 font-medium mb-1 uppercase tracking-widest text-xs">나의 총 명성</p>
            <p className="text-4xl font-display font-black text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">{stats.fame.toLocaleString()}</p>
          </motion.div>
        </div>

        <h2 className="text-2xl font-display font-bold mb-8 flex items-center gap-4 tracking-widest text-zinc-200">
          <div className="w-1 h-8 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
          공개된 마왕성 목록
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((l, i) => (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 * i }}
              key={l.id} 
              className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-3xl p-8 flex flex-col hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_-10px_rgba(234,179,8,0.2)]"
            >
              <h3 className="text-2xl font-display font-bold mb-2 tracking-wide text-zinc-100">{l.name}</h3>
              <p className="text-sm text-zinc-500 mb-8 font-medium tracking-wide">제작자: <span className="text-zinc-300">{l.creator}</span></p>
              
              <div className="space-y-4 text-sm mb-10 flex-1 bg-[#050505]/50 border border-zinc-800/30 p-5 rounded-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">악명</span>
                  <span className="text-purple-400 font-black text-lg drop-shadow-[0_0_8px_rgba(192,132,252,0.4)]">{l.infamy.toLocaleString()}</span>
                </div>
                <div className="h-px w-full bg-zinc-800/50"></div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">클리어율</span>
                  <span className="text-zinc-200 font-bold text-lg">
                    {l.attempts > 0 ? Math.round((l.clears / l.attempts) * 100) : 0}%
                  </span>
                </div>
                <div className="h-px w-full bg-zinc-800/50"></div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 font-medium uppercase tracking-wider text-xs">도전 횟수</span>
                  <span className="text-zinc-400 font-medium">{l.attempts.toLocaleString()} 회</span>
                </div>
              </div>

              <button 
                onClick={() => onPlay(l)}
                className="w-full bg-transparent border border-yellow-500/50 hover:bg-yellow-500 hover:text-zinc-950 text-yellow-500 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300 group"
              >
                <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" /> 공략 시작 (하트 5)
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
