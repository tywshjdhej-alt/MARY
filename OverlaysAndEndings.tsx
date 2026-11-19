import React from 'react';
import { FileText, Play, RotateCcw, Settings, ShieldAlert, Trophy, X } from 'lucide-react';
import { t } from '../i18n/translations';
import { Language, SaveData } from '../types/game';

export const IntroOverlay: React.FC<{
  language: Language;
  onSkip: () => void;
}> = ({ language, onSkip }) => {
  const isRtl = language === 'ar';
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      onClick={onSkip}
      className="fixed inset-0 z-20 flex flex-col justify-end items-center p-8 pb-12 cursor-pointer"
      style={{
        background:
          'linear-gradient(to top, rgba(4,5,8,0.92) 0%, rgba(4,5,8,0.3) 45%, rgba(4,5,8,0.65) 100%)',
      }}
    >
      <div className="max-w-xl text-center space-y-2.5 mb-6">
        <p className="text-sm md:text-base text-rose-300/90 font-medium">{t(language, 'introLine1')}</p>
        <p className="text-base md:text-lg text-zinc-100 font-display">{t(language, 'introLine2')}</p>
        <p className="text-sm text-sky-300/90">{t(language, 'introLine3')}</p>
      </div>
      <span className="text-xs tracking-wider text-zinc-400">{t(language, 'skipIntro')}</span>
    </div>
  );
};

export const NoteModal: React.FC<{
  language: Language;
  onClose: () => void;
}> = ({ language, onClose }) => {
  const isRtl = language === 'ar';
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-md bg-[#1d1914] border border-amber-900/50 rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-950/60">
          <div className="flex items-center gap-2 text-amber-200">
            <FileText className="w-4 h-4" />
            <h2 className="text-sm font-semibold">{t(language, 'letterTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-amber-200/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm md:text-base text-amber-100/90 leading-relaxed font-display">
            {t(language, 'letterBody')}
          </p>
        </div>
        <div className="px-5 py-3 border-t border-amber-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded bg-amber-900/60 text-amber-100 hover:bg-amber-800/70"
          >
            {t(language, 'close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PauseModal: React.FC<{
  language: Language;
  onResume: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onSaveAndQuit: () => void;
}> = ({ language, onResume, onOpenSettings, onRestart, onSaveAndQuit }) => {
  const isRtl = language === 'ar';
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-xs bg-[#0e1016] border border-zinc-700 rounded-lg p-6 space-y-3 shadow-2xl">
        <h2 className="text-lg font-semibold text-zinc-100 text-center mb-4">
          {t(language, 'pausedTitle')}
        </h2>

        <button
          type="button"
          onClick={onResume}
          className="w-full flex items-center justify-center gap-2 py-3 rounded bg-rose-900/90 border border-rose-700 text-sm font-semibold text-white hover:bg-rose-800"
        >
          <Play className="w-4 h-4" />
          <span>{t(language, 'resume')}</span>
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-[#151822] border border-zinc-700 text-sm text-zinc-200 hover:border-zinc-500"
        >
          <Settings className="w-4 h-4" />
          <span>{t(language, 'settings')}</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded bg-[#151822] border border-zinc-700 text-sm text-zinc-200 hover:border-zinc-500"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{t(language, 'restartStage')}</span>
        </button>

        <button
          type="button"
          onClick={onSaveAndQuit}
          className="w-full py-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200"
        >
          {t(language, 'saveAndQuit')}
        </button>
      </div>
    </div>
  );
};

export const CaughtModal: React.FC<{
  language: Language;
  onRetry: () => void;
  onExitMenu: () => void;
}> = ({ language, onRetry, onExitMenu }) => {
  const isRtl = language === 'ar';
  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-[#100407]/95"
    >
      <div className="max-w-md w-full text-center space-y-5">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-3xl font-display font-bold text-rose-100">
          {t(language, 'caughtTitle')}
        </h2>
        <p className="text-sm text-rose-200/80 leading-relaxed">{t(language, 'caughtDesc')}</p>
        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="w-full py-3 rounded bg-rose-900 border border-rose-700 text-sm font-semibold text-white hover:bg-rose-800"
          >
            {t(language, 'retryCheckpoint')}
          </button>
          <button
            type="button"
            onClick={onExitMenu}
            className="w-full py-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white"
          >
            {t(language, 'exitGame')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const EscapedModal: React.FC<{
  language: Language;
  saveData: SaveData;
  onReplay: () => void;
  onExitMenu: () => void;
}> = ({ language, saveData, onReplay, onExitMenu }) => {
  const isRtl = language === 'ar';

  const endingKey =
    saveData.solvedPuzzles.portraits &&
    saveData.solvedPuzzles.breaker &&
    saveData.choices.readSecretLetter
      ? 'ending_truth'
      : saveData.maryMetrics.hideCount <= 1 && saveData.maryMetrics.ignoredPhoneCount === 0
      ? 'ending_survivor'
      : 'ending_marked';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-[#07090e]/95 overflow-y-auto"
    >
      <div className="max-w-lg w-full bg-[#0e1118] border border-zinc-700 rounded-lg p-6 md:p-8 space-y-5 shadow-2xl">
        <div className="flex items-center gap-3 text-amber-400">
          <Trophy className="w-8 h-8 shrink-0" />
          <h2 className="text-xl md:text-2xl font-display font-bold text-zinc-100">
            {t(language, 'escapedTitle')}
          </h2>
        </div>

        <p className="text-sm text-zinc-300 leading-relaxed">{t(language, 'escapedDesc')}</p>

        <div className="p-4 rounded bg-[#141824] border border-zinc-800 space-y-1">
          <div className="text-xs text-zinc-400">{t(language, 'endingPathLabel')}</div>
          <div className="text-sm font-semibold text-amber-300">{t(language, endingKey)}</div>
        </div>

        <div className="p-4 rounded bg-[#11131b] border border-zinc-800/80 space-y-2">
          <div className="text-xs font-semibold text-zinc-300">{t(language, 'futureStagesTitle')}</div>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-zinc-400">
            <span className="text-emerald-400 font-medium">1. {t(language, 'room_bedroom').split(' ')[0]} ✓</span>
            <span>{t(language, 'stage2')}</span>
            <span>{t(language, 'stage3')}</span>
            <span>{t(language, 'stage4')}</span>
            <span>{t(language, 'stage5')}</span>
            <span>{t(language, 'stage6')}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={onReplay}
            className="flex-1 py-3 rounded bg-rose-900 border border-rose-700 text-sm font-semibold text-white hover:bg-rose-800"
          >
            {t(language, 'restartStage')}
          </button>
          <button
            type="button"
            onClick={onExitMenu}
            className="flex-1 py-3 rounded bg-zinc-900 border border-zinc-700 text-sm text-zinc-200 hover:border-zinc-500"
          >
            {t(language, 'exitGame')}
          </button>
        </div>
      </div>
    </div>
  );
};
