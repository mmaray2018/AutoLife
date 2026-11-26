import { useState } from 'react';
import { ExternalLink, MessageCircle, X } from 'lucide-react';
import { LanguageCode } from '../types/autolife';
import { buildWhatsAppUrl, sanitizeWhatsAppNumber } from '../utils/whatsapp';

interface WhatsAppConnectButtonProps {
  whatsappNumber?: string;
  language: LanguageCode;
  message: string;
  label?: string;
  compact?: boolean;
  title?: string;
  className?: string;
  onSaveWhatsApp: (phone: string) => void;
}

export function WhatsAppConnectButton({
  whatsappNumber,
  language,
  message,
  label = 'WhatsApp',
  compact = false,
  title = 'Enviar para WhatsApp cadastrado',
  className,
  onSaveWhatsApp,
}: WhatsAppConnectButtonProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState(whatsappNumber ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const waUrl = buildWhatsAppUrl(whatsappNumber, language, message);

  const defaultClass = compact
    ? 'inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0'
    : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0';

  if (waUrl) {
    return (
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={className ?? defaultClass}
        title={title}
        aria-label={title}
      >
        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        {label ? <span>{label}</span> : null}
      </a>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeWhatsAppNumber(phoneInput, language);
    if (!clean) {
      setValidationError('Informe um WhatsApp válido com DDD (ex.: +55 11 99999-8888).');
      return;
    }
    setValidationError(null);
    onSaveWhatsApp(phoneInput.trim());
    setShowSetupModal(false);
  };

  const savedPreviewUrl = buildWhatsAppUrl(phoneInput, language, message);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPhoneInput(whatsappNumber ?? '');
          setValidationError(null);
          setShowSetupModal(true);
        }}
        className={className ?? defaultClass}
        title={title}
        aria-label={title}
      >
        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        {label ? <span>{label}</span> : null}
      </button>

      {showSetupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Conectar WhatsApp</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Cadastre seu número uma vez para enviar qualquer serviço, nota ou agendamento direto para o seu WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  WhatsApp cadastrado (com DDI + DDD)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex.: +55 11 99999-8888"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              {validationError && (
                <p className="text-xs text-red-600 dark:text-red-400">{validationError}</p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowSetupModal(false)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                >
                  Salvar WhatsApp
                </button>
                {savedPreviewUrl && (
                  <a
                    href={savedPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      const clean = sanitizeWhatsAppNumber(phoneInput, language);
                      if (clean) onSaveWhatsApp(phoneInput.trim());
                      setShowSetupModal(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <span>Salvar e Abrir WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
