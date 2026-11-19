import React, { useState } from 'react';
import { Check, Copy, Download, FileCode2, X } from 'lucide-react';
import { UNITY_BUILD_INSTRUCTIONS, UNITY_SCRIPTS } from '../unity/unityScripts';
import { Language } from '../types/game';

interface UnityExportModalProps {
  language: Language;
  onClose: () => void;
}

const CLOUD_APK_WORKFLOW_PREVIEW = `# .github/workflows/build-apk.yml + BUILD_APK_CLOUD_GUIDE.md
#
# 1. حمّل ملفات المشروع كاملة من AI Studio (Download / Export Project).
# 2. ارفع الملفات على مستودع مجاني في GitHub.com (تأكد من وجود مجلد .github/workflows/build-apk.yml).
# 3. افتح تبويب Actions في المستودع -> سيتم بناء ملف MARY-Prototype-V1-APK تلقائياً خلال ~3 دقائق.
# 4. نزّل الملف من قسم Artifacts، فك الضغط وثبّت app-debug.apk على الأندرويد (يعمل Offline بالكامل!).

name: Build MARY Android APK
on:
  push:
    branches: [ main, master ]
  workflow_dispatch:
jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - uses: android-actions/setup-android@v3
      - run: npm install && npm run build
      - run: |
          npm install --no-save @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6
          rm -rf android
          npx cap add android
          node scripts/configure-android.mjs
          npx cap sync android
      - working-directory: android
        run: chmod +x gradlew && ./gradlew assembleDebug --no-daemon
      - uses: actions/upload-artifact@v4
        with:
          name: MARY-Prototype-V1-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk`;

export const UnityExportModal: React.FC<UnityExportModalProps> = ({ language, onClose }) => {
  const isRtl = language === 'ar';
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'script' | 'unity_guide' | 'cloud_apk'>('cloud_apk');

  const currentScript = UNITY_SCRIPTS[selectedIndex];

  const activeContent =
    viewMode === 'cloud_apk'
      ? CLOUD_APK_WORKFLOW_PREVIEW
      : viewMode === 'unity_guide'
      ? UNITY_BUILD_INSTRUCTIONS
      : currentScript.code;

  const activeFilename =
    viewMode === 'cloud_apk'
      ? 'build-apk.yml'
      : viewMode === 'unity_guide'
      ? 'BUILD_APK_INSTRUCTIONS.md'
      : currentScript.filename;

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownloadAllBundle = () => {
    const combined = [
      UNITY_BUILD_INSTRUCTIONS,
      ...UNITY_SCRIPTS.map(
        (s) => `\n// ==========================================\n// FILE: ${s.folder}/${s.filename}\n// ==========================================\n${s.code}`,
      ),
    ].join('\n');
    downloadFile('MARY_Unity_CSharp_Complete_Pack.txt', combined);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/85"
    >
      <div className="w-full max-w-5xl h-[85vh] bg-[#0d0f15] border border-zinc-700 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-zinc-100">
              {language === 'ar'
                ? 'تصدير Android APK السحابي وحزمة أكواد Unity C#'
                : 'Cloud Android APK Builder & Unity 3D C# Pack'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {language === 'ar'
                ? 'تمت إضافة إعدادات Capacitor و GitHub Actions لبناء ملف .apk أوفلاين تلقائياً، مع كافة أكواد Unity C# الـ 13.'
                : 'Capacitor + GitHub Actions cloud APK workflow is configured in the repo alongside all 13 Unity C# scripts.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAllBundle}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-rose-900/90 border border-rose-700 text-white hover:bg-rose-800"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'ar' ? 'تحميل أكواد Unity' : 'Download Unity Pack'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body split */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0" dir="ltr">
          {/* Script list */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-[#090b10] overflow-y-auto p-2.5 flex md:flex-col gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('cloud_apk')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-left whitespace-nowrap transition-colors ${
                viewMode === 'cloud_apk'
                  ? 'bg-emerald-950/60 border border-emerald-700/70 text-emerald-200'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <FileCode2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Cloud APK (GitHub)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('unity_guide')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-left whitespace-nowrap transition-colors ${
                viewMode === 'unity_guide'
                  ? 'bg-amber-950/60 border border-amber-700/70 text-amber-200'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              <FileCode2 className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Unity APK Guide</span>
            </button>

            {UNITY_SCRIPTS.map((script, idx) => (
              <button
                key={script.filename}
                type="button"
                onClick={() => {
                  setViewMode('script');
                  setSelectedIndex(idx);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono-tabular text-left whitespace-nowrap transition-colors ${
                  viewMode === 'script' && selectedIndex === idx
                    ? 'bg-rose-950/70 border border-rose-700/70 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{script.filename}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-[#07090d]">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-[#0b0d13]">
              <div className="text-xs text-zinc-300 truncate">
                {viewMode === 'cloud_apk'
                  ? '.github/workflows/build-apk.yml — Cloud Android APK Builder'
                  : viewMode === 'unity_guide'
                  ? 'BUILD_APK_INSTRUCTIONS.md'
                  : `${currentScript.folder}/${currentScript.filename} — ${currentScript.summary}`}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-zinc-500"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadFile(activeFilename, activeContent)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-zinc-500"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            <pre className="flex-1 overflow-auto p-4 text-xs font-mono-tabular text-zinc-200 leading-relaxed">
              <code>{activeContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
