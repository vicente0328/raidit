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
    <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center text-[#e4e4e7] font-sans p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#22d3ee]/[0.03] rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#c084fc]/[0.03] rounded-full blur-[150px]"></div>
      </div>

      {/* Top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent"></div>

      {/* Title */}
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
          className="text-[#52525b] text-[10px] md:text-xs tracking-[0.4em] font-medieval uppercase mb-4 md:mb-6"
        >
          Asymmetric Tower Defense
        </motion.p>

        <div className="flex items-center justify-center gap-3 md:gap-6 mb-4 md:mb-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <Skull className="w-8 h-8 md:w-12 md:h-12 text-[#c084fc] drop-shadow-[0_0_20px_rgba(192,132,252,0.3)]" />
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black tracking-wider">
            <span className="bg-gradient-to-b from-white via-[#a1a1aa] to-[#52525b] text-transparent bg-clip-text">
              RAID IT
            </span>
          </h1>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
            <Sword className="w-8 h-8 md:w-12 md:h-12 text-[#22d3ee] drop-shadow-[0_0_20px_rgba(34,211,238,0.3)]" />
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-[#52525b] text-sm md:text-base font-medieval tracking-[0.15em]"
        >
          Build towers. Raid towers.<br/>Claim glory.
        </motion.p>
      </motion.div>

      {!user ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="relative z-10 w-full max-w-[360px]"
        >
          <AnimatePresence mode="wait">
            {authMode === 'choose' && (
              <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col gap-3">
                <button onClick={handleGoogleLogin} disabled={loading}
                  className="flex items-center justify-center gap-3 bg-[#fafafa] hover:bg-white text-[#09090b] px-6 py-3.5 rounded-xl font-sans font-semibold text-sm transition-all duration-200 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </button>

                <div className="flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-[#27272a]"></div>
                  <span className="text-[#52525b] text-[10px] tracking-[0.2em] uppercase">or</span>
                  <div className="flex-1 h-px bg-[#27272a]"></div>
                </div>

                <button onClick={() => { setAuthMode('login'); setError(''); }}
                  className="flex items-center justify-center gap-3 bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-[#3f3f46] px-6 py-3.5 rounded-xl font-sans font-semibold text-sm text-[#a1a1aa] hover:text-[#e4e4e7] transition-all duration-200"
                >
                  <Mail className="w-4 h-4" />
                  Sign in with Email
                </button>

                <button onClick={() => { setAuthMode('signup'); setError(''); }}
                  className="flex items-center justify-center gap-2 text-[#52525b] hover:text-[#71717a] text-xs font-sans transition-colors mt-2"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  New here? Create account
                </button>

                {error && (
                  <p className="text-[#f87171] text-xs text-center mt-2 bg-[#f87171]/[0.06] border border-[#f87171]/[0.15] rounded-lg p-3">{error}</p>
                )}
              </motion.div>
            )}

            {authMode === 'login' && (
              <motion.form key="login" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                onSubmit={handleEmailLogin} className="flex flex-col gap-3"
              >
                <h3 className="text-center font-display text-lg text-[#e4e4e7] tracking-[0.15em] mb-1">SIGN IN</h3>

                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-3 text-[#e4e4e7] text-sm placeholder-[#52525b] focus:border-[#3f3f46] focus:outline-none transition-all" />
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-3 text-[#e4e4e7] text-sm placeholder-[#52525b] focus:border-[#3f3f46] focus:outline-none transition-all" />

                {error && <p className="text-[#f87171] text-xs text-center bg-[#f87171]/[0.06] border border-[#f87171]/[0.15] rounded-lg p-2.5">{error}</p>}

                <button type="submit" disabled={loading}
                  className="bg-[#fafafa] hover:bg-white text-[#09090b] px-6 py-3.5 rounded-xl font-sans font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  {loading ? 'Signing in...' : 'Enter'}
                </button>

                <div className="flex items-center justify-between mt-1">
                  <button type="button" onClick={() => { setAuthMode('choose'); setError(''); }}
                    className="text-[#52525b] hover:text-[#71717a] text-xs transition-colors">Back</button>
                  <button type="button" onClick={() => { setAuthMode('signup'); setError(''); }}
                    className="text-[#52525b] hover:text-[#71717a] text-xs transition-colors">Create account</button>
                </div>
              </motion.form>
            )}

            {authMode === 'signup' && (
              <motion.form key="signup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                onSubmit={handleEmailSignUp} className="flex flex-col gap-3"
              >
                <h3 className="text-center font-display text-lg text-[#e4e4e7] tracking-[0.15em] mb-1">CREATE ACCOUNT</h3>

                <input type="text" placeholder="Adventurer Name" value={displayName} onChange={e => setDisplayName(e.target.value)} required
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-3 text-[#e4e4e7] text-sm placeholder-[#52525b] focus:border-[#3f3f46] focus:outline-none transition-all" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-3 text-[#e4e4e7] text-sm placeholder-[#52525b] focus:border-[#3f3f46] focus:outline-none transition-all" />
                <input type="password" placeholder="Password (6+ chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg px-4 py-3 text-[#e4e4e7] text-sm placeholder-[#52525b] focus:border-[#3f3f46] focus:outline-none transition-all" />

                {error && <p className="text-[#f87171] text-xs text-center bg-[#f87171]/[0.06] border border-[#f87171]/[0.15] rounded-lg p-2.5">{error}</p>}

                <button type="submit" disabled={loading}
                  className="bg-[#fafafa] hover:bg-white text-[#09090b] px-6 py-3.5 rounded-xl font-sans font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  {loading ? 'Creating...' : 'Begin Adventure'}
                </button>

                <div className="flex items-center justify-between mt-1">
                  <button type="button" onClick={() => { setAuthMode('choose'); setError(''); }}
                    className="text-[#52525b] hover:text-[#71717a] text-xs transition-colors">Back</button>
                  <button type="button" onClick={() => { setAuthMode('login'); setError(''); }}
                    className="text-[#52525b] hover:text-[#71717a] text-xs transition-colors">Sign in</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative z-10 w-full max-w-xl"
        >
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex items-center justify-between mb-10 px-1"
          >
            <p className="text-[#71717a] text-xs">
              Welcome, <span className="text-[#a1a1aa]">{user.displayName || 'Adventurer'}</span>
            </p>
            <button onClick={logout} className="flex items-center gap-1.5 text-[#52525b] hover:text-[#71717a] text-xs transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </motion.div>

          <p className="text-center text-[#52525b] text-xs tracking-[0.3em] uppercase mb-6">Choose your path</p>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {/* Demon */}
            <motion.button
              onClick={() => onSelectFaction('demon')}
              className="group relative rounded-xl p-5 md:p-8 flex flex-col items-center text-center transition-all duration-300 active:scale-[0.97]
                bg-[#18181b] border border-[#27272a] hover:border-[#c084fc]/30
                hover:shadow-[0_0_40px_rgba(192,132,252,0.06)]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#c084fc]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>

              <div className="relative mb-4 md:mb-5">
                <div className="absolute inset-0 bg-[#c084fc]/15 rounded-full blur-2xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Skull className="w-10 h-10 md:w-16 md:h-16 text-[#c084fc] relative z-10 transition-transform duration-300 group-hover:scale-110" />
              </div>

              <h2 className="text-base md:text-xl font-display font-bold tracking-wider text-[#fafafa] mb-1.5 relative z-10">Demon Lord</h2>

              <span className="text-[10px] md:text-xs text-[#71717a] tracking-wider uppercase mb-3">Build & Defend</span>

              <p className="text-[#52525b] text-[10px] md:text-xs leading-relaxed relative z-10 hidden md:block">
                Design deadly tower traps.<br/>Crush every challenger.
              </p>
              <p className="text-[#52525b] text-[10px] relative z-10 md:hidden">Design & defend</p>
            </motion.button>

            {/* Hero */}
            <motion.button
              onClick={() => onSelectFaction('hero')}
              className="group relative rounded-xl p-5 md:p-8 flex flex-col items-center text-center transition-all duration-300 active:scale-[0.97]
                bg-[#18181b] border border-[#27272a] hover:border-[#22d3ee]/30
                hover:shadow-[0_0_40px_rgba(34,211,238,0.06)]"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#22d3ee]/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>

              <div className="relative mb-4 md:mb-5">
                <div className="absolute inset-0 bg-[#22d3ee]/15 rounded-full blur-2xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Shield className="w-10 h-10 md:w-16 md:h-16 text-[#22d3ee] relative z-10 transition-transform duration-300 group-hover:scale-110" />
              </div>

              <h2 className="text-base md:text-xl font-display font-bold tracking-wider text-[#fafafa] mb-1.5 relative z-10">Hero</h2>

              <span className="text-[10px] md:text-xs text-[#71717a] tracking-wider uppercase mb-3">Raid & Conquer</span>

              <p className="text-[#52525b] text-[10px] md:text-xs leading-relaxed relative z-10 hidden md:block">
                Storm impossible towers.<br/>Claim legendary glory.
              </p>
              <p className="text-[#52525b] text-[10px] relative z-10 md:hidden">Raid & conquer</p>
            </motion.button>
          </div>
        </motion.div>
      )}

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent"></div>
    </div>
  );
}
