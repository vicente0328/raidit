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
      className="min-h-[100dvh] bg-[#09090b] text-[#e4e4e7] font-sans relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[#c084fc]/[0.02] rounded-full blur-[150px]"></div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent"></div>

      <div className="max-w-5xl mx-auto relative z-10 p-5 md:p-8">
        <button onClick={onBack} className="flex items-center gap-2 text-[#52525b] hover:text-[#a1a1aa] mb-8 transition-colors text-xs tracking-[0.1em] uppercase">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        <motion.div initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-10 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-px bg-[#c084fc]/40"></div>
                <span className="text-[#c084fc]/60 text-[10px] tracking-[0.3em] uppercase">Dark Architect's Hall</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-wider flex items-center gap-3">
                <Skull className="w-7 h-7 md:w-9 md:h-9 text-[#c084fc] drop-shadow-[0_0_15px_rgba(192,132,252,0.25)]" />
                <span className="text-[#fafafa]">MY TOWERS</span>
              </h1>
              <p className="text-[#52525b] text-sm mt-2 ml-10 md:ml-12">Design deadly traps. Crush every challenger.</p>
            </div>

            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
              className="bg-[#18181b] border border-[#27272a] rounded-lg p-4 min-w-[160px]"
            >
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-3.5 h-3.5 text-[#c084fc]/50" />
                <span className="text-[#52525b] text-[10px] uppercase tracking-[0.2em]">Total Infamy</span>
              </div>
              <p className="text-2xl md:text-3xl font-display font-black text-[#c084fc] glow-purple">{stats.infamy.toLocaleString()}</p>
            </motion.div>
          </div>
        </motion.div>

        <div className="h-px bg-[#27272a]/60 mb-8"></div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Swords className="w-4 h-4 text-[#52525b]" />
            <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-[#71717a]">My Towers</h2>
          </div>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onEdit}
            className="bg-[#c084fc]/[0.08] hover:bg-[#c084fc]/[0.15] border border-[#c084fc]/15 hover:border-[#c084fc]/30 text-[#c084fc] px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all duration-200"
          >
            <Plus className="w-4 h-4" /> New Tower
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {myLevels.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="col-span-full text-center py-20 md:py-24 border border-dashed border-[#27272a] rounded-lg bg-[#18181b]/30"
            >
              <Skull className="w-12 h-12 mx-auto mb-4 text-[#27272a]" />
              <p className="text-base font-semibold mb-1 text-[#52525b]">No towers yet</p>
              <p className="text-[#3f3f46] text-xs">Create your first tower and challenge the heroes.</p>
            </motion.div>
          ) : myLevels.map((l, i) => (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 * i }}
              key={l.id}
              className="bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-lg p-5 transition-all duration-200"
            >
              <h3 className="text-base md:text-lg font-display font-bold tracking-wide text-[#fafafa] mb-4">{l.name}</h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Infamy</span>
                  <span className="text-[#c084fc] font-bold text-sm">{l.infamy.toLocaleString()}</span>
                </div>
                <div className="h-px bg-[#27272a]/50"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Defended</span>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-[#3f3f46]" />
                    <span className="text-[#a1a1aa] font-semibold">{l.attempts - l.clears}</span>
                  </div>
                </div>
                <div className="h-px bg-[#27272a]/50"></div>
                <div className="flex justify-between items-center">
                  <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Breached</span>
                  <div className="flex items-center gap-1.5">
                    <ShieldOff className="w-3 h-3 text-[#3f3f46]" />
                    <span className="text-[#f87171] font-semibold">{l.clears}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
