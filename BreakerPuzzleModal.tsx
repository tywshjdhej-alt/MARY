import React, { useState } from 'react';
import { CheckCircle2, Delete, X, Zap } from 'lucide-react';
import { t } from '../i18n/translations';
import { Language } from '../types/game';

interface BreakerPuzzleModalProps {
  language: Language;
  solved: boolean;
  onSolve: () => void;
  onClose: () => void;
}

export const BreakerPuzzleModal: React.FC<BreakerPuzzleModalProps> = ({
  language,
  solved,
  onSolve,
  onClose,
}) => {
  const isRtl = language === 'ar';
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d: string) => {
    if (solved || pin.length >= 3) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 3) {
      if (next === '209') {
        onSolve();
      } else {
        setError(true);
        setTimeout(() => setPin(''), 550);
      }
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-sm bg-[#0e1016] border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-semibold text-zinc-100">{t(language, 'breakerTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">{t(language, 'breakerDesc')}</p>

          {/* Digital PIN Display */}
          <div
            className={`py-3 px-4 rounded border text-center font-mono-tabular text-2xl tracking-[0.5em] ${
              solved
                ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                : error
                ? 'bg-rose-950/40 border-rose-600 text-rose-300'
                : 'bg-[#07090d] border-zinc-700 text-amber-300'
            }`}
          >
            {solved ? '209' : pin.padEnd(3, '_')}
          </div>

          {error && <p className="text-xs text-rose-400 text-center">{t(language, 'breakerWrong')}</p>}

          {solved ? (
            <div className="flex items-center gap-2 p-3 rounded bg-emerald-950/50 border border-emerald-700 text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t(language, 'breakerSuccess')}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2" dir="ltr">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="py-3 rounded bg-[#161a24] border border-zinc-700 text-base font-mono-tabular font-semibold text-zinc-100 hover:bg-zinc-800 active:bg-amber-900/50"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPin('')}
                className="py-3 rounded bg-[#161a24] border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                CLR
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="py-3 rounded bg-[#161a24] border border-zinc-700 text-base font-mono-tabular font-semibold text-zinc-100 hover:bg-zinc-800"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setPin((p) => p.slice(0, -1))}
                className="py-3 rounded bg-[#161a24] border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
