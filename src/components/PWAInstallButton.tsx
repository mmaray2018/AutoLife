import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>Instalar App (PWA)</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Instalar no iPhone</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
            role="dialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Instalar no iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <li>1. Toque no botão Compartilhar na barra do Safari.</li>
                <li>2. Role e toque em Adicionar à Tela de Início.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Modo Offline — Dados locais ativos</span>
    </div>
  );
}
