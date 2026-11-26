import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  BookOpen,
  CalendarPlus,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Plus,
  Search,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import { CARE_GUIDES } from '../data/seedData';
import {
  MaintenanceItem,
  MaintenanceStatus,
  PowertrainType,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { computeMaintenanceStatus, formatDistance, isDateRecorded } from '../utils/autolife';
import { downloadCalendarEvent } from '../utils/calendar';
import {
  buildMaintenanceWhatsAppText,
  buildPreTripWhatsAppText,
} from '../utils/whatsapp';
import { ResilientImage } from './ResilientImage';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface HealthMaintenanceViewProps {
  vehicle: Vehicle | null;
  items: MaintenanceItem[];
  prefs: UserPreferences;
  t: Translations;
  onOpenLogModal: (item: MaintenanceItem) => void;
  onOpenAddVehicle: () => void;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
}

export function HealthMaintenanceView({
  vehicle,
  items,
  prefs,
  t,
  onOpenLogModal,
  onOpenAddVehicle,
  onUpdatePrefs,
}: HealthMaintenanceViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [guideScope, setGuideScope] = useState<'active' | 'all' | 'car' | 'motorcycle'>('active');
  const [showPreTripModal, setShowPreTripModal] = useState(false);
  const [tripKm, setTripKm] = useState(350);
  const [heavyLoad, setHeavyLoad] = useState(false);
  const [checkedPreTrip, setCheckedPreTrip] = useState<Record<string, boolean>>({});
  const isMoto = vehicle?.vehicleType === 'motorcycle';

  const enrichedItems = useMemo(() => {
    if (!vehicle) return [];
    return items
      .filter((item) => item.vehicleId === vehicle.id)
      .map((item) => {
        const computed = computeMaintenanceStatus(item, vehicle, prefs);
        const localized = t.items[item.titleKey] ?? {
          title: item.titleKey,
          desc: item.descriptionKey,
        };
        return {
          item,
          localized,
          ...computed,
        };
      })
      .sort((a, b) => {
        const order = {
          [MaintenanceStatus.OVERDUE]: 0,
          [MaintenanceStatus.ATTENTION]: 1,
          [MaintenanceStatus.PENDING]: 2,
          [MaintenanceStatus.ON_TRACK]: 3,
        };
        return order[a.status] - order[b.status];
      });
  }, [items, vehicle, prefs, t]);

  const counts = useMemo(() => {
    let onTrack = 0;
    let attention = 0;
    let overdue = 0;
    let pending = 0;
    for (const entry of enrichedItems) {
      if (entry.status === MaintenanceStatus.ON_TRACK) onTrack += 1;
      else if (entry.status === MaintenanceStatus.ATTENTION) attention += 1;
      else if (entry.status === MaintenanceStatus.OVERDUE) overdue += 1;
      else pending += 1;
    }
    return { onTrack, attention, overdue, pending };
  }, [enrichedItems]);

  const nextReminderItem = useMemo(() => {
    const scheduled = enrichedItems.find(
      (entry) => entry.status !== MaintenanceStatus.PENDING && Boolean(entry.projectedDueDate)
    );
    return scheduled ?? null;
  }, [enrichedItems]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = entry.localized.title.toLowerCase().includes(q);
        const matchDesc = entry.localized.desc.toLowerCase().includes(q);
        const matchNotes = (entry.item.notes ?? '').toLowerCase().includes(q);
        return matchTitle || matchDesc || matchNotes;
      }
      return true;
    });
  }, [enrichedItems, statusFilter, searchQuery]);

  const preTripChecklist = useMemo(() => {
    if (!vehicle) return [];
    if (isMoto) {
      const frontPsi = vehicle.tirePressurePsi;
      const rearPsi =
        (vehicle.rearTirePressurePsi ?? vehicle.tirePressurePsi + 4) + (heavyLoad ? 3 : 0);
      const list = [
        {
          id: 'pt-moto-tires',
          label: `Calibrar pneus a frio: ${frontPsi} PSI dianteiro e ${rearPsi} PSI traseiro`,
        },
        {
          id: 'pt-moto-chain',
          label:
            'Conferir folga da corrente (20–30 mm) e lubrificação com a moto desligada no cavalete',
        },
        {
          id: 'pt-moto-brakes',
          label:
            'Testar manete e pedal de freio, conferir farol, luz de freio, setas e retrovisores',
        },
        {
          id: 'pt-moto-docs',
          label: `Validar documento (${
            isDateRecorded(vehicle.documentExpiryDate)
              ? vehicle.documentExpiryDate
              : t.health.notRecorded
          }), capacete/viseira e seguro`,
        },
      ];
      if (vehicle.powertrain === PowertrainType.ELECTRIC) {
        const range = vehicle.estimatedRangeKm ?? 130;
        const stops =
          tripKm > range * 0.8 ? Math.ceil((tripKm - range * 0.8) / (range * 0.65)) : 0;
        list.push({
          id: 'pt-moto-ev',
          label:
            stops > 0
              ? `Viagem de ${formatDistance(tripKm, prefs.units)}: programar ${stops} recarga(s) no percurso`
              : `Autonomia elétrica estimada cobre ${formatDistance(tripKm, prefs.units)} com folga`,
        });
      } else {
        list.push({
          id: 'pt-moto-oil',
          label: 'Checar óleo com a moto reta na vertical em piso plano (nunca no descanso lateral)',
        });
      }
      return list;
    }

    const adjustedPsi = vehicle.tirePressurePsi + (heavyLoad ? 3 : 0);
    const list = [
      {
        id: 'pt-tires',
        label: `Calibrar pneus a frio em ${adjustedPsi} PSI (incluindo estepe)`,
      },
      {
        id: 'pt-coolant',
        label:
          'Conferir visualmente líquido de arrefecimento entre MIN e MAX com o motor frio (nunca abrir a tampa quente)',
      },
      {
        id: 'pt-brakes',
        label: 'Testar resposta do pedal de freio e verificar faróis, setas e limpadores',
      },
      {
        id: 'pt-docs',
        label: `Validar licenciamento (${
          isDateRecorded(vehicle.documentExpiryDate)
            ? vehicle.documentExpiryDate
            : t.health.notRecorded
        }) e itens obrigatórios no porta-malas`,
      },
    ];

    if (vehicle.powertrain === PowertrainType.ELECTRIC) {
      const range = vehicle.estimatedRangeKm ?? 390;
      const stops = tripKm > range * 0.8 ? Math.ceil((tripKm - range * 0.8) / (range * 0.65)) : 0;
      list.push({
        id: 'pt-ev',
        label:
          stops > 0
            ? `Viagem de ${formatDistance(tripKm, prefs.units)}: programar ${stops} parada(s) de recarga rápida no trajeto`
            : `Autonomia estimada cobre ${formatDistance(tripKm, prefs.units)} com margem de segurança`,
      });
    } else {
      list.push({
        id: 'pt-oil',
        label: 'Conferir nível do óleo na vareta em piso plano antes de pegar a estrada',
      });
    }
    return list;
  }, [vehicle, isMoto, heavyLoad, tripKm, prefs.units]);

  const preTripCompletedCount = preTripChecklist.filter((c) => checkedPreTrip[c.id]).length;

  const visibleGuides = useMemo(() => {
    const activeType = vehicle?.vehicleType ?? 'car';
    return CARE_GUIDES.filter((g) => {
      const gType = g.vehicleType ?? 'all';
      if (guideScope === 'all') return true;
      if (guideScope === 'active') return gType === 'all' || gType === activeType;
      return gType === 'all' || gType === guideScope;
    });
  }, [guideScope, vehicle?.vehicleType]);

  if (!vehicle) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {t.health.title}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
            {t.health.subtitle}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <Car className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Nenhum veículo cadastrado
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Cadastre seu primeiro carro ou motocicleta para acompanhar os alertas preventivos e o histórico de saúde.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddVehicle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.addVehicle}</span>
          </button>
        </div>
      </div>
    );
  }

  const profileLabel =
    vehicle.drivingProfile === 'urban_severe'
      ? 'Uso Urbano Severo (-35% intervalo)'
      : vehicle.drivingProfile === 'highway'
      ? 'Uso Rodoviário (+15% intervalo)'
      : 'Uso Misto';

  const renderStatusIndicator = (status: MaintenanceStatus) => {
    if (status === MaintenanceStatus.PENDING) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{t.status[status]}</span>
        </span>
      );
    }
    if (status === MaintenanceStatus.OVERDUE) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>{t.status[status]}</span>
        </span>
      );
    }
    if (status === MaintenanceStatus.ATTENTION) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{t.status[status]}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>{t.status[status]}</span>
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {t.health.title}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
            {t.health.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCheckedPreTrip({});
              setShowPreTripModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Inspeção Pré-Viagem 60s</span>
          </button>
        </div>
      </div>

      {/* Predictive Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
        <div className="flex flex-wrap items-center gap-2">
          {isMoto ? (
            <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          ) : (
            <Car className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          )}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {t.vehicleTypes[vehicle.vehicleType ?? 'car']}
            {isMoto && vehicle.engineDisplacementCc ? ` ${vehicle.engineDisplacementCc}cc` : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Motor Preditivo:
            </strong>{' '}
            {profileLabel}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">{vehicle.weeklyKm ?? 250} km/semana</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">
            {isMoto
              ? `${vehicle.tirePressurePsi}/${vehicle.rearTirePressurePsi ?? vehicle.tirePressurePsi + 4} PSI`
              : `${vehicle.tirePressurePsi} PSI`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{t.health.manualReminder}</span>
        </div>
      </div>

      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.health.onTrackCount}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {counts.onTrack}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t.status[MaintenanceStatus.ON_TRACK]}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.health.attentionCount}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {counts.attention}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t.status[MaintenanceStatus.ATTENTION]}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.health.overdueCount}
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-red-600 dark:text-red-400 tabular-nums">
              {counts.overdue}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t.status[MaintenanceStatus.OVERDUE]}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.health.nextDue}
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {nextReminderItem ? nextReminderItem.localized.title : '—'}
            </span>
            {nextReminderItem && (
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                {nextReminderItem.projectedDueDate}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Checklist Toolbar & Table */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
            {(
              [
                { id: 'all', label: t.health.allFilter },
                { id: MaintenanceStatus.OVERDUE, label: t.status[MaintenanceStatus.OVERDUE] },
                { id: MaintenanceStatus.ATTENTION, label: t.status[MaintenanceStatus.ATTENTION] },
                { id: MaintenanceStatus.PENDING, label: t.status[MaintenanceStatus.PENDING] },
                { id: MaintenanceStatus.ON_TRACK, label: t.status[MaintenanceStatus.ON_TRACK] },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.health.searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600"
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            {t.health.searchPlaceholder}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredItems.map(
              ({
                item,
                localized,
                status,
                daysElapsed,
                effectiveIntervalDays,
                effectiveIntervalKm,
                projectedDueDate,
              }) => (
                <div
                  key={item.id}
                  className="p-4 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {localized.title}
                      </h2>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                        ·
                      </span>
                      {renderStatusIndicator(status)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {localized.desc}
                    </p>
                    {localized.safety && (
                      <div className="mt-2 inline-flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <span>{localized.safety}</span>
                      </div>
                    )}
                    <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span>
                        {t.health.lastCheck}:{' '}
                        <strong className="font-medium text-slate-700 dark:text-slate-300">
                          {status === MaintenanceStatus.PENDING || !isDateRecorded(item.lastCheckedDate)
                            ? t.health.notRecorded
                            : daysElapsed === 0
                            ? t.health.today
                            : `${daysElapsed} ${t.health.daysAgo}`}
                        </strong>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t.health.dueEvery}: {effectiveIntervalDays}d /{' '}
                        {formatDistance(effectiveIntervalKm, prefs.units)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        Previsão:{' '}
                        <strong className="font-mono text-slate-700 dark:text-slate-300">
                          {projectedDueDate || t.health.notRecorded}
                        </strong>
                      </span>
                      {item.notes && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-600 dark:text-slate-300">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <WhatsAppConnectButton
                      whatsappNumber={prefs.whatsappNumber}
                      language={prefs.language}
                      compact
                      label="WhatsApp"
                      title="Enviar serviço para o WhatsApp cadastrado"
                      message={buildMaintenanceWhatsAppText({
                        vehicle,
                        serviceTitle: localized.title,
                        statusLabel: t.status[status],
                        projectedDueDate,
                        effectiveIntervalDays,
                        effectiveIntervalKm,
                        units: prefs.units,
                        notes: item.notes,
                      })}
                      onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                    />
                    {projectedDueDate && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadCalendarEvent({
                            title: `${t.brand}: ${localized.title} (${vehicle.make} ${vehicle.model})`,
                            description: localized.desc,
                            dateIso: projectedDueDate,
                            filename: `autolife-${item.category}.ics`,
                          })
                        }
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                        title="Adicionar previsão ao Calendário (.ics)"
                        aria-label="Adicionar ao Calendário"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenLogModal(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <Wrench className="w-3.5 h-3.5 shrink-0" />
                      <span>{t.actions.logCheck}</span>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* Illustrated Care Guides */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              {t.health.guidesTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.health.guidesSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit shrink-0">
            {(
              [
                { id: 'active', label: `Para este ${t.vehicleTypes[vehicle.vehicleType ?? 'car']}` },
                { id: 'car', label: t.vehicleTypes.car },
                { id: 'motorcycle', label: t.vehicleTypes.motorcycle },
                { id: 'all', label: t.health.allFilter },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGuideScope(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  guideScope === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {visibleGuides.map((guide) => {
            const localizedGuide = t.guides[guide.titleKey];
            if (!localizedGuide) return null;
            return (
              <article
                key={guide.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <ResilientImage
                    src={guide.imageSrc}
                    alt={localizedGuide.title}
                    fallbackTitle={localizedGuide.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                      {localizedGuide.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {localizedGuide.subtitle}
                    </p>
                    <ol className="mt-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      {localizedGuide.steps.map((step, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 shrink-0 tabular-nums">
                            0{index + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{localizedGuide.warning}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Pre-Trip 60-Second Inspection Modal */}
      {showPreTripModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Inspeção Pré-Viagem em 60 Segundos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {vehicle.make} {vehicle.model} · {t.powertrain[vehicle.powertrain]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreTripModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Distância da viagem (km)
                </label>
                <input
                  type="number"
                  min={20}
                  max={5000}
                  value={tripKm}
                  onChange={(e) => setTripKm(Math.max(20, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Lotação / Carga
                </label>
                <select
                  value={heavyLoad ? 'heavy' : 'normal'}
                  onChange={(e) => setHeavyLoad(e.target.value === 'heavy')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="normal">{isMoto ? 'Somente piloto' : 'Carga normal'}</option>
                  <option value="heavy">
                    {isMoto
                      ? 'Garupa / Baú carregado (+3 PSI traseiro)'
                      : 'Carro cheio / bagagem (+3 PSI)'}
                  </option>
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {preTripChecklist.map((entry) => {
                const checked = Boolean(checkedPreTrip[entry.id]);
                return (
                  <label
                    key={entry.id}
                    className="py-3 flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-slate-800 dark:text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setCheckedPreTrip((prev) => ({
                          ...prev,
                          [entry.id]: !prev[entry.id],
                        }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className={checked ? 'line-through text-slate-400' : ''}>
                      {entry.label}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs tabular-nums">
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {preTripCompletedCount} / {preTripChecklist.length} verificados
              </span>
              <div className="flex items-center gap-2">
                <WhatsAppConnectButton
                  whatsappNumber={prefs.whatsappNumber}
                  language={prefs.language}
                  label="Enviar no WhatsApp"
                  message={buildPreTripWhatsAppText({
                    vehicle,
                    tripKm,
                    checklistLabels: preTripChecklist.map((c) => c.label),
                    units: prefs.units,
                  })}
                  onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                />
                <button
                  type="button"
                  onClick={() => setShowPreTripModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-medium"
                >
                  {preTripCompletedCount === preTripChecklist.length
                    ? 'Pronto para Viajar'
                    : t.actions.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
