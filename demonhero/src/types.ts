export type Faction = 'demon' | 'hero' | null;

export enum BlockType {
  EMPTY = 0,
  WALL = 1,
  SPIKE = 2,
  MOB_PATROL = 3,
  MOB_STATIONARY = 4,
  BOSS = 5,
  DOOR = 6,
  SPAWN = 7,
  PLATFORM = 8,
  POTION = 9,
  MOB_GARGOYLE = 10,
  MOB_SLIME = 11,
  MOB_IMP = 12,
  MOB_SKELETON = 13,
}

export interface RoomData {
  grid: number[][];
}

export type MapOrientation = 'vertical' | 'horizontal';

export interface LevelData {
  id: string;
  name: string;
  creator: string;
  creatorId: string;
  rooms: RoomData[];
  infamy: number;
  clears: number;
  attempts: number;
  orientation: MapOrientation;
}

export type EquipSlot = 'weapon' | 'armor' | 'boots' | 'accessory';

export interface ItemDef {
  id: string;
  name: string;
  nameKo: string;
  type: 'consumable' | 'weapon' | 'armor' | 'boots' | 'accessory';
  rarity: 'common' | 'rare' | 'epic';
  description: string;
  healAmount?: number;
  atk?: number;
  def?: number;
  speed?: number;
  maxHp?: number;
  // Special effects
  lifesteal?: number;      // fraction of damage healed (0.0-1.0)
  freezeChance?: number;   // chance to freeze enemy (0.0-1.0)
  aoeRadius?: number;      // area-of-effect damage radius in pixels
  thornsDmg?: number;      // damage reflected back to attacker (fraction)
  regenRate?: number;       // HP regen per 5 seconds (fraction of maxHp)
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface Equipment {
  weapon: string | null;
  armor: string | null;
  boots: string | null;
  accessory: string | null;
}

export interface PlayerStats {
  fame: number;
  infamy: number;
  inventory: InventoryItem[];
  equipment: Equipment;
}
