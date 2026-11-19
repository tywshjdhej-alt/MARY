import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { t } from '../i18n/translations';
import { Language } from '../types/game';

interface PortraitsPuzzleModalProps {
  language: Language;
  order: number[];
  solved: boolean;
  onSwap: (idxA: number, idxB: number) => void;
  onClose: () => void;
}

const PORTRAIT_VISUALS = [
  { digit: '2', bg: 'from-slate-800 to-amber-950', motif: 'sun' },
  { digit: '0', bg: 'from-zinc-900 to-slate-900', motif: 'eclipse' },
  { digit: '9', bg: 'from-rose-950 to-zinc-950', motif: 'mary' },
];

export const PortraitsPuzzleModal: React.FC<PortraitsPuzzleModalProps> = ({
  language,
  order,
  solved,
  onSwap,
  onClose,
}) => {
  const isRtl = language === 'ar';
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handleCardClick = (slotIdx: number) => {
    if (solved) return;
    if (selectedSlot === null) {
      setSelectedSlot(slotIdx);
    } else if (selectedSlot === slotIdx) {
      setSelectedSlot(null);
    } else {
      onSwap(selectedSlot, slotIdx);
      setSelectedSlot(null);
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-xl bg-[#0e1016] border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">{t(language, 'portraitsTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-zinc-300 leading-relaxed">{t(language, 'portraitsDesc')}</p>

          <div className="grid grid-cols-3 gap-3">
            {order.map((portraitId, slotIdx) => {
              const vis = PORTRAIT_VISUALS[portraitId];
              const isSelected = selectedSlot === slotIdx;
              return (
                <button
                  key={slotIdx}
                  type="button"
                  onClick={() => handleCardClick(slotIdx)}
                  className={`group flex flex-col items-center p-3 rounded border text-center transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/30 -translate-y-1'
                      : solved
                      ? 'border-emerald-600/70 bg-emerald-950/20'
                      : 'border-zinc-700 bg-[#141720] hover:border-zinc-500'
                  }`}
                >
                  <div
                    className={`w-full aspect-[3/4] rounded bg-gradient-to-b ${vis.bg} border border-zinc-700 flex flex-col items-center justify-center mb-2.5 relative overflow-hidden`}
                  >
                    {vis.motif === 'sun' && (
                      <div className="w-10 h-10 rounded-full bg-amber-400/80 shadow-lg" />
                    )}
                    {vis.motif === 'eclipse' && (
                      <div className="w-11 h-11 rounded-full bg-black border-2 border-slate-400" />
                    )}
                    {vis.motif === 'mary' && (
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-zinc-950 flex items-center justify-center gap-1.5">
                          <span className="w-1.5 h-1 bg-rose-500" />
                          <span className="w-1.5 h-1 bg-rose-500" />
                        </div>
                        <div className="w-10 h-14 bg-zinc-950 rounded-t-lg mt-1" />
                      </div>
                    )}
                    <span className="mt-3 font-mono-tabular text-lg font-bold text-zinc-200/80">
                      {vis.digit}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-zinc-200 leading-tight">
                    {t(language, `portrait${portraitId}Title`)}
                  </span>
                </button>
              );
            })}
          </div>

          {solved && (
            <div className="flex items-center gap-2.5 p-3.5 rounded bg-emerald-950/50 border border-emerald-700/70 text-emerald-200 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{t(language, 'portraitsSolved')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
