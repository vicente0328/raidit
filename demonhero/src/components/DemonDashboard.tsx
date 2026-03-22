import React, { useState, useRef, useEffect } from 'react';
import { LevelData, PlayerStats } from '../types';
import { Skull, Plus, ArrowLeft, Flame, ShieldOff, ShieldCheck, Swords, Pencil, Layers, Check, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  levels: LevelData[];
  stats: PlayerStats;
  userId: string;
  maxTowers: number;
  onEdit: (existingLevel: LevelData | null) => void;
  onRenameTower: (levelId: string, newName: string) => Promise<void>;
  onDeleteTower: (levelId: string) => Promise<void>;
  onBack: () => void;
}

export function DemonDashboard({ levels, stats, userId, maxTowers, onEdit, onRenameTower, onDeleteTower, onBack }: Props) {
  const myTowers = levels.filter(l => l.creatorId === userId);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [towerName, setTowerName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [renamingId]);

  const handleStartRename = (tower: LevelData) => {
    setTowerName(tower.name);
    setRenamingId(tower.id);
  };

  const handleSaveName = async (levelId: string) => {
    const trimmed = towerName.trim();
    const tower = myTowers.find(t => t.id === levelId);
    if (!trimmed || trimmed === tower?.name) {
      setRenamingId(null);
      return;
    }
    try {
      await onRenameTower(levelId, trimmed);
    } catch {}
    setRenamingId(null);
  };

  const handleConfirmDelete = async (levelId: string) => {
    await onDeleteTower(levelId);
    setDeletingId(null);
  };

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
            <span className="text-[10px] text-[#3f3f46]">{myTowers.length} / {maxTowers}</span>
          </div>
          {myTowers.length < maxTowers && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onEdit(null)}
              className="bg-[#c084fc]/[0.08] hover:bg-[#c084fc]/[0.15] border border-[#c084fc]/15 hover:border-[#c084fc]/30 text-[#c084fc] px-4 py-2 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" /> 새 탑 만들기
            </motion.button>
          )}
        </div>

        {myTowers.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="text-center py-20 md:py-24 border border-dashed border-[#27272a] rounded-lg bg-[#18181b]/30"
          >
            <Skull className="w-12 h-12 mx-auto mb-4 text-[#27272a]" />
            <p className="text-base font-semibold mb-1 text-[#52525b]">아직 탑이 없습니다</p>
            <p className="text-[#3f3f46] text-xs mb-6">탑을 만들어 용사들에게 도전하세요.</p>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => onEdit(null)}
              className="bg-[#c084fc]/[0.08] hover:bg-[#c084fc]/[0.15] border border-[#c084fc]/15 hover:border-[#c084fc]/30 text-[#c084fc] px-6 py-3 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all duration-200 mx-auto"
            >
              <Plus className="w-4 h-4" /> 첫 번째 탑 만들기
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {myTowers.map((tower, i) => (
              <motion.div key={tower.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * i }}
                className="bg-[#18181b] border border-[#27272a] rounded-lg p-5 flex flex-col"
              >
                {/* Name / Rename */}
                {renamingId === tower.id ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      ref={nameInputRef}
                      value={towerName}
                      onChange={e => setTowerName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveName(tower.id); if (e.key === 'Escape') setRenamingId(null); }}
                      maxLength={30}
                      className="bg-[#09090b] border border-[#c084fc]/30 rounded-md px-2 py-1 text-base font-display font-bold tracking-wide text-[#fafafa] outline-none focus:border-[#c084fc]/60 w-full"
                    />
                    <button onClick={() => handleSaveName(tower.id)} className="text-[#4ade80] hover:text-[#4ade80]/80 shrink-0">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => handleStartRename(tower)} className="flex items-center gap-2 group mb-1 text-left">
                    <h3 className="text-base font-display font-bold tracking-wide text-[#fafafa] truncate">{tower.name}</h3>
                    <Pencil className="w-3 h-3 text-[#3f3f46] group-hover:text-[#71717a] transition-colors shrink-0" />
                  </button>
                )}
                <p className="text-[#52525b] text-xs mb-4 flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> {tower.rooms.length} floor{tower.rooms.length !== 1 ? 's' : ''}
                </p>

                {/* Stats */}
                <div className="space-y-2 text-xs mb-5 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Infamy</span>
                    <span className="text-[#c084fc] font-bold text-sm">{tower.infamy.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-[#27272a]/50"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Defended</span>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-[#3f3f46]" />
                      <span className="text-[#a1a1aa] font-semibold">{tower.attempts - tower.clears}</span>
                    </div>
                  </div>
                  <div className="h-px bg-[#27272a]/50"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#52525b] uppercase tracking-wider text-[10px]">Breached</span>
                    <div className="flex items-center gap-1.5">
                      <ShieldOff className="w-3 h-3 text-[#3f3f46]" />
                      <span className="text-[#f87171] font-semibold">{tower.clears}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {deletingId === tower.id ? (
                  <div className="bg-[#f87171]/[0.05] border border-[#f87171]/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-[#f87171] font-semibold mb-2">정말 삭제하시겠습니까?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleConfirmDelete(tower.id)}
                        className="flex-1 py-2 rounded-md bg-[#f87171]/[0.1] border border-[#f87171]/30 text-[#f87171] text-xs font-semibold hover:bg-[#f87171]/[0.2] transition-all">
                        삭제
                      </button>
                      <button onClick={() => setDeletingId(null)}
                        className="flex-1 py-2 rounded-md bg-[#18181b] border border-[#27272a] text-[#71717a] text-xs font-semibold hover:border-[#3f3f46] transition-all">
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onEdit(tower)}
                      className="flex-1 bg-[#c084fc]/[0.08] hover:bg-[#c084fc]/[0.15] border border-[#c084fc]/15 hover:border-[#c084fc]/30 text-[#c084fc] px-3 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all duration-200"
                    >
                      <Pencil className="w-3.5 h-3.5" /> 편집
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDeletingId(tower.id)}
                      className="bg-[#f87171]/[0.08] hover:bg-[#f87171]/[0.15] border border-[#f87171]/15 hover:border-[#f87171]/30 text-[#f87171] px-3 py-2 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-all duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
