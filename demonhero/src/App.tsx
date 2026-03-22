import React, { useState, useEffect } from 'react';
import { Faction, LevelData, PlayerStats, RoomData } from './types';
import { Home } from './components/Home';
import { HeroDashboard } from './components/HeroDashboard';
import { DemonDashboard } from './components/DemonDashboard';
import { LevelEditor } from './components/LevelEditor';
import { GameCanvas } from './components/GameCanvas';
import { createFloorGrid } from './utils';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, increment, query, orderBy, getDocs } from 'firebase/firestore';

const DEFAULT_LEVEL: LevelData = {
  id: 'default-1',
  name: '초보 마왕의 탑',
  creator: 'System',
  creatorId: 'system',
  infamy: 150,
  clears: 10,
  attempts: 45,
  rooms: [
    { grid: createFloorGrid() },
    { grid: createFloorGrid() },
    { grid: createFloorGrid() }
  ]
};

// Floor 1: tutorial floor with a patrol enemy
DEFAULT_LEVEL.rooms[0].grid[19][4] = 3; // Patrol on lower platform
DEFAULT_LEVEL.rooms[0].grid[15][6] = 2; // Spike on mid platform

// Floor 2: harder with stationary mage
DEFAULT_LEVEL.rooms[1].grid[19][3] = 3; // Patrol
DEFAULT_LEVEL.rooms[1].grid[11][3] = 4; // Stationary mage
DEFAULT_LEVEL.rooms[1].grid[7][6] = 2;  // Spike near top

// Floor 3: boss floor
DEFAULT_LEVEL.rooms[2].grid[11][3] = 5;  // Boss on middle platform

type Screen = 'home' | 'hero_dash' | 'demon_dash' | 'play' | 'edit' | 'result';

