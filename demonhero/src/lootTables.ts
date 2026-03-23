import { BlockType } from './types';

interface LootEntry {
  itemId: string;
  weight: number; // relative probability within the table
}

interface LootTable {
  dropChance: number; // 0.0–1.0: overall chance that anything drops at all
  entries: LootEntry[];
}

const LOOT_TABLES: Partial<Record<BlockType, LootTable>> = {
  // === Patrol (순찰병) — 30% drop chance ===
  [BlockType.MOB_PATROL]: {
    dropChance: 0.3,
    entries: [
      { itemId: 'hp_potion_s', weight: 20 },
      { itemId: 'iron_sword', weight: 8 },
      { itemId: 'swift_boots', weight: 2 },
    ],
  },

  // === Stationary Mage (마법사) — 50% drop chance ===
  [BlockType.MOB_STATIONARY]: {
    dropChance: 0.5,
    entries: [
      { itemId: 'hp_potion_m', weight: 30 },
      { itemId: 'iron_sword', weight: 10 },
      { itemId: 'flame_blade', weight: 8 },
      { itemId: 'regen_ring', weight: 2 },
    ],
  },

  // === Gargoyle (가고일) — 50% drop chance ===
  [BlockType.MOB_GARGOYLE]: {
    dropChance: 0.5,
    entries: [
      { itemId: 'hp_potion_m', weight: 20 },
      { itemId: 'steel_armor', weight: 15 },
      { itemId: 'thornmail', weight: 10 },
      { itemId: 'regen_ring', weight: 5 },
    ],
  },

  // === Slime (슬라임) — 40% drop chance ===
  [BlockType.MOB_SLIME]: {
    dropChance: 0.4,
    entries: [
      { itemId: 'hp_potion_s', weight: 25 },
      { itemId: 'hp_potion_m', weight: 15 },
      { itemId: 'wind_boots', weight: 10 },
      { itemId: 'swift_boots', weight: 5 },
      { itemId: 'dash_boots', weight: 3 },
    ],
  },

  // === Imp (임프) — 45% drop chance ===
  [BlockType.MOB_IMP]: {
    dropChance: 0.45,
    entries: [
      { itemId: 'hp_potion_s', weight: 20 },
      { itemId: 'flame_blade', weight: 12 },
      { itemId: 'vampiric_blade', weight: 8 },
      { itemId: 'dash_boots', weight: 5 },
    ],
  },

  // === Skeleton Knight (해골 기사) — 70% drop chance ===
  [BlockType.MOB_SKELETON]: {
    dropChance: 0.7,
    entries: [
      { itemId: 'hp_potion_m', weight: 20 },
      { itemId: 'flame_blade', weight: 35 },
      { itemId: 'thornmail', weight: 15 },
      { itemId: 'vampiric_blade', weight: 10 },
    ],
  },

  // === Boss (마왕) — 100% drop chance, guaranteed ===
  [BlockType.BOSS]: {
    dropChance: 1.0,
    entries: [
      { itemId: 'shadow_edge', weight: 50 },
      { itemId: 'frostbow', weight: 30 },
      { itemId: 'earthshaker_hammer', weight: 20 },
    ],
  },
};

/** Roll a drop for a given enemy type. Returns itemId or null. */
export function rollDrop(enemyType: BlockType): string | null {
  const table = LOOT_TABLES[enemyType];
  if (!table) return null;

  // Check overall drop chance
  if (Math.random() > table.dropChance) return null;

  // Weighted random selection
  const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of table.entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.itemId;
  }

  return table.entries[table.entries.length - 1].itemId;
}
