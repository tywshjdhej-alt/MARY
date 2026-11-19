import React from 'react';
import { Play, RotateCcw, Settings, Code2, Globe, Volume2, VolumeX } from 'lucide-react';
import { t } from '../i18n/translations';
import { GameSettings } from '../types/game';

interface MainMenuProps {
  settings: GameSettings;
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  onOpenUnityPack: () => void;
  onToggleLanguage: () => void;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  settings,
  hasSave,
  onNewGame,
  onContinue,
  onOpenSettings,
  onOpenUnityPack,
  onToggleLanguage,
  onToggleMute,
}) => {
  const lang = settings.language;
  const isRtl = lang === 'ar';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none"
      style={{
        background:
          'linear-gradient(95deg, rgba(6,7,10,0.92) 0%, rgba(6,7,10,0.68) 48%, rgba(6,7,10,0.18) 100%)',
      }}
    >
      {/* Top Bar: Quiet year label + Language/Mute actions */}
      <div className="flex items-center justify-between pointer-events-auto">
        <span className="text-xs tracking-[0.22em] text-zinc-400 font-mono-tabular uppercase">
          {t(lang, 'yearTag')}
        </span>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMute}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 bg-[#11131a]/90 border border-zinc-800 rounded hover:border-zinc-600 hover:text-white transition-colors whitespace-nowrap"
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{settings.muted ? t(lang, 'unmute') : t(lang, 'mute')}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLanguage}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-200 bg-[#11131a]/90 border border-zinc-800 rounded hover:border-zinc-600 hover:text-white transition-colors whitespace-nowrap"
          >
            <Globe className="w-4 h-4 text-rose-400" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>
      </div>

      {/* Center-Left Hero Title Lockup + Menu Stack */}
      <div className="my-auto max-w-md pointer-events-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <div className="mb-8">
          <svg
            viewBox="0 0 360 92"
            className="w-72 md:w-88 h-auto overflow-visible"
            aria-label="MARY – The Forgotten City"
          >
            <defs>
              <linearGradient id="maryTitleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f4f1ea" />
                <stop offset="65%" stopColor="#c7bfb3" />
                <stop offset="100%" stopColor="#7f1d28" />
              </linearGradient>
            </defs>
            <text
              x="0"
              y="62"
              fill="url(#maryTitleGrad)"
              fontFamily="Cormorant Garamond, Georgia, serif"
              fontWeight="700"
              fontSize="74"
              letterSpacing="12"
            >
              MARY
            </text>
            <line x1="2" y1="76" x2="290" y2="76" stroke="#7f1d28" strokeWidth="1.5" />
          </svg>
          <p className="mt-1 text-sm md:text-base tracking-[0.26em] text-zinc-300 font-medium">
            {t(lang, 'gameSubtitle')}
          </p>
        </div>

        {/* Menu Buttons */}
        <div className="flex flex-col gap-2.5 w-full max-w-xs">
          {hasSave && (
            <button
              type="button"
              onClick={onContinue}
              className="flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-white bg-rose-900/90 border border-rose-700/70 rounded hover:bg-rose-800 transition-colors"
            >
              <span>{t(lang, 'continueGame')}</span>
              <Play className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onNewGame}
            className={`flex items-center justify-between px-5 py-3.5 text-sm font-semibold rounded border transition-colors ${
              hasSave
                ? 'text-zinc-100 bg-[#12151d]/95 border-zinc-700 hover:border-zinc-500'
                : 'text-white bg-rose-900/90 border-rose-700/70 hover:bg-rose-800'
            }`}
          >
            <span>{t(lang, 'newGame')}</span>
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center justify-between px-5 py-3 text-sm font-medium text-zinc-200 bg-[#101219]/92 border border-zinc-800 rounded hover:border-zinc-600 transition-colors"
          >
            <span>{t(lang, 'settings')}</span>
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            type="button"
            onClick={onOpenUnityPack}
            className="flex items-center justify-between px-5 py-3 text-sm font-medium text-zinc-300 bg-[#101219]/92 border border-zinc-800 rounded hover:border-zinc-600 transition-colors"
          >
            <span>{t(lang, 'unityPack')}</span>
            <Code2 className="w-4 h-4 text-amber-400/80" />
          </button>
        </div>
      </div>

      {/* Bottom single-line control hint */}
      <div className="flex items-center justify-between text-xs text-zinc-400 pointer-events-none">
        <p className="truncate max-w-full">
          {settings.showTouchControls ? t(lang, 'touchHint') : t(lang, 'controlsHint')}
        </p>
      </div>
    </div>
  );
};
