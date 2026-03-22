import { ItemDef } from './types';

export const ITEMS: Record<string, ItemDef> = {
  // === Consumables ===
  hp_potion_s: {
    id: 'hp_potion_s',
    name: 'Small Potion',
    nameKo: '소형 물약',
    type: 'consumable',
    rarity: 'common',
    description: 'HP를 30 회복합니다.',
    healAmount: 30,
  },
  hp_potion_l: {
    id: 'hp_potion_l',
    name: 'Large Potion',
    nameKo: '대형 물약',
    type: 'consumable',
    rarity: 'rare',
    description: 'HP를 60 회복합니다.',
    healAmount: 60,
  },

  // === Weapons ===
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    nameKo: '철검',
    type: 'weapon',
    rarity: 'common',
    description: '공격력 +1',
    atk: 1,
  },
  flame_blade: {
    id: 'flame_blade',
    name: 'Flame Blade',
    nameKo: '화염검',
    type: 'weapon',
    rarity: 'rare',
    description: '공격력 +2',
    atk: 2,
  },
  shadow_edge: {
    id: 'shadow_edge',
    name: 'Shadow Edge',
    nameKo: '그림자 칼날',
    type: 'weapon',
    rarity: 'epic',
    description: '공격력 +4',
    atk: 4,
  },

  // === Armor ===
  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Armor',
    nameKo: '가죽 갑옷',
    type: 'armor',
    rarity: 'common',
    description: '방어력 +1, 최대HP +10',
    def: 1,
    maxHp: 10,
  },
  steel_armor: {
    id: 'steel_armor',
    name: 'Steel Armor',
    nameKo: '강철 갑옷',
    type: 'armor',
    rarity: 'rare',
    description: '방어력 +2, 최대HP +25',
    def: 2,
    maxHp: 25,
  },
  dragon_mail: {
    id: 'dragon_mail',
    name: 'Dragon Mail',
    nameKo: '용비늘 갑옷',
    type: 'armor',
    rarity: 'epic',
    description: '방어력 +4, 최대HP +50',
    def: 4,
    maxHp: 50,
  },

  // === Boots ===
  wind_boots: {
    id: 'wind_boots',
    name: 'Wind Boots',
    nameKo: '바람의 장화',
    type: 'boots',
    rarity: 'common',
    description: '이동속도 +1',
    speed: 1,
  },
  dash_boots: {
    id: 'dash_boots',
    name: 'Dash Boots',
    nameKo: '질주의 장화',
    type: 'boots',
    rarity: 'rare',
    description: '이동속도 +2',
    speed: 2,
  },
  phantom_boots: {
    id: 'phantom_boots',
    name: 'Phantom Boots',
    nameKo: '환영의 장화',
    type: 'boots',
    rarity: 'epic',
    description: '이동속도 +3',
    speed: 3,
  },
};

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}

// Weighted reward table — common items appear more often
export const REWARD_TABLE: string[] = [
  'hp_potion_s', 'hp_potion_s', 'hp_potion_s', 'hp_potion_s',
  'hp_potion_l', 'hp_potion_l',
  'iron_sword', 'iron_sword', 'iron_sword',
  'leather_armor', 'leather_armor', 'leather_armor',
  'wind_boots', 'wind_boots', 'wind_boots',
  'flame_blade', 'flame_blade',
  'steel_armor', 'steel_armor',
  'dash_boots', 'dash_boots',
  'shadow_edge',
  'dragon_mail',
  'phantom_boots',
];

export function rollReward(): string {
  return REWARD_TABLE[Math.floor(Math.random() * REWARD_TABLE.length)];
}

export const RARITY_COLORS: Record<string, string> = {
  common: '#a1a1aa',
  rare: '#38bdf8',
  epic: '#c084fc',
};

export const SLOT_NAMES_KO: Record<string, string> = {
  weapon: '무기',
  armor: '갑옷',
  boots: '장화',
};

export const ITEM_TYPE_EMOJI: Record<string, string> = {
  consumable: '🧪',
  weapon: '⚔️',
  armor: '🛡️',
  boots: '👢',
};
