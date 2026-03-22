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
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>;
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100 font-sans">
        <h1 className={`text-6xl font-black mb-6 tracking-tight ${gameResult.win ? 'text-yellow-500' : 'text-red-500'}`}>
          {gameResult.win ? '공략 성공!' : '공략 실패...'}
        </h1>
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl text-center mb-12">
          <p className="text-zinc-400 text-xl font-medium mb-2">명성 변화</p>
          <p className={`text-5xl font-black ${gameResult.fameChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {gameResult.fameChange > 0 ? '+' : ''}{gameResult.fameChange}
          </p>
        </div>
        <button 
          onClick={() => { setGameResult(null); setScreen('hero_dash'); }}
          className="bg-zinc-800 hover:bg-zinc-700 px-10 py-4 rounded-2xl font-bold text-lg transition-colors"
        >
          길드로 돌아가기
        </button>
      </div>
    );
  }

  return null;
}
