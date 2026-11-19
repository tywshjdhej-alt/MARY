import React from 'react';
import {
  Backpack,
  BatteryCharging,
  Flashlight,
  Hand,
  Pause,
  Smartphone,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { t } from '../i18n/translations';
import { GameSettings, HUDStateSnapshot } from '../types/game';

interface GameHUDProps {
  hud: HUDStateSnapshot;
  settings: GameSettings;
  hasUnreadPhone: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onOpenInventory: () => void;
  onOpenPhone: () => void;
  onInteract: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  settings,
  hasUnreadPhone,
  onPause,
  onToggleMute,
  onOpenInventory,
  onOpenPhone,
  onInteract,
}) => {
  const lang = settings.language;
  const isRtl = lang === 'ar';
  const maryNear = hud.maryDistance < 8.0;

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="fixed inset-0 z-10 pointer-events-none">
      {/* Subtle atmospheric vignette + danger blood vignette when Mary hunts/approaches */}
      <div className="absolute inset-0 horror-vignette pointer-events-none" />
      {maryNear && (
        <div
          className="absolute inset-0 danger-vignette pointer-events-none transition-opacity duration-200"
          style={{
            opacity: Math.max(0.15, Math.min(0.9, 1 - (hud.maryDistance - 1.2) / 7)),
          }}
        />
      )}

      {/* Top HUD Perimeter */}
      <div className="relative flex items-start justify-between p-4 md:p-6 gap-4">
        {/* Top-Left: Room, Objective & Flashlight Battery */}
        <div className="flex flex-col gap-1.5 max-w-xs md:max-w-md bg-[#0b0d13]/85 border border-zinc-800/90 px-3.5 py-2.5 rounded pointer-events-none">
          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span className="font-semibold text-rose-400">{t(lang, hud.currentRoomKey)}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 font-mono-tabular">
              <Flashlight className="w-3.5 h-3.5 text-amber-400" />
              <BatteryCharging className="w-3.5 h-3.5 text-zinc-400" />
              <span>{hud.battery}%</span>
            </span>
            {hud.isHidden && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400 font-semibold">{t(lang, 'hiddenStatus')}</span>
              </>
            )}
            {!hud.isHidden && hud.isCrouching && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-sky-400 font-semibold">{t(lang, 'crouchingStatus')}</span>
              </>
            )}
          </div>
          <p className="text-xs md:text-sm font-medium text-zinc-100 leading-snug">
            {t(lang, hud.objectiveKey)}
          </p>
        </div>

        {/* Top-Right: Quick Utility Buttons (Phone, Bag, Sound, Pause) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {!settings.showTouchControls && (
            <>
              <button
                type="button"
                onClick={onOpenPhone}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border transition-colors ${
                  hasUnreadPhone
                    ? 'bg-sky-900/90 border-sky-500 text-sky-100'
                    : 'bg-[#0d1017]/90 border-zinc-800 text-zinc-200 hover:border-zinc-600'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">{t(lang, 'btnPhone')}</span>
              </button>

              <button
                type="button"
                onClick={onOpenInventory}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-[#0d1017]/90 border border-zinc-800 text-zinc-200 hover:border-zinc-600 transition-colors"
              >
                <Backpack className="w-4 h-4" />
                <span className="hidden sm:inline">{t(lang, 'btnBag')}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={t(lang, settings.muted ? 'unmute' : 'mute')}
            className="p-2.5 rounded bg-[#0d1017]/90 border border-zinc-800 text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause"
            className="p-2.5 rounded bg-[#0d1017]/90 border border-zinc-800 text-zinc-200 hover:border-zinc-600 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Adaptive AI Alert Banner / Mary Proximity */}
      {(hud.alertMessageKey || maryNear) && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-[#140a0e]/92 border border-rose-800/80 text-xs md:text-sm font-medium text-rose-200 text-center max-w-md pointer-events-none">
          {hud.alertMessageKey ? t(lang, hud.alertMessageKey) : t(lang, 'maryNearWarning')}
        </div>
      )}

      {/* Center-Bottom Context Interact Prompt */}
      {hud.nearbyInteractable && (
        <div className="absolute bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={onInteract}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded border text-xs md:text-sm font-semibold shadow-xl transition-colors ${
              hud.nearbyInteractable.locked
                ? 'bg-[#181214]/95 border-rose-800/80 text-rose-200'
                : 'bg-[#10131c]/95 border-amber-500/70 text-zinc-100 hover:bg-[#191e2b]'
            }`}
          >
            <Hand className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">
              {!settings.showTouchControls && '[E] '}
              {t(lang, hud.nearbyInteractable.labelKey)}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
