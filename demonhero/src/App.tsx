import React, { useState, useEffect } from 'react';
import { Faction, LevelData, PlayerStats, RoomData, InventoryItem, EquipSlot, Equipment } from './types';
import { Home } from './components/Home';
import { HeroDashboard } from './components/HeroDashboard';
import { DemonDashboard } from './components/DemonDashboard';
import { LevelEditor } from './components/LevelEditor';
import { GameCanvas } from './components/GameCanvas';
import { createFloorGrid } from './utils';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, increment, query, orderBy } from 'firebase/firestore';
import { rollReward, getItem, RARITY_COLORS } from './items';

const DEFAULT_EQUIPMENT: Equipment = { weapon: null, armor: null, boots: null };

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
DEFAULT_LEVEL.rooms[0].grid[33][5] = 3; // Patrol on lower platform
DEFAULT_LEVEL.rooms[0].grid[27][10] = 2; // Spike on mid platform

// Floor 2: harder with stationary mage
DEFAULT_LEVEL.rooms[1].grid[33][4] = 3; // Patrol
DEFAULT_LEVEL.rooms[1].grid[21][4] = 4; // Stationary mage
DEFAULT_LEVEL.rooms[1].grid[15][10] = 2;  // Spike near top

// Floor 3: boss floor
DEFAULT_LEVEL.rooms[2].grid[21][5] = 5;  // Boss on middle platform

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

// Helper to add item to inventory array
function addToInventory(inv: InventoryItem[], itemId: string, qty: number = 1): InventoryItem[] {
  const copy = inv.map(i => ({ ...i }));
  const existing = copy.find(i => i.itemId === itemId);
  if (existing) {
    existing.quantity += qty;
  } else {
    copy.push({ itemId, quantity: qty });
  }
  return copy;
}

