import { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Download,
  ExternalLink,
  FileText,
  Fuel,
  ImagePlus,
  Loader2,
  Plus,
  Receipt,
  Stethoscope,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  AttachmentCategory,
  ChargingSession,
  MaintenanceCategory,
  ServiceLog,
  UserPreferences,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import { formatCurrency, formatDistance, todayIso } from '../utils/autolife';
import { convertCurrency } from '../utils/billing';
import {
  buildAttachmentWhatsAppText,
  buildChargingSessionWhatsAppText,
  buildServiceLogWhatsAppText,
} from '../utils/whatsapp';
import { insertServiceLogToCloud, syncVehicleToCloud } from '../services/dataRepository';
import { deleteVehicleAttachment, uploadVehicleAttachment } from '../services/storageRepository';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface VehicleMedicalRecordPanelProps {
  vehicle: Vehicle;
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  attachmentsLoading: boolean;
  prefs: UserPreferences;
  cloudUserId: string | null;
  onAddServiceLog: (log: ServiceLog) => Promise<void> | void;
  onAddChargingSession: (session: ChargingSession) => void;
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

const ATTACHMENT_TYPE_LABELS: Record<AttachmentCategory, string> = {
  receipt: 'Nota da Oficina / Recibo',
  insurance: 'Seguro',
  document: 'ITV / Licenciamento / CRLV',
  vehicle_photo: 'Foto do Veículo',
  inspection: 'Vistoria / Peça',
  diagnostic: 'Laudo / Scanner',
};

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
  logs,
  chargingSessions,
  attachments,
  attachmentsLoading,
  prefs,
  cloudUserId,
  onAddServiceLog,
  onAddChargingSession,
  onAttachmentCreated,
  onAttachmentDeleted,
  onOpenCloudSettings,
  onUpdatePrefs,
}: VehicleMedicalRecordPanelProps) {
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Record form state
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

  const openModal = (initialKind: RecordKind = 'maintenance') => {
    setRecordKind(initialKind);
    setRecordDate(todayIso());
    setOdometerKm(String(vehicle.odometerKm));
    setTitle('');
    setWorkshopName('');
    setCost('');
    setNotes('');
    setPendingFile(null);
    setPendingAttCategory('receipt');
    setFormError(null);
    setShowAddModal(true);
  };

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
    if (filter === 'all') return timelineEntries;
    return timelineEntries.filter((entry) => entry.filterGroup === filter);
  }, [timelineEntries, filter]);

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

        const newLog: ServiceLog = {
          id: `log-${Date.now()}`,
          vehicleId: vehicle.id,
          date: recordDate || todayIso(),
          odometerKm: Math.max(0, Math.round(Number(odometerKm) || vehicle.odometerKm)),
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

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
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

      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Ficha Médica do Veículo — {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            Placa <span className="font-mono">{vehicle.plate}</span> ·{' '}
            <span className="font-mono">{formatDistance(vehicle.odometerKm, prefs.units)}</span> ·{' '}
            Linha do tempo completa de manutenções, revisões, abastecimentos, recargas, gastos e notas fiscais
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
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
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => openModal('maintenance')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Registro</span>
          </button>
        </div>
      </div>

      {timelineError && (
        <div className="mx-5 mt-4 p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-xs text-red-700 dark:text-red-300">
          {timelineError}
        </div>
      )}

      {/* Timeline Body */}
      <div className="p-5 sm:p-6">
        {attachmentsLoading && timelineEntries.length === 0 ? (
          <div className="flex items-center gap-2 py-8 justify-center text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando ficha médica do veículo...</span>
          </div>
        ) : timelineEntries.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Nenhum registro na ficha médica deste veículo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Adicione manutenções, revisões, abastecimentos, carregamentos elétricos, gastos e a foto da nota da oficina para acompanhar todo o histórico em ordem cronológica.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModal('maintenance')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Primeiro Registro</span>
            </button>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
            Nenhum registro encontrado para este filtro.
          </div>
        ) : (
          <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
            {visibleEntries.map((entry) => (
              <div key={entry.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute -left-6 top-1.5 w-[19px] h-[19px] rounded-full bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 flex items-center justify-center"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                </span>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-3">
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
                            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                              ·
                            </span>
                            <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums">
                              {formatDistance(entry.odometerKm, prefs.units)}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {entry.title}
                      </h3>

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
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 rounded-lg px-3 py-2">
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
                            className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Medical Record Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  Novo Registro na Ficha Médica
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {vehicle.make} {vehicle.model} · {vehicle.plate}
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
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
                    className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors ${
                      recordKind === k.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                      className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                      className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Photo of Invoice / Receipt / Insurance / ITV */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    Foto da nota, recibo, seguro ou ITV (JPG ≤ 2 MB, privado)
                  </span>
                  <select
                    value={pendingAttCategory}
                    onChange={(e) => setPendingAttCategory(e.target.value as AttachmentCategory)}
                    className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tirar Foto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => modalGalleryRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
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
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
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
