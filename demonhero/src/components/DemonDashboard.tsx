import React from 'react';
import { LevelData, PlayerStats } from '../types';
import { Skull, Plus, ArrowLeft, Flame, ShieldOff, ShieldCheck, Swords } from 'lucide-react';
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
      className="min-h-[100dvh] bg-[#080604] text-[#e8dcc8] font-sans relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#7c3aed]/[0.04] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#8b0000]/[0.03] rounded-full blur-[120px]"></div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#7c3aed]/30 to-transparent"></div>

      <div className="max-w-5xl mx-auto relative z-10 p-5 md:p-8">
        {/* Nav */}
        <button onClick={onBack} className="flex items-center gap-2 text-[#5a4d3e] hover:text-[#7c3aed] mb-8 transition-colors text-xs tracking-[0.15em] uppercase font-medieval">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-10 md:mb-14"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-px bg-[#7c3aed]/40"></div>
            <span className="text-[#6b4d9a] text-[10px] tracking-[0.3em] font-medieval uppercase">Dark Architect's Hall</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-wider flex items-center gap-3">
                <Skull className="w-8 h-8 md:w-10 md:h-10 text-[#7c3aed] drop-shadow-[0_0_12px_rgba(124,58,237,0.4)]" />
                <span className="bg-gradient-to-b from-[#e8d5ff] via-[#7c3aed] to-[#4c1d95] text-transparent bg-clip-text">
                  MY TOWERS
                </span>
              </h1>
              <p className="text-[#5a4d3e] text-sm font-medieval tracking-wide mt-2 ml-11 md:ml-13">Design deadly traps. Crush every challenger.</p>
            </div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-b from-[#15121a]/80 to-[#0a080d]/80 border border-[#7c3aed]/[0.12] rounded-xl p-4 md:p-5 min-w-[180px] backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-3.5 h-3.5 text-[#6b4d9a]" />
                <span className="text-[#5a4d3e] text-[10px] font-medieval uppercase tracking-[0.2em]">Total Infamy</span>
              </div>
              <p className="text-2xl md:text-3xl font-display font-black text-[#7c3aed] glow-royal">{stats.infamy.toLocaleString()}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#3d3630]/50 to-transparent mb-8"></div>

        {/* Section header with create button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Swords className="w-4 h-4 text-[#6b4d9a]" />
            <h2 className="text-sm md:text-base font-display font-bold tracking-[0.15em] uppercase text-[#8b7355]">
              My Towers
            </h2>
            <div className="hidden md:block w-16 h-px bg-[#3d3630]/30"></div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onEdit}
            className="bg-[#7c3aed]/[0.1] hover:bg-[#7c3aed]/[0.18] border border-[#7c3aed]/20 hover:border-[#7c3aed]/40 text-[#a78bfa] px-4 md:px-5 py-2.5 rounded-lg font-medieval font-bold text-xs md:text-sm flex items-center gap-2 transition-all duration-300"
          >
            <Plus className="w-4 h-4" /> New Tower
          </motion.button>
        </div>

        {/* Tower cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {myLevels.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="col-span-full text-center py-20 md:py-28 border border-dashed border-white/[0.06] rounded-xl bg-gradient-to-b from-[#0d0a10]/50 to-transparent"
            >
              <Skull className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-5 text-[#3d3630]/60" />
              <p className="text-base md:text-lg font-display font-bold mb-2 tracking-wider text-[#5a4d3e]">No towers yet</p>
              <p className="text-[#3d3630] text-xs md:text-sm font-medieval">Create your first tower and challenge the heroes.</p>
            </motion.div>
          ) : myLevels.map((l, i) => (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.06 * i }}
              key={l.id}
              className="group relative bg-gradient-to-b from-[#12101a] to-[#0a080d] border border-white/[0.06] hover:border-[#7c3aed]/20 rounded-xl p-5 md:p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(124,58,237,0.06)]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#7c3aed]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>

              <div className="relative z-10">
                <h3 className="text-lg md:text-xl font-display font-bold tracking-wide text-[#e8dcc8] mb-5">{l.name}</h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a4d3e] font-medieval uppercase tracking-wider text-[10px]">Infamy</span>
                    <span className="text-[#7c3aed] font-black text-base glow-royal">{l.infamy.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-white/[0.04]"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a4d3e] font-medieval uppercase tracking-wider text-[10px]">Defended</span>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-[#5a4d3e]" />
                      <span className="text-[#e8dcc8] font-bold">{l.attempts - l.clears}</span>
                    </div>
                  </div>
                  <div className="h-px bg-white/[0.04]"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a4d3e] font-medieval uppercase tracking-wider text-[10px]">Breached</span>
                    <div className="flex items-center gap-1.5">
                      <ShieldOff className="w-3 h-3 text-[#5a4d3e]" />
                      <span className="text-[#cc2200] font-bold">{l.clears}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3d3630]/20 to-transparent"></div>
    </motion.div>
  );
}
