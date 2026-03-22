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
  name: '초보 마왕의 성',
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

// Add some enemies to default level
DEFAULT_LEVEL.rooms[0].grid[9][10] = 3; // Patrol
DEFAULT_LEVEL.rooms[1].grid[9][10] = 4; // Stationary
DEFAULT_LEVEL.rooms[1].grid[9][12] = 2; // Spike
DEFAULT_LEVEL.rooms[2].grid[9][10] = 5; // Boss

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
      name: `나의 마왕성 ${levels.filter(l => l.creator === user.displayName).length + 1}`,
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
    return <div className="min-h-screen bg-[#0d0a07] flex items-center justify-center text-[#d4a017] font-display text-xl tracking-widest glow-gold">입장 중...</div>;
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
    return (
      <div className="min-h-screen bg-dungeon flex flex-col items-center justify-center text-[#e8dcc8] font-sans relative overflow-hidden">
        {/* Ambient glow based on result */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[150px] pointer-events-none ${gameResult.win ? 'bg-[#d4a017]/10' : 'bg-[#8b0000]/10'}`}></div>

        {/* Ornamental line */}
        <div className="flex items-center justify-center gap-4 mb-8 relative z-10">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#5a4d3e]"></div>
          <span className="text-[#5a4d3e] text-xs tracking-[0.3em] font-medieval uppercase">
            {gameResult.win ? 'Victory' : 'Defeat'}
          </span>
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#5a4d3e]"></div>
        </div>

        <h1 className={`text-5xl md:text-7xl font-display font-black mb-8 tracking-wider relative z-10 ${gameResult.win ? 'text-[#d4a017] glow-gold' : 'text-[#cc2200] glow-blood'}`}>
          {gameResult.win ? '공략 성공!' : '공략 실패...'}
        </h1>

        <div className="card-stone p-8 md:p-10 rounded-2xl text-center mb-10 relative z-10 min-w-[280px]">
          {/* Corner ornaments */}
          <div className="absolute top-2 left-2 w-4 h-4 border-t border-l border-[#5a4d3e]/50"></div>
          <div className="absolute top-2 right-2 w-4 h-4 border-t border-r border-[#5a4d3e]/50"></div>
          <div className="absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[#5a4d3e]/50"></div>
          <div className="absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[#5a4d3e]/50"></div>

          <p className="text-[#8b7355] text-lg font-medieval mb-3 tracking-wider">명성 변화</p>
          <p className={`text-5xl md:text-6xl font-display font-black ${gameResult.fameChange > 0 ? 'text-[#d4a017] glow-gold' : 'text-[#cc2200] glow-blood'}`}>
            {gameResult.fameChange > 0 ? '+' : ''}{gameResult.fameChange}
          </p>
        </div>

        <button
          onClick={() => { setGameResult(null); setScreen('hero_dash'); }}
          className="btn-medieval text-[#d4a017] hover:text-[#f0c85a] px-10 py-4 rounded-xl font-medieval font-bold text-lg transition-all relative z-10"
        >
          길드로 돌아가기
        </button>
      </div>
    );
  }

  return null;
}
