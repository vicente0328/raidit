import React, { useState } from 'react';
import { Faction } from '../types';
import { Sword, Skull, LogIn, Mail, UserPlus, ChevronRight, Shield, Flame, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithGoogle, loginWithEmail, signUpWithEmail, logout } from '../firebase';

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
        setError('Invalid email or password.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else {
        setError('Login failed: ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your adventurer name.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, displayName.trim());
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('This email is already in use.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak.');
      } else {
        setError('Sign up failed: ' + (err?.message || 'Unknown error'));
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
        setError('This domain is not authorized. Contact admin.');
      } else if (code !== 'auth/popup-closed-by-user') {
        setError('Google login failed: ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#080604] flex flex-col items-center justify-center text-[#e8dcc8] font-sans p-4 relative overflow-hidden">
      {/* Animated background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-full bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.08)_0%,transparent_60%)]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-full bg-[radial-gradient(ellipse_at_bottom,rgba(194,65,12,0.06)_0%,transparent_50%)]"></div>
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#d4a017]/[0.03] rounded-full blur-[120px] animate-torch"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#7c3aed]/[0.04] rounded-full blur-[150px] animate-torch" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4a017]/40 to-transparent"></div>

      {/* Title Section */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center mb-10 md:mb-14 relative z-10"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-[#8b7355] text-[10px] md:text-xs tracking-[0.4em] font-medieval uppercase mb-4 md:mb-6"
        >
          Dark Fantasy Tower Defense
        </motion.p>

        <div className="flex items-center justify-center gap-3 md:gap-6 mb-4 md:mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Skull className="w-8 h-8 md:w-14 md:h-14 text-[#7c3aed] drop-shadow-[0_0_15px_rgba(124,58,237,0.5)]" />
          </motion.div>

          <h1 className="text-4xl md:text-7xl lg:text-8xl font-display font-black tracking-wider">
            <span className="bg-gradient-to-b from-[#fff8e7] via-[#d4a017] to-[#6b4d0a] text-transparent bg-clip-text">
              RAID IT
            </span>
          </h1>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <Sword className="w-8 h-8 md:w-14 md:h-14 text-[#d4a017] drop-shadow-[0_0_15px_rgba(212,160,23,0.5)]" />
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-[#5a4d3e] text-sm md:text-lg font-medieval tracking-[0.15em]"
        >
          Build towers. Raid towers. Claim glory.
        </motion.p>
      </motion.div>

      {!user ? (
        /* ===== LOGIN SECTION ===== */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="relative z-10 w-full max-w-[360px]"
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
                  className="group flex items-center justify-center gap-3 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08] hover:border-white/[0.15] backdrop-blur-sm px-6 py-4 rounded-2xl font-medieval font-bold text-sm text-[#e8dcc8] transition-all duration-300 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4 text-[#d4a017]" />
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-white/[0.06]"></div>
                  <span className="text-[#5a4d3e] text-[10px] font-medieval tracking-[0.2em] uppercase">or</span>
                  <div className="flex-1 h-px bg-white/[0.06]"></div>
                </div>

                <button
                  onClick={() => { setAuthMode('login'); setError(''); }}
                  className="group flex items-center justify-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] px-6 py-4 rounded-2xl font-medieval font-bold text-sm text-[#8b7355] hover:text-[#c4a882] transition-all duration-300"
                >
                  <Mail className="w-4 h-4" />
                  Sign in with Email
                </button>

                <button
                  onClick={() => { setAuthMode('signup'); setError(''); }}
                  className="flex items-center justify-center gap-2 text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors mt-2"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  New here? Create account
                </button>

                {error && (
                  <p className="text-[#cc2200] text-xs font-medieval text-center mt-2 bg-[#cc2200]/[0.06] border border-[#cc2200]/[0.15] rounded-xl p-3">{error}</p>
                )}
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
                <h3 className="text-center font-display text-lg text-[#d4a017] tracking-[0.15em] mb-1">SIGN IN</h3>

                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[#e8dcc8] text-sm font-medieval placeholder-[#5a4d3e] focus:border-[#d4a017]/40 focus:bg-white/[0.06] focus:outline-none transition-all" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[#e8dcc8] text-sm font-medieval placeholder-[#5a4d3e] focus:border-[#d4a017]/40 focus:bg-white/[0.06] focus:outline-none transition-all" />

                {error && <p className="text-[#cc2200] text-xs font-medieval text-center bg-[#cc2200]/[0.06] border border-[#cc2200]/[0.15] rounded-xl p-2.5">{error}</p>}

                <button type="submit" disabled={loading}
                  className="bg-gradient-to-r from-[#d4a017]/20 to-[#8b6914]/20 hover:from-[#d4a017]/30 hover:to-[#8b6914]/30 border border-[#d4a017]/30 px-6 py-4 rounded-xl font-medieval font-bold text-sm text-[#d4a017] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  {loading ? 'Signing in...' : 'Enter'}
                </button>

                <div className="flex items-center justify-between mt-1">
                  <button type="button" onClick={() => { setAuthMode('choose'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors">← Back</button>
                  <button type="button" onClick={() => { setAuthMode('signup'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors">Create account →</button>
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
                <h3 className="text-center font-display text-lg text-[#7c3aed] tracking-[0.15em] mb-1">CREATE ACCOUNT</h3>

                <input type="text" placeholder="Adventurer Name" value={displayName} onChange={e => setDisplayName(e.target.value)} required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[#e8dcc8] text-sm font-medieval placeholder-[#5a4d3e] focus:border-[#7c3aed]/40 focus:bg-white/[0.06] focus:outline-none transition-all" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[#e8dcc8] text-sm font-medieval placeholder-[#5a4d3e] focus:border-[#7c3aed]/40 focus:bg-white/[0.06] focus:outline-none transition-all" />
                <input type="password" placeholder="Password (6+ chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-[#e8dcc8] text-sm font-medieval placeholder-[#5a4d3e] focus:border-[#7c3aed]/40 focus:bg-white/[0.06] focus:outline-none transition-all" />

                {error && <p className="text-[#cc2200] text-xs font-medieval text-center bg-[#cc2200]/[0.06] border border-[#cc2200]/[0.15] rounded-xl p-2.5">{error}</p>}

                <button type="submit" disabled={loading}
                  className="bg-gradient-to-r from-[#7c3aed]/20 to-[#4c1d95]/20 hover:from-[#7c3aed]/30 hover:to-[#4c1d95]/30 border border-[#7c3aed]/30 px-6 py-4 rounded-xl font-medieval font-bold text-sm text-[#a78bfa] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {loading ? 'Creating...' : 'Begin Adventure'}
                </button>

                <div className="flex items-center justify-between mt-1">
                  <button type="button" onClick={() => { setAuthMode('choose'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors">← Back</button>
                  <button type="button" onClick={() => { setAuthMode('login'); setError(''); }}
                    className="text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors">Sign in →</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* ===== FACTION SELECT ===== */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative z-10 w-full max-w-2xl"
        >
          {/* Welcome bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-between mb-8 md:mb-10 px-1"
          >
            <p className="text-[#5a4d3e] text-xs md:text-sm font-medieval">
              Welcome, <span className="text-[#c4a882]">{user.displayName || 'Adventurer'}</span>
            </p>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[#5a4d3e] hover:text-[#8b7355] text-xs font-medieval transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </motion.div>

          <p className="text-center text-[#5a4d3e] text-xs md:text-sm font-medieval tracking-[0.2em] uppercase mb-6">
            Choose your path
          </p>

          <div className="grid grid-cols-2 gap-3 md:gap-6">
            {/* Demon Card */}
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              onClick={() => onSelectFaction('demon')}
              className="group relative rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col items-center text-center transition-all duration-500 active:scale-[0.97]
                bg-gradient-to-b from-[#1a1520] to-[#0d0a10] border border-[#7c3aed]/[0.12] hover:border-[#7c3aed]/30
                shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(124,58,237,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#7c3aed]/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl md:rounded-3xl"></div>

              <div className="relative mb-4 md:mb-6">
                <div className="absolute inset-0 bg-[#7c3aed]/20 rounded-full blur-2xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Skull className="w-12 h-12 md:w-20 md:h-20 text-[#7c3aed] relative z-10 transition-transform duration-500 group-hover:scale-110" />
              </div>

              <h2 className="text-lg md:text-2xl font-display font-bold tracking-wider text-[#e8dcc8] mb-2 md:mb-3 relative z-10">Demon Lord</h2>

              <div className="flex items-center gap-1.5 mb-3 md:mb-4">
                <Flame className="w-3 h-3 text-[#7c3aed]/60" />
                <span className="text-[10px] md:text-xs text-[#7c3aed]/70 font-medieval tracking-wider uppercase">Build & Defend</span>
                <Flame className="w-3 h-3 text-[#7c3aed]/60" />
              </div>

              <p className="text-[#6b5d6e] text-xs md:text-sm font-medieval leading-relaxed relative z-10 hidden md:block">
                Design deadly tower traps.<br/>
                Crush every challenger.
              </p>
              <p className="text-[#6b5d6e] text-[10px] font-medieval relative z-10 md:hidden">
                Design & defend towers
              </p>
            </motion.button>

            {/* Hero Card */}
            <motion.button
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              onClick={() => onSelectFaction('hero')}
              className="group relative rounded-2xl md:rounded-3xl p-5 md:p-8 flex flex-col items-center text-center transition-all duration-500 active:scale-[0.97]
                bg-gradient-to-b from-[#1a1810] to-[#0d0a07] border border-[#d4a017]/[0.12] hover:border-[#d4a017]/30
                shadow-[0_4px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_40px_rgba(212,160,23,0.15)]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#d4a017]/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl md:rounded-3xl"></div>

              <div className="relative mb-4 md:mb-6">
                <div className="absolute inset-0 bg-[#d4a017]/20 rounded-full blur-2xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Shield className="w-12 h-12 md:w-20 md:h-20 text-[#d4a017] relative z-10 transition-transform duration-500 group-hover:scale-110" />
              </div>

              <h2 className="text-lg md:text-2xl font-display font-bold tracking-wider text-[#e8dcc8] mb-2 md:mb-3 relative z-10">Hero</h2>

              <div className="flex items-center gap-1.5 mb-3 md:mb-4">
                <Sword className="w-3 h-3 text-[#d4a017]/60" />
                <span className="text-[10px] md:text-xs text-[#d4a017]/70 font-medieval tracking-wider uppercase">Raid & Conquer</span>
                <Sword className="w-3 h-3 text-[#d4a017]/60" />
              </div>

              <p className="text-[#6b6050] text-xs md:text-sm font-medieval leading-relaxed relative z-10 hidden md:block">
                Storm impossible towers.<br/>
                Claim legendary glory.
              </p>
              <p className="text-[#6b6050] text-[10px] font-medieval relative z-10 md:hidden">
                Raid & claim glory
              </p>
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#3d3630]/30 to-transparent"></div>
    </div>
  );
}
