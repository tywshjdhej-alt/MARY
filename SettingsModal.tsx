import React from 'react';
import { X } from 'lucide-react';
import { OUTFIT_COLORS } from '../game/models';
import { t } from '../i18n/translations';
import { GameSettings, GraphicsQuality, Language } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  outfitColorIndex: number;
  onUpdateSettings: (next: GameSettings) => void;
  onChangeOutfit: (idx: number) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  outfitColorIndex,
  onUpdateSettings,
  onChangeOutfit,
  onClose,
}) => {
  const lang = settings.language;
  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-md bg-[#0e1016] border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">{t(lang, 'settingsTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Master Volume */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span>{t(lang, 'masterVolume')}</span>
              <span className="font-mono-tabular">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, volume: Number(e.target.value), muted: false })
              }
              className="w-full accent-rose-600"
            />
          </div>

          {/* Camera Sensitivity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span>{t(lang, 'cameraSens')}</span>
              <span className="font-mono-tabular">{settings.sensitivity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.0"
              step="0.1"
              value={settings.sensitivity}
              onChange={(e) =>
                onUpdateSettings({ ...settings, sensitivity: Number(e.target.value) })
              }
              className="w-full accent-rose-600"
            />
          </div>

          {/* Graphics Quality */}
          <div className="space-y-2">
            <span className="block text-xs text-zinc-300">{t(lang, 'graphicsQuality')}</span>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, quality: q })}
                  className={`py-2 text-xs font-medium rounded border transition-colors ${
                    settings.quality === q
                      ? 'bg-rose-900/80 border-rose-500 text-white'
                      : 'bg-[#141720] border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {t(lang, `quality${q.charAt(0).toUpperCase() + q.slice(1)}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <span className="block text-xs text-zinc-300">{t(lang, 'languageLabel')}</span>
            <div className="grid grid-cols-2 gap-2">
              {(['ar', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, language: l })}
                  className={`py-2 text-xs font-medium rounded border transition-colors ${
                    settings.language === l
                      ? 'bg-rose-900/80 border-rose-500 text-white'
                      : 'bg-[#141720] border-zinc-800 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {l === 'ar' ? 'العربية' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Outfit Color */}
          <div className="space-y-2">
            <span className="block text-xs text-zinc-300">{t(lang, 'outfitLabel')}</span>
            <div className="flex items-center gap-3">
              {OUTFIT_COLORS.map((hex, idx) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => onChangeOutfit(idx)}
                  aria-label={`Outfit ${idx + 1}`}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    outfitColorIndex === idx
                      ? 'border-white scale-110'
                      : 'border-zinc-700 hover:border-zinc-500'
                  }`}
                  style={{ backgroundColor: `#${hex.toString(16).padStart(6, '0')}` }}
                />
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <label className="flex items-center justify-between text-xs text-zinc-200 cursor-pointer">
              <span>{t(lang, 'touchControlsLabel')}</span>
              <input
                type="checkbox"
                checked={settings.showTouchControls}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, showTouchControls: e.target.checked })
                }
                className="w-4 h-4 accent-rose-600"
              />
            </label>

            <label className="flex items-center justify-between text-xs text-zinc-200 cursor-pointer">
              <span>{t(lang, 'muteAudio')}</span>
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={(e) => onUpdateSettings({ ...settings, muted: e.target.checked })}
                className="w-4 h-4 accent-rose-600"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
