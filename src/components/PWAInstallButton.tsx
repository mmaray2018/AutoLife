import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { getUi } from '../data/uiTranslations';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { LanguageCode } from '../types/autolife';

export function PWAInstallButton({ language = 'en' }: { language?: LanguageCode }) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const pwa = getUi(language).pwa;

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0c1629]/80 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
        <span>{pwa.installBtn}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0c1629]/80 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>{pwa.iosTitle}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-2xl autolife-glass p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  {pwa.iosTitle}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <li>{pwa.iosStep1}</li>
                <li>{pwa.iosStep2}</li>
                <li>{pwa.iosStep3}</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-xl bg-slate-900 dark:bg-sky-600 text-white text-xs font-medium"
              >
                {pwa.gotIt}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator({ language = 'en' }: { language?: LanguageCode }) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  const pwa = getUi(language).pwa;

  return (
    <div className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>{pwa.offlineBadge}</span>
    </div>
  );
}
