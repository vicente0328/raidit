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
}

export interface RoomData {
  grid: number[][];
}

export interface LevelData {
  id: string;
  name: string;
  creator: string;
  creatorId: string;
  rooms: RoomData[];
  infamy: number;
  clears: number;
  attempts: number;
}

export type EquipSlot = 'weapon' | 'armor' | 'boots';

export interface ItemDef {
  id: string;
  name: string;
  nameKo: string;
  type: 'consumable' | 'weapon' | 'armor' | 'boots';
  rarity: 'common' | 'rare' | 'epic';
  description: string;
  healAmount?: number;
  atk?: number;
  def?: number;
  speed?: number;
  maxHp?: number;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface Equipment {
  weapon: string | null;
  armor: string | null;
  boots: string | null;
}

export interface PlayerStats {
  fame: number;
  infamy: number;
  inventory: InventoryItem[];
  equipment: Equipment;
}