// Helper to remove item from inventory
function removeFromInventory(inv: InventoryItem[], itemId: string, qty: number = 1): InventoryItem[] {
  return inv.map(i => {
    if (i.itemId === itemId) return { ...i, quantity: i.quantity - qty };
    return { ...i };
  }).filter(i => i.quantity > 0);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [faction, setFaction] = useState<Faction>(null);
  const [stats, setStats] = useState<PlayerStats>({
    fame: 100, infamy: 100,
    inventory: [],
    equipment: DEFAULT_EQUIPMENT
  });
  const [levels, setLevels] = useState<LevelData[]>([DEFAULT_LEVEL]);
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);
  const [editingLevel, setEditingLevel] = useState<LevelData | null>(null);
  const [gameResult, setGameResult] = useState<{ win: boolean; fameChange: number; rewardItemId?: string } | null>(null);
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
      const userRef = doc(db, 'users', user.uid);
      const unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let inventory: InventoryItem[] = [];
          let equipment: Equipment = DEFAULT_EQUIPMENT;
          try { inventory = data.inventory ? JSON.parse(data.inventory) : []; } catch {}
          try { equipment = data.equipment ? JSON.parse(data.equipment) : DEFAULT_EQUIPMENT; } catch {}
          setStats({
            fame: data.fame || 0,
            infamy: data.infamy || 0,
            inventory,
            equipment,
          });
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

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

      return () => { unsubUser(); unsubLevels(); };
    } else {
      setStats({ fame: 100, infamy: 100, inventory: [], equipment: DEFAULT_EQUIPMENT });
      setLevels([DEFAULT_LEVEL]);
    }
  }, [user, isAuthReady]);

  // === Inventory Helpers ===
  const saveInventoryToFirestore = async (newInventory: InventoryItem[], newEquipment?: Equipment) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const update: Record<string, string> = { inventory: JSON.stringify(newInventory) };
    if (newEquipment) update.equipment = JSON.stringify(newEquipment);
    await updateDoc(userRef, update);
  };

  const handleEquipItem = async (itemId: string) => {
    const item = getItem(itemId);
    if (!item || item.type === 'consumable') return;
    const slot = item.type as EquipSlot;
    const newEquip = { ...stats.equipment, [slot]: itemId };
    await saveInventoryToFirestore(stats.inventory, newEquip);
  };

  const handleUnequipItem = async (slot: EquipSlot) => {
    const newEquip = { ...stats.equipment, [slot]: null };
    await saveInventoryToFirestore(stats.inventory, newEquip);
  };

  // === Game Handlers ===
  const handleSelectFaction = (f: Faction) => {
    setFaction(f);
    setScreen(f === 'hero' ? 'hero_dash' : 'demon_dash');
  };

  const handlePlay = (level: LevelData) => {
    setCurrentLevel(level);
    setScreen('play');
  };

  const handleWin = async (pickedUpItems: InventoryItem[]) => {
    if (!currentLevel || !user) return;
    const fameGained = Math.floor(currentLevel.infamy * 0.08);

    // Roll a reward item
    const rewardItemId = rollReward();

    setGameResult({ win: true, fameChange: fameGained, rewardItemId });
    setScreen('result');

    try {
      const userRef = doc(db, 'users', user.uid);
      // Build updated inventory: merge picked up items + reward
      let newInventory = [...stats.inventory];
      for (const pi of pickedUpItems) {
        newInventory = addToInventory(newInventory, pi.itemId, pi.quantity);
      }
      newInventory = addToInventory(newInventory, rewardItemId, 1);

      await updateDoc(userRef, {
        fame: increment(fameGained),
        inventory: JSON.stringify(newInventory),
      });

      const levelRef = doc(db, 'levels', currentLevel.id);
      await updateDoc(levelRef, {
        clears: increment(1),
        attempts: increment(1),
        infamy: Math.max(0, currentLevel.infamy - fameGained)
      });

      if (currentLevel.creatorId && currentLevel.creatorId !== user.uid && currentLevel.creatorId !== 'system') {
        const creatorRef = doc(db, 'users', currentLevel.creatorId);
        await updateDoc(creatorRef, { infamy: increment(-fameGained) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'levels/users');
    }
  };

  const handleLose = async (pickedUpItems: InventoryItem[]) => {
    if (!currentLevel || !user) return;
    const rawLoss = Math.floor(currentLevel.infamy * 0.08);
    const fameLost = Math.min(rawLoss, stats.fame);
    setGameResult({ win: false, fameChange: -fameLost });
    setScreen('result');

    try {
      const userRef = doc(db, 'users', user.uid);
      // Items picked up are kept even on loss
      if (pickedUpItems.length > 0) {
        let newInventory = [...stats.inventory];
        for (const pi of pickedUpItems) {
          newInventory = addToInventory(newInventory, pi.itemId, pi.quantity);
        }
        await updateDoc(userRef, {
          fame: fameLost > 0 ? increment(-fameLost) : increment(0),
          inventory: JSON.stringify(newInventory),
        });
      } else if (fameLost > 0) {
        await updateDoc(userRef, { fame: increment(-fameLost) });
      }

      const levelRef = doc(db, 'levels', currentLevel.id);
      await updateDoc(levelRef, {
        attempts: increment(1),
        infamy: increment(fameLost)
      });

      if (currentLevel.creatorId && currentLevel.creatorId !== user.uid && currentLevel.creatorId !== 'system') {
        const creatorRef = doc(db, 'users', currentLevel.creatorId);
        await updateDoc(creatorRef, { infamy: increment(fameLost) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'levels/users');
    }
  };

  // Use consumable from dashboard
  const handleUseItemDashboard = async (itemId: string) => {
    const item = getItem(itemId);
    if (!item || item.type !== 'consumable') return;
    const newInventory = removeFromInventory(stats.inventory, itemId);
    await saveInventoryToFirestore(newInventory);
  };

  const handleSaveLevel = async (rooms: RoomData[]) => {
    if (!user) throw new Error('Not authenticated');
    const levelId = `tower-${user.uid}`;
    const levelRef = doc(db, 'levels', levelId);
    try {
      const existingDoc = await getDoc(levelRef);
      if (existingDoc.exists()) {
        await updateDoc(levelRef, { rooms: JSON.stringify(rooms) });
      } else {
        const newLevel = {
          id: levelId,
          name: `나의 마왕탑`,
          creatorId: user.uid,
          creatorName: user.displayName || '이름 없는 마왕',
          infamy: 100,
          clears: 0,
          attempts: 0,
          rooms: JSON.stringify(rooms),
          createdAt: new Date().toISOString()
        };
        await setDoc(levelRef, newLevel);
      }
      setEditingLevel(null);
      setScreen('demon_dash');
    } catch (error) {
      console.error('Save level failed:', error);
      throw error;
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
    return (
      <HeroDashboard
        levels={levels}
        stats={stats}
        onPlay={handlePlay}
        onBack={() => setScreen('home')}
        onEquipItem={handleEquipItem}
        onUnequipItem={handleUnequipItem}
        onUseItem={handleUseItemDashboard}
      />
    );
  }

  const handleRenameTower = async (newName: string) => {
    if (!user) return;
    const levelRef = doc(db, 'levels', `tower-${user.uid}`);
    await updateDoc(levelRef, { name: newName });
  };

  if (screen === 'demon_dash') {
    return <DemonDashboard levels={levels} stats={stats} userId={user?.uid ?? ''} onEdit={(existing) => { setEditingLevel(existing); setScreen('edit'); }} onRenameTower={handleRenameTower} onBack={() => setScreen('home')} />;
  }

  if (screen === 'edit') {
    return <LevelEditor onSave={handleSaveLevel} onCancel={() => { setEditingLevel(null); setScreen('demon_dash'); }} initialRooms={editingLevel?.rooms} />;
  }

  if (screen === 'play' && currentLevel) {
    return (
      <GameCanvas
        level={currentLevel}
        stats={stats}
        onWin={handleWin}
        onLose={handleLose}
        onQuit={() => { setCurrentLevel(null); setScreen('hero_dash'); }}
        onSaveInventory={saveInventoryToFirestore}
      />
    );
  }

  if (screen === 'result' && gameResult) {
    const isWin = gameResult.win;
    const rewardItem = gameResult.rewardItemId ? getItem(gameResult.rewardItemId) : null;
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

        <div className="relative z-10 bg-[#18181b] border border-[#27272a] rounded-lg p-6 md:p-8 text-center mb-6 min-w-[220px]">
          <p className="text-[#52525b] text-[10px] uppercase tracking-[0.3em] mb-3">Fame Change</p>
          <p className={`text-4xl md:text-5xl font-display font-black ${gameResult.fameChange > 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
            {gameResult.fameChange > 0 ? '+' : ''}{gameResult.fameChange}
          </p>
        </div>

        {isWin && rewardItem && (
          <div className="relative z-10 bg-[#18181b] border border-[#27272a] rounded-lg p-4 md:p-6 text-center mb-10 min-w-[220px]">
            <p className="text-[#52525b] text-[10px] uppercase tracking-[0.3em] mb-2">보상 아이템</p>
            <p className="text-lg font-display font-bold" style={{ color: RARITY_COLORS[rewardItem.rarity] }}>
              {rewardItem.nameKo}
            </p>
            <p className="text-[11px] text-[#71717a] mt-1">{rewardItem.description}</p>
          </div>
        )}

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
