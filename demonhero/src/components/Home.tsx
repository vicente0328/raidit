import React, { useState } from 'react';
import { Faction } from '../types';
import { Sword, Skull, LogIn, Mail, UserPlus, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithGoogle, loginWithEmail, signUpWithEmail } from '../firebase';

interface Props {
  onSelectFaction: (faction: Faction) => void;
  user: any;
}

type AuthMode = 'choose' | 'login' | 'signup';

export function Home({ onSelectFaction, user }: Props) {
  const [authMode, setAuthMode] = useState<AuthMode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (code === 'auth/invalid-email') {
        setError('올바른 이메일 형식이 아닙니다.');
      } else {
        setError('로그인 실패: ' + (err?.message || '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (!displayName.trim()) {
      setError('모험가 이름을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName.trim());
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('이미 사용 중인 이메일입니다.');
      } else if (code === 'auth/invalid-email') {
        setError('올바른 이메일 형식이 아닙니다.');
      } else if (code === 'auth/weak-password') {
        setError('비밀번호가 너무 약합니다. 6자 이상 입력하세요.');
      } else {
        setError('가입 실패: ' + (err?.message || '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/unauthorized-domain') {
        setError('이 도메인이 Firebase에 등록되지 않았습니다. 관리자에게 문의하세요.');
      } else if (code !== 'auth/popup-closed-by-user') {
        setError('Google 로그인 실패: ' + (err?.message || '알 수 없는 오류'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dungeon flex flex-col items-center justify-center text-[#e8dcc8] font-sans p-4 relative overflow-hidden">
      {/* Ambient torch glows */}
      <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-[#c2410c]/10 rounded-full blur-[100px] pointer-events-none animate-torch"></div>
      <div className="absolute bottom-1/3 right-1/5 w-80 h-80 bg-[#d4a017]/8 rounded-full blur-[120px] pointer-events-none animate-torch" style={{ animationDelay: '1.5s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4c1d95]/5 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4a017]/30 to-transparent"></div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="text-center mb-16 relative z-10"
      >
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

        <div className="flex items-center justify-center mt-6">
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-[#5a4d3e] to-transparent"></div>
        </div>
      </motion.div>

      {!user ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="relative z-10 w-full max-w-sm"
        >
          <AnimatePresence mode="wait">
            {authMode === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-3"
              >
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="group flex items-center justify-center gap-3 btn-medieval px-8 py-4 rounded-xl font-medieval font-bold text-base text-[#d4a017] hover:text-[#f0c85a] transition-all disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  {loading ? '연결 중...' : 'Google 계정으로 입장'}
                </button>

                <div className="flex items-center gap-3 my-2">
                  <div className="flex-1 h-px bg-[#3d3630]/50"></div>
                  <span className="text-[#5a4d3e] text-xs font-medieval tracking-wider">또는</span>
                  <div className="flex-1 h-px bg-[#3d3630]/50"></div>
                </div>

                <button
                  onClick={() => { setAuthMode('login'); setError(''); }}
                  className="group flex items-center justify-center gap-3 btn-medieval px-8 py-4 rounded-xl font-medieval font-bold text-base text-[#c4a882] hover:text-[#e8dcc8] transition-all"
                >
                  <Mail className="w-5 h-5" />
                  이메일로 로그인
                </button>

                <button
                  onClick={() => { setAuthMode('signup'); setError(''); }}
                  className="flex items-center justify-center gap-2 text-[#5a4d3e] hover:text-[#8b7355] text-sm font-medieval transition-colors mt-1"
                >
                  <UserPlus className="w-4 h-4" />
                  계정이 없으신가요? 회원가입
                </button>
              </motion.div>
            )}

            {authMode === 'login' && (
              <motion.form
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleEmailLogin}
                className="flex flex-col gap-3"
              >
                <h3 className="text-center font-display text-xl text-[#d4a017] tracking-wider mb-2">로그인</h3>

                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#1a1510] border border-[#3d3630] rounded-xl px-4 py-3 text-[#e8dcc8] font-medieval placeholder-[#5a4d3e] focus:border-[#d4a017]/50 focus:outline-none transition-colors"
                />
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#1a1510] border border-[#3d3630] rounded-xl px-4 py-3 text-[#e8dcc8] font-medieval placeholder-[#5a4d3e] focus:border-[#d4a017]/50 focus:outline-none transition-colors"
                />

                {error && (
                  <p className="text-[#cc2200] text-xs font-medieval text-center bg-[#8b0000]/10 border border-[#8b0000]/20 rounded-lg p-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-medieval px-8 py-4 rounded-xl font-medieval font-bold text-base text-[#d4a017] hover:text-[#f0c85a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-5 h-5" />
                  {loading ? '입장 중...' : '입장하기'}
                </button>

                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('choose'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors"
                  >
                    ← 뒤로
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors"
                  >
                    회원가입 →
                  </button>
                </div>
              </motion.form>
            )}

            {authMode === 'signup' && (
              <motion.form
                key="signup"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleEmailSignUp}
                className="flex flex-col gap-3"
              >
                <h3 className="text-center font-display text-xl text-[#7c3aed] tracking-wider mb-2">모험가 등록</h3>

                <input
                  type="text"
                  placeholder="모험가 이름"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  className="w-full bg-[#1a1510] border border-[#3d3630] rounded-xl px-4 py-3 text-[#e8dcc8] font-medieval placeholder-[#5a4d3e] focus:border-[#7c3aed]/50 focus:outline-none transition-colors"
                />
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-[#1a1510] border border-[#3d3630] rounded-xl px-4 py-3 text-[#e8dcc8] font-medieval placeholder-[#5a4d3e] focus:border-[#7c3aed]/50 focus:outline-none transition-colors"
                />
                <input
                  type="password"
                  placeholder="비밀번호 (6자 이상)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-[#1a1510] border border-[#3d3630] rounded-xl px-4 py-3 text-[#e8dcc8] font-medieval placeholder-[#5a4d3e] focus:border-[#7c3aed]/50 focus:outline-none transition-colors"
                />

                {error && (
                  <p className="text-[#cc2200] text-xs font-medieval text-center bg-[#8b0000]/10 border border-[#8b0000]/20 rounded-lg p-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-medieval px-8 py-4 rounded-xl font-medieval font-bold text-base text-[#7c3aed] hover:text-[#a78bfa] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  {loading ? '등록 중...' : '모험 시작'}
                </button>

                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('choose'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors"
                  >
                    ← 뒤로
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors"
                  >
                    로그인 →
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {error && authMode === 'choose' && (
            <p className="text-[#cc2200] text-xs font-medieval text-center mt-3 bg-[#8b0000]/10 border border-[#8b0000]/20 rounded-lg p-2">{error}</p>
          )}
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
            <div className="absolute inset-0 bg-gradient-to-b from-[#4c1d95]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
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

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#3d3630] to-transparent"></div>
    </div>
  );
}
