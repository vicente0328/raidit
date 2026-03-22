import React from 'react';
import { LevelData, PlayerStats } from '../types';
import { Skull, Plus, ArrowLeft, Flame } from 'lucide-react';
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
      className="min-h-screen bg-dungeon text-[#e8dcc8] p-6 md:p-8 font-sans relative"
    >
      {/* Ambient glow - demonic */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[#4c1d95]/8 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#8b0000]/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <button onClick={onBack} className="flex items-center gap-2 text-[#8b7355] hover:text-[#7c3aed] mb-10 transition-colors font-medieval uppercase tracking-widest text-sm">
          <ArrowLeft className="w-4 h-4" /> 진영 선택으로
        </button>

        <div className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#3d3630]/50">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-px bg-[#7c3aed]/50"></div>
              <span className="text-[#6b4d9a] text-xs tracking-[0.3em] font-medieval uppercase">Dark Architect's Hall</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-black text-[#7c3aed] mb-3 flex items-center gap-4 tracking-wider glow-royal">
              <Skull className="w-10 h-10 md:w-12 md:h-12" /> 마왕성 관리소
            </h1>
            <p className="text-[#8b7355] text-base md:text-lg font-medieval tracking-wide">치명적인 함정과 몬스터를 배치하여 용사들을 절망에 빠뜨리세요.</p>
          </motion.div>

          <motion.div
            initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="card-stone rounded-xl p-5 min-w-[220px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-4 h-4 text-[#6b4d9a]" />
              <p className="text-[#8b7355] font-medieval text-xs uppercase tracking-widest">나의 총 악명</p>
            </div>
            <p className="text-3xl md:text-4xl font-display font-black text-[#7c3aed] glow-royal">{stats.infamy.toLocaleString()}</p>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <h2 className="text-xl md:text-2xl font-display font-bold flex items-center gap-4 tracking-wider text-[#e8dcc8]">
            <div className="w-1 h-7 bg-[#7c3aed] shadow-[0_0_8px_rgba(124,58,237,0.6)]"></div>
            내 마왕성 목록
          </h2>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onEdit}
            className="btn-medieval text-[#7c3aed] hover:text-[#a78bfa] px-6 py-3 rounded-xl font-medieval font-bold flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" /> 새 마왕성 설계
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myLevels.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="col-span-full text-center py-28 border border-dashed border-[#3d3630]/50 rounded-2xl card-stone"
            >
              <Skull className="w-16 h-16 mx-auto mb-6 text-[#3d3630]" />
              <p className="text-xl font-display font-bold mb-2 tracking-wider text-[#8b7355]">아직 설계한 마왕성이 없습니다.</p>
              <p className="text-[#5a4d3e] font-medieval">새로운 마왕성을 만들어 용사들을 시험하세요!</p>
            </motion.div>
          ) : myLevels.map((l, i) => (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 * i }}
              key={l.id}
              className="card-stone rounded-2xl p-7 transition-all duration-300 hover:-translate-y-2"
            >
              <h3 className="text-xl md:text-2xl font-display font-bold mb-6 tracking-wide text-[#e8dcc8]">{l.name}</h3>

              <div className="space-y-3 text-sm bg-[#0d0a07]/60 border border-[#3d3630]/30 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-[#8b7355] font-medieval text-xs uppercase tracking-wider">현재 악명</span>
                  <span className="text-[#7c3aed] font-black text-lg glow-royal">{l.infamy.toLocaleString()}</span>
                </div>
                <div className="h-px w-full bg-[#3d3630]/40"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b7355] font-medieval text-xs uppercase tracking-wider">방어 성공</span>
                  <span className="text-[#e8dcc8] font-bold text-lg">{l.attempts - l.clears} 회</span>
                </div>
                <div className="h-px w-full bg-[#3d3630]/40"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8b7355] font-medieval text-xs uppercase tracking-wider">돌파 허용</span>
                  <span className="text-[#cc2200] font-bold text-lg">{l.clears} 회</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
