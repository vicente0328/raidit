import React from 'react';
import { InventoryItem, Equipment, EquipSlot } from '../types';
import { getItem, RARITY_COLORS, SLOT_NAMES_KO, ITEM_TYPE_EMOJI } from '../items';
import { X } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  equipment: Equipment;
  onUseItem?: (itemId: string) => void;
  onEquipItem?: (itemId: string) => void;
  onUnequipItem?: (slot: EquipSlot) => void;
  onClose?: () => void;
  mode: 'dashboard' | 'ingame';
}

export function InventoryPanel({ inventory, equipment, onUseItem, onEquipItem, onUnequipItem, onClose, mode }: Props) {
  const slots: EquipSlot[] = ['weapon', 'armor', 'boots'];

  const consumables = inventory.filter(i => {
    const def = getItem(i.itemId);
    return def && def.type === 'consumable' && i.quantity > 0;
  });

  const equipmentItems = inventory.filter(i => {
    const def = getItem(i.itemId);
    return def && def.type !== 'consumable' && i.quantity > 0;
  });

  return (
    <div className={`${mode === 'ingame' ? 'absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm' : ''}`}>
      <div className={`bg-[#111114] border border-[#27272a] rounded-xl ${mode === 'ingame' ? 'w-[320px] max-h-[80vh] overflow-y-auto' : 'w-full'} p-4`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-display font-bold text-[#e4e4e7] tracking-wider">
            {mode === 'ingame' ? '보관함' : '장비 & 보관함'}
          </h3>
          {onClose && (
            <button onClick={onClose} className="text-[#52525b] hover:text-[#a1a1aa] transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Equipment Slots */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-[0.15em] mb-2">장착 중</p>
          <div className="grid grid-cols-3 gap-2">
            {slots.map(slot => {
              const equippedId = equipment[slot];
              const item = equippedId ? getItem(equippedId) : null;
              return (
                <div key={slot} className="bg-[#18181b] border border-[#27272a] rounded-lg p-2 text-center">
                  <p className="text-[9px] text-[#52525b] uppercase tracking-wider mb-1">{SLOT_NAMES_KO[slot]}</p>
                  {item ? (
                    <>
                      <p className="text-xs font-semibold" style={{ color: RARITY_COLORS[item.rarity] }}>
                        {item.nameKo}
                      </p>
                      <p className="text-[9px] text-[#71717a] mt-0.5">{item.description}</p>
                      {mode === 'dashboard' && onUnequipItem && (
                        <button
                          onClick={() => onUnequipItem(slot)}
                          className="mt-1.5 text-[9px] text-[#f87171] hover:text-[#fca5a5] transition-colors"
                        >
                          해제
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-[#3f3f46]">비어있음</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Consumables */}
        {consumables.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-[0.15em] mb-2">소비 아이템</p>
            <div className="space-y-1.5">
              {consumables.map(inv => {
                const item = getItem(inv.itemId)!;
                return (
                  <div key={inv.itemId} className="flex items-center justify-between bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{ITEM_TYPE_EMOJI[item.type]}</span>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: RARITY_COLORS[item.rarity] }}>
                          {item.nameKo} <span className="text-[#52525b]">x{inv.quantity}</span>
                        </p>
                        <p className="text-[9px] text-[#71717a]">{item.description}</p>
                      </div>
                    </div>
                    {onUseItem && (
                      <button
                        onClick={() => onUseItem(inv.itemId)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 hover:bg-[#4ade80]/20 transition-colors"
                      >
                        사용
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Equipment Items */}
        {equipmentItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[#52525b] uppercase tracking-[0.15em] mb-2">장비 아이템</p>
            <div className="space-y-1.5">
              {equipmentItems.map(inv => {
                const item = getItem(inv.itemId)!;
                const isEquipped = equipment[item.type as EquipSlot] === inv.itemId;
                return (
                  <div key={inv.itemId} className={`flex items-center justify-between bg-[#18181b] border rounded-lg px-3 py-2 ${isEquipped ? 'border-[#4ade80]/30' : 'border-[#27272a]'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{ITEM_TYPE_EMOJI[item.type]}</span>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: RARITY_COLORS[item.rarity] }}>
                          {item.nameKo}
                          {isEquipped && <span className="ml-1 text-[9px] text-[#4ade80]">[장착중]</span>}
                        </p>
                        <p className="text-[9px] text-[#71717a]">{item.description}</p>
                      </div>
                    </div>
                    {mode === 'dashboard' && !isEquipped && onEquipItem && (
                      <button
                        onClick={() => onEquipItem(inv.itemId)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#38bdf8]/10 text-[#38bdf8] border border-[#38bdf8]/20 hover:bg-[#38bdf8]/20 transition-colors"
                      >
                        장착
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {consumables.length === 0 && equipmentItems.length === 0 && (
          <p className="text-center text-[#3f3f46] text-xs py-4">보관함이 비어있습니다.</p>
        )}
      </div>
    </div>
  );
}
