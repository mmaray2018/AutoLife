import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Bike,
  CalendarPlus,
  Car,
  Check,
  Copy,
  CreditCard,
  Download,
  FileText,
  Gauge,
  Loader2,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  BillingCycle,
  ChargingSession,
  CurrencyCode,
  DrivingProfile,
  MaintenanceItem,
  MaintenanceStatus,
  PaymentMethodType,
  PlanTier,
  ServiceLog,
  UserPreferences,
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
  CURRENCY_LIST,
  PAYMENT_METHOD_LABELS,
  convertCurrency,
  getLocalizedPlanPrice,
} from '../utils/billing';
import { downloadCalendarEvent } from '../utils/calendar';
import {
  buildServiceLogWhatsAppText,
  buildVehicleWhatsAppText,
} from '../utils/whatsapp';
import { CarbonFootprintSection } from './CarbonFootprintSection';
import { FleetAnalyticsSection } from './FleetAnalyticsSection';
import { VehicleMedicalRecordPanel } from './VehicleMedicalRecordPanel';
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
  onAttachmentCreated: (attachment: VehicleAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  onSelectVehicle: (id: string) => void;
  onUpdateOdometer: (vehicleId: string, newKm: number) => void;
  onUpdateDrivingProfile: (
    vehicleId: string,
    drivingProfile: DrivingProfile,
    weeklyKm: number
  ) => void;
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
  logs: ServiceLog[];
  prefs: UserPreferences;
  t: Translations;
  cloudUserId: string | null;
  cloudUserEmail?: string | null;
  onOpenCloudSettings: () => void;
}

interface PixCheckoutData {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  formattedAmount: string;
  planId: 'plus' | 'fleet';
  status: string;
}

