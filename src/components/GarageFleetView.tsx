import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bike,
  Building2,
  CalendarPlus,
  Car,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Gauge,
  Lock,
  Plus,
  QrCode,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  ChargingSession,
  DrivingProfile,
  MaintenanceItem,
  MaintenanceStatus,
  OdometerEvent,
  OrganizationMember,
  OrganizationProfile,
  ServiceLog,
  SubscriptionPaymentRecord,
  SubscriptionPlanCatalogItem,
  UserPreferences,
  UserSubscriptionRecord,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import {
  computeMaintenanceStatus,
  daysBetween,
  downloadCsv,
  formatCurrency,
  formatDistance,
  isDateRecorded,
  todayIso,
} from '../utils/autolife';
import {
  CURRENCY_CATALOG,
  convertCurrency,
  isBusinessPlan,
  normalizePlanTier,
} from '../utils/billing';
import { downloadCalendarEvent } from '../utils/calendar';
import { downloadPdfBlob, generateFleetSummaryPdf } from '../utils/pdfReport';
import {
  buildServiceLogWhatsAppText,
  buildVehicleWhatsAppText,
} from '../utils/whatsapp';
import { CarbonFootprintSection } from './CarbonFootprintSection';
import { FleetAnalyticsSection } from './FleetAnalyticsSection';
import { FleetTeamSection } from './FleetTeamSection';
import { SubscriptionPlansSection } from './SubscriptionPlansSection';
import { VehicleMedicalRecordPanel } from './VehicleMedicalRecordPanel';
import { VehiclePassportModal } from './VehiclePassportModal';
import { VehicleVaultSection } from './VehicleVaultSection';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface GarageFleetViewProps {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  maintenanceItems: MaintenanceItem[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  attachmentsLoading: boolean;
  attachmentsError: string | null;
  catalogPlans: SubscriptionPlanCatalogItem[];
  catalogSource: 'database' | 'fallback';
  subscription: UserSubscriptionRecord | null;
  payments: SubscriptionPaymentRecord[];
  organization: OrganizationProfile | null;
  orgMembers: OrganizationMember[];
  odometerEvents: OdometerEvent[];
  focusPlansSignal?: number;
  onAttachmentCreated: (attachment: VehicleAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  onSelectVehicle: (id: string) => void;
  onUpdateOdometer: (vehicleId: string, newKm: number) => void;
  onUpdateDrivingProfile: (
    vehicleId: string,
    drivingProfile: DrivingProfile,
    weeklyKm: number
  ) => void;
  onAssignVehicleMember: (vehicleId: string, memberName: string, memberEmail: string) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onOpenAddVehicle: () => void;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  onAddServiceLog: (log: ServiceLog) => Promise<void> | void;
  onAddChargingSession: (session: ChargingSession) => void;
  onMarkMaintenanceChecked?: (payload: {
    itemId: string;
    date: string;
    odometerKm: number;
    notes?: string;
  }) => void;
  onOrganizationUpdated: (org: OrganizationProfile) => void;
  onMembersChanged: (members: OrganizationMember[]) => void;
  onSubscriptionUpdated: (sub: UserSubscriptionRecord | null) => void;
  onRefreshSubscription: () => Promise<void>;
  logs: ServiceLog[];
  prefs: UserPreferences;
  t: Translations;
  cloudUserId: string | null;
  cloudUserEmail?: string | null;
  onOpenCloudSettings: () => void;
}

export function GarageFleetView({
  vehicles,
  activeVehicle,
  maintenanceItems,
  chargingSessions,
  attachments,
  attachmentsLoading,
  attachmentsError,
  catalogPlans,
  catalogSource,
  subscription,
  payments,
  organization,
  orgMembers,
  odometerEvents,
  focusPlansSignal = 0,
  onAttachmentCreated,
  onAttachmentDeleted,
  onSelectVehicle,
  onUpdateOdometer,
  onUpdateDrivingProfile,
  onAssignVehicleMember,
  onDeleteVehicle,
  onOpenAddVehicle,
  onUpdatePrefs,
  onAddServiceLog,
  onAddChargingSession,
  onMarkMaintenanceChecked,
  onOrganizationUpdated,
  onMembersChanged,
  onSubscriptionUpdated,
  onRefreshSubscription,
  logs,
  prefs,
  t,
  cloudUserId,
  cloudUserEmail,
  onOpenCloudSettings,
}: GarageFleetViewProps) {
  const normalizedPlan = normalizePlanTier(prefs.activePlan);
  const hasBusinessAccess = isBusinessPlan(normalizedPlan);

  const [viewMode, setViewMode] = useState<'personal' | 'fleet'>(
    hasBusinessAccess ? 'fleet' : 'personal'
  );
  const [fleetTypeFilter, setFleetTypeFilter] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [odometerInput, setOdometerInput] = useState<string>(
    String(activeVehicle?.odometerKm ?? 0)
  );
  const [weeklyKmInput, setWeeklyKmInput] = useState<string>(
    String(activeVehicle?.weeklyKm ?? 250)
  );
  const [odometerSaved, setOdometerSaved] = useState(false);
  const [showPassport, setShowPassport] = useState(false);

  const medicalRecordRef = useRef<HTMLDivElement | null>(null);
  const plansSectionRef = useRef<HTMLDivElement | null>(null);

  const activeVehicleId = activeVehicle?.id ?? '';
  const [lastSyncedId, setLastSyncedId] = useState(activeVehicleId);
  if (activeVehicleId !== lastSyncedId) {
    setLastSyncedId(activeVehicleId);
    setOdometerInput(String(activeVehicle?.odometerKm ?? 0));
    setWeeklyKmInput(String(activeVehicle?.weeklyKm ?? 250));
  }

  useEffect(() => {
    if (focusPlansSignal > 0) {
      window.setTimeout(() => {
        plansSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  }, [focusPlansSignal]);

  const activePlanItem = useMemo(
    () => catalogPlans.find((p) => p.id === normalizedPlan) ?? catalogPlans[0] ?? null,
    [catalogPlans, normalizedPlan]
  );
  const vehicleLimit = activePlanItem?.vehicleLimit ?? (hasBusinessAccess ? 10 : 1);
  const isFleetModeActive = viewMode === 'fleet' && hasBusinessAccess;

  const visibleLogs = useMemo(() => {
    if (!activeVehicle) return [];
    const filtered = isFleetModeActive
      ? logs
      : logs.filter((l) => l.vehicleId === activeVehicle.id);
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, isFleetModeActive, activeVehicle]);

  const totalSpend = useMemo(() => {
    if (!activeVehicle) return 0;
    const serviceTotal = visibleLogs.reduce(
      (acc, item) =>
        acc + convertCurrency(item.cost, item.currency ?? 'BRL', prefs.currency),
      0
    );
    const relevantSessions = isFleetModeActive
      ? chargingSessions
      : chargingSessions.filter((c) => c.vehicleId === activeVehicle.id);
    const chargeTotal = relevantSessions.reduce(
      (acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency),
      0
    );
    return serviceTotal + chargeTotal;
  }, [visibleLogs, chargingSessions, isFleetModeActive, activeVehicle, prefs.currency]);

  const costPerKm = useMemo(() => {
    if (!activeVehicle) return 0;
    const baseKm = isFleetModeActive
      ? vehicles.reduce((acc, v) => acc + Math.max(1000, v.odometerKm), 0)
      : Math.max(1000, activeVehicle.odometerKm);
    return totalSpend / baseKm;
  }, [totalSpend, isFleetModeActive, vehicles, activeVehicle]);

  const today = todayIso();

  const fleetKpis = useMemo(() => {
    const currentMonth = today.slice(0, 7);
    let totalOdometer = 0;
    let overdueVehicles = 0;
    let upcomingRevisions = 0;
    let expiringDocuments = 0;

    for (const v of vehicles) {
      totalOdometer += v.odometerKm;
      const vItems = maintenanceItems.filter((i) => i.vehicleId === v.id);
      let hasOverdue = false;
      let hasAttentionOrRevision = false;
      for (const item of vItems) {
        const res = computeMaintenanceStatus(item, v, prefs);
        if (res.status === MaintenanceStatus.OVERDUE) {
          hasOverdue = true;
        } else if (res.status === MaintenanceStatus.ATTENTION) {
          hasAttentionOrRevision = true;
        }
      }
      if (hasOverdue) overdueVehicles++;
      if (hasAttentionOrRevision) upcomingRevisions++;

      const docDays = isDateRecorded(v.documentExpiryDate)
        ? daysBetween(today, v.documentExpiryDate)
        : null;
      const insDays = isDateRecorded(v.insuranceExpiryDate)
        ? daysBetween(today, v.insuranceExpiryDate)
        : null;
      if (
        (docDays !== null && docDays <= prefs.docReminderDays) ||
        (insDays !== null && insDays <= prefs.docReminderDays)
      ) {
        expiringDocuments++;
      }
    }

    const monthlySpend =
      logs
        .filter((l) => l.date.startsWith(currentMonth))
        .reduce((acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency), 0) +
      chargingSessions
        .filter((c) => c.date.startsWith(currentMonth))
        .reduce((acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency), 0);

    return {
      totalOdometer,
      overdueVehicles,
      upcomingRevisions,
      expiringDocuments,
      monthlySpend,
    };
  }, [vehicles, maintenanceItems, logs, chargingSessions, prefs, today]);

  const assignablePeople = useMemo(() => {
    const list: Array<{ name: string; email: string; roleLabel: string }> = [];
    if (cloudUserEmail) {
      list.push({ name: 'Administrador da Conta', email: cloudUserEmail, roleLabel: 'Proprietário' });
    }
    for (const m of orgMembers) {
      if (m.inviteStatus === 'revoked') continue;
      list.push({
        name: m.memberName || m.memberEmail,
        email: m.memberEmail,
        roleLabel: m.role,
      });
    }
    return list;
  }, [cloudUserEmail, orgMembers]);

  const scrollToPlans = () => {
    plansSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!activeVehicle || vehicles.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.garage.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.garage.subtitle}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <Car className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Sua garagem está vazia
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Cadastre seu primeiro carro ou moto para gerar o Passaporte Digital com QR Code, controlar manutenções e anexar notas fiscais com privacidade.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>{t.actions.addVehicle}</span>
            </button>
            {!cloudUserId && (
              <button
                type="button"
                onClick={onOpenCloudSettings}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
              >
                <span>Entrar com Google / Conta</span>
              </button>
            )}
          </div>
        </div>

        <div ref={plansSectionRef}>
          <SubscriptionPlansSection
            catalogPlans={catalogPlans}
            catalogSource={catalogSource}
            subscription={subscription}
            payments={payments}
            vehiclesCount={vehicles.length}
            prefs={prefs}
            t={t}
            cloudUserId={cloudUserId}
            cloudUserEmail={cloudUserEmail}
            onUpdatePrefs={onUpdatePrefs}
            onSubscriptionUpdated={onSubscriptionUpdated}
            onRefreshSubscription={onRefreshSubscription}
          />
        </div>
      </div>
    );
  }

  const handleOdometerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(odometerInput);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    onUpdateOdometer(activeVehicle.id, Math.round(parsed));
    setOdometerSaved(true);
    setTimeout(() => setOdometerSaved(false), 2000);
  };

  const currencyMeta = CURRENCY_CATALOG[prefs.currency] ?? CURRENCY_CATALOG.BRL;

  const handleExportCsv = () => {
    const header = [
      'Date',
      'Vehicle',
      'Category',
      'Title',
      'Odometer (km)',
      'Workshop',
      `Cost (${prefs.currency})`,
    ];
    const rows = visibleLogs.map((log) => {
      const veh = vehicles.find((v) => v.id === log.vehicleId);
      const converted = convertCurrency(log.cost, log.currency ?? 'BRL', prefs.currency);
      return [
        log.date,
        veh ? `${veh.make} ${veh.model}` : log.vehicleId,
        t.categories[log.category],
        log.title,
        String(log.odometerKm),
        log.workshopName,
        converted.toFixed(currencyMeta.decimals),
      ];
    });
    downloadCsv('autolife-service-history.csv', [header, ...rows]);
  };

  const handleDownloadFleetPdf = () => {
    const { blob, filename } = generateFleetSummaryPdf({
      organizationName: organization?.name || 'Frota Empresarial',
      vehicles,
      maintenanceItems,
      logs,
      chargingSessions,
      prefs,
    });
    downloadPdfBlob(blob, filename);
  };

  const hasLicenseDate = isDateRecorded(activeVehicle.documentExpiryDate);
  const hasInsuranceDate = isDateRecorded(activeVehicle.insuranceExpiryDate);
  const licenseDaysLeft = hasLicenseDate
    ? daysBetween(today, activeVehicle.documentExpiryDate)
    : null;
  const insuranceDaysLeft = hasInsuranceDate
    ? daysBetween(today, activeVehicle.insuranceExpiryDate)
    : null;

  const analyticsVehicles = isFleetModeActive ? vehicles : [activeVehicle];

  return (
    <div className="space-y-8">
      {/* Header + Consumer vs. B2B Fleet Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isFleetModeActive ? 'Gestão Empresarial de Frotas' : t.garage.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isFleetModeActive
              ? `${organization?.name || 'Empresa'} · ${vehicles.length}${
                  vehicleLimit !== null ? ` / ${vehicleLimit}` : ''
                } veículo(s) sob gestão ativa`
              : `${t.garage.subtitle} · ${activePlanItem?.name ?? 'Plano Particular'}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppConnectButton
            whatsappNumber={prefs.whatsappNumber}
            language={prefs.language}
            label="WhatsApp"
            title="Enviar resumo do veículo para o WhatsApp cadastrado"
            message={buildVehicleWhatsAppText({
              vehicle: activeVehicle,
              units: prefs.units,
            })}
            onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
          />
          <button
            type="button"
            onClick={() =>
              medicalRecordRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Ficha Médica</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPassport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Passaporte Digital + QR</span>
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('personal')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'personal'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.garage.modePersonal}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('fleet')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'fleet'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {!hasBusinessAccess && <Lock className="w-3 h-3 text-amber-500" />}
              <span>
                Frota Empresarial{hasBusinessAccess ? ` (${vehicles.length})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* B2B Fleet Mode OR Gate OR Personal Specs */}
      {viewMode === 'fleet' && !hasBusinessAccess ? (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <Building2 className="w-4 h-4" />
              <span>Área Exclusiva para Empresas · Plano Frotas</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Separe sua garagem particular da gestão corporativa de frotas
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              O Plano Particular foi desenhado para 1 veículo com experiência simples, Passaporte Digital e alertas preventivos. O módulo <strong>Frota Empresarial</strong> desbloqueia até 10, 25, 50 ou 100+ carros e motos, responsáveis por veículo, convites de equipe com permissões, isolamento multiempresa e relatórios gerenciais consolidados.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={scrollToPlans}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white whitespace-nowrap shrink-0"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Ver Planos Frotas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('personal')}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                Voltar para Modo Particular
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs shrink-0">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Multiveículos (10 a 100+)
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                Carros e motocicletas unificados
              </div>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                Equipe & Permissões
              </div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                Motoristas, gestores e isolamento por CNPJ
              </div>
            </div>
          </div>
        </section>
      ) : isFleetModeActive ? (
        <div className="space-y-6">
          {/* Limit reached expansion banner */}
          {vehicleLimit !== null && vehicles.length >= vehicleLimit && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200">
                  <strong>Limite do plano atingido ({vehicles.length}/{vehicleLimit} veículos).</strong>{' '}
                  Para cadastrar novos veículos sem interromper sua operação, expanda sua frota para 25, 50 ou 100 veículos.
                </div>
              </div>
              <button
                type="button"
                onClick={scrollToPlans}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap shrink-0"
              >
                Expandir Frota
              </button>
            </div>
          )}

          {/* Enterprise Fleet KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 tabular-nums">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Veículos na Frota</div>
              <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {vehicles.length}
                <span className="text-xs font-normal text-slate-400">
                  {vehicleLimit !== null ? ` / ${vehicleLimit}` : ' (ilimitado)'}
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Odômetro Total</div>
              <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatDistance(fleetKpis.totalOdometer, prefs.units)}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">Manutenções Atrasadas</div>
              <div
                className={`mt-1 font-display text-xl font-bold ${
                  fleetKpis.overdueVehicles > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {fleetKpis.overdueVehicles} veículo(s)
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Revisões / Docs Próximos
              </div>
              <div className="mt-1 font-display text-xl font-bold text-amber-600 dark:text-amber-400">
                {fleetKpis.upcomingRevisions} rev · {fleetKpis.expiringDocuments} doc
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 col-span-2 lg:col-span-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">Gastos no Mês Atual</div>
              <div className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(fleetKpis.monthlySpend, prefs.currency)}
              </div>
            </div>
          </div>

          {/* Fleet Matrix Table */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t.garage.allVehicles}
                </h2>
                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'all', label: `Todos (${vehicles.length})` },
                      {
                        id: 'car',
                        label: `${t.vehicleTypes.car} (${vehicles.filter((v) => (v.vehicleType ?? 'car') === 'car').length})`,
                      },
                      {
                        id: 'motorcycle',
                        label: `${t.vehicleTypes.motorcycle} (${vehicles.filter((v) => v.vehicleType === 'motorcycle').length})`,
                      },
                    ] as const
                  ).map((ft) => (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => setFleetTypeFilter(ft.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        fleetTypeFilter === ft.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadFleetPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Relatório Geral (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAddVehicle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.actions.addVehicle}</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-5">Veículo</th>
                    <th className="py-3 px-4">Placa / Tipo</th>
                    <th className="py-3 px-4">Situação</th>
                    <th className="py-3 px-4 text-right">Odômetro</th>
                    <th className="py-3 px-4 text-right">Gastos Mês</th>
                    <th className="py-3 px-4">Vencimentos</th>
                    <th className="py-3 px-4">Responsável</th>
                    <th className="py-3 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {vehicles
                    .filter((v) =>
                      fleetTypeFilter === 'all'
                        ? true
                        : (v.vehicleType ?? 'car') === fleetTypeFilter
                    )
                    .map((v) => {
                      const isSelected = v.id === activeVehicle.id;
                      const vType = v.vehicleType ?? 'car';
                      const vItems = maintenanceItems.filter((i) => i.vehicleId === v.id);
                      const vOverdue = vItems.filter(
                        (i) => computeMaintenanceStatus(i, v, prefs).status === MaintenanceStatus.OVERDUE
                      ).length;
                      const vAttention = vItems.filter(
                        (i) => computeMaintenanceStatus(i, v, prefs).status === MaintenanceStatus.ATTENTION
                      ).length;

                      const currentMonth = today.slice(0, 7);
                      const vMonthSpend =
                        logs
                          .filter((l) => l.vehicleId === v.id && l.date.startsWith(currentMonth))
                          .reduce(
                            (acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency),
                            0
                          ) +
                        chargingSessions
                          .filter((c) => c.vehicleId === v.id && c.date.startsWith(currentMonth))
                          .reduce(
                            (acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency),
                            0
                          );

                      return (
                        <tr
                          key={v.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-5 font-medium text-slate-900 dark:text-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectVehicle(v.id);
                                setTimeout(() => {
                                  medicalRecordRef.current?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                  });
                                }, 60);
                              }}
                              className="text-left hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 flex items-center gap-2"
                            >
                              {vType === 'motorcycle' ? (
                                <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              ) : (
                                <Car className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                              <span>
                                {v.make} {v.model} ({v.year})
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            <span className="font-mono font-semibold">{v.plate}</span> ·{' '}
                            {t.vehicleTypes[vType]}
                          </td>
                          <td className="py-3 px-4 text-xs whitespace-nowrap">
                            {vOverdue > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>{vOverdue} atrasado(s)</span>
                              </span>
                            ) : vAttention > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{vAttention} revisão(ões) próxima(s)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Em dia</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {formatDistance(v.odometerKm, prefs.units)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {formatCurrency(vMonthSpend, prefs.currency)}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <div>
                              Doc:{' '}
                              {isDateRecorded(v.documentExpiryDate)
                                ? v.documentExpiryDate
                                : '—'}
                            </div>
                            <div>
                              Seg:{' '}
                              {isDateRecorded(v.insuranceExpiryDate)
                                ? v.insuranceExpiryDate
                                : '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <select
                              value={v.assignedMemberEmail ?? ''}
                              onChange={(e) => {
                                const email = e.target.value;
                                const match = assignablePeople.find((p) => p.email === email);
                                onAssignVehicleMember(v.id, match?.name ?? '', email);
                              }}
                              className="px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 max-w-[160px]"
                            >
                              <option value="">Não atribuído</option>
                              {assignablePeople.map((p) => (
                                <option key={p.email} value={p.email}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectVehicle(v.id);
                                  setShowPassport(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Passaporte Digital + QR Code"
                              >
                                <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>QR</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectVehicle(v.id);
                                  setTimeout(() => {
                                    medicalRecordRef.current?.scrollIntoView({
                                      behavior: 'smooth',
                                      block: 'start',
                                    });
                                  }, 60);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>Ficha</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteVehicle(v.id)}
                                className="p-1.5 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                aria-label="Remover veículo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Company Profile, Multi-Tenant Isolation & Team Permissions */}
          <FleetTeamSection
            organization={organization}
            members={orgMembers}
            cloudUserId={cloudUserId}
            maxTeamMembers={activePlanItem?.maxTeamMembers ?? 10}
            onOrganizationUpdated={onOrganizationUpdated}
            onMembersChanged={onMembersChanged}
            onOpenCloudSettings={onOpenCloudSettings}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Vehicle Specs, Odometer & Predictive Driving Profile */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t.garage.specsTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t.vehicleTypes[activeVehicle.vehicleType ?? 'car']} · {activeVehicle.make}{' '}
                  {activeVehicle.model} · {activeVehicle.year} ·{' '}
                  <span className="font-mono">{activeVehicle.plate}</span>
                </p>
              </div>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap">
                {t.powertrain[activeVehicle.powertrain]}
                {activeVehicle.engineDisplacementCc
                  ? ` · ${activeVehicle.engineDisplacementCc}cc`
                  : ''}
              </span>
            </div>

            <form onSubmit={handleOdometerSubmit} className="pt-1 flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <label
                  htmlFor="odometer-update-input"
                  className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
                >
                  {t.health.odometerLabel} (km)
                </label>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="odometer-update-input"
                    type="number"
                    min={0}
                    value={odometerInput}
                    onChange={(e) => setOdometerInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  {odometerSaved ? '✓' : t.actions.updateOdometer}
                </button>
              </div>
            </form>

            {/* Predictive Severity & Weekly Mileage */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Perfil de Severidade de Uso
                </label>
                <select
                  value={activeVehicle.drivingProfile ?? 'mixed'}
                  onChange={(e) =>
                    onUpdateDrivingProfile(
                      activeVehicle.id,
                      e.target.value as DrivingProfile,
                      Number(weeklyKmInput) || 250
                    )
                  }
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="urban_severe">Urbano Severo (trânsito intenso)</option>
                  <option value="mixed">Misto (cidade + estrada)</option>
                  <option value="highway">Rodoviário (viagens longas)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Média semanal (km/sem)
                </label>
                <input
                  type="number"
                  min={20}
                  max={3000}
                  value={weeklyKmInput}
                  onChange={(e) => {
                    setWeeklyKmInput(e.target.value);
                    const val = Math.max(20, Number(e.target.value) || 250);
                    onUpdateDrivingProfile(
                      activeVehicle.id,
                      activeVehicle.drivingProfile ?? 'mixed',
                      val
                    );
                  }}
                  className="w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {vehicles.length}
                  {vehicleLimit !== null ? `/${vehicleLimit}` : ''} veículo(s) no plano
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAddVehicle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{t.actions.addVehicle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteVehicle(activeVehicle.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover veículo e histórico</span>
                </button>
              </div>
            </div>
          </section>

          {/* Documentation Expiry */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {t.garage.docsTitle}
              </h2>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t.garage.docLicense}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {hasLicenseDate
                      ? `${t.garage.expiresOn} ${activeVehicle.documentExpiryDate}`
                      : t.health.notRecorded}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasLicenseDate && licenseDaysLeft !== null ? (
                    <span
                      className={`text-xs font-semibold font-mono whitespace-nowrap ${
                        licenseDaysLeft <= prefs.docReminderDays
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {licenseDaysLeft}d
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">—</span>
                  )}
                  <WhatsAppConnectButton
                    whatsappNumber={prefs.whatsappNumber}
                    language={prefs.language}
                    compact
                    label=""
                    title="Enviar vencimento no WhatsApp cadastrado"
                    message={`*AutoLife World — Documento*\nVeículo: ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.plate})\n${t.garage.docLicense}: ${
                      hasLicenseDate
                        ? `vence em ${activeVehicle.documentExpiryDate}`
                        : t.health.notRecorded
                    }`}
                    onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                  />
                  {hasLicenseDate && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadCalendarEvent({
                          title: `${t.garage.docLicense} — ${activeVehicle.make} ${activeVehicle.model}`,
                          description: `${activeVehicle.plate} (${t.garage.expiresOn} ${activeVehicle.documentExpiryDate})`,
                          dateIso: activeVehicle.documentExpiryDate,
                          filename: `licenciamento-${activeVehicle.plate}.ics`,
                        })
                      }
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                      title="Adicionar ao Calendário (.ics)"
                      aria-label="Adicionar vencimento ao Calendário"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {t.garage.docInsurance}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {hasInsuranceDate
                      ? `${t.garage.expiresOn} ${activeVehicle.insuranceExpiryDate}`
                      : t.health.notRecorded}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasInsuranceDate && insuranceDaysLeft !== null ? (
                    <span
                      className={`text-xs font-semibold font-mono whitespace-nowrap ${
                        insuranceDaysLeft <= prefs.docReminderDays
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {insuranceDaysLeft}d
                    </span>
                  ) : (
                    <span className="text-xs font-mono text-slate-400">—</span>
                  )}
                  <WhatsAppConnectButton
                    whatsappNumber={prefs.whatsappNumber}
                    language={prefs.language}
                    compact
                    label=""
                    title="Enviar vencimento do seguro no WhatsApp cadastrado"
                    message={`*AutoLife World — Seguro*\nVeículo: ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.plate})\n${t.garage.docInsurance}: ${
                      hasInsuranceDate
                        ? `vence em ${activeVehicle.insuranceExpiryDate}`
                        : t.health.notRecorded
                    }`}
                    onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                  />
                  {hasInsuranceDate && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadCalendarEvent({
                          title: `${t.garage.docInsurance} — ${activeVehicle.make} ${activeVehicle.model}`,
                          description: `${activeVehicle.plate} (${t.garage.expiresOn} ${activeVehicle.insuranceExpiryDate})`,
                          dateIso: activeVehicle.insuranceExpiryDate,
                          filename: `seguro-${activeVehicle.plate}.ics`,
                        })
                      }
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                      title="Adicionar ao Calendário (.ics)"
                      aria-label="Adicionar vencimento ao Calendário"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Ficha Médica Completa (Linha do Tempo de Manutenções, Revisões, Abastecimentos, EV, Gastos e Notas) */}
      <div ref={medicalRecordRef}>
        <VehicleMedicalRecordPanel
          vehicle={activeVehicle}
          maintenanceItems={maintenanceItems}
          logs={logs}
          chargingSessions={chargingSessions}
          attachments={attachments}
          attachmentsLoading={attachmentsLoading}
          prefs={prefs}
          t={t}
          cloudUserId={cloudUserId}
          cloudUserEmail={cloudUserEmail}
          onAddServiceLog={onAddServiceLog}
          onAddChargingSession={onAddChargingSession}
          onMarkMaintenanceChecked={onMarkMaintenanceChecked}
          onAttachmentCreated={onAttachmentCreated}
          onAttachmentDeleted={onAttachmentDeleted}
          onOpenCloudSettings={onOpenCloudSettings}
          onUpdatePrefs={onUpdatePrefs}
        />
      </div>

      {/* Analytics & EV Charging Trends */}
      <FleetAnalyticsSection
        vehicles={analyticsVehicles}
        activeVehicle={activeVehicle}
        logs={logs}
        chargingSessions={chargingSessions}
        prefs={prefs}
      />

      {/* Monthly Carbon Footprint & EV Impact Reduction */}
      <CarbonFootprintSection
        vehicles={analyticsVehicles}
        activeVehicle={activeVehicle}
        logs={logs}
        chargingSessions={chargingSessions}
        prefs={prefs}
      />

      {/* Digital Vault for Vehicle Photos, Documents & Receipts */}
      <div className="space-y-3">
        {attachmentsError && (
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300">
            {attachmentsError}
          </div>
        )}
        <VehicleVaultSection
          activeVehicle={activeVehicle}
          cloudUserId={cloudUserId}
          onOpenCloudSettings={onOpenCloudSettings}
          language={prefs.language}
          whatsappNumber={prefs.whatsappNumber}
          onUpdatePrefs={onUpdatePrefs}
          externalAttachments={attachments}
          externalLoading={attachmentsLoading}
          onAttachmentCreated={onAttachmentCreated}
          onAttachmentDeleted={onAttachmentDeleted}
        />
      </div>

      {/* Service & TCO Cost Ledger */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.garage.ledgerTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 flex flex-wrap items-center gap-2">
              <span>
                TCO acumulado:{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(totalSpend, prefs.currency)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Custo por km:{' '}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {formatCurrency(costPerKm, prefs.currency)}/km
                </strong>
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 w-fit"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.actions.exportCsv}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                <th className="py-3 px-5">Data</th>
                <th className="py-3 px-4">Veículo</th>
                <th className="py-3 px-4">Serviço</th>
                <th className="py-3 px-4">Oficina / Local</th>
                <th className="py-3 px-4 text-right">Odômetro</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-5 text-right">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
              {visibleLogs.map((log) => {
                const veh = vehicles.find((v) => v.id === log.vehicleId) ?? activeVehicle;
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-5 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {log.date}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {veh ? `${veh.make} ${veh.model}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {log.title}
                      </div>
                      {log.notes && (
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {log.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {log.workshopName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatDistance(log.odometerKm, prefs.units)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(
                        convertCurrency(log.cost, log.currency ?? 'BRL', prefs.currency),
                        prefs.currency
                      )}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <WhatsAppConnectButton
                        whatsappNumber={prefs.whatsappNumber}
                        language={prefs.language}
                        compact
                        label="Enviar"
                        message={buildServiceLogWhatsAppText({
                          vehicle: veh,
                          log,
                          currency: prefs.currency,
                          units: prefs.units,
                        })}
                        onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* International DB-Driven Commercial Plans & Subscription Management */}
      <div ref={plansSectionRef}>
        <SubscriptionPlansSection
          catalogPlans={catalogPlans}
          catalogSource={catalogSource}
          subscription={subscription}
          payments={payments}
          vehiclesCount={vehicles.length}
          prefs={prefs}
          t={t}
          cloudUserId={cloudUserId}
          cloudUserEmail={cloudUserEmail}
          onUpdatePrefs={onUpdatePrefs}
          onSubscriptionUpdated={onSubscriptionUpdated}
          onRefreshSubscription={onRefreshSubscription}
        />
      </div>

      {/* Verifiable Digital Vehicle Passport Modal + QR Code */}
      {showPassport && (
        <VehiclePassportModal
          vehicle={activeVehicle}
          maintenanceItems={maintenanceItems}
          logs={logs}
          attachments={attachments}
          odometerEvents={odometerEvents.filter((e) => e.vehicleId === activeVehicle.id)}
          prefs={prefs}
          t={t}
          cloudUserId={cloudUserId}
          onUpdatePrefs={onUpdatePrefs}
          onClose={() => setShowPassport(false)}
        />
      )}
    </div>
  );
}
