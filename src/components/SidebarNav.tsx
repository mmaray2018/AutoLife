import {
  Activity,
  Bike,
  Car,
  Globe,
  MapPin,
  Moon,
  Plus,
  Sun,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  ModuleId,
  UnitSystem,
  Vehicle,
} from '../types/autolife';
import { formatDistance } from '../utils/autolife';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarNavProps {
  activeModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  vehicles: Vehicle[];
  activeVehicleId: string;
  onSelectVehicle: (id: string) => void;
  onAddVehicle: () => void;
  onRequestDeleteVehicle: (vehicleId: string) => void;
  t: Translations;
  units: UnitSystem;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarNav({
  activeModule,
  onSelectModule,
  vehicles,
  activeVehicleId,
  onSelectVehicle,
  onAddVehicle,
  onRequestDeleteVehicle,
  t,
  units,
  theme,
  onToggleTheme,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const navItems: { id: ModuleId; label: string; icon: typeof Activity }[] = [
    { id: 'settings', label: t.nav.settings, icon: Globe },
    { id: 'health', label: t.nav.health, icon: Activity },
    { id: 'garage', label: t.nav.garage, icon: Car },
    { id: 'ev', label: t.nav.ev, icon: Zap },
    { id: 'network', label: t.nav.network, icon: MapPin },
  ];

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) ?? vehicles[0] ?? null;

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-[264px] select-none">
      {/* Brand Wordmark - clean single-line text element */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
          {t.brand}
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label={t.actions.close}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Vehicle Selector */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <label
          htmlFor="sidebar-vehicle-select"
          className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5"
        >
          {t.nav.garage}
        </label>
        <select
          id="sidebar-vehicle-select"
          disabled={vehicles.length === 0}
          value={activeVehicle?.id ?? ''}
          onChange={(e) => onSelectVehicle(e.target.value)}
          className="w-full px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {vehicles.length === 0 ? (
            <option value="">Nenhum veículo cadastrado</option>
          ) : (
            vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.vehicleType === 'motorcycle' ? `[${t.vehicleTypes.motorcycle}] ` : ''}
                {v.make} {v.model} ({v.year})
              </option>
            ))
          )}
        </select>
        {activeVehicle && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {activeVehicle.vehicleType === 'motorcycle' ? (
              <Bike className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {t.vehicleTypes[activeVehicle.vehicleType ?? 'car']}
              {activeVehicle.vehicleType === 'motorcycle' && activeVehicle.engineDisplacementCc
                ? ` ${activeVehicle.engineDisplacementCc}cc`
                : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t.powertrain[activeVehicle.powertrain]}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {formatDistance(activeVehicle.odometerKm, units)}
            </span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onAddVehicle();
              onCloseMobile();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Adicionar</span>
          </button>
          {activeVehicle && (
            <button
              type="button"
              onClick={() => {
                onRequestDeleteVehicle(activeVehicle.id);
                onCloseMobile();
              }}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0"
              title="Remover veículo e todo o seu histórico"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectModule(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom PWA Install & Theme Toggle */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
        <PWAInstallButton />
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600"
          aria-label={theme === 'dark' ? t.settings.light : t.settings.dark}
        >
          <span>{theme === 'dark' ? t.settings.light : t.settings.dark}</span>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
