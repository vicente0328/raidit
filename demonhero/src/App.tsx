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
    if (!user) throw new Error('Not authenticated');

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
      console.error('Save level failed:', error);
      throw error; // propagate to LevelEditor for visible feedback
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent"></div>
        <div className="text-[#a1a1aa] font-display text-lg tracking-[0.3em] animate-pulse">LOADING</div>
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
      <div className="min-h-[100dvh] bg-[#09090b] flex flex-col items-center justify-center text-[#e4e4e7] font-sans relative overflow-hidden p-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[200px] ${isWin ? 'bg-[#4ade80]/[0.04]' : 'bg-[#f87171]/[0.04]'}`}></div>
        </div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#27272a] to-transparent"></div>

        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-10 h-px bg-[#27272a]"></div>
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#52525b]">
            {isWin ? 'Tower Cleared' : 'Tower Failed'}
          </span>
          <div className="w-10 h-px bg-[#27272a]"></div>
        </div>

        <h1 className={`text-4xl md:text-6xl font-display font-black mb-10 tracking-wider relative z-10 ${isWin ? 'text-[#4ade80] glow-green' : 'text-[#f87171] glow-red'}`}>
          {isWin ? 'VICTORY' : 'DEFEATED'}
        </h1>

        <div className="relative z-10 bg-[#18181b] border border-[#27272a] rounded-lg p-6 md:p-8 text-center mb-10 min-w-[220px]">
          <p className="text-[#52525b] text-[10px] uppercase tracking-[0.3em] mb-3">Fame Change</p>
          <p className={`text-4xl md:text-5xl font-display font-black ${gameResult.fameChange > 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
            {gameResult.fameChange > 0 ? '+' : ''}{gameResult.fameChange}
          </p>
        </div>

        <button
          onClick={() => { setGameResult(null); setScreen('hero_dash'); }}
          className="relative z-10 px-8 py-3 rounded-lg font-semibold text-sm transition-all duration-200 bg-[#18181b] hover:bg-[#1f1f23] border border-[#27272a] hover:border-[#3f3f46] text-[#a1a1aa]"
        >
          Return to Guild
        </button>
      </div>
    );
  }

  return null;
}
