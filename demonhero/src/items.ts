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
  hp_potion_m: {
    id: 'hp_potion_m',
    name: 'Medium Potion',
    nameKo: '중형 물약',
    type: 'consumable',
    rarity: 'common',
    description: 'HP를 45 회복합니다.',
    healAmount: 45,
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
  swift_boots: {
    id: 'swift_boots',
    name: 'Boots of Swiftness',
    nameKo: '신속의 장화',
    type: 'boots',
    rarity: 'common',
    description: '이동속도 +1 (10% 증가)',
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

  // === Special Weapons ===
  vampiric_blade: {
    id: 'vampiric_blade',
    name: 'Vampiric Blade',
    nameKo: '흡혈의 검',
    type: 'weapon',
    rarity: 'rare',
    description: '공격력 +2, 피해의 20%만큼 HP 회복',
    atk: 2,
    lifesteal: 0.2,
  },
  frostbow: {
    id: 'frostbow',
    name: 'Frostbow',
    nameKo: '빙결의 활',
    type: 'weapon',
    rarity: 'epic',
    description: '공격력 +3, 30% 확률로 적 2초 빙결',
    atk: 3,
    freezeChance: 0.3,
  },
  earthshaker_hammer: {
    id: 'earthshaker_hammer',
    name: 'Earthshaker Hammer',
    nameKo: '대지의 망치',
    type: 'weapon',
    rarity: 'epic',
    description: '공격력 +3, 주변 적에게 광역 피해',
    atk: 3,
    aoeRadius: 120,
  },

  // === Special Armor ===
  thornmail: {
    id: 'thornmail',
    name: 'Thornmail',
    nameKo: '가시 갑옷',
    type: 'armor',
    rarity: 'rare',
    description: '방어력 +2, 최대HP +15, 피격 시 피해 30% 반사',
    def: 2,
    maxHp: 15,
    thornsDmg: 0.3,
  },

  // === Accessories ===
  regen_ring: {
    id: 'regen_ring',
    name: 'Ring of Regeneration',
    nameKo: '재생의 반지',
    type: 'accessory',
    rarity: 'rare',
    description: '5초마다 최대 HP의 1%를 회복합니다',
    regenRate: 0.01,
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

// Medium potion for drop table
// (hp_potion_m is a mid-tier consumable between small and large)


export const SLOT_NAMES_KO: Record<string, string> = {
  weapon: '무기',
  armor: '갑옷',
  boots: '장화',
  accessory: '장신구',
};

export const ITEM_TYPE_EMOJI: Record<string, string> = {
  consumable: '🧪',
  weapon: '⚔️',
  armor: '🛡️',
  boots: '👢',
  accessory: '💍',
};
