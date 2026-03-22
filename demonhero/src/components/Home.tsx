import React from 'react';
import { Faction } from '../types';
import { Sword, Skull, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { loginWithGoogle } from '../firebase';

interface Props {
  onSelectFaction: (faction: Faction) => void;
  user: any;
}

export function Home({ onSelectFaction, user }: Props) {
  return (
    <div className="min-h-screen bg-[#050505] bg-noise flex flex-col items-center justify-center text-zinc-100 font-sans p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-900/20 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center mb-20 relative z-10"
      >
        <h1 className="text-6xl md:text-8xl font-display font-black mb-6 tracking-widest flex flex-col md:flex-row items-center justify-center gap-6 drop-shadow-2xl">
          <Skull className="w-16 h-16 md:w-20 md:h-20 text-purple-500 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
          <span className="bg-gradient-to-b from-zinc-100 to-zinc-500 text-transparent bg-clip-text">마왕 대 용사</span>
          <Sword className="w-16 h-16 md:w-20 md:h-20 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
        </h1>
        <p className="text-zinc-400 text-xl md:text-2xl font-medium tracking-[0.2em] uppercase">Demon King vs Hero</p>
      </motion.div>

      {!user ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="relative z-10"
        >
          <button 
            onClick={loginWithGoogle}
            className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-bold text-xl hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:-translate-y-1"
          >
            <LogIn className="w-6 h-6" />
            Google 계정으로 시작하기
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center relative z-10">
          <motion.button 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            onClick={() => onSelectFaction('demon')}
            className="group relative w-full md:w-96 h-[400px] bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 hover:border-purple-500/50 rounded-3xl p-8 flex flex-col items-center justify-center transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_-10px_rgba(168,85,247,0.3)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Skull className="w-24 h-24 text-purple-500 mb-8 transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]" />
            <h2 className="text-4xl font-display font-bold mb-4 tracking-wider text-zinc-100">마왕 진영</h2>
            <p className="text-zinc-400 text-center leading-relaxed font-medium">나만의 마왕성을 설계하고<br/>도전하는 용사들을 좌절시키세요.</p>
          </motion.button>

          <motion.button 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            onClick={() => onSelectFaction('hero')}
            className="group relative w-full md:w-96 h-[400px] bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 hover:border-yellow-500/50 rounded-3xl p-8 flex flex-col items-center justify-center transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_20px_40px_-10px_rgba(234,179,8,0.3)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <Sword className="w-24 h-24 text-yellow-500 mb-8 transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]" />
            <h2 className="text-4xl font-display font-bold mb-4 tracking-wider text-zinc-100">용사 진영</h2>
            <p className="text-zinc-400 text-center leading-relaxed font-medium">악명 높은 마왕성을 공략하고<br/>전설적인 명성을 얻으세요.</p>
          </motion.button>
        </div>
      )}
    </div>
  );
}
