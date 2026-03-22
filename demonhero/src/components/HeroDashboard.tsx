import React from 'react';
import { LevelData, PlayerStats } from '../types';
import { Sword, ArrowLeft, Play, Shield, Users, Trophy, Target } from 'lucide-react';
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
      className="min-h-[100dvh] bg-[#080604] text-[#e8dcc8] font-sans relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4a017]/[0.04] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#c2410c]/[0.03] rounded-full blur-[120px]"></div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4a017]/30 to-transparent"></div>

      <div className="max-w-5xl mx-auto relative z-10 p-5 md:p-8">
        {/* Nav */}
        <button onClick={onBack} className="flex items-center gap-2 text-[#5a4d3e] hover:text-[#d4a017] mb-8 transition-colors text-xs tracking-[0.15em] uppercase font-medieval">
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
            <div className="w-6 h-px bg-[#d4a017]/40"></div>
            <span className="text-[#8b6914] text-[10px] tracking-[0.3em] font-medieval uppercase">Adventurer's Guild</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-wider flex items-center gap-3">
                <Sword className="w-8 h-8 md:w-10 md:h-10 text-[#d4a017] drop-shadow-[0_0_12px_rgba(212,160,23,0.4)]" />
                <span className="bg-gradient-to-b from-[#fff8e7] via-[#d4a017] to-[#8b6914] text-transparent bg-clip-text">
                  RAID HQ
                </span>
              </h1>
              <p className="text-[#5a4d3e] text-sm font-medieval tracking-wide mt-2 ml-11 md:ml-13">Storm the towers. Claim legendary glory.</p>
            </div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-b from-[#1a1810]/80 to-[#0d0a07]/80 border border-[#d4a017]/[0.12] rounded-xl p-4 md:p-5 min-w-[180px] backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-3.5 h-3.5 text-[#8b6914]" />
                <span className="text-[#5a4d3e] text-[10px] font-medieval uppercase tracking-[0.2em]">Total Fame</span>
              </div>
              <p className="text-2xl md:text-3xl font-display font-black text-[#d4a017] glow-gold">{stats.fame.toLocaleString()}</p>
            </motion.div>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#3d3630]/50 to-transparent mb-8"></div>

        {/* Section title */}
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-4 h-4 text-[#8b6914]" />
          <h2 className="text-sm md:text-base font-display font-bold tracking-[0.15em] uppercase text-[#8b7355]">
            Available Towers
          </h2>
          <div className="flex-1 h-px bg-[#3d3630]/30"></div>
          <span className="text-[#5a4d3e] text-[10px] font-medieval">{levels.length} listed</span>
        </div>

        {/* Tower cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {levels.map((l, i) => (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.06 * i }}
              key={l.id}
              className="group relative bg-gradient-to-b from-[#141210] to-[#0a0907] border border-white/[0.06] hover:border-[#d4a017]/20 rounded-xl p-5 md:p-6 flex flex-col transition-all duration-300 hover:shadow-[0_8px_30px_rgba(212,160,23,0.06)]"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#d4a017]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>

              <div className="relative z-10 flex-1">
                <h3 className="text-lg md:text-xl font-display font-bold tracking-wide text-[#e8dcc8] mb-1">{l.name}</h3>
                <p className="text-[10px] text-[#5a4d3e] mb-5 font-medieval tracking-wider">
                  by <span className="text-[#8b7355]">{l.creator}</span>
                </p>

                <div className="space-y-2.5 text-xs mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a4d3e] font-medieval uppercase tracking-wider text-[10px]">Infamy</span>
                    <span className="text-[#7c3aed] font-black text-base glow-royal">{l.infamy.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-white/[0.04]"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a4d3e] font-medieval uppercase tracking-wider text-[10px]">Clear Rate</span>
                    <span className="text-[#e8dcc8] font-bold">
                      {l.attempts > 0 ? Math.round((l.clears / l.attempts) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-px bg-white/[0.04]"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#5a4d3e] font-medieval uppercase tracking-wider text-[10px]">Attempts</span>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-[#5a4d3e]" />
                      <span className="text-[#8b7355] font-medium">{l.attempts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onPlay(l)}
                className="relative z-10 w-full bg-[#d4a017]/[0.08] hover:bg-[#d4a017]/[0.15] border border-[#d4a017]/20 hover:border-[#d4a017]/40 text-[#d4a017] hover:text-[#f0c85a] py-3 rounded-lg font-medieval font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 group/btn"
              >
                <Play className="w-4 h-4 fill-current group-hover/btn:scale-110 transition-transform" /> RAID
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3d3630]/20 to-transparent"></div>
    </motion.div>
  );
}
