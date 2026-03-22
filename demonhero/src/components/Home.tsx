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
    <div className="min-h-screen bg-dungeon flex flex-col items-center justify-center text-[#e8dcc8] font-sans p-4 relative overflow-hidden">
      {/* Ambient torch glows */}
      <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-[#c2410c]/10 rounded-full blur-[100px] pointer-events-none animate-torch"></div>
      <div className="absolute bottom-1/3 right-1/5 w-80 h-80 bg-[#d4a017]/8 rounded-full blur-[120px] pointer-events-none animate-torch" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4c1d95]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4a017]/30 to-transparent"></div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-center mb-20 relative z-10"
      >
        {/* Ornamental line above title */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="w-20 h-px bg-gradient-to-r from-transparent to-[#d4a017]/50"></div>
          <span className="text-[#d4a017] text-xs tracking-[0.3em] font-medieval uppercase">A Dark Fantasy Dungeon Game</span>
          <div className="w-20 h-px bg-gradient-to-l from-transparent to-[#d4a017]/50"></div>
        </div>

        <h1 className="text-5xl md:text-8xl font-display font-black mb-6 tracking-wider flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <Skull className="w-14 h-14 md:w-20 md:h-20 text-[#7c3aed] drop-shadow-[0_0_20px_rgba(124,58,237,0.6)]" />
          <span className="bg-gradient-to-b from-[#f5e6c8] via-[#d4a017] to-[#8b6914] text-transparent bg-clip-text drop-shadow-2xl">
            마왕 대 용사
          </span>
          <Sword className="w-14 h-14 md:w-20 md:h-20 text-[#d4a017] drop-shadow-[0_0_20px_rgba(212,160,23,0.6)]" />
        </h1>

        <p className="text-[#8b7355] text-lg md:text-2xl font-medieval tracking-[0.25em] uppercase">Demon Lord vs Hero</p>

        {/* Ornamental line below */}
        <div className="flex items-center justify-center mt-6">
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#5a4d3e] to-transparent"></div>
        </div>
      </motion.div>

      {!user ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="relative z-10"
        >
          <button
            onClick={loginWithGoogle}
            className="group flex items-center gap-3 btn-medieval px-10 py-5 rounded-xl font-medieval font-bold text-xl text-[#d4a017] hover:text-[#f0c85a] transition-all"
          >
            <LogIn className="w-6 h-6" />
            Google 계정으로 입장
          </button>
        </motion.div>
      ) : (
        <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center relative z-10">
          {/* Demon Faction Card */}
          <motion.button
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            onClick={() => onSelectFaction('demon')}
            className="group relative w-full md:w-96 h-[420px] card-stone rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-500 hover:-translate-y-3 overflow-hidden"
          >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#4c1d95]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

            {/* Corner ornaments */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#4c1d95]/30 group-hover:border-[#7c3aed]/60 transition-colors"></div>
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#4c1d95]/30 group-hover:border-[#7c3aed]/60 transition-colors"></div>
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#4c1d95]/30 group-hover:border-[#7c3aed]/60 transition-colors"></div>
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#4c1d95]/30 group-hover:border-[#7c3aed]/60 transition-colors"></div>

            <Skull className="w-24 h-24 text-[#7c3aed] mb-8 transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_25px_rgba(124,58,237,0.7)] relative z-10" />
            <h2 className="text-3xl font-display font-bold mb-4 tracking-wider text-[#e8dcc8] relative z-10">마왕 진영</h2>
            <div className="w-12 h-px bg-[#4c1d95]/50 mb-4 group-hover:w-20 transition-all"></div>
            <p className="text-[#8b7355] text-center leading-relaxed font-medieval relative z-10">
              나만의 마왕성을 설계하고<br/>도전하는 용사들을 좌절시키세요.
            </p>
          </motion.button>

          {/* Hero Faction Card */}
          <motion.button
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            onClick={() => onSelectFaction('hero')}
            className="group relative w-full md:w-96 h-[420px] card-stone rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-500 hover:-translate-y-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-[#d4a017]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#8b6914]/30 group-hover:border-[#d4a017]/60 transition-colors"></div>
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#8b6914]/30 group-hover:border-[#d4a017]/60 transition-colors"></div>
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#8b6914]/30 group-hover:border-[#d4a017]/60 transition-colors"></div>
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#8b6914]/30 group-hover:border-[#d4a017]/60 transition-colors"></div>

            <Sword className="w-24 h-24 text-[#d4a017] mb-8 transition-all duration-500 group-hover:scale-110 group-hover:drop-shadow-[0_0_25px_rgba(212,160,23,0.7)] relative z-10" />
            <h2 className="text-3xl font-display font-bold mb-4 tracking-wider text-[#e8dcc8] relative z-10">용사 진영</h2>
            <div className="w-12 h-px bg-[#d4a017]/50 mb-4 group-hover:w-20 transition-all"></div>
            <p className="text-[#8b7355] text-center leading-relaxed font-medieval relative z-10">
              악명 높은 마왕성을 공략하고<br/>전설적인 명성을 얻으세요.
            </p>
          </motion.button>
        </div>
      )}

      {/* Bottom ornamental border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d3630] to-transparent"></div>
    </div>
  );
}
