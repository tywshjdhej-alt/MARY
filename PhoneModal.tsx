import React, { useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { t } from '../i18n/translations';
import { Language, SaveData } from '../types/game';

interface PhoneModalProps {
  language: Language;
  saveData: SaveData;
  onReply: () => void;
  onIgnore: () => void;
}

export const PhoneModal: React.FC<PhoneModalProps> = ({
  language,
  saveData,
  onReply,
  onIgnore,
}) => {
  const isRtl = language === 'ar';
  const [repliedNow, setRepliedNow] = useState(saveData.choices.repliedToMary);

  const handleReply = () => {
    setRepliedNow(true);
    onReply();
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80"
    >
      <div className="w-full max-w-sm bg-[#12161d] border-2 border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Retro 2009 Phone Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0d12] border-b border-zinc-800">
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-sky-400">
            <Smartphone className="w-4 h-4" />
            <span>{t(language, 'phoneHeader')}</span>
          </div>
          <button
            type="button"
            onClick={onIgnore}
            className="p-1 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Monospace LCD Screen */}
        <div className="p-5 bg-[#0c141c] border-b border-zinc-800 space-y-3">
          <div className="text-xs font-mono-tabular text-rose-400 font-semibold">
            {t(language, 'phoneFrom')} · 02:09
          </div>

          <div className="p-3.5 rounded bg-[#101c28] border border-sky-900/50 text-sm text-sky-100 leading-relaxed">
            {t(language, 'phoneMsg1')}
          </div>

          {saveData.solvedPuzzles.studyDoor && (
            <div className="p-3.5 rounded bg-[#101c28] border border-sky-900/50 text-sm text-amber-200 leading-relaxed">
              {t(language, 'phoneMsg2')}
            </div>
          )}

          {saveData.maryMetrics.marySearchesHiding && (
            <div className="p-3.5 rounded bg-[#1c1016] border border-rose-900/60 text-sm text-rose-200 leading-relaxed">
              {t(language, 'phoneMsg3')}
            </div>
          )}

          {repliedNow && (
            <p className="text-xs text-zinc-400 italic">{t(language, 'phoneRepliedNote')}</p>
          )}
        </div>

        {/* Phone Keypad Actions */}
        <div className="p-4 flex flex-col gap-2 bg-[#0b0d12]">
          {!repliedNow && (
            <button
              type="button"
              onClick={handleReply}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded bg-sky-900/80 border border-sky-600/60 text-sky-100 hover:bg-sky-800 transition-colors"
            >
              {t(language, 'phoneReplyBtn')}
            </button>
          )}
          <button
            type="button"
            onClick={onIgnore}
            className="w-full py-2.5 px-4 text-xs font-medium rounded bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            {repliedNow ? t(language, 'close') : t(language, 'phoneIgnoreBtn')}
          </button>
        </div>
      </div>
    </div>
  );
};