export function GarageFleetView({
  vehicles,
  activeVehicle,
  maintenanceItems,
  chargingSessions,
  attachments,
  attachmentsLoading,
  attachmentsError,
  onAttachmentCreated,
  onAttachmentDeleted,
  onSelectVehicle,
  onUpdateOdometer,
  onUpdateDrivingProfile,
  onDeleteVehicle,
  onOpenAddVehicle,
  onUpdatePrefs,
  onAddServiceLog,
  onAddChargingSession,
  onMarkMaintenanceChecked,
  logs,
  prefs,
  t,
  cloudUserId,
  cloudUserEmail,
  onOpenCloudSettings,
}: GarageFleetViewProps) {
  const [viewMode, setViewMode] = useState<'personal' | 'fleet'>('personal');
  const [fleetTypeFilter, setFleetTypeFilter] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [odometerInput, setOdometerInput] = useState<string>(
    String(activeVehicle?.odometerKm ?? 0)
  );
  const [weeklyKmInput, setWeeklyKmInput] = useState<string>(
    String(activeVehicle?.weeklyKm ?? 250)
  );
  const [odometerSaved, setOdometerSaved] = useState(false);
  const [showPassport, setShowPassport] = useState(false);

  // Multi-currency commercial plans & checkout state
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [checkoutPlan, setCheckoutPlan] = useState<'plus' | 'fleet' | null>(null);
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethodType>('card');
  const [payerEmail, setPayerEmail] = useState<string>(cloudUserEmail ?? '');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutFeedback, setCheckoutFeedback] = useState<{
    mode: 'error' | 'success';
    message: string;
  } | null>(null);
  const [pixCheckout, setPixCheckout] = useState<PixCheckoutData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixVerifying, setPixVerifying] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);

  const medicalRecordRef = useRef<HTMLDivElement | null>(null);

  const activeVehicleId = activeVehicle?.id ?? '';
  const [lastSyncedId, setLastSyncedId] = useState(activeVehicleId);
  if (activeVehicleId !== lastSyncedId) {
    setLastSyncedId(activeVehicleId);
    setOdometerInput(String(activeVehicle?.odometerKm ?? 0));
    setWeeklyKmInput(String(activeVehicle?.weeklyKm ?? 250));
  }

  useEffect(() => {
    if (cloudUserEmail && !payerEmail) {
      setPayerEmail(cloudUserEmail);
    }
  }, [cloudUserEmail, payerEmail]);

  // Auto-poll Mercado Pago Pix status while QR Code is displayed
  useEffect(() => {
    if (!pixCheckout || pixConfirmed) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/billing/verify-mp-payment?payment_id=${encodeURIComponent(pixCheckout.paymentId)}`
        );
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          verified?: boolean;
          status?: string;
          planId?: 'plus' | 'fleet' | null;
        };
        if (!active) return;
        if (data.verified) {
          setPixConfirmed(true);
          onUpdatePrefs({ activePlan: data.planId ?? pixCheckout.planId });
          setCheckoutFeedback({
            mode: 'success',
            message: 'Pagamento Pix confirmado! Seu plano foi ativado imediatamente.',
          });
        }
      } catch {
        // Ignore transient polling failure
      }
    };
    const timer = window.setInterval(() => {
      void poll();
    }, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pixCheckout, pixConfirmed, onUpdatePrefs]);

  const visibleLogs = useMemo(() => {
    if (!activeVehicle) return [];
    const filtered =
      viewMode === 'fleet'
        ? logs
        : logs.filter((l) => l.vehicleId === activeVehicle.id);
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, viewMode, activeVehicle]);

  const activeVehicleLogs = useMemo(() => {
    if (!activeVehicle) return [];
    return logs
      .filter((l) => l.vehicleId === activeVehicle.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, activeVehicle]);

  const activeCompliance = useMemo(() => {
    if (!activeVehicle) return { onTrack: 0, total: 0 };
    const vItems = maintenanceItems.filter((i) => i.vehicleId === activeVehicle.id);
    if (vItems.length === 0) return { onTrack: 0, total: 0 };
    const onTrack = vItems.filter(
      (i) => computeMaintenanceStatus(i, activeVehicle, prefs).status === MaintenanceStatus.ON_TRACK
    ).length;
    return { onTrack, total: vItems.length };
  }, [maintenanceItems, activeVehicle, prefs]);

  const totalSpend = useMemo(() => {
    if (!activeVehicle) return 0;
    const serviceTotal = visibleLogs.reduce(
      (acc, item) =>
        acc + convertCurrency(item.cost, item.currency ?? 'BRL', prefs.currency),
      0
    );
    const relevantSessions =
      viewMode === 'fleet'
        ? chargingSessions
        : chargingSessions.filter((c) => c.vehicleId === activeVehicle.id);
    const chargeTotal = relevantSessions.reduce(
      (acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency),
      0
    );
    return serviceTotal + chargeTotal;
  }, [visibleLogs, chargingSessions, viewMode, activeVehicle, prefs.currency]);

  const costPerKm = useMemo(() => {
    if (!activeVehicle) return 0;
    const baseKm =
      viewMode === 'fleet'
        ? vehicles.reduce((acc, v) => acc + Math.max(1000, v.odometerKm), 0)
        : Math.max(1000, activeVehicle.odometerKm);
    return totalSpend / baseKm;
  }, [totalSpend, viewMode, vehicles, activeVehicle]);

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
              Cadastre seu primeiro carro ou moto para abrir a Ficha Médica completa, controlar manutenções e anexar fotos das notas fiscais com privacidade.
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

  const activePlan: PlanTier = prefs.activePlan ?? 'free';
  const currencyMeta = CURRENCY_CATALOG[prefs.currency] ?? CURRENCY_CATALOG.BRL;

  const handleOpenCheckout = (planId: 'plus' | 'fleet') => {
    const allowedMethods = currencyMeta.paymentMethods;
    if (!allowedMethods.includes(checkoutMethod)) {
      setCheckoutMethod(allowedMethods[0]);
    }
    setPixCheckout(null);
    setPixConfirmed(false);
    setPixCopied(false);
    setCheckoutFeedback(null);
    setCheckoutPlan(planId);
  };

  const handleCurrencyChangeInCheckout = (nextCurrency: CurrencyCode) => {
    onUpdatePrefs({ currency: nextCurrency });
    const nextAllowed = CURRENCY_CATALOG[nextCurrency].paymentMethods;
    if (!nextAllowed.includes(checkoutMethod)) {
      setCheckoutMethod(nextAllowed[0]);
    }
    setPixCheckout(null);
    setPixConfirmed(false);
    setCheckoutFeedback(null);
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutPlan) return;
    setIsCheckingOut(true);
    setCheckoutFeedback(null);
    setPixCheckout(null);
    setPixConfirmed(false);
    try {
      const res = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: checkoutPlan,
          currency: prefs.currency,
          billingCycle,
          paymentMethod: checkoutMethod,
          payerEmail: (payerEmail || cloudUserEmail || '').trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      if (data.mode === 'mercadopago_pix' && typeof data.qrCode === 'string' && data.paymentId) {
        setPixCheckout({
          paymentId: String(data.paymentId),
          qrCode: data.qrCode,
          qrCodeBase64: typeof data.qrCodeBase64 === 'string' ? data.qrCodeBase64 : '',
          ticketUrl: typeof data.ticketUrl === 'string' ? data.ticketUrl : '',
          formattedAmount: typeof data.formattedAmount === 'string' ? data.formattedAmount : '',
          planId: checkoutPlan,
          status: typeof data.status === 'string' ? data.status : 'pending',
        });
        return;
      }

      if (
        (data.mode === 'stripe_live' || data.mode === 'mercadopago_checkout') &&
        typeof data.checkoutUrl === 'string'
      ) {
        const parsed = new URL(data.checkoutUrl);
        if (parsed.protocol === 'https:') {
          window.location.assign(parsed.toString());
          return;
        }
      }

      setCheckoutFeedback({
        mode: 'error',
        message: 'Não foi possível iniciar o pagamento online. Verifique a configuração do gateway.',
      });
    } catch (err) {
      setCheckoutFeedback({
        mode: 'error',
        message: err instanceof Error ? err.message : 'Falha ao iniciar checkout.',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleManualVerifyPix = async () => {
    if (!pixCheckout) return;
    setPixVerifying(true);
    setCheckoutFeedback(null);
    try {
      const res = await fetch(
        `/api/billing/verify-mp-payment?payment_id=${encodeURIComponent(pixCheckout.paymentId)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao consultar pagamento Pix.');
      }
      if (data.verified) {
        setPixConfirmed(true);
        onUpdatePrefs({ activePlan: data.planId ?? pixCheckout.planId });
        setCheckoutFeedback({
          mode: 'success',
          message: 'Pagamento Pix confirmado! Seu plano foi ativado.',
        });
      } else {
        setCheckoutFeedback({
          mode: 'error',
          message:
            'Pagamento Pix ainda aguardando compensação. Conclua no app do seu banco e clique novamente em Verificar.',
        });
      }
    } catch (err) {
      setCheckoutFeedback({
        mode: 'error',
        message: err instanceof Error ? err.message : 'Erro ao verificar pagamento Pix.',
      });
    } finally {
      setPixVerifying(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixCheckout?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixCheckout.qrCode);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2500);
    } catch {
      // Clipboard API fallback not needed beyond inline text box
    }
  };

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

  const today = todayIso();
  const hasLicenseDate = isDateRecorded(activeVehicle.documentExpiryDate);
  const hasInsuranceDate = isDateRecorded(activeVehicle.insuranceExpiryDate);
  const licenseDaysLeft = hasLicenseDate
    ? daysBetween(today, activeVehicle.documentExpiryDate)
    : null;
  const insuranceDaysLeft = hasInsuranceDate
    ? daysBetween(today, activeVehicle.insuranceExpiryDate)
    : null;

  return (
    <div className="space-y-8">
      {/* Header + Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.garage.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.garage.subtitle}
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
            <Award className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Passaporte do Veículo</span>
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
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                viewMode === 'fleet'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {t.garage.modeFleet} ({vehicles.length})
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Matrix or Active Vehicle Specs + Driving Profile */}
      {viewMode === 'fleet' ? (
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
            <button
              type="button"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.actions.addVehicle}</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5">Veículo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Placa</th>
                  <th className="py-3 px-4">Motorização</th>
                  <th className="py-3 px-4 text-right">Odômetro</th>
                  <th className="py-3 px-4">Licenciamento</th>
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
                          {t.vehicleTypes[vType]}
                          {v.engineDisplacementCc ? ` · ${v.engineDisplacementCc}cc` : ''}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {v.plate}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {t.powertrain[v.powertrain]}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-900 dark:text-slate-100">
                          {formatDistance(v.odometerKm, prefs.units)}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {isDateRecorded(v.documentExpiryDate)
                            ? v.documentExpiryDate
                            : t.health.notRecorded}
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
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
                              <span>Ficha Médica</span>
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

      {/* Fleet Analytics (Recharts Multi-Vehicle Costs & EV Charging Trends) */}
      <FleetAnalyticsSection
        vehicles={vehicles}
        activeVehicle={activeVehicle}
        logs={logs}
        chargingSessions={chargingSessions}
        prefs={prefs}
      />

      {/* Monthly Carbon Footprint & EV Impact Reduction (Recharts) */}
      <CarbonFootprintSection
        vehicles={vehicles}
        activeVehicle={activeVehicle}
        logs={logs}
        chargingSessions={chargingSessions}
        prefs={prefs}
      />

      {/* Digital Vault for Vehicle Photos, Documents & Receipts (Supabase Storage) */}
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

      {/* Commercial Ecosystem Tiers */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t.garage.plansTitle}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.garage.plansSubtitle}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 w-fit shrink-0">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                billingCycle === 'monthly'
                  ? 'bg-slate-900 text-white dark:bg-blue-600'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                billingCycle === 'annual'
                  ? 'bg-slate-900 text-white dark:bg-blue-600'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Anual (-20%)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            const freePrice = getLocalizedPlanPrice('free', prefs.currency, billingCycle);
            const plusPrice = getLocalizedPlanPrice('plus', prefs.currency, billingCycle);
            const fleetPrice = getLocalizedPlanPrice('fleet', prefs.currency, billingCycle);
            return (
              <>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Motorista Essencial
                      </span>
                      {activePlan === 'free' && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Plano atual
                        </span>
                      )}
                    </div>
                    <div className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatCurrency(freePrice.displayMonthly, prefs.currency)} / mês
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <li>1 veículo cadastrado</li>
                      <li>8 lembretes preventivos inteligentes</li>
                      <li>Guias visuais de inspeção + Pré-Viagem</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    disabled={activePlan === 'free'}
                    onClick={() => onUpdatePrefs({ activePlan: 'free' })}
                    className="w-full py-2 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-60"
                  >
                    {activePlan === 'free' ? 'Ativo' : 'Usar plano gratuito'}
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-blue-600 dark:border-blue-500 rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        AutoLife Plus (Multiveículos)
                      </span>
                      {activePlan === 'plus' && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Plano atual
                        </span>
                      )}
                    </div>
                    <div className="tabular-nums">
                      <div className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(plusPrice.displayMonthly, prefs.currency)} / mês
                      </div>
                      {billingCycle === 'annual' && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Cobrança anual: {formatCurrency(plusPrice.billedTotal, prefs.currency)}
                        </div>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <li>Até 5 veículos + Passaporte do Veículo</li>
                      <li>Ficha Médica completa + Linha do tempo</li>
                      <li>Cofre privado de notas fiscais + PWA Offline</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout('plus')}
                    className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0"
                  >
                    {activePlan === 'plus' ? 'Gerenciar / Trocar Moeda' : `Assinar em ${prefs.currency}`}
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Frotas, Oficinas & Seguradoras
                      </span>
                      {activePlan === 'fleet' && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Plano atual
                        </span>
                      )}
                    </div>
                    <div className="tabular-nums">
                      <div className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(fleetPrice.displayMonthly, prefs.currency)} / mês
                      </div>
                      {billingCycle === 'annual' && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Cobrança anual: {formatCurrency(fleetPrice.billedTotal, prefs.currency)}
                        </div>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <li>Até 50 carros e motos na frota unificada (delivery & corporativo)</li>
                      <li>Motor Preditivo de severidade & TCO por tipo</li>
                      <li>Agendamento direto na Rede Global</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout('fleet')}
                    className="w-full py-2 px-3 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-white whitespace-nowrap shrink-0"
                  >
                    {activePlan === 'fleet' ? 'Gerenciar / Trocar Moeda' : `Assinar em ${prefs.currency}`}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Multi-Currency Checkout Modal */}
      {checkoutPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {pixCheckout ? <QrCode className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                  <span>{pixCheckout ? 'Pagamento Instantâneo via Pix' : 'Pagamento Seguro'}</span>
                </div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {checkoutPlan === 'plus'
                    ? 'AutoLife Plus (Multiveículos)'
                    : 'AutoLife Frotas & Oficinas'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckoutPlan(null);
                  setPixCheckout(null);
                  setPixConfirmed(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pixCheckout ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col items-center text-center space-y-3">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Escaneie o QR Code no app do seu banco ({pixCheckout.formattedAmount})
                  </div>
                  {pixCheckout.qrCodeBase64 ? (
                    <img
                      src={`data:image/png;base64,${pixCheckout.qrCodeBase64}`}
                      alt="QR Code Pix"
                      className="w-48 h-48 rounded-lg bg-white p-2 border border-slate-200"
                    />
                  ) : null}
                  <div className="w-full space-y-1.5 text-left">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Pix Copia e Cola
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixCheckout.qrCode}
                        className="flex-1 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopyPixCode()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white whitespace-nowrap shrink-0"
                      >
                        {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{pixCopied ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {checkoutFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs ${
                      checkoutFeedback.mode === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <p>{checkoutFeedback.message}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPixCheckout(null);
                      setPixConfirmed(false);
                      setCheckoutFeedback(null);
                    }}
                    className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    Trocar forma de pagamento
                  </button>
                  {pixConfirmed ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCheckoutPlan(null);
                        setPixCheckout(null);
                      }}
                      className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Concluir
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pixVerifying}
                      onClick={() => void handleManualVerifyPix()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    >
                      {pixVerifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>Verificar Pagamento Pix</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Moeda de cobrança
                    </label>
                    <select
                      value={prefs.currency}
                      onChange={(e) => handleCurrencyChangeInCheckout(e.target.value as CurrencyCode)}
                      className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {CURRENCY_LIST.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol}) — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Ciclo de faturamento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`py-2 px-2 text-xs font-medium rounded-lg border ${
                          billingCycle === 'monthly'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Mensal
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`py-2 px-2 text-xs font-medium rounded-lg border ${
                          billingCycle === 'annual'
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-slate-900 dark:text-slate-100'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Anual (-20%)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Meios de pagamento ({currencyMeta.code})
                  </div>
                  <div className="space-y-2">
                    {currencyMeta.paymentMethods.map((method) => {
                      const info = PAYMENT_METHOD_LABELS[method];
                      const selected = checkoutMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setCheckoutMethod(method)}
                          className={`w-full p-3 rounded-lg border text-left flex items-center justify-between gap-3 transition-colors ${
                            selected
                              ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                              : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {info.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {info.subtitle}
                            </div>
                          </div>
                          {selected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!cloudUserEmail && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      E-mail para comprovante (opcional)
                    </label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between tabular-nums">
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Total ({billingCycle === 'annual' ? 'Anual' : 'Mensal'})
                  </span>
                  <span className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(
                      getLocalizedPlanPrice(checkoutPlan, prefs.currency, billingCycle).billedTotal,
                      prefs.currency
                    )}
                  </span>
                </div>

                {checkoutFeedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs ${
                      checkoutFeedback.mode === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <p>{checkoutFeedback.message}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCheckoutPlan(null)}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {t.actions.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={isCheckingOut}
                    onClick={() => void handleConfirmCheckout()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                  >
                    {isCheckingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {checkoutMethod === 'pix'
                        ? `Gerar QR Code Pix (${prefs.currency})`
                        : `Pagar com Cartão (${prefs.currency})`}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Verifiable Vehicle Passport Modal */}
      {showPassport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  AutoLife World · Passaporte do Veículo
                </div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
                </h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                  {t.vehicleTypes[activeVehicle.vehicleType ?? 'car']}
                  {activeVehicle.engineDisplacementCc ? ` ${activeVehicle.engineDisplacementCc}cc` : ''}{' '}
                  · Placa: <span className="font-mono">{activeVehicle.plate}</span> ·{' '}
                  {t.powertrain[activeVehicle.powertrain]} ·{' '}
                  <span className="font-mono">
                    {formatDistance(activeVehicle.odometerKm, prefs.units)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPassport(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 print:hidden"
                aria-label={t.actions.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Itens em dia
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {activeCompliance.onTrack} / {activeCompliance.total}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Registros verificados
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                  {activeVehicleLogs.length}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Investimento ({prefs.currency})
                </div>
                <div className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(
                    activeVehicleLogs.reduce(
                      (acc, l) =>
                        acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency),
                      0
                    ),
                    prefs.currency
                  )}
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Emissão do relatório
                </div>
                <div className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {today}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Histórico Cronológico de Manutenção
              </h3>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-60 overflow-y-auto tabular-nums">
                {activeVehicleLogs.length === 0 ? (
                  <p className="py-4 text-xs text-slate-500">
                    Nenhum registro histórico lançado ainda.
                  </p>
                ) : (
                  activeVehicleLogs.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <span className="font-mono text-slate-500 mr-2">{log.date}</span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {log.title}
                        </span>
                        <span className="text-slate-500 ml-2">({log.workshopName})</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 font-mono">
                        <span className="text-slate-600 dark:text-slate-400">
                          {formatDistance(log.odometerKm, prefs.units)}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(
                            convertCurrency(log.cost, log.currency ?? 'BRL', prefs.currency),
                            prefs.currency
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowPassport(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                {t.actions.close}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
