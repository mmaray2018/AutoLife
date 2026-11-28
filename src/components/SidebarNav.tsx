import {
  Activity,
  Bike,
  Car,
  Globe,
  MapPin,
  Moon,
  Plus,
  ShieldCheck,
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
  VehicleAttachment,
} from '../types/autolife';
import { formatDistance } from '../utils/autolife';
import { resolveVehicleColorStyle } from '../utils/vehicleVisualResolver';
import { PWAInstallButton } from './PWAInstallButton';
import { VehicleVisual } from './VehicleVisual';

interface SidebarNavProps {
  activeModule: ModuleId;
  onSelectModule: (module: ModuleId) => void;
  vehicles: Vehicle[];
  activeVehicleId: string;
  attachments?: VehicleAttachment[];
  onSelectVehicle: (id: string) => void;
  onAddVehicle: () => void;
  onRequestDeleteVehicle: (vehicleId: string) => void;
  t: Translations;
  units: UnitSystem;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  isAdmin?: boolean;
}

export function SidebarNav({
  activeModule,
  onSelectModule,
  vehicles,
  activeVehicleId,
  attachments = [],
  onSelectVehicle,
  onAddVehicle,
  onRequestDeleteVehicle,
  t,
  units,
  theme,
  onToggleTheme,
  mobileOpen,
  onCloseMobile,
  isAdmin = false,
}: SidebarNavProps) {
  const navItems: { id: ModuleId; label: string; icon: typeof Activity }[] = [
    { id: 'settings', label: t.nav.settings, icon: Globe },
    { id: 'health', label: t.nav.health, icon: Activity },
    { id: 'garage', label: t.nav.garage, icon: Car },
    { id: 'ev', label: t.nav.ev, icon: Zap },
    { id: 'network', label: t.nav.network, icon: MapPin },
    ...(isAdmin ? [{ id: 'admin' as ModuleId, label: t.nav.admin, icon: ShieldCheck }] : []),
  ];

  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) ?? vehicles[0] ?? null;

  const content = (
    <div className="flex flex-col h-full bg-white/95 dark:bg-[#091120]/95 backdrop-blur-md border-r border-slate-200 dark:border-white/10 w-[272px] select-none">
      {/* Brand Wordmark */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-sky-400 shrink-0" aria-hidden="true" />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap truncate">
            {t.brand}
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-500"
          aria-label={t.actions.close}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Active Vehicle Selector + Clean Thumbnail */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-white/10 space-y-3">
        <div>
          <label
            htmlFor="sidebar-vehicle-select"
            className="block text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5"
          >
            {t.nav.garage}
          </label>
          <select
            id="sidebar-vehicle-select"
            disabled={vehicles.length === 0}
            value={activeVehicle?.id ?? ''}
            onChange={(e) => onSelectVehicle(e.target.value)}
            className="w-full px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#0c1629] text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-60"
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
        </div>

        {activeVehicle && (
          <div className="rounded-xl overflow-hidden border border-slate-200/90 dark:border-sky-400/20 bg-slate-50 dark:bg-[#0c1629]/90">
            <div className="relative h-24 w-full overflow-hidden bg-slate-900">
              <VehicleVisual
                vehicle={activeVehicle}
                attachments={attachments}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060b16]/90 via-[#060b16]/25 to-transparent" />
              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">
                    {activeVehicle.make} {activeVehicle.model}
                  </div>
                  <div className="text-[10px] font-mono text-sky-300 truncate flex items-center gap-1.5">
                    <span>
                      {activeVehicle.year} · {activeVehicle.plate}
                    </span>
                    {activeVehicle.color && (
                      <span className="inline-flex items-center gap-1 text-slate-200">
                        <span
                          className="w-2 h-2 rounded-full border border-white/50 shrink-0"
                          style={{
                            backgroundColor: resolveVehicleColorStyle(activeVehicle.color)
                              .primaryHex,
                          }}
                        />
                        <span>{activeVehicle.color}</span>
                      </span>
                    )}
                  </div>
                </div>
                {activeVehicle.vehicleType === 'motorcycle' ? (
                  <Bike className="w-4 h-4 text-sky-400 shrink-0" />
                ) : (
                  <Car className="w-4 h-4 text-sky-400 shrink-0" />
                )}
              </div>
            </div>

            <div className="px-2.5 py-2 flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
              <span className="truncate">
                {t.powertrain[activeVehicle.powertrain]}
                {activeVehicle.vehicleType === 'motorcycle' && activeVehicle.engineDisplacementCc
                  ? ` · ${activeVehicle.engineDisplacementCc}cc`
                  : ''}
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-sky-300 shrink-0">
                {formatDistance(activeVehicle.odometerKm, units)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onAddVehicle();
              onCloseMobile();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0c1629] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101d36] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Adicionar</span>
          </button>
          {activeVehicle && (
            <button
              type="button"
              onClick={() => {
                onRequestDeleteVehicle(activeVehicle.id);
                onCloseMobile();
              }}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-medium rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0"
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
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-500 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-sky-500/15 dark:text-sky-300 dark:border dark:border-sky-400/40'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom PWA Install & Theme Toggle */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 space-y-2">
        <PWAInstallButton />
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-sky-500"
          aria-label={theme === 'dark' ? t.settings.light : t.settings.dark}
        >
          <span>{theme === 'dark' ? t.settings.light : t.settings.dark}</span>
          {theme === 'dark' ? <Sun className="w-4 h-4 text-sky-400" /> : <Moon className="w-4 h-4" />}
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
            className="fixed inset-0 bg-[#040812]/75 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