async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [faction, setFaction] = useState<Faction>(null);
  const [stats, setStats] = useState<PlayerStats>({ fame: 100, infamy: 100 });
  const [levels, setLevels] = useState<LevelData[]>([DEFAULT_LEVEL]);
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);
  const [gameResult, setGameResult] = useState<{ win: boolean, fameChange: number } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;

    if (user) {
      // Listen to user stats
      const userRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStats({ fame: data.fame || 0, infamy: data.infamy || 0 });
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

      // Listen to levels
      const levelsQuery = query(collection(db, 'levels'), orderBy('createdAt', 'desc'));
      const unsubLevels = onSnapshot(levelsQuery, (snapshot) => {
        const fetchedLevels: LevelData[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetchedLevels.push({
            id: data.id,
            name: data.name,
            creator: data.creatorName,
            creatorId: data.creatorId,
            infamy: data.infamy,
            clears: data.clears,
            attempts: data.attempts,
            rooms: JSON.parse(data.rooms)
          });
        });
        setLevels(fetchedLevels.length > 0 ? fetchedLevels : [DEFAULT_LEVEL]);
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'levels'));

      return () => {
        unsubUser();
        unsubLevels();
      };
    } else {
      setStats({ fame: 100, infamy: 100 });
      setLevels([DEFAULT_LEVEL]);
    }
  }, [user, isAuthReady]);

  const handleSelectFaction = (f: Faction) => {
    setFaction(f);
    setScreen(f === 'hero' ? 'hero_dash' : 'demon_dash');
  };

  const handlePlay = (level: LevelData) => {
    setCurrentLevel(level);
    setScreen('play');
  };

  const handleWin = async () => {
    if (!currentLevel || !user) return;
    const fameGained = Math.floor(currentLevel.infamy * 0.08);
    setGameResult({ win: true, fameChange: fameGained });
    setScreen('result');

    try {
      // Update user fame
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { fame: increment(fameGained) });

      // Update level stats
      if (currentLevel.id !== 'default-1') {
        const levelRef = doc(db, 'levels', currentLevel.id);
        await updateDoc(levelRef, { 
          clears: increment(1), 
          attempts: increment(1),
          infamy: Math.max(0, currentLevel.infamy - fameGained)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'levels/users');
    }
  };

  const handleLose = async () => {
    if (!currentLevel || !user) return;
    const rawLoss = Math.floor(currentLevel.infamy * 0.08);
    const fameLost = Math.min(rawLoss, stats.fame);
    setGameResult({ win: false, fameChange: -fameLost });
    setScreen('result');

    try {
      const userRef = doc(db, 'users', user.uid);
      if (fameLost > 0) {
        await updateDoc(userRef, { fame: increment(-fameLost) });
      }

      // Update level stats
      if (currentLevel.id !== 'default-1') {
        const levelRef = doc(db, 'levels', currentLevel.id);
        await updateDoc(levelRef, { 
          attempts: increment(1),
          infamy: increment(fameLost)
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'levels/users');
    }
  };

  const handleSaveLevel = async (rooms: RoomData[]) => {
    if (!user) return;
    
    const levelId = `level-${Date.now()}`;
    const newLevel = {
      id: levelId,
      name: `나의 마왕탑 ${levels.filter(l => l.creator === user.displayName).length + 1}`,
      creatorId: user.uid,
      creatorName: user.displayName || '이름 없는 마왕',
      infamy: 100,
      clears: 0,
      attempts: 0,
      rooms: JSON.stringify(rooms),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'levels', levelId), newLevel);
      setScreen('demon_dash');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'levels');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-[100dvh] bg-[#080604] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d4a017]/30 to-transparent"></div>
        <div className="text-[#d4a017] font-display text-lg tracking-[0.3em] glow-gold animate-pulse">LOADING</div>
      </div>
    );
  }

  if (screen === 'home') {
    return <Home onSelectFaction={handleSelectFaction} user={user} />;
  }

  if (screen === 'hero_dash') {
    return <HeroDashboard levels={levels} stats={stats} onPlay={handlePlay} onBack={() => setScreen('home')} />;
  }

  if (screen === 'demon_dash') {
    return <DemonDashboard levels={levels} stats={stats} userId={user?.uid ?? ''} onEdit={() => setScreen('edit')} onBack={() => setScreen('home')} />;
  }

  if (screen === 'edit') {
    return <LevelEditor onSave={handleSaveLevel} onCancel={() => setScreen('demon_dash')} />;
  }

  if (screen === 'play' && currentLevel) {
    return <GameCanvas level={currentLevel} onWin={handleWin} onLose={handleLose} />;
  }

  if (screen === 'result' && gameResult) {
    const isWin = gameResult.win;
    return (
      <div className="min-h-[100dvh] bg-[#080604] flex flex-col items-center justify-center text-[#e8dcc8] font-sans relative overflow-hidden p-4">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px] ${isWin ? 'bg-[#d4a017]/[0.08]' : 'bg-[#8b0000]/[0.08]'}`}></div>
        </div>
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${isWin ? 'via-[#d4a017]/30' : 'via-[#cc2200]/30'} to-transparent`}></div>

        {/* Tag */}
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className={`w-12 h-px bg-gradient-to-r from-transparent ${isWin ? 'to-[#d4a017]/40' : 'to-[#cc2200]/40'}`}></div>
          <span className={`text-[10px] tracking-[0.4em] font-medieval uppercase ${isWin ? 'text-[#8b6914]' : 'text-[#8b3333]'}`}>
            {isWin ? 'Tower Cleared' : 'Tower Failed'}
          </span>
          <div className={`w-12 h-px bg-gradient-to-l from-transparent ${isWin ? 'to-[#d4a017]/40' : 'to-[#cc2200]/40'}`}></div>
        </div>

        {/* Title */}
        <h1 className={`text-4xl md:text-6xl font-display font-black mb-10 tracking-wider relative z-10 ${isWin ? 'bg-gradient-to-b from-[#fff8e7] via-[#d4a017] to-[#8b6914]' : 'bg-gradient-to-b from-[#ff8866] via-[#cc2200] to-[#8b0000]'} text-transparent bg-clip-text`}>
          {isWin ? 'VICTORY' : 'DEFEATED'}
        </h1>

        {/* Fame card */}
        <div className="relative z-10 bg-gradient-to-b from-[#141210]/80 to-[#0a0907]/80 border border-white/[0.06] rounded-xl p-6 md:p-8 text-center mb-10 min-w-[240px] backdrop-blur-sm">
          <p className="text-[#5a4d3e] text-[10px] font-medieval uppercase tracking-[0.3em] mb-3">Fame Change</p>
          <p className={`text-4xl md:text-5xl font-display font-black ${gameResult.fameChange > 0 ? 'text-[#d4a017] glow-gold' : 'text-[#cc2200] glow-blood'}`}>
            {gameResult.fameChange > 0 ? '+' : ''}{gameResult.fameChange}
          </p>
        </div>

        <button
          onClick={() => { setGameResult(null); setScreen('hero_dash'); }}
          className={`relative z-10 px-8 py-3.5 rounded-lg font-medieval font-bold text-sm tracking-wider transition-all duration-300 ${
            isWin
              ? 'bg-[#d4a017]/[0.1] hover:bg-[#d4a017]/[0.18] border border-[#d4a017]/20 hover:border-[#d4a017]/40 text-[#d4a017] hover:text-[#f0c85a]'
              : 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.12] text-[#8b7355] hover:text-[#c4a882]'
          }`}
        >
          Return to Guild
        </button>

        <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${isWin ? 'via-[#d4a017]/20' : 'via-[#3d3630]/20'} to-transparent`}></div>
      </div>
    );
  }

  return null;
}
