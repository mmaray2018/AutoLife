import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CalendarPlus,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  FileDown,
  FileText,
  Gauge,
  History,
  Plus,
  Search,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import { CARE_GUIDES } from '../data/seedData';
import {
  ChargingSession,
  MaintenanceCategory,
  MaintenanceItem,
  MaintenanceStatus,
  PowertrainType,
  ServiceLog,
  UserPreferences,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import {
  computeMaintenanceStatus,
  daysBetween,
  formatDistance,
  isDateRecorded,
  todayIso,
} from '../utils/autolife';
import { downloadCalendarEvent } from '../utils/calendar';
import {
  buildMaintenanceWhatsAppText,
  buildPreTripWhatsAppText,
} from '../utils/whatsapp';
import { ResilientImage } from './ResilientImage';
import { VehicleFinalReportTab } from './VehicleFinalReportTab';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface HealthMaintenanceViewProps {
  vehicle: Vehicle | null;
  items: MaintenanceItem[];
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  attachmentsLoading: boolean;
  prefs: UserPreferences;
  t: Translations;
  cloudUserId: string | null;
  cloudUserEmail?: string | null;
  onOpenLogModal: (item: MaintenanceItem) => void;
  onOpenAddVehicle: () => void;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  onAttachmentCreated: (attachment: VehicleAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  onOpenCloudSettings: () => void;
}

export function HealthMaintenanceView({
  vehicle,
  items,
  logs,
  chargingSessions,
  attachments,
  attachmentsLoading,
  prefs,
  t,
  cloudUserId,
  cloudUserEmail,
  onOpenLogModal,
  onOpenAddVehicle,
  onUpdatePrefs,
  onAttachmentCreated,
  onAttachmentDeleted,
  onOpenCloudSettings,
}: HealthMaintenanceViewProps) {
  const [activeSection, setActiveSection] = useState<'checklist' | 'guides' | 'report'>('checklist');
  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<
    Record<'safety' | 'motor' | 'documents', boolean>
  >({
    safety: false,
    motor: false,
    documents: false,
  });
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [guideScope, setGuideScope] = useState<'active' | 'all' | 'car' | 'motorcycle'>('active');
  const [showPreTripModal, setShowPreTripModal] = useState(false);
  const [tripKm, setTripKm] = useState(350);
  const [heavyLoad, setHeavyLoad] = useState(false);
  const [checkedPreTrip, setCheckedPreTrip] = useState<Record<string, boolean>>({});
  const isMoto = vehicle?.vehicleType === 'motorcycle';

  const enrichedItems = useMemo(() => {
    if (!vehicle) return [];
    const today = todayIso();
    const vehicleLogs = logs
      .filter((log) => log.vehicleId === vehicle.id)
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.odometerKm - a.odometerKm;
      });

    return items
      .filter((item) => item.vehicleId === vehicle.id)
      .map((item) => {
        const computed = computeMaintenanceStatus(item, vehicle, prefs);
        const localized = t.items[item.titleKey] ?? {
          title: item.titleKey,
          desc: item.descriptionKey,
        };

        const itemLogs = vehicleLogs.filter((log) => log.category === item.category);
        const historyLogsCount = itemLogs.length;
        const latestServiceLog = itemLogs[0] ?? null;

        const isDoc = item.category === MaintenanceCategory.DOCUMENTATION;
        const hasRecordedCheck = isDateRecorded(item.lastCheckedDate);
        const actualDaysRemaining =
          isDoc && computed.projectedDueDate
            ? daysBetween(today, computed.projectedDueDate)
            : computed.daysRemaining;

        let dayRatio = 0;
        let kmRatio = 0;

        if (isDoc) {
          if (computed.projectedDueDate) {
            const docWindowDays = Math.max(computed.effectiveIntervalDays, 365);
            const docElapsedDays = hasRecordedCheck
              ? computed.daysElapsed
              : Math.max(0, docWindowDays - actualDaysRemaining);
            dayRatio = docElapsedDays / Math.max(1, hasRecordedCheck ? computed.effectiveIntervalDays : docWindowDays);
          } else if (hasRecordedCheck) {
            dayRatio = computed.daysElapsed / Math.max(1, computed.effectiveIntervalDays);
          }
        } else if (computed.status !== MaintenanceStatus.PENDING) {
          dayRatio = computed.daysElapsed / Math.max(1, computed.effectiveIntervalDays);
          kmRatio = computed.kmElapsed / Math.max(1, computed.effectiveIntervalKm);
        }

        const maxRatio = Math.max(dayRatio, kmRatio);
        const hasProgressBaseline =
          computed.status !== MaintenanceStatus.PENDING || Boolean(computed.projectedDueDate);
        const usagePercent = hasProgressBaseline ? Math.max(0, Math.round(maxRatio * 100)) : 0;
        const barPercent = hasProgressBaseline
          ? Math.min(100, Math.max(usagePercent > 0 ? 4 : 0, usagePercent))
          : 0;
        const kmPercent =
          !isDoc && computed.status !== MaintenanceStatus.PENDING
            ? Math.max(0, Math.round(kmRatio * 100))
            : 0;
        const kmBarPercent =
          !isDoc && computed.status !== MaintenanceStatus.PENDING
            ? Math.min(100, Math.max(computed.kmElapsed > 0 ? 4 : 0, kmPercent))
            : 0;
        const dayPercent = hasProgressBaseline ? Math.max(0, Math.round(dayRatio * 100)) : 0;
        const dayBarPercent = hasProgressBaseline
          ? Math.min(100, Math.max(dayPercent > 0 ? 4 : 0, dayPercent))
          : 0;

        let triggerDriver: 'km' | 'date' | 'both' | 'pending' = 'pending';
        if (!hasProgressBaseline) {
          triggerDriver = 'pending';
        } else if (isDoc) {
          triggerDriver = 'date';
        } else if (Math.abs(kmRatio - dayRatio) <= 0.08 && maxRatio > 0) {
          triggerDriver = 'both';
        } else if (kmRatio > dayRatio) {
          triggerDriver = 'km';
        } else {
          triggerDriver = 'date';
        }

        return {
          item,
          localized,
          ...computed,
          actualDaysRemaining,
          historyLogsCount,
          latestServiceLog,
          usagePercent,
          barPercent,
          kmPercent,
          kmBarPercent,
          dayPercent,
          dayBarPercent,
          triggerDriver,
        };
      })
      .sort((a, b) => {
        const order = {
          [MaintenanceStatus.OVERDUE]: 0,
          [MaintenanceStatus.ATTENTION]: 1,
          [MaintenanceStatus.PENDING]: 2,
          [MaintenanceStatus.ON_TRACK]: 3,
        };
        if (order[a.status] !== order[b.status]) {
          return order[a.status] - order[b.status];
        }
        return b.usagePercent - a.usagePercent;
      });
  }, [items, logs, vehicle, prefs, t]);

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

  const priorityDashboard = useMemo(() => {
    const urgent = enrichedItems.filter(
      (entry) =>
        entry.status === MaintenanceStatus.OVERDUE ||
        entry.status === MaintenanceStatus.ATTENTION
    );

    if (urgent.length > 0) {
      return {
        items: urgent.slice(0, 4),
        totalUrgent: urgent.length,
        hasUrgent: true,
      };
    }

    const upcoming = [...enrichedItems]
      .sort((a, b) => {
        const aScheduled = a.status !== MaintenanceStatus.PENDING || Boolean(a.projectedDueDate);
        const bScheduled = b.status !== MaintenanceStatus.PENDING || Boolean(b.projectedDueDate);
        if (aScheduled !== bScheduled) return aScheduled ? -1 : 1;
        return b.usagePercent - a.usagePercent;
      })
      .slice(0, 3);

    return {
      items: upcoming,
      totalUrgent: 0,
      hasUrgent: false,
    };
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

  const categoryGroups = useMemo(() => {
    const resolveGroupKey = (category: MaintenanceCategory): 'safety' | 'motor' | 'documents' => {
      if (
        category === MaintenanceCategory.BRAKES ||
        category === MaintenanceCategory.TIRES ||
        category === MaintenanceCategory.SUSPENSION
      ) {
        return 'safety';
      }
      if (category === MaintenanceCategory.DOCUMENTATION) {
        return 'documents';
      }
      return 'motor';
    };

    const definitions: Array<{
      id: 'safety' | 'motor' | 'documents';
      title: string;
      subtitle: string;
    }> = [
      {
        id: 'safety',
        title: 'Segurança',
        subtitle: 'Freios, calibragem de pneus, desgaste e suspensão',
      },
      {
        id: 'motor',
        title: 'Motor & Sistemas',
        subtitle: 'Óleo, arrefecimento, bateria, transmissão e revisões periódicas',
      },
      {
        id: 'documents',
        title: 'Documentos & Prazos',
        subtitle: 'Licenciamento, vistoria obrigatória e vencimento do seguro',
      },
    ];

    return definitions
      .map((def) => {
        const entries = filteredItems.filter((entry) => resolveGroupKey(entry.item.category) === def.id);
        const overdue = entries.filter((e) => e.status === MaintenanceStatus.OVERDUE).length;
        const attention = entries.filter((e) => e.status === MaintenanceStatus.ATTENTION).length;
        const onTrack = entries.filter((e) => e.status === MaintenanceStatus.ON_TRACK).length;
        return {
          ...def,
          entries,
          overdue,
          attention,
          onTrack,
        };
      })
      .filter((group) => group.entries.length > 0);
  }, [filteredItems]);

  const allExpanded =
    categoryGroups.length > 0 && categoryGroups.every((g) => expandedCategories[g.id]);

  const toggleAllCategories = () => {
    const nextValue = !allExpanded;
    setExpandedCategories({
      safety: nextValue,
      motor: nextValue,
      documents: nextValue,
    });
  };

  // By default, expand only categories with overdue/attention items so the view stays calm and focused
  const vehicleIdForReset = vehicle?.id ?? '';
  useEffect(() => {
    const hasUrgent = (id: 'safety' | 'motor' | 'documents') => {
      const grp = categoryGroups.find((g) => g.id === id);
      return Boolean(grp && (grp.overdue > 0 || grp.attention > 0));
    };
    setExpandedCategories({
      safety: hasUrgent('safety'),
      motor: hasUrgent('motor'),
      documents: hasUrgent('documents'),
    });
    setExpandedRowIds({});
  }, [vehicleIdForReset]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="space-y-6">
      {/* Page Title, Section Switcher & Pre-Trip Action */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {t.health.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 tabular-nums">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {t.vehicleTypes[vehicle.vehicleType ?? 'car']}
              {isMoto && vehicle.engineDisplacementCc ? ` ${vehicle.engineDisplacementCc}cc` : ''}
            </span>
            <span aria-hidden="true">·</span>
            <span>{profileLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{vehicle.weeklyKm ?? 250} km/sem</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {isMoto
                ? `${vehicle.tirePressurePsi}/${vehicle.rearTirePressurePsi ?? vehicle.tirePressurePsi + 4} PSI`
                : `${vehicle.tirePressurePsi} PSI`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveSection('checklist')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'checklist'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Checklist &amp; Lembretes
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('guides')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'guides'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guias Ilustrados</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('report')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'report'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Relatório Final</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setCheckedPreTrip({});
              setShowPreTripModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Pré-Viagem 60s</span>
          </button>
        </div>
      </div>

      {activeSection === 'checklist' && (
        <>
          {/* Compact 4-Metric Hairline Summary Strip */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl grid grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 tabular-nums">
            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.health.onTrackCount}
              </span>
              <span className="font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {counts.onTrack}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.health.attentionCount}
              </span>
              <span className="font-mono text-xl font-semibold text-amber-600 dark:text-amber-400">
                {counts.attention}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.health.overdueCount}
              </span>
              <span className="font-mono text-xl font-semibold text-red-600 dark:text-red-400">
                {counts.overdue}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {t.health.nextDue}
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {nextReminderItem ? nextReminderItem.localized.title : 'Sem pendências'}
                </div>
              </div>
              {nextReminderItem && (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                  {nextReminderItem.projectedDueDate}
                </span>
              )}
            </div>
          </div>

          {/* Próximos Passos: High-Priority Maintenance Dashboard */}
          {priorityDashboard.items.length > 0 && (
            <section className="space-y-3" aria-label="Próximos passos de manutenção">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Próximos Passos
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {priorityDashboard.hasUrgent
                      ? 'Lembretes críticos por data ou quilometragem priorizados pelo histórico de uso'
                      : 'Sem vencimentos críticos no momento — próximos itens preventivos pelo uso acumulado'}
                  </p>
                </div>

                <div className="flex items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                  {priorityDashboard.hasUrgent ? (
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      Exibindo {priorityDashboard.items.length} de {priorityDashboard.totalUrgent}{' '}
                      prioridade{priorityDashboard.totalUrgent > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Frota sob controle</span>
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-2 ${
                  priorityDashboard.items.length >= 3 ? 'xl:grid-cols-3' : ''
                } gap-4`}
              >
                {priorityDashboard.items.map((entry) => {
                  const {
                    item,
                    localized,
                    status,
                    actualDaysRemaining,
                    kmRemaining,
                    kmElapsed,
                    daysElapsed,
                    effectiveIntervalDays,
                    effectiveIntervalKm,
                    projectedDueDate,
                    usagePercent,
                    barPercent,
                    triggerDriver,
                    historyLogsCount,
                    latestServiceLog,
                  } = entry;
                  const isDoc = item.category === MaintenanceCategory.DOCUMENTATION;
                  const borderTone =
                    status === MaintenanceStatus.OVERDUE
                      ? 'border-red-200 dark:border-red-900/60'
                      : status === MaintenanceStatus.ATTENTION
                      ? 'border-amber-200 dark:border-amber-900/60'
                      : 'border-slate-200 dark:border-slate-800';
                  const progressFillTone =
                    status === MaintenanceStatus.OVERDUE
                      ? 'bg-red-600 dark:bg-red-500'
                      : status === MaintenanceStatus.ATTENTION
                      ? 'bg-amber-500 dark:bg-amber-400'
                      : status === MaintenanceStatus.ON_TRACK
                      ? 'bg-emerald-600 dark:bg-emerald-500'
                      : 'bg-slate-300 dark:bg-slate-700';

                  const driverLabel =
                    triggerDriver === 'km'
                      ? status === MaintenanceStatus.OVERDUE
                        ? 'Crítico por KM'
                        : 'Alerta por KM'
                      : triggerDriver === 'date'
                      ? status === MaintenanceStatus.OVERDUE
                        ? 'Crítico por Data'
                        : 'Alerta por Data'
                      : triggerDriver === 'both'
                      ? 'Por Data e KM'
                      : 'Aguardando 1º registro';

                  const deadlineSummary =
                    status === MaintenanceStatus.PENDING && !projectedDueDate
                      ? 'Registre a primeira checagem para iniciar o acompanhamento'
                      : status === MaintenanceStatus.OVERDUE
                      ? triggerDriver === 'km' && kmRemaining < 0
                        ? `Excedido em ${formatDistance(Math.abs(kmRemaining), prefs.units)}${
                            projectedDueDate ? ` · Prev. ${projectedDueDate}` : ''
                          }`
                        : actualDaysRemaining < 0
                        ? `Vencido há ${Math.abs(actualDaysRemaining)}d${
                            projectedDueDate ? ` · ${projectedDueDate}` : ''
                          }`
                        : `Prazo excedido · ${projectedDueDate || 'Ação imediata'}`
                      : isDoc
                      ? `Vence em ${Math.max(0, actualDaysRemaining)}d · ${projectedDueDate}`
                      : `Vence em ${Math.max(0, actualDaysRemaining)}d · ${projectedDueDate} · Restam ${formatDistance(
                          Math.max(0, kmRemaining),
                          prefs.units
                        )}`;

                  return (
                    <article
                      key={`priority-${item.id}`}
                      className={`bg-white dark:bg-slate-900 border ${borderTone} rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-4`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {triggerDriver === 'km' ? (
                                <Gauge className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                              ) : triggerDriver === 'pending' ? (
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              ) : (
                                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              )}
                              <span>{driverLabel}</span>
                              {historyLogsCount > 0 && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    {historyLogsCount} reg.
                                  </span>
                                </>
                              )}
                            </div>
                            <h3 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                              {localized.title}
                            </h3>
                          </div>

                          {renderStatusIndicator(status)}
                        </div>

                        <p className="text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200">
                          {deadlineSummary}
                        </p>

                        {/* Visual Progress Bar Based on Usage History */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                            <span className="text-slate-500 dark:text-slate-400">
                              Uso do ciclo
                            </span>
                            <span
                              className={`font-mono font-semibold ${
                                status === MaintenanceStatus.OVERDUE
                                  ? 'text-red-600 dark:text-red-400'
                                  : status === MaintenanceStatus.ATTENTION
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {usagePercent}%
                            </span>
                          </div>
                          <div
                            className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={Math.min(100, usagePercent)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${localized.title}: ${usagePercent}% do ciclo`}
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${progressFillTone}`}
                              style={{ width: `${barPercent}%` }}
                            />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {isDoc ? (
                              <span>
                                {projectedDueDate ? `Prazo ${projectedDueDate}` : 'Sem validade'}
                              </span>
                            ) : (
                              <span>
                                {formatDistance(kmElapsed, prefs.units)} /{' '}
                                {formatDistance(effectiveIntervalKm, prefs.units)}
                              </span>
                            )}
                            <span>
                              {isDoc
                                ? latestServiceLog
                                  ? `Últ. ${latestServiceLog.date}`
                                  : 'Sem renovação salva'
                                : `${daysElapsed}/${effectiveIntervalDays}d`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenLogModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
                        >
                          <Wrench className="w-3.5 h-3.5 shrink-0" />
                          <span>Registrar agora</span>
                        </button>

                        <div className="flex items-center gap-1.5 shrink-0">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                              title="Adicionar previsão ao Calendário (.ics)"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                              <span>Agenda</span>
                            </button>
                          )}
                          <WhatsAppConnectButton
                            whatsappNumber={prefs.whatsappNumber}
                            language={prefs.language}
                            compact
                            label="WhatsApp"
                            title="Enviar alerta para o WhatsApp cadastrado"
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
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* Checklist Filter Bar + Expandable Category Cards */}
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 sm:px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
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
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      statusFilter === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.health.searchPlaceholder}
                    className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-blue-600"
                  />
                </div>

                {categoryGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllCategories}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    {allExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Recolher todas</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Expandir todas</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {categoryGroups.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Nenhum item encontrado para este filtro ou busca.
                </p>
                {(statusFilter !== 'all' || searchQuery.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {categoryGroups.map((group) => {
                  const forceExpand = Boolean(searchQuery.trim()) || statusFilter !== 'all';
                  const isExpanded = forceExpand || Boolean(expandedCategories[group.id]);
                  const CategoryIcon =
                    group.id === 'safety'
                      ? ShieldAlert
                      : group.id === 'documents'
                      ? FileText
                      : Wrench;
                  const iconAccentClass =
                    group.id === 'safety'
                      ? 'text-amber-600 dark:text-amber-400'
                      : group.id === 'documents'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-blue-600 dark:text-blue-400';

                  return (
                    <section
                      key={group.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() =>
                          setExpandedCategories((prev) => ({
                            ...prev,
                            [group.id]: !prev[group.id],
                          }))
                        }
                        className="w-full px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon className={`w-4 h-4 shrink-0 ${iconAccentClass}`} />
                          <div className="min-w-0">
                            <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100">
                              {group.title}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {group.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-7 sm:pl-0 tabular-nums">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                              {group.entries.length}{' '}
                              {group.entries.length === 1 ? 'item' : 'itens'}
                            </span>
                            {group.overdue > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {group.overdue} vencido{group.overdue > 1 ? 's' : ''}
                                </span>
                              </>
                            )}
                            {group.attention > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {group.attention} atenção
                                </span>
                              </>
                            )}
                            {group.overdue === 0 && group.attention === 0 && group.onTrack > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                  {group.onTrack} em dia
                                </span>
                              </>
                            )}
                          </div>

                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <span>{isExpanded ? 'Ocultar' : 'Abrir'}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                          {group.entries.map(
                            ({
                              item,
                              localized,
                              status,
                              daysElapsed,
                              kmElapsed,
                              effectiveIntervalDays,
                              effectiveIntervalKm,
                              projectedDueDate,
                              usagePercent,
                              barPercent,
                              kmPercent,
                              kmBarPercent,
                              dayPercent,
                              dayBarPercent,
                              triggerDriver,
                              historyLogsCount,
                              latestServiceLog,
                            }) => {
                              const rowOpen = Boolean(expandedRowIds[item.id]);
                              const isDoc = item.category === MaintenanceCategory.DOCUMENTATION;
                              const rowBarTone =
                                status === MaintenanceStatus.OVERDUE
                                  ? 'bg-red-600 dark:bg-red-500'
                                  : status === MaintenanceStatus.ATTENTION
                                  ? 'bg-amber-500 dark:bg-amber-400'
                                  : status === MaintenanceStatus.ON_TRACK
                                  ? 'bg-emerald-600 dark:bg-emerald-500'
                                  : 'bg-slate-300 dark:bg-slate-700';

                              return (
                                <div
                                  key={item.id}
                                  className="px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors space-y-3"
                                >
                                  {/* Slim Scannable Row + Visual Usage Progress Bar */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1 space-y-2">
                                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs tabular-nums">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                          {localized.title}
                                        </h3>
                                        <span
                                          className="text-slate-300 dark:text-slate-700"
                                          aria-hidden="true"
                                        >
                                          ·
                                        </span>
                                        {renderStatusIndicator(status)}
                                        <span
                                          className="text-slate-300 dark:text-slate-700"
                                          aria-hidden="true"
                                        >
                                          ·
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400 font-mono">
                                          {projectedDueDate
                                            ? `Previsto ${projectedDueDate}`
                                            : 'Sem data'}
                                        </span>
                                      </div>

                                      {/* Per-Item Visual Progress Bar */}
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 max-w-2xl">
                                        <div
                                          className="h-1.5 flex-1 min-w-[140px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                                          role="progressbar"
                                          aria-valuenow={Math.min(100, usagePercent)}
                                          aria-valuemin={0}
                                          aria-valuemax={100}
                                          aria-label={`Progresso de uso: ${usagePercent}%`}
                                        >
                                          <div
                                            className={`h-full rounded-full transition-all duration-300 ${rowBarTone}`}
                                            style={{ width: `${barPercent}%` }}
                                          />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums shrink-0">
                                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                                            {usagePercent}%
                                          </span>
                                          <span aria-hidden="true">·</span>
                                          <span>
                                            {triggerDriver === 'pending'
                                              ? 'Sem registro inicial'
                                              : isDoc
                                              ? `${dayPercent}% prazo`
                                              : triggerDriver === 'km'
                                              ? `${formatDistance(kmElapsed, prefs.units)}/${formatDistance(
                                                  effectiveIntervalKm,
                                                  prefs.units
                                                )}`
                                              : `${daysElapsed}/${effectiveIntervalDays}d`}
                                          </span>
                                          <span aria-hidden="true">·</span>
                                          <span>
                                            {historyLogsCount > 0
                                              ? `${historyLogsCount} histórico${
                                                  historyLogsCount > 1 ? 's' : ''
                                                }`
                                              : '0 histórico'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        aria-expanded={rowOpen}
                                        onClick={() =>
                                          setExpandedRowIds((prev) => ({
                                            ...prev,
                                            [item.id]: !prev[item.id],
                                          }))
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                                      >
                                        <span>Detalhes</span>
                                        {rowOpen ? (
                                          <ChevronUp className="w-3.5 h-3.5" />
                                        ) : (
                                          <ChevronDown className="w-3.5 h-3.5" />
                                        )}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => onOpenLogModal(item)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
                                      >
                                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                                        <span>Registrar</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded Row Details (Usage Breakdown, History, Description, Safety, Calendar, WhatsApp) */}
                                  {rowOpen && (
                                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-3 text-xs">
                                      <p className="text-slate-600 dark:text-slate-400">
                                        {localized.desc}
                                      </p>

                                      {/* Detailed Progress Breakdown (Distance + Time) */}
                                      <div
                                        className={`grid grid-cols-1 ${
                                          isDoc ? '' : 'sm:grid-cols-2'
                                        } gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 tabular-nums`}
                                      >
                                        {!isDoc && (
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-2 text-[11px]">
                                              <span className="font-medium text-slate-600 dark:text-slate-300">
                                                Uso por quilometragem
                                              </span>
                                              <span className="font-mono text-slate-700 dark:text-slate-200">
                                                {formatDistance(kmElapsed, prefs.units)} /{' '}
                                                {formatDistance(effectiveIntervalKm, prefs.units)} (
                                                {kmPercent}%)
                                              </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                              <div
                                                className={`h-full rounded-full ${rowBarTone}`}
                                                style={{ width: `${kmBarPercent}%` }}
                                              />
                                            </div>
                                          </div>
                                        )}

                                        <div className="space-y-1">
                                          <div className="flex items-center justify-between gap-2 text-[11px]">
                                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                              {isDoc ? 'Prazo do documento' : 'Uso por tempo'}
                                            </span>
                                            <span className="font-mono text-slate-700 dark:text-slate-200">
                                              {isDoc
                                                ? `${
                                                    projectedDueDate
                                                      ? `Vence ${projectedDueDate}`
                                                      : 'Sem data'
                                                  } (${dayPercent}%)`
                                                : `${daysElapsed} / ${effectiveIntervalDays} dias (${dayPercent}%)`}
                                            </span>
                                          </div>
                                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${rowBarTone}`}
                                              style={{ width: `${dayBarPercent}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {latestServiceLog && (
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                                          <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>Último serviço no histórico:</span>
                                          <strong className="font-mono font-medium text-slate-800 dark:text-slate-100">
                                            {latestServiceLog.date}
                                          </strong>
                                          <span aria-hidden="true">·</span>
                                          <span className="font-mono">
                                            {formatDistance(latestServiceLog.odometerKm, prefs.units)}
                                          </span>
                                          {latestServiceLog.workshopName && (
                                            <>
                                              <span aria-hidden="true">·</span>
                                              <span>{latestServiceLog.workshopName}</span>
                                            </>
                                          )}
                                        </div>
                                      )}

                                      {localized.safety && (
                                        <div className="inline-flex items-start gap-2 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
                                          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                          <span>{localized.safety}</span>
                                        </div>
                                      )}

                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-500 dark:text-slate-400 tabular-nums">
                                          <span>
                                            {t.health.lastCheck}:{' '}
                                            <strong className="font-medium text-slate-700 dark:text-slate-300">
                                              {status === MaintenanceStatus.PENDING ||
                                              !isDateRecorded(item.lastCheckedDate)
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
                                          {item.notes && (
                                            <>
                                              <span aria-hidden="true">·</span>
                                              <span className="text-slate-600 dark:text-slate-300">
                                                {item.notes}
                                              </span>
                                            </>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
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
                                            onSaveWhatsApp={(phone) =>
                                              onUpdatePrefs({ whatsappNumber: phone })
                                            }
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
                                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                                              title="Adicionar previsão ao Calendário (.ics)"
                                            >
                                              <CalendarPlus className="w-3.5 h-3.5" />
                                              <span>Agenda</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeSection === 'guides' && (
        /* Dedicated Tab: Illustrated Care Guides */
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
                  {
                    id: 'active',
                    label: `Para este ${t.vehicleTypes[vehicle.vehicleType ?? 'car']}`,
                  },
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
      )}

      {activeSection === 'report' && (
        <VehicleFinalReportTab
          vehicle={vehicle}
          maintenanceItems={items}
          logs={logs}
          chargingSessions={chargingSessions}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          prefs={prefs}
          t={t}
          cloudUserId={cloudUserId}
          cloudUserEmail={cloudUserEmail}
          onAttachmentCreated={onAttachmentCreated}
          onAttachmentDeleted={onAttachmentDeleted}
          onOpenCloudSettings={onOpenCloudSettings}
          onUpdatePrefs={onUpdatePrefs}
        />
      )}

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
