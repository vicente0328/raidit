import React, { useState } from 'react';
import { LevelData, PlayerStats, EquipSlot } from '../types';
import { Sword, ArrowLeft, Play, Users, Trophy, Target, Backpack } from 'lucide-react';
import { motion } from 'motion/react';
import { InventoryPanel } from './InventoryPanel';

interface Props {
  levels: LevelData[];
  stats: PlayerStats;
  onPlay: (level: LevelData) => void;
  onBack: () => void;
  onEquipItem: (itemId: string) => void;
  onUnequipItem: (slot: EquipSlot) => void;
  onUseItem: (itemId: string) => void;
}

export function HeroDashboard({ levels, stats, onPlay, onBack, onEquipItem, onUnequipItem, onUseItem }: Props) {
  const [tab, setTab] = useState<'towers' | 'inventory'>('towers');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-[100dvh] bg-[#09090b] text-[#e4e4e7] font-sans relative overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-[#22d3ee]/[0.02] rounded-full blur-[150px]"></div>
      </div>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent"></div>

      <div className="max-w-5xl mx-auto relative z-10 p-5 md:p-8">
        <button onClick={onBack} className="flex items-center gap-2 text-[#52525b] hover:text-[#a1a1aa] mb-8 transition-colors text-xs tracking-[0.1em] uppercase">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Header */}
        <motion.div initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="mb-10 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-px bg-[#22d3ee]/40"></div>
                <span className="text-[#22d3ee]/60 text-[10px] tracking-[0.3em] uppercase">Adventurer's Guild</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-wider flex items-center gap-3">
                <Sword className="w-7 h-7 md:w-9 md:h-9 text-[#22d3ee] drop-shadow-[0_0_15px_rgba(34,211,238,0.25)]" />
                <span className="text-[#fafafa]">RAID HQ</span>
              </h1>
              <p className="text-[#52525b] text-sm mt-2 ml-10 md:ml-12">Storm the towers. Claim legendary glory.</p>
            </div>

            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}
              className="bg-[#18181b] border border-[#27272a] rounded-lg p-4 min-w-[160px]"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-3.5 h-3.5 text-[#22d3ee]/50" />
                <span className="text-[#52525b] text-[10px] uppercase tracking-[0.2em]">Total Fame</span>
              </div>
              <p className="text-2xl md:text-3xl font-display font-black text-[#22d3ee] glow-cyan">{stats.fame.toLocaleString()}</p>
            </motion.div>
          </div>
        </motion.div>

        <div className="h-px bg-[#27272a]/60 mb-6"></div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#111114] border border-[#27272a] p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('towers')}
            className={`px-4 py-2 rounded-md font-semibold text-xs tracking-wider transition-all flex items-center gap-2 ${
              tab === 'towers' ? 'bg-[#22d3ee]/10 border border-[#22d3ee]/25 text-[#22d3ee]' : 'text-[#52525b] hover:text-[#71717a]'
            }`}
          >
            <Target className="w-3.5 h-3.5" /> Towers
          </button>
          <button
            onClick={() => setTab('inventory')}
            className={`px-4 py-2 rounded-md font-semibold text-xs tracking-wider transition-all flex items-center gap-2 ${
              tab === 'inventory' ? 'bg-[#22d3ee]/10 border border-[#22d3ee]/25 text-[#22d3ee]' : 'text-[#52525b] hover:text-[#71717a]'
            }`}
          >
            <Backpack className="w-3.5 h-3.5" /> Inventory
          </button>
        </div>

        {tab === 'towers' && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-4 h-4 text-[#52525b]" />
              <h2 className="text-sm font-semibold tracking-[0.1em] uppercase text-[#71717a]">Available Towers</h2>
              <div className="flex-1 h-px bg-[#27272a]/40"></div>
              <span className="text-[#3f3f46] text-[10px]">{levels.length} listed</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {levels.map((l, i) => (
                <motion.div
                  initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 * i }}
                  key={l.id}
                  className="group bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-lg p-5 flex flex-col transition-all duration-200"
                >
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-display font-bold tracking-wide text-[#fafafa] mb-0.5">{l.name}</h3>
                    <p className="text-[10px] text-[#52525b] mb-4">by <span className="text-[#71717a]">{l.creator}</span></p>

                    <div className="space-y-2 text-xs mb-5">
                      <div className="flex justify-between items-center">
                        <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Infamy</span>
                        <span className="text-[#c084fc] font-bold text-sm">{l.infamy.toLocaleString()}</span>
                      </div>
                      <div className="h-px bg-[#27272a]/50"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Clear Rate</span>
                        <span className="text-[#a1a1aa] font-semibold">
                          {l.attempts > 0 ? Math.round((l.clears / l.attempts) * 100) : 0}%
                        </span>
                      </div>
                      <div className="h-px bg-[#27272a]/50"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Attempts</span>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-[#3f3f46]" />
                          <span className="text-[#71717a]">{l.attempts.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => onPlay(l)}
                    className="w-full bg-[#22d3ee]/[0.08] hover:bg-[#22d3ee]/[0.15] border border-[#22d3ee]/15 hover:border-[#22d3ee]/30 text-[#22d3ee] py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <Play className="w-4 h-4 fill-current" /> RAID
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {tab === 'inventory' && (
          <InventoryPanel
            inventory={stats.inventory}
            equipment={stats.equipment}
            onUseItem={onUseItem}
            onEquipItem={onEquipItem}
            onUnequipItem={onUnequipItem}
            mode="dashboard"
          />
        )}
      </div>
    </motion.div>
  );
}
