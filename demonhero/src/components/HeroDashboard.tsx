import React from 'react';
import { LevelData, PlayerStats } from '../types';
import { Sword, ArrowLeft, Play, Shield } from 'lucide-react';
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
      className="min-h-screen bg-dungeon text-[#e8dcc8] p-6 md:p-8 font-sans relative"
    >
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#d4a017]/5 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#c2410c]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-[#8b7355] hover:text-[#d4a017] mb-10 transition-colors font-medieval uppercase tracking-widest text-sm">
          <ArrowLeft className="w-4 h-4" /> 진영 선택으로
        </button>

        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#3d3630]/50">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-px bg-[#d4a017]/50"></div>
              <span className="text-[#8b6914] text-xs tracking-[0.3em] font-medieval uppercase">Adventurer's Guild</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-black text-[#d4a017] mb-3 flex items-center gap-4 tracking-wider glow-gold">
              <Sword className="w-10 h-10 md:w-12 md:h-12" /> 용사 길드
            </h1>
            <p className="text-[#8b7355] text-base md:text-lg font-medieval tracking-wide">전 세계의 악명 높은 마왕성들이 당신의 도전을 기다립니다.</p>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="card-stone rounded-xl p-5 min-w-[220px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-[#8b6914]" />
              <p className="text-[#8b7355] font-medieval text-xs uppercase tracking-widest">나의 총 명성</p>
            </div>
            <p className="text-3xl md:text-4xl font-display font-black text-[#d4a017] glow-gold">{stats.fame.toLocaleString()}</p>
          </motion.div>
        </div>

        <h2 className="text-xl md:text-2xl font-display font-bold mb-8 flex items-center gap-4 tracking-wider text-[#e8dcc8]">
          <div className="w-1 h-7 bg-[#d4a017] shadow-[0_0_8px_rgba(212,160,23,0.6)]"></div>
          공개된 마왕성 목록
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {levels.map((l, i) => (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 * i }}
              key={l.id}
              className="card-stone rounded-2xl p-7 flex flex-col transition-all duration-300 hover:-translate-y-2"
            >
              <h3 className="text-xl md:text-2xl font-display font-bold mb-2 tracking-wide text-[#e8dcc8]">{l.name}</h3>
              <p className="text-sm text-[#8b7355] mb-6 font-medieval tracking-wide">제작자: <span className="text-[#c4a882]">{l.creator}</span></p>

              <div className="space-y-3 text-sm mb-8 flex-1 bg-[#0d0a07]/60 border border-[#3d3630]/30 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[#8b7355] font-medieval text-xs uppercase tracking-wider">악명</span>
                  <span className="text-[#7c3aed] font-black text-lg glow-royal">{l.infamy.toLocaleString()}</span>
                </div>
                <div className="h-px w-full bg-[#3d3630]/40"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b7355] font-medieval text-xs uppercase tracking-wider">클리어율</span>
                  <span className="text-[#e8dcc8] font-bold text-lg">
                    {l.attempts > 0 ? Math.round((l.clears / l.attempts) * 100) : 0}%
                  </span>
                </div>
                <div className="h-px w-full bg-[#3d3630]/40"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b7355] font-medieval text-xs uppercase tracking-wider">도전 횟수</span>
                  <span className="text-[#8b7355] font-medium">{l.attempts.toLocaleString()} 회</span>
                </div>
              </div>

              <button
                onClick={() => onPlay(l)}
                className="w-full btn-medieval text-[#d4a017] hover:text-[#f0c85a] py-4 rounded-xl font-medieval font-bold text-base flex items-center justify-center gap-2 transition-all group"
              >
                <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" /> 공략 시작
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
