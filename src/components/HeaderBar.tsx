import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, Plus } from 'lucide-react';
import { Translations } from '../data/i18n';
import { CurrencyCode, LanguageCode, ModuleId, Vehicle } from '../types/autolife';
import { CURRENCY_CATALOG, CURRENCY_LIST } from '../utils/billing';

interface HeaderBarProps {
  activeModule: ModuleId;
  activeVehicle: Vehicle | null;
  t: Translations;
  language: LanguageCode;
  currency: CurrencyCode;
  onChangeLanguage: (lang: LanguageCode) => void;
  onChangeCurrency: (currency: CurrencyCode) => void;
  onOpenMobileNav: () => void;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}

const LANGUAGE_OPTIONS: { code: LanguageCode; flag: string; short: string; label: string }[] = [
  { code: 'pt', flag: '🇧🇷', short: 'PT', label: 'Português' },
  { code: 'en', flag: '🇺🇸', short: 'EN', label: 'English' },
  { code: 'es', flag: '🇪🇸', short: 'ES', label: 'Español' },
  { code: 'de', flag: '🇩🇪', short: 'DE', label: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', short: 'FR', label: 'Français' },
];

const CURRENCY_FLAGS: Record<CurrencyCode, string> = {
  BRL: '🇧🇷',
  USD: '🇺🇸',
  EUR: '🇪🇺',
  GBP: '🇬🇧',
  CAD: '🇨🇦',
  CHF: '🇨🇭',
  MXN: '🇲🇽',
  JPY: '🇯🇵',
};

export function HeaderBar({
  activeModule,
  activeVehicle,
  t,
  language,
  currency,
  onChangeLanguage,
  onChangeCurrency,
  onOpenMobileNav,
  onPrimaryAction,
  primaryActionLabel,
}: HeaderBarProps) {
  const [openMenu, setOpenMenu] = useState<'lang' | 'currency' | null>(null);
  const menusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (menusRef.current && !menusRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const currentLang =
    LANGUAGE_OPTIONS.find((item) => item.code === language) ?? LANGUAGE_OPTIONS[0];
  const currentCurrency = CURRENCY_CATALOG[currency] ?? CURRENCY_CATALOG.BRL;

  return (
    <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Contextual Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm min-w-0 truncate">
          <span className="font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 hidden sm:inline">
            {t.brand}
          </span>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
            {t.nav[activeModule]}
          </span>
          {activeVehicle && (
            <>
              <span className="text-slate-300 dark:text-slate-600 hidden md:inline" aria-hidden="true">
                /
              </span>
              <span className="text-slate-500 dark:text-slate-400 truncate hidden md:inline">
                {activeVehicle.make} {activeVehicle.model}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Top-Right Corner: Language Flags + Currency Selector + Primary Action */}
      <div ref={menusRef} className="flex items-center gap-2 shrink-0">
        {/* Language Flag Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((prev) => (prev === 'lang' ? null : 'lang'))}
            aria-label={t.settings.languageLabel}
            aria-expanded={openMenu === 'lang'}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {currentLang.flag}
            </span>
            <span className="hidden sm:inline">{currentLang.short}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {openMenu === 'lang' && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 z-50">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = opt.code === language;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => {
                      onChangeLanguage(opt.code);
                      setOpenMenu(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-sm leading-none">
                        {opt.flag}
                      </span>
                      <span>{opt.label}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{opt.short}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Currency Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((prev) => (prev === 'currency' ? null : 'currency'))}
            aria-label={t.settings.currencyLabel}
            aria-expanded={openMenu === 'currency'}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0 tabular-nums"
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {CURRENCY_FLAGS[currentCurrency.code]}
            </span>
            <span className="font-mono">{currentCurrency.code}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {openMenu === 'currency' && (
            <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1 z-50">
              {CURRENCY_LIST.map((item) => {
                const active = item.code === currency;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      onChangeCurrency(item.code);
                      setOpenMenu(null);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors tabular-nums ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span aria-hidden="true" className="text-sm leading-none">
                        {CURRENCY_FLAGS[item.code]}
                      </span>
                      <span className="font-mono font-semibold">{item.code}</span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {item.symbol}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">{item.region}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Single Primary Action */}
        <button
          type="button"
          onClick={onPrimaryAction}
          className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{primaryActionLabel}</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>
    </header>
  );
}
