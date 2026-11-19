import React from 'react';
import { BatteryCharging, FileText, Key, Smartphone, X } from 'lucide-react';
import { t } from '../i18n/translations';
import { INVENTORY_CATALOG, InventoryItemId, Language } from '../types/game';

interface InventoryModalProps {
  language: Language;
  items: InventoryItemId[];
  battery: number;
  onUseItem: (id: InventoryItemId) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  language,
  items,
  battery,
  onUseItem,
  onClose,
}) => {
  const isRtl = language === 'ar';

  const getIcon = (id: InventoryItemId) => {
    const cat = INVENTORY_CATALOG[id].category;
    if (cat === 'key') return <Key className="w-5 h-5 text-amber-400" />;
    if (cat === 'battery') return <BatteryCharging className="w-5 h-5 text-emerald-400" />;
    if (cat === 'tool') return <Smartphone className="w-5 h-5 text-sky-400" />;
    return <FileText className="w-5 h-5 text-zinc-300" />;
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-xl bg-[#0e1016] border border-zinc-700/80 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-zinc-100">{t(language, 'inventoryTitle')}</h2>
            <span className="text-xs font-mono-tabular text-zinc-400">
              {t(language, 'battery')}: {Math.round(battery)}%
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              {t(language, 'inventoryEmpty')}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((id) => {
                const def = INVENTORY_CATALOG[id];
                return (
                  <div
                    key={id}
                    className="flex flex-col justify-between gap-3 p-3.5 rounded bg-[#141720] border border-zinc-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded bg-[#0b0d12] border border-zinc-800 shrink-0">
                        {getIcon(id)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-400 mb-0.5">
                          {t(language, `cat_${def.category}`)}
                        </div>
                        <div className="text-sm font-semibold text-zinc-100 truncate">
                          {t(language, `item_${id}_name`)}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                          {t(language, `item_${id}_desc`)}
                        </p>
                      </div>
                    </div>

                    {def.usable && (
                      <button
                        type="button"
                        onClick={() => onUseItem(id)}
                        className="w-full py-2 text-xs font-semibold rounded bg-rose-900/80 border border-rose-700/60 text-white hover:bg-rose-800 transition-colors"
                      >
                        {t(language, 'useItem')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
