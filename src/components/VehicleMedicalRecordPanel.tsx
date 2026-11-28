import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarPlus,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Fuel,
  ImagePlus,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Receipt,
  Search,
  Share2,
  Stethoscope,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  AttachmentCategory,
  ChargingSession,
  MaintenanceCategory,
  MaintenanceItem,
  MaintenanceStatus,
  ServiceLog,
  UserPreferences,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import {
  computeMaintenanceStatus,
  daysBetween,
  formatCurrency,
  formatDistance,
  isDateRecorded,
  todayIso,
} from '../utils/autolife';
import { convertCurrency } from '../utils/billing';
import { downloadCalendarEvent } from '../utils/calendar';
import {
  buildAttachmentWhatsAppText,
  buildChargingSessionWhatsAppText,
  buildFullMedicalDossierText,
  buildMaintenanceWhatsAppText,
  buildMedicalDossierEmailUrl,
  buildServiceLogWhatsAppText,
  buildWhatsAppShareUrl,
  buildWhatsAppUrl,
  formatWhatsAppDisplay,
  sanitizeWhatsAppNumber,
} from '../utils/whatsapp';
import { downloadPdfBlob, generateVehicleFinalPdf } from '../utils/pdfReport';
import { insertServiceLogToCloud, syncVehicleToCloud } from '../services/dataRepository';
import { deleteVehicleAttachment, uploadVehicleAttachment } from '../services/storageRepository';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface VehicleMedicalRecordPanelProps {
  vehicle: Vehicle;
  maintenanceItems?: MaintenanceItem[];
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  attachmentsLoading: boolean;
  prefs: UserPreferences;
  t?: Translations;
  cloudUserId: string | null;
  cloudUserEmail?: string | null;
  onAddServiceLog: (log: ServiceLog) => Promise<void> | void;
  onAddChargingSession: (session: ChargingSession) => void;
  onMarkMaintenanceChecked?: (payload: {
    itemId: string;
    date: string;
    odometerKm: number;
    notes?: string;
  }) => void;
  onAttachmentCreated: (attachment: VehicleAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  onOpenCloudSettings: () => void;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
}

type RecordKind = 'maintenance' | 'revision' | 'fuel' | 'ev_charge' | 'expense';
type TimelineFilter = 'all' | 'maintenance' | 'fuel' | 'ev' | 'expense';

interface TimelineEntry {
  id: string;
  kind: 'log' | 'charge' | 'attachment';
  filterGroup: Exclude<TimelineFilter, 'all'>;
  date: string;
  badgeLabel: string;
  title: string;
  odometerKm: number | null;
  location: string;
  cost: number | null;
  currency: UserPreferences['currency'];
  notes: string;
  attachments: VehicleAttachment[];
  serviceLogId?: string;
  sourceLog?: ServiceLog;
  sourceCharge?: ChargingSession;
}

interface ReminderRadarEntry {
  id: string;
  sourceItem?: MaintenanceItem;
  kind: 'maintenance' | 'license' | 'insurance';
  title: string;
  status: MaintenanceStatus;
  statusLabel: string;
  dueSummary: string;
  projectedDueDate: string;
  progressPercent: number;
  effectiveIntervalDays: number;
  effectiveIntervalKm: number;
  category: MaintenanceCategory;
  urgencyRank: number;
}

const ATTACHMENT_TYPE_LABELS: Record<AttachmentCategory, string> = {
  receipt: 'Nota da Oficina / Recibo',
  insurance: 'Seguro',
  document: 'ITV / Licenciamento / CRLV',
  vehicle_photo: 'Foto do Veículo',
  inspection: 'Vistoria / Peça',
  diagnostic: 'Laudo / Scanner',
};

const FALLBACK_ITEM_TITLES: Record<string, string> = {
  oilChange: 'Troca de Óleo e Filtro',
  tireRotation: 'Calibragem e Rodízio de Pneus',
  brakeCheck: 'Pastilhas e Fluido de Freio',
  coolantCheck: 'Líquido de Arrefecimento',
  batteryHealth: 'Bateria 12V / Alta Tensão',
  timingBelt: 'Correia Dentada / Comando',
  chainDrive: 'Kit Relação / Corrente',
  suspensionCheck: 'Suspensão e Alinhamento',
  periodicRevision: 'Revisão Periódica Geral',
  docsRenewal: 'Documentação e Seguro',
};

const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function formatMonthHeading(dateIso: string): string {
  const parts = dateIso.split('-');
  if (parts.length < 2) return 'Outros registros';
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const monthName = MONTH_NAMES_PT[monthIdx] ?? parts[1];
  return `${monthName} de ${year}`;
}

function isSafeHttpsUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function VehicleMedicalRecordPanel({
  vehicle,
  maintenanceItems = [],
  logs,
  chargingSessions,
  attachments,
  attachmentsLoading,
  prefs,
  t,
  cloudUserId,
  cloudUserEmail,
  onAddServiceLog,
  onAddChargingSession,
  onMarkMaintenanceChecked,
  onAttachmentCreated,
  onAttachmentDeleted,
  onOpenCloudSettings,
  onUpdatePrefs,
}: VehicleMedicalRecordPanelProps) {
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderFilter, setReminderFilter] = useState<'urgent' | 'all'>('urgent');
  const [remindersCollapsed, setRemindersCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Linked WhatsApp & Email dossier sharing state
  const hasSavedWhatsapp = Boolean(sanitizeWhatsAppNumber(prefs.whatsappNumber, prefs.language));
  const [whatsappInput, setWhatsappInput] = useState(prefs.whatsappNumber ?? '');
  const [editingWhatsapp, setEditingWhatsapp] = useState(!hasSavedWhatsapp);
  const [whatsappFeedback, setWhatsappFeedback] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState(cloudUserEmail ?? '');
  const [dossierFeedback, setDossierFeedback] = useState<string | null>(null);
  const [dossierCopied, setDossierCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    setWhatsappInput(prefs.whatsappNumber ?? '');
    if (sanitizeWhatsAppNumber(prefs.whatsappNumber, prefs.language)) {
      setEditingWhatsapp(false);
    }
  }, [prefs.whatsappNumber, prefs.language]);

  useEffect(() => {
    if (cloudUserEmail && !recipientEmail) {
      setRecipientEmail(cloudUserEmail);
    }
  }, [cloudUserEmail, recipientEmail]);

  // Add Record form state
  const [linkedReminderItemId, setLinkedReminderItemId] = useState<string | null>(null);
  const [recordKind, setRecordKind] = useState<RecordKind>('maintenance');
  const [maintenanceCategory, setMaintenanceCategory] = useState<MaintenanceCategory>(
    MaintenanceCategory.OIL
  );
  const [recordDate, setRecordDate] = useState(todayIso());
  const [odometerKm, setOdometerKm] = useState(String(vehicle.odometerKm));
  const [title, setTitle] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  // EV Charging specific fields
  const [powerType, setPowerType] = useState<'DC' | 'AC'>('DC');
  const [energyKwh, setEnergyKwh] = useState('35');
  const [socStart, setSocStart] = useState('20');
  const [socEnd, setSocEnd] = useState('80');

  // Optional photo attachment on create
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingAttCategory, setPendingAttCategory] = useState<AttachmentCategory>('receipt');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline attachment upload on existing timeline row
  const [uploadingLogId, setUploadingLogId] = useState<string | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const inlineCameraRef = useRef<HTMLInputElement | null>(null);
  const inlineGalleryRef = useRef<HTMLInputElement | null>(null);
  const targetLogForUploadRef = useRef<ServiceLog | null>(null);

  const modalCameraRef = useRef<HTMLInputElement | null>(null);
  const modalGalleryRef = useRef<HTMLInputElement | null>(null);

  const openModal = (
    initialKind: RecordKind = 'maintenance',
    preset?: {
      linkedItemId?: string | null;
      category?: MaintenanceCategory;
      title?: string;
      attCategory?: AttachmentCategory;
    }
  ) => {
    setLinkedReminderItemId(preset?.linkedItemId ?? null);
    setRecordKind(initialKind);
    setMaintenanceCategory(preset?.category ?? MaintenanceCategory.OIL);
    setRecordDate(todayIso());
    setOdometerKm(String(vehicle.odometerKm));
    setTitle(preset?.title ?? '');
    setWorkshopName('');
    setCost('');
    setNotes('');
    setPendingFile(null);
    setPendingAttCategory(preset?.attCategory ?? 'receipt');
    setFormError(null);
    setShowAddModal(true);
  };

  // Compute upcoming/overdue reminders from maintenanceItems + document/insurance expiries
  const reminderEntries = useMemo<ReminderRadarEntry[]>(() => {
    const today = todayIso();
    const list: ReminderRadarEntry[] = [];

    const vehicleItems = maintenanceItems.filter((item) => item.vehicleId === vehicle.id);
    for (const item of vehicleItems) {
      if (item.category === MaintenanceCategory.DOCUMENTATION) continue;
      const calc = computeMaintenanceStatus(item, vehicle, prefs);
      const itemTitle =
        t?.items?.[item.titleKey]?.title ?? FALLBACK_ITEM_TITLES[item.titleKey] ?? item.titleKey;

      let statusLabel = 'Em dia';
      let dueSummary = '';
      let progressPercent = 0;
      let urgencyRank = 3;

      if (calc.status === MaintenanceStatus.PENDING) {
        statusLabel = 'Aguardando 1º registro';
        dueSummary = `Ciclo sugerido: ${calc.effectiveIntervalDays}d / ${formatDistance(calc.effectiveIntervalKm, prefs.units)}`;
        progressPercent = 15;
        urgencyRank = 2;
      } else {
        const dayRatio = calc.daysElapsed / Math.max(1, calc.effectiveIntervalDays);
        const kmRatio = calc.kmElapsed / Math.max(1, calc.effectiveIntervalKm);
        progressPercent = Math.min(100, Math.max(5, Math.round(Math.max(dayRatio, kmRatio) * 100)));

        if (calc.status === MaintenanceStatus.OVERDUE) {
          statusLabel = 'Vencido';
          urgencyRank = 0;
          const overDays = calc.daysRemaining < 0 ? `${Math.abs(calc.daysRemaining)}d atrasado` : '';
          const overKm =
            calc.kmRemaining < 0
              ? `${formatDistance(Math.abs(calc.kmRemaining), prefs.units)} excedidos`
              : '';
          dueSummary = [overDays, overKm].filter(Boolean).join(' · ') || 'Revisão imediata recomendada';
        } else if (calc.status === MaintenanceStatus.ATTENTION) {
          statusLabel = 'Vence em breve';
          urgencyRank = 1;
          dueSummary = `Faltam ${Math.max(0, calc.daysRemaining)}d ou ${formatDistance(Math.max(0, calc.kmRemaining), prefs.units)}${calc.projectedDueDate ? ` (${calc.projectedDueDate})` : ''}`;
        } else {
          statusLabel = 'Em dia';
          urgencyRank = 3;
          dueSummary = `Previsto em ${Math.max(0, calc.daysRemaining)}d ou ${formatDistance(Math.max(0, calc.kmRemaining), prefs.units)}${calc.projectedDueDate ? ` (${calc.projectedDueDate})` : ''}`;
        }
      }

      list.push({
        id: item.id,
        sourceItem: item,
        kind: 'maintenance',
        title: itemTitle,
        status: calc.status,
        statusLabel,
        dueSummary,
        projectedDueDate: calc.projectedDueDate,
        progressPercent,
        effectiveIntervalDays: calc.effectiveIntervalDays,
        effectiveIntervalKm: calc.effectiveIntervalKm,
        category: item.category,
        urgencyRank,
      });
    }

    // Add Licensing & Insurance reminders directly so the owner never forgets legal deadlines
    const hasDoc = isDateRecorded(vehicle.documentExpiryDate);
    if (hasDoc) {
      const daysLeft = daysBetween(today, vehicle.documentExpiryDate);
      const status =
        daysLeft < 0
          ? MaintenanceStatus.OVERDUE
          : daysLeft <= prefs.docReminderDays
          ? MaintenanceStatus.ATTENTION
          : MaintenanceStatus.ON_TRACK;
      list.push({
        id: `doc-license-${vehicle.id}`,
        kind: 'license',
        title: t?.garage?.docLicense ?? 'Licenciamento / ITV / CRLV',
        status,
        statusLabel:
          status === MaintenanceStatus.OVERDUE
            ? 'Vencido'
            : status === MaintenanceStatus.ATTENTION
            ? 'Vence em breve'
            : 'Em dia',
        dueSummary:
          daysLeft < 0
            ? `Venceu há ${Math.abs(daysLeft)}d (${vehicle.documentExpiryDate})`
            : `Vence em ${daysLeft}d (${vehicle.documentExpiryDate})`,
        projectedDueDate: vehicle.documentExpiryDate,
        progressPercent:
          daysLeft < 0 ? 100 : Math.min(100, Math.max(10, Math.round(((365 - daysLeft) / 365) * 100))),
        effectiveIntervalDays: 365,
        effectiveIntervalKm: 0,
        category: MaintenanceCategory.DOCUMENTATION,
        urgencyRank: status === MaintenanceStatus.OVERDUE ? 0 : status === MaintenanceStatus.ATTENTION ? 1 : 3,
      });
    } else {
      list.push({
        id: `doc-license-${vehicle.id}`,
        kind: 'license',
        title: t?.garage?.docLicense ?? 'Licenciamento / ITV / CRLV',
        status: MaintenanceStatus.PENDING,
        statusLabel: 'Data não informada',
        dueSummary: 'Registre o comprovante ou vencimento para ativar alertas',
        projectedDueDate: '',
        progressPercent: 0,
        effectiveIntervalDays: 365,
        effectiveIntervalKm: 0,
        category: MaintenanceCategory.DOCUMENTATION,
        urgencyRank: 2,
      });
    }

    const hasIns = isDateRecorded(vehicle.insuranceExpiryDate);
    if (hasIns) {
      const daysLeft = daysBetween(today, vehicle.insuranceExpiryDate);
      const status =
        daysLeft < 0
          ? MaintenanceStatus.OVERDUE
          : daysLeft <= prefs.docReminderDays
          ? MaintenanceStatus.ATTENTION
          : MaintenanceStatus.ON_TRACK;
      list.push({
        id: `doc-insurance-${vehicle.id}`,
        kind: 'insurance',
        title: t?.garage?.docInsurance ?? 'Apólice de Seguro',
        status,
        statusLabel:
          status === MaintenanceStatus.OVERDUE
            ? 'Vencido'
            : status === MaintenanceStatus.ATTENTION
            ? 'Vence em breve'
            : 'Em dia',
        dueSummary:
          daysLeft < 0
            ? `Venceu há ${Math.abs(daysLeft)}d (${vehicle.insuranceExpiryDate})`
            : `Vence em ${daysLeft}d (${vehicle.insuranceExpiryDate})`,
        projectedDueDate: vehicle.insuranceExpiryDate,
        progressPercent:
          daysLeft < 0 ? 100 : Math.min(100, Math.max(10, Math.round(((365 - daysLeft) / 365) * 100))),
        effectiveIntervalDays: 365,
        effectiveIntervalKm: 0,
        category: MaintenanceCategory.DOCUMENTATION,
        urgencyRank: status === MaintenanceStatus.OVERDUE ? 0 : status === MaintenanceStatus.ATTENTION ? 1 : 3,
      });
    } else {
      list.push({
        id: `doc-insurance-${vehicle.id}`,
        kind: 'insurance',
        title: t?.garage?.docInsurance ?? 'Apólice de Seguro',
        status: MaintenanceStatus.PENDING,
        statusLabel: 'Data não informada',
        dueSummary: 'Anexe a apólice ou informe a data para lembretes',
        projectedDueDate: '',
        progressPercent: 0,
        effectiveIntervalDays: 365,
        effectiveIntervalKm: 0,
        category: MaintenanceCategory.DOCUMENTATION,
        urgencyRank: 2,
      });
    }

    return list.sort((a, b) => a.urgencyRank - b.urgencyRank || b.progressPercent - a.progressPercent);
  }, [maintenanceItems, vehicle, prefs, t]);

  const urgentReminders = useMemo(
    () => reminderEntries.filter((r) => r.status !== MaintenanceStatus.ON_TRACK),
    [reminderEntries]
  );

  const displayedReminders = useMemo(() => {
    if (reminderFilter === 'all') return reminderEntries;
    return urgentReminders.length > 0 ? urgentReminders : reminderEntries.slice(0, 4);
  }, [reminderFilter, reminderEntries, urgentReminders]);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    const vehicleLogs = logs.filter((l) => l.vehicleId === vehicle.id);
    for (const log of vehicleLogs) {
      const logAttachments = attachments.filter((a) => a.serviceLogId === log.id);
      let badgeLabel = 'Manutenção';
      let filterGroup: Exclude<TimelineFilter, 'all'> = 'maintenance';

      if (log.category === MaintenanceCategory.REVISION) {
        badgeLabel = 'Revisão';
      } else if (log.category === MaintenanceCategory.FUEL) {
        badgeLabel = 'Abastecimento';
        filterGroup = 'fuel';
      } else if (log.category === MaintenanceCategory.EXPENSE) {
        badgeLabel = 'Gasto';
        filterGroup = 'expense';
      }

      entries.push({
        id: `log-${log.id}`,
        kind: 'log',
        filterGroup,
        date: log.date,
        badgeLabel,
        title: log.title,
        odometerKm: log.odometerKm,
        location: log.workshopName,
        cost: log.cost,
        currency: log.currency ?? 'BRL',
        notes: log.notes,
        attachments: logAttachments,
        serviceLogId: log.id,
        sourceLog: log,
      });
    }

    const vehicleCharges = chargingSessions.filter((s) => s.vehicleId === vehicle.id);
    for (const chg of vehicleCharges) {
      entries.push({
        id: `chg-${chg.id}`,
        kind: 'charge',
        filterGroup: 'ev',
        date: chg.date,
        badgeLabel: 'Carregamento EV',
        title: `Recarga ${chg.powerType} · ${chg.energyKwh.toFixed(1)} kWh (${chg.socStart}% → ${chg.socEnd}%)`,
        odometerKm: null,
        location: chg.stationName,
        cost: chg.cost,
        currency: chg.currency ?? 'BRL',
        notes: '',
        attachments: [],
        sourceCharge: chg,
      });
    }

    const standaloneAttachments = attachments.filter(
      (a) => a.vehicleId === vehicle.id && !a.serviceLogId
    );
    for (const att of standaloneAttachments) {
      entries.push({
        id: `att-${att.id}`,
        kind: 'attachment',
        filterGroup: 'expense',
        date: att.attachmentDate,
        badgeLabel: ATTACHMENT_TYPE_LABELS[att.fileCategory] ?? 'Nota / Documento',
        title: att.fileName,
        odometerKm: null,
        location: 'Arquivo Privado',
        cost: null,
        currency: prefs.currency,
        notes: att.notes || '',
        attachments: [att],
      });
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, chargingSessions, attachments, vehicle.id, prefs.currency]);

  const visibleEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return timelineEntries.filter((entry) => {
      if (filter !== 'all' && entry.filterGroup !== filter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.location.toLowerCase().includes(q) ||
        entry.badgeLabel.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q) ||
        entry.date.includes(q)
      );
    });
  }, [timelineEntries, filter, searchQuery]);

  // Group timeline entries by Month/Year for structured medical-record scanning
  const groupedEntries = useMemo(() => {
    const groups: { monthKey: string; label: string; totalCost: number; entries: TimelineEntry[] }[] = [];
    const map = new Map<string, { monthKey: string; label: string; totalCost: number; entries: TimelineEntry[] }>();

    for (const entry of visibleEntries) {
      const monthKey = entry.date.slice(0, 7) || 'outros';
      let bucket = map.get(monthKey);
      if (!bucket) {
        bucket = {
          monthKey,
          label: formatMonthHeading(entry.date),
          totalCost: 0,
          entries: [],
        };
        map.set(monthKey, bucket);
        groups.push(bucket);
      }
      bucket.entries.push(entry);
      if (entry.cost !== null) {
        bucket.totalCost += convertCurrency(entry.cost, entry.currency ?? 'BRL', prefs.currency);
      }
    }
    return groups;
  }, [visibleEntries, prefs.currency]);

  // Real clinical summary metrics
  const totalInvested = useMemo(
    () =>
      timelineEntries.reduce((sum, e) => {
        if (e.cost === null) return sum;
        return sum + convertCurrency(e.cost, e.currency ?? 'BRL', prefs.currency);
      }, 0),
    [timelineEntries, prefs.currency]
  );

  const vehicleAttachmentsCount = useMemo(
    () => attachments.filter((a) => a.vehicleId === vehicle.id).length,
    [attachments, vehicle.id]
  );

  const overdueCount = useMemo(
    () => reminderEntries.filter((r) => r.status === MaintenanceStatus.OVERDUE).length,
    [reminderEntries]
  );
  const attentionCount = useMemo(
    () => reminderEntries.filter((r) => r.status === MaintenanceStatus.ATTENTION).length,
    [reminderEntries]
  );

  const topUrgentReminder = reminderEntries[0] ?? null;
  const latestEntry = timelineEntries[0] ?? null;

  const dossierEntries = useMemo(
    () =>
      timelineEntries.map((entry) => ({
        date: entry.date,
        badgeLabel: entry.badgeLabel,
        title: entry.title,
        odometerKm: entry.odometerKm,
        location: entry.location,
        cost: entry.cost,
        currency: entry.currency,
        notes: entry.notes,
      })),
    [timelineEntries]
  );

  const upcomingDossierReminders = useMemo(
    () =>
      reminderEntries
        .filter((r) => r.status === MaintenanceStatus.OVERDUE || r.status === MaintenanceStatus.ATTENTION)
        .slice(0, 4)
        .map((r) => ({
          title: r.title,
          statusLabel: r.statusLabel,
          dueSummary: r.dueSummary,
        })),
    [reminderEntries]
  );

  const fullDossierText = useMemo(
    () =>
      buildFullMedicalDossierText({
        vehicle,
        entries: dossierEntries,
        currency: prefs.currency,
        units: prefs.units,
        ownerEmail: cloudUserEmail,
        upcomingReminders: upcomingDossierReminders,
      }),
    [vehicle, dossierEntries, prefs.currency, prefs.units, cloudUserEmail, upcomingDossierReminders]
  );

  const waDossierText = useMemo(
    () =>
      buildFullMedicalDossierText({
        vehicle,
        entries: dossierEntries,
        currency: prefs.currency,
        units: prefs.units,
        ownerEmail: cloudUserEmail,
        upcomingReminders: upcomingDossierReminders,
        maxChars: 1700,
      }),
    [vehicle, dossierEntries, prefs.currency, prefs.units, cloudUserEmail, upcomingDossierReminders]
  );

  const shareHistoryWhatsAppUrl = useMemo(() => {
    const activePhone = hasSavedWhatsapp ? prefs.whatsappNumber : whatsappInput;
    return buildWhatsAppShareUrl(waDossierText, activePhone, prefs.language);
  }, [waDossierText, hasSavedWhatsapp, prefs.whatsappNumber, whatsappInput, prefs.language]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (pendingFile && !cloudUserId) {
      setFormError(
        'Entre com sua conta (Google, Apple, Facebook ou e-mail) para salvar a foto da nota no Storage privado.'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (recordKind === 'ev_charge') {
        const kwh = Math.max(0.1, Number(energyKwh) || 0);
        const parsedCost = Math.max(0, Number(cost) || 0);
        const start = Math.min(100, Math.max(0, Number(socStart) || 0));
        const end = Math.min(100, Math.max(start, Number(socEnd) || 80));

        const newSession: ChargingSession = {
          id: `chg-${Date.now()}`,
          vehicleId: vehicle.id,
          date: recordDate || todayIso(),
          stationName: workshopName.trim() || title.trim() || 'Estação de Recarga',
          powerType,
          energyKwh: kwh,
          cost: parsedCost,
          currency: prefs.currency,
          socStart: start,
          socEnd: end,
        };
        onAddChargingSession(newSession);

        if (pendingFile && cloudUserId) {
          await syncVehicleToCloud(cloudUserId, vehicle);
          const uploaded = await uploadVehicleAttachment({
            userId: cloudUserId,
            vehicleId: vehicle.id,
            file: pendingFile,
            category: pendingAttCategory,
            attachmentDate: newSession.date,
            notes: `Recarga ${newSession.stationName} (${kwh} kWh)`.slice(0, 200),
          });
          onAttachmentCreated(uploaded);
        }
      } else {
        const cleanTitle =
          title.trim() ||
          (recordKind === 'revision'
            ? 'Revisão periódica'
            : recordKind === 'fuel'
            ? 'Abastecimento'
            : recordKind === 'expense'
            ? 'Despesa do veículo'
            : 'Manutenção preventiva');

        const category =
          recordKind === 'revision'
            ? MaintenanceCategory.REVISION
            : recordKind === 'fuel'
            ? MaintenanceCategory.FUEL
            : recordKind === 'expense'
            ? MaintenanceCategory.EXPENSE
            : maintenanceCategory;

        const cleanDate = recordDate || todayIso();
        const cleanKm = Math.max(0, Math.round(Number(odometerKm) || vehicle.odometerKm));

        const newLog: ServiceLog = {
          id: `log-${Date.now()}`,
          vehicleId: vehicle.id,
          date: cleanDate,
          odometerKm: cleanKm,
          category,
          title: cleanTitle,
          cost: Math.max(0, Number(cost) || 0),
          currency: prefs.currency,
          workshopName:
            workshopName.trim() ||
            (recordKind === 'fuel' ? 'Posto de Combustível' : 'Oficina / Registro Próprio'),
          notes: notes.trim(),
        };
        await onAddServiceLog(newLog);

        // If launched from a reminder in the Radar, also reset its next maintenance cycle
        if (linkedReminderItemId && onMarkMaintenanceChecked) {
          onMarkMaintenanceChecked({
            itemId: linkedReminderItemId,
            date: cleanDate,
            odometerKm: cleanKm,
            notes: notes.trim() || undefined,
          });
        }

        if (pendingFile && cloudUserId) {
          await syncVehicleToCloud(cloudUserId, vehicle);
          await insertServiceLogToCloud(cloudUserId, newLog);
          const uploaded = await uploadVehicleAttachment({
            userId: cloudUserId,
            vehicleId: vehicle.id,
            file: pendingFile,
            category: pendingAttCategory,
            attachmentDate: newLog.date,
            notes: notes.trim() || cleanTitle,
            serviceLogId: newLog.id,
          });
          onAttachmentCreated(uploaded);
        }
      }

      setShowAddModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar o registro.');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerInlineUpload = (logId: string, source: 'camera' | 'gallery') => {
    if (!cloudUserId) {
      onOpenCloudSettings();
      return;
    }
    const found = logs.find((l) => l.id === logId) ?? null;
    targetLogForUploadRef.current = found;
    if (source === 'camera') {
      inlineCameraRef.current?.click();
    } else {
      inlineGalleryRef.current?.click();
    }
  };

  const handleInlineFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const targetLog = targetLogForUploadRef.current;
    if (!file || !cloudUserId || !targetLog) return;

    setUploadingLogId(targetLog.id);
    setTimelineError(null);
    try {
      await syncVehicleToCloud(cloudUserId, vehicle);
      await insertServiceLogToCloud(cloudUserId, targetLog);
      const uploaded = await uploadVehicleAttachment({
        userId: cloudUserId,
        vehicleId: vehicle.id,
        file,
        category: 'receipt',
        attachmentDate: targetLog.date,
        notes: targetLog.title,
        serviceLogId: targetLog.id,
      });
      onAttachmentCreated(uploaded);
    } catch (err) {
      setTimelineError(err instanceof Error ? err.message : 'Erro ao enviar foto da nota.');
    } finally {
      setUploadingLogId(null);
      targetLogForUploadRef.current = null;
    }
  };

  const handleDeleteAttachment = async (att: VehicleAttachment) => {
    if (!cloudUserId) return;
    setTimelineError(null);
    try {
      await deleteVehicleAttachment(cloudUserId, att);
      onAttachmentDeleted(att.id);
    } catch (err) {
      setTimelineError(err instanceof Error ? err.message : 'Erro ao remover anexo.');
    }
  };

  const renderBadgeIcon = (entry: TimelineEntry) => {
    if (entry.filterGroup === 'fuel') {
      return <Fuel className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    if (entry.filterGroup === 'ev') {
      return <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    }
    if (entry.filterGroup === 'expense') {
      return <Receipt className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />;
    }
    return <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />;
  };

  const renderReminderStatusIcon = (status: MaintenanceStatus) => {
    if (status === MaintenanceStatus.OVERDUE) {
      return <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />;
    }
    if (status === MaintenanceStatus.ATTENTION) {
      return <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
    }
    if (status === MaintenanceStatus.PENDING) {
      return <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />;
    }
    return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
  };

  const effectiveWaNumber = hasSavedWhatsapp ? prefs.whatsappNumber : whatsappInput;
  const waDossierUrl = buildWhatsAppUrl(effectiveWaNumber, prefs.language, waDossierText);
  const cleanEmailTarget = recipientEmail.trim() || (cloudUserEmail ?? '');
  const emailDossierUrl = cleanEmailTarget
    ? buildMedicalDossierEmailUrl({
        recipientEmail: cleanEmailTarget,
        vehicle,
        dossierText: fullDossierText,
      })
    : null;

  const handleSaveWhatsappHere = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = whatsappInput.trim();
    if (!sanitizeWhatsAppNumber(clean, prefs.language)) {
      setWhatsappFeedback('Informe um WhatsApp válido com DDD/DDI (ex.: +55 11 99999-8888).');
      return;
    }
    onUpdatePrefs({ whatsappNumber: clean });
    setEditingWhatsapp(false);
    setWhatsappFeedback('WhatsApp salvo permanentemente na conta.');
  };

  const handleCopyFullDossier = async () => {
    try {
      await navigator.clipboard.writeText(fullDossierText.replace(/\*/g, ''));
      setDossierCopied(true);
      setDossierFeedback('Ficha técnica completa copiada!');
      window.setTimeout(() => setDossierCopied(false), 2500);
    } catch {
      setDossierFeedback('Use os botões de WhatsApp ou E-mail ao lado.');
    }
  };

  const handleDownloadMedicalPdf = async () => {
    setGeneratingPdf(true);
    setDossierFeedback(null);
    try {
      const res = await generateVehicleFinalPdf({
        vehicle,
        maintenanceItems,
        logs,
        chargingSessions,
        attachments,
        prefs,
        t,
        ownerEmail: cleanEmailTarget || cloudUserEmail,
      });
      downloadPdfBlob(res.blob, res.filename);
      setDossierFeedback(
        `PDF "${res.filename}" gerado com ${res.embeddedPhotosCount} foto(s) incorporada(s).`
      );
    } catch (err) {
      setDossierFeedback(
        err instanceof Error ? err.message : 'Não foi possível gerar o PDF.'
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  const docLicenseOk =
    isDateRecorded(vehicle.documentExpiryDate) &&
    daysBetween(todayIso(), vehicle.documentExpiryDate) > prefs.docReminderDays;
  const docInsuranceOk =
    isDateRecorded(vehicle.insuranceExpiryDate) &&
    daysBetween(todayIso(), vehicle.insuranceExpiryDate) > prefs.docReminderDays;

  return (
    <section className="autolife-glass rounded-2xl overflow-hidden">
      <input
        ref={inlineCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInlineFileSelected}
        className="hidden"
      />
      <input
        ref={inlineGalleryRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleInlineFileSelected}
        className="hidden"
      />

      {/* Zone 1: Clinical Header */}
      <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <h2 className="font-display text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              Prontuário &amp; Ficha Médica — {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              Placa <span className="font-mono text-slate-700 dark:text-slate-300">{vehicle.plate}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {formatDistance(vehicle.odometerKm, prefs.units)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{vehicle.powertrain.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Pneus {vehicle.tirePressurePsi}
              {vehicle.rearTirePressurePsi ? `/${vehicle.rearTirePressurePsi}` : ''} PSI
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={shareHistoryWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              const clean = whatsappInput.trim();
              if (!hasSavedWhatsapp && sanitizeWhatsAppNumber(clean, prefs.language)) {
                onUpdatePrefs({ whatsappNumber: clean });
                setEditingWhatsapp(false);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0"
            title="Gerar e enviar todo o histórico de manutenção via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar Histórico</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={() => openModal('maintenance')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-sky-950/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Registro</span>
          </button>
        </div>
      </div>

      {/* Zone 2: 4-Metric Clinical Summary Strip (Flat hairline-divided grid, zero nested cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/10 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/50 tabular-nums">
        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Radar de Atenção
          </div>
          {overdueCount > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
                {attentionCount > 0 ? ` · ${attentionCount} próximo${attentionCount > 1 ? 's' : ''}` : ''}
              </span>
            </div>
          ) : attentionCount > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <BellRing className="w-3.5 h-3.5 shrink-0" />
              <span>{attentionCount} vence em breve</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Sem urgências agora</span>
            </div>
          )}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {topUrgentReminder ? `${topUrgentReminder.title}` : 'Checklist preventivo ativo'}
          </div>
        </div>

        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Documentos &amp; Seguro
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {docLicenseOk && docInsuranceOk
              ? 'Ambos regulares'
              : !isDateRecorded(vehicle.documentExpiryDate) && !isDateRecorded(vehicle.insuranceExpiryDate)
              ? 'Datas não informadas'
              : 'Conferir vencimentos'}
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
            Doc: {isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : '—'} · Seg:{' '}
            {isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : '—'}
          </div>
        </div>

        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Último Atendimento
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {latestEntry ? latestEntry.title : 'Nenhum registro'}
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
            {latestEntry
              ? `${latestEntry.date}${
                  latestEntry.odometerKm !== null
                    ? ` · ${formatDistance(latestEntry.odometerKm, prefs.units)}`
                    : ''
                }`
              : 'Registre a primeira manutenção'}
          </div>
        </div>

        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Investimento Documentado
          </div>
          <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalInvested, prefs.currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {timelineEntries.length} registro{timelineEntries.length === 1 ? '' : 's'} ·{' '}
            {vehicleAttachmentsCount} anexo{vehicleAttachmentsCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Zone 3: Reminder Radar — Tying future obligations directly to medical record actions */}
      {reminderEntries.length > 0 && (
        <div className="border-b border-slate-200/80 dark:border-white/10">
          <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40 dark:bg-[#081020]/40">
            <div className="flex items-center gap-2 min-w-0">
              <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Radar de Lembretes — Próximas Revisões e Prazos
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Registre em 1 clique ao realizar ou envie para sua agenda e WhatsApp para não esquecer
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setReminderFilter('urgent')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                    reminderFilter === 'urgent'
                      ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Atenção ({urgentReminders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReminderFilter('all')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap ${
                    reminderFilter === 'all'
                      ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  Todos ({reminderEntries.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setRemindersCollapsed((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap"
              >
                <span>{remindersCollapsed ? 'Expandir' : 'Recolher'}</span>
                {remindersCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {!remindersCollapsed && (
            <div className="divide-y divide-slate-200/80 dark:divide-white/10">
              {displayedReminders.map((rem) => {
                const statusTextClass =
                  rem.status === MaintenanceStatus.OVERDUE
                    ? 'text-red-600 dark:text-red-400'
                    : rem.status === MaintenanceStatus.ATTENTION
                    ? 'text-amber-600 dark:text-amber-400'
                    : rem.status === MaintenanceStatus.PENDING
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-emerald-600 dark:text-emerald-400';

                const barColorClass =
                  rem.status === MaintenanceStatus.OVERDUE
                    ? 'bg-red-600 dark:bg-red-500'
                    : rem.status === MaintenanceStatus.ATTENTION
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : rem.status === MaintenanceStatus.PENDING
                    ? 'bg-slate-400 dark:bg-slate-600'
                    : 'bg-emerald-600 dark:bg-emerald-500';

                const reminderMessage = buildMaintenanceWhatsAppText({
                  vehicle,
                  serviceTitle: rem.title,
                  statusLabel: rem.statusLabel,
                  projectedDueDate: rem.projectedDueDate,
                  effectiveIntervalDays: rem.effectiveIntervalDays,
                  effectiveIntervalKm: rem.effectiveIntervalKm || vehicle.odometerKm,
                  units: prefs.units,
                  notes: rem.dueSummary,
                });

                return (
                  <div
                    key={rem.id}
                    className="px-5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {rem.title}
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          ·
                        </span>
                        <span className={`inline-flex items-center gap-1 font-medium ${statusTextClass}`}>
                          {renderReminderStatusIcon(rem.status)}
                          <span>{rem.statusLabel}</span>
                        </span>
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                          ·
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                          {rem.dueSummary}
                        </span>
                      </div>

                      <div className="w-full max-w-md h-1.5 rounded-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColorClass}`}
                          style={{ width: `${Math.max(4, rem.progressPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          openModal(rem.kind === 'maintenance' ? 'maintenance' : 'expense', {
                            linkedItemId: rem.sourceItem?.id ?? null,
                            category: rem.category,
                            title: rem.title,
                            attCategory:
                              rem.kind === 'insurance'
                                ? 'insurance'
                                : rem.kind === 'license'
                                ? 'document'
                                : 'receipt',
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0"
                      >
                        <Check className="w-3 h-3" />
                        <span>Registrar agora</span>
                      </button>

                      {rem.projectedDueDate && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadCalendarEvent({
                              title: `${rem.title} — ${vehicle.make} ${vehicle.model}`,
                              description: `${vehicle.plate} · ${rem.dueSummary}`,
                              dateIso: rem.projectedDueDate,
                              filename: `lembrete-${vehicle.plate}-${rem.id}.ics`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                          title="Salvar alerta no Google Agenda / Apple Calendar (.ics)"
                        >
                          <CalendarPlus className="w-3 h-3" />
                          <span>Agenda</span>
                        </button>
                      )}

                      <WhatsAppConnectButton
                        whatsappNumber={prefs.whatsappNumber}
                        language={prefs.language}
                        compact
                        label="Lembrar"
                        title="Enviar este lembrete para o WhatsApp"
                        message={reminderMessage}
                        onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Zone 4: Direct Dispatch Strip (Linked WhatsApp + Email — Flat hairline bar) */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/50 space-y-2.5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 flex-1 min-w-0">
            {/* Linked WhatsApp */}
            <div className="flex items-center gap-2 min-w-0">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {hasSavedWhatsapp && !editingWhatsapp ? (
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    WhatsApp:
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappInput(prefs.whatsappNumber ?? '');
                      setWhatsappFeedback(null);
                      setEditingWhatsapp(true);
                    }}
                    className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap"
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveWhatsappHere} className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    placeholder="WhatsApp (+55 11 99999-8888)"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    className="w-48 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap shrink-0"
                  >
                    Salvar
                  </button>
                  {hasSavedWhatsapp && (
                    <button
                      type="button"
                      onClick={() => setEditingWhatsapp(false)}
                      className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    >
                      Cancelar
                    </button>
                  )}
                </form>
              )}
            </div>

            <span aria-hidden="true" className="hidden sm:inline text-slate-300 dark:text-slate-700">
              |
            </span>

            {/* Linked Email */}
            <div className="flex items-center gap-2 min-w-0 flex-1 max-w-sm">
              <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <input
                type="email"
                aria-label="E-mail para envio da ficha"
                placeholder="email@exemplo.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full min-w-0 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {waDossierUrl ? (
              <a
                href={waDossierUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const clean = whatsappInput.trim();
                  if (!hasSavedWhatsapp && sanitizeWhatsAppNumber(clean, prefs.language)) {
                    onUpdatePrefs({ whatsappNumber: clean });
                    setEditingWhatsapp(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Enviar para meu WhatsApp</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingWhatsapp(true);
                  setWhatsappFeedback('Salve seu WhatsApp ao lado para envio direto em 1 clique.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Configurar WhatsApp</span>
              </button>
            )}

            {emailDossierUrl ? (
              <a
                href={emailDossierUrl}
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(fullDossierText.replace(/\*/g, ''))
                    .catch(() => {});
                  setDossierFeedback(
                    `Abrindo seu e-mail para ${cleanEmailTarget} (texto completo também copiado).`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Enviar Ficha por E-mail</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setDossierFeedback('Informe um e-mail acima para enviar a ficha técnica completa.')
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Enviar Ficha por E-mail</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleCopyFullDossier()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
            >
              {dossierCopied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{dossierCopied ? 'Copiado' : 'Copiar Ficha'}</span>
            </button>

            <button
              type="button"
              disabled={generatingPdf}
              onClick={() => void handleDownloadMedicalPdf()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-sky-200 dark:border-sky-500/40 bg-sky-50/70 dark:bg-sky-950/35 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-950/60 whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {generatingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>PDF Completo</span>
            </button>
          </div>
        </div>

        {(whatsappFeedback || dossierFeedback) && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            {whatsappFeedback || dossierFeedback}
          </p>
        )}
      </div>

      {/* Zone 5: Timeline Toolbar (Search + Category Filter) */}
      <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar serviço, oficina, nota ou data..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10 rounded-xl w-fit">
          {(
            [
              { id: 'all', label: `Todos (${timelineEntries.length})` },
              { id: 'maintenance', label: 'Manutenções & Revisões' },
              { id: 'fuel', label: 'Abastecimentos' },
              { id: 'ev', label: 'Carregamentos EV' },
              { id: 'expense', label: 'Gastos & Notas' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {timelineError && (
        <div className="mx-5 mt-4 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
          {timelineError}
        </div>
      )}

      {/* Chronological Timeline Body Grouped by Month */}
      <div className="p-5 sm:p-6">
        {attachmentsLoading && timelineEntries.length === 0 ? (
          <div className="flex items-center gap-2 py-8 justify-center text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando prontuário médico do veículo...</span>
          </div>
        ) : timelineEntries.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Nenhum registro lançado no histórico deste veículo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Clique em “Registrar agora” nos lembretes acima ou adicione manutenções, abastecimentos, recargas e fotos das notas fiscais para construir a ficha técnica completa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModal('maintenance')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Primeiro Registro</span>
            </button>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhum registro encontrado para essa busca ou filtro.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="space-y-7">
            {groupedEntries.map((group) => (
              <div key={group.monthKey} className="space-y-3">
                {/* Month Divider Header */}
                <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-white/10">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {group.label}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      {group.entries.length} {group.entries.length === 1 ? 'item' : 'itens'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(group.totalCost, prefs.currency)}
                    </span>
                  </div>
                </div>

                {/* Hairline-separated Timeline Entries (No nested cards inside cards) */}
                <div className="relative pl-6 divide-y divide-slate-200/80 dark:divide-white/10 before:content-[''] before:absolute before:left-[9px] before:top-3 before:bottom-3 before:w-px before:bg-slate-200 dark:before:bg-white/15">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="relative py-3.5 first:pt-1 last:pb-1 space-y-2.5">
                      <span
                        aria-hidden="true"
                        className="absolute -left-6 top-4 first:top-1.5 w-[19px] h-[19px] rounded-full bg-white dark:bg-[#0c1629] border-2 border-sky-600 dark:border-sky-400 flex items-center justify-center"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />
                      </span>

                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {entry.date}
                            </span>
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                              ·
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
                              {renderBadgeIcon(entry)}
                              <span>{entry.badgeLabel}</span>
                            </span>
                            {entry.odometerKm !== null && (
                              <>
                                <span
                                  aria-hidden="true"
                                  className="text-slate-300 dark:text-slate-700"
                                >
                                  ·
                                </span>
                                <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                                  {formatDistance(entry.odometerKm, prefs.units)}
                                </span>
                              </>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {entry.title}
                          </h4>

                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            Oficina / Local:{' '}
                            <strong className="font-medium text-slate-800 dark:text-slate-200">
                              {entry.location}
                            </strong>
                          </div>
                        </div>

                        <div className="flex sm:flex-col sm:items-end justify-between gap-2 shrink-0">
                          {entry.cost !== null && (
                            <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                              {formatCurrency(
                                convertCurrency(entry.cost, entry.currency ?? 'BRL', prefs.currency),
                                prefs.currency
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5">
                            {entry.kind === 'log' && entry.serviceLogId && (
                              <>
                                  <button
                                    type="button"
                                    disabled={uploadingLogId === entry.serviceLogId}
                                    onClick={() => triggerInlineUpload(entry.serviceLogId!, 'camera')}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap"
                                    title="Tirar foto da nota"
                                  >
                                    {uploadingLogId === entry.serviceLogId ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Camera className="w-3 h-3" />
                                    )}
                                    <span>Foto da Nota</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={uploadingLogId === entry.serviceLogId}
                                    onClick={() => triggerInlineUpload(entry.serviceLogId!, 'gallery')}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                                    title="Escolher nota da galeria"
                                  >
                                    <ImagePlus className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              <WhatsAppConnectButton
                                whatsappNumber={prefs.whatsappNumber}
                                language={prefs.language}
                                compact
                                label="WhatsApp"
                                message={
                                  entry.sourceLog
                                    ? buildServiceLogWhatsAppText({
                                        vehicle,
                                        log: entry.sourceLog,
                                        currency: prefs.currency,
                                        units: prefs.units,
                                        badgeLabel: entry.badgeLabel,
                                        attachmentUrl: entry.attachments[0]?.signedUrl,
                                      })
                                    : entry.sourceCharge
                                    ? buildChargingSessionWhatsAppText({
                                        vehicle,
                                        session: entry.sourceCharge,
                                        currency: prefs.currency,
                                      })
                                    : entry.attachments[0]
                                    ? buildAttachmentWhatsAppText({
                                        vehicle,
                                        attachment: entry.attachments[0],
                                        categoryLabel: entry.badgeLabel,
                                      })
                                    : `${vehicle.make} ${vehicle.model}: ${entry.title}`
                                }
                                onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                              />
                            </div>
                          </div>
                        </div>

                        {entry.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-[#081020]/60 border border-slate-200/70 dark:border-white/10 rounded-xl px-3 py-2">
                            {entry.notes}
                          </p>
                        )}

                        {entry.attachments.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                            {entry.attachments.map((att) => {
                              const isImage = att.mimeType.startsWith('image/');
                              const safeHref = isSafeHttpsUrl(att.signedUrl) ? att.signedUrl : undefined;
                              return (
                                <div
                                  key={att.id}
                                  className="flex items-center gap-3 p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/70"
                                >
                                {isImage && safeHref ? (
                                  <a
                                    href={safeHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 block"
                                  >
                                    <img
                                      src={safeHref}
                                      alt={att.fileName}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ) : (
                                  <div className="w-12 h-12 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1 space-y-1">
                                  <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {att.fileName}
                                  </div>
                                  <div className="flex items-center gap-2.5 text-[11px]">
                                    {safeHref && (
                                      <>
                                        <a
                                          href={safeHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                          <span>Ver</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                        <a
                                          href={safeHref}
                                          download={att.fileName}
                                          className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:underline"
                                        >
                                          <Download className="w-2.5 h-2.5" />
                                          <span>Baixar</span>
                                        </a>
                                      </>
                                    )}
                                    {cloudUserId && (
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteAttachment(att)}
                                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 ml-auto"
                                        aria-label="Apagar nota"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Medical Record Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="autolife-glass rounded-2xl max-w-lg w-full p-6 space-y-4 my-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  {linkedReminderItemId
                    ? 'Concluir Lembrete e Registrar na Ficha'
                    : 'Novo Registro na Ficha Médica'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {vehicle.make} {vehicle.model} · {vehicle.plate}
                  {linkedReminderItemId ? ' · Atualiza automaticamente o próximo ciclo' : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              {/* Record Kind */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10">
                {(
                  [
                    { id: 'maintenance', label: 'Manutenção' },
                    { id: 'revision', label: 'Revisão' },
                    { id: 'fuel', label: 'Abastec.' },
                    { id: 'ev_charge', label: 'Recarga EV' },
                    { id: 'expense', label: 'Gasto' },
                  ] as const
                ).map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setRecordKind(k.id)}
                    className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      recordKind === k.id
                        ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>

              {recordKind === 'maintenance' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Sistema / Categoria
                  </label>
                  <select
                    value={maintenanceCategory}
                    onChange={(e) => setMaintenanceCategory(e.target.value as MaintenanceCategory)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  >
                    <option value={MaintenanceCategory.OIL}>Óleo &amp; Filtros</option>
                    <option value={MaintenanceCategory.BRAKES}>Freios</option>
                    <option value={MaintenanceCategory.TIRES}>Pneus &amp; Alinhamento</option>
                    <option value={MaintenanceCategory.COOLANT}>Arrefecimento</option>
                    <option value={MaintenanceCategory.BATTERY}>Bateria</option>
                    <option value={MaintenanceCategory.SUSPENSION}>Suspensão</option>
                    <option value={MaintenanceCategory.TIMING_BELT}>Correia Dentada</option>
                    <option value={MaintenanceCategory.CHAIN_DRIVE}>Kit Relação / Corrente</option>
                    <option value={MaintenanceCategory.DOCUMENTATION}>Documentação / ITV / Seguro</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    required
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>

                {recordKind !== 'ev_charge' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Km
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={odometerKm}
                      onChange={(e) => setOdometerKm(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Energia (kWh)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0.1}
                      required
                      value={energyKwh}
                      onChange={(e) => setEnergyKwh(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>

              {recordKind === 'ev_charge' ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Tipo
                    </label>
                    <select
                      value={powerType}
                      onChange={(e) => setPowerType(e.target.value as 'AC' | 'DC')}
                      className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                    >
                      <option value="DC">DC</option>
                      <option value="AC">AC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Bateria Início %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={socStart}
                      onChange={(e) => setSocStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Bateria Fim %
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={socEnd}
                      onChange={(e) => setSocEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    O que foi feito
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      recordKind === 'fuel'
                        ? 'Descrição do abastecimento'
                        : recordKind === 'revision'
                        ? 'Descrição da revisão'
                        : recordKind === 'expense'
                        ? 'Descrição do gasto ou seguro'
                        : 'Descrição da manutenção realizada'
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {recordKind === 'fuel'
                      ? 'Posto'
                      : recordKind === 'ev_charge'
                      ? 'Estação / Eletroposto'
                      : 'Oficina / Estabelecimento'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      recordKind === 'fuel'
                        ? 'Nome do posto'
                        : recordKind === 'ev_charge'
                        ? 'Nome da estação de recarga'
                        : 'Nome da oficina ou próprio'
                    }
                    value={workshopName}
                    onChange={(e) => setWorkshopName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Valor ({prefs.currency})
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {recordKind !== 'ev_charge' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Observações
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Peças trocadas, garantia, detalhes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Photo of Invoice / Receipt / Insurance / ITV */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#081020]/60 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Foto da nota, recibo, seguro ou ITV (JPG ≤ 2 MB, privado)
                  </span>
                  <select
                    value={pendingAttCategory}
                    onChange={(e) => setPendingAttCategory(e.target.value as AttachmentCategory)}
                    className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200"
                  >
                    <option value="receipt">Nota da Oficina / Recibo</option>
                    <option value="insurance">Seguro</option>
                    <option value="document">ITV / Documento</option>
                    <option value="inspection">Vistoria / Peça</option>
                  </select>
                </div>

                <input
                  ref={modalCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPendingFile(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
                <input
                  ref={modalGalleryRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPendingFile(f);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => modalCameraRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 text-white"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tirar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => modalGalleryRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Galeria</span>
                  </button>
                  {pendingFile && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">
                      {pendingFile.name}
                    </span>
                  )}
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-600 dark:text-red-400">{formError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Salvar Registro</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
