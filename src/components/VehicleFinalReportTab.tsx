import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileDown,
  FileText,
  Fuel,
  ImagePlus,
  Loader2,
  Mail,
  MessageCircle,
  Printer,
  Receipt,
  Search,
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
  formatCurrency,
  formatDistance,
  isDateRecorded,
  todayIso,
} from '../utils/autolife';
import { convertCurrency } from '../utils/billing';
import {
  ATTACHMENT_CATEGORY_LABELS,
  buildVehicleTimelineEntries,
  downloadPdfBlob,
  FinalReportTimelineItem,
  generateVehicleFinalPdf,
  sharePdfViaWebShare,
} from '../utils/pdfReport';
import {
  buildFullMedicalDossierText,
  buildMedicalDossierEmailUrl,
  buildWhatsAppShareUrl,
  formatWhatsAppDisplay,
  sanitizeWhatsAppNumber,
} from '../utils/whatsapp';
import { syncVehicleToCloud } from '../services/dataRepository';
import { deleteVehicleAttachment, uploadVehicleAttachment } from '../services/storageRepository';

interface VehicleFinalReportTabProps {
  vehicle: Vehicle;
  maintenanceItems: MaintenanceItem[];
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  attachmentsLoading: boolean;
  prefs: UserPreferences;
  t: Translations;
  cloudUserId: string | null;
  cloudUserEmail?: string | null;
  onAttachmentCreated: (attachment: VehicleAttachment) => void;
  onAttachmentDeleted: (attachmentId: string) => void;
  onOpenCloudSettings: () => void;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
}

type ReportCategoryFilter = 'all' | 'maintenance' | 'fuel' | 'ev' | 'expense';

function isSafeHttpsUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function VehicleFinalReportTab({
  vehicle,
  maintenanceItems,
  logs,
  chargingSessions,
  attachments,
  attachmentsLoading,
  prefs,
  t,
  cloudUserId,
  cloudUserEmail,
  onAttachmentCreated,
  onAttachmentDeleted,
  onOpenCloudSettings,
  onUpdatePrefs,
}: VehicleFinalReportTabProps) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [categoryFilter, setCategoryFilter] = useState<ReportCategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [recipientEmail, setRecipientEmail] = useState(cloudUserEmail ?? '');
  const [whatsappInput, setWhatsappInput] = useState(prefs.whatsappNumber ?? '');
  const [pdfActionState, setPdfActionState] = useState<'idle' | 'download' | 'whatsapp' | 'email'>('idle');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Photo quick-upload inside Final Report
  const [uploadCategory, setUploadCategory] = useState<AttachmentCategory>('vehicle_photo');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Photo lightbox
  const [previewAttachment, setPreviewAttachment] = useState<VehicleAttachment | null>(null);

  const timelineEntries = useMemo(
    () =>
      buildVehicleTimelineEntries({
        vehicle,
        logs,
        chargingSessions,
        attachments,
        currency: prefs.currency,
        order: sortOrder,
      }),
    [vehicle, logs, chargingSessions, attachments, prefs.currency, sortOrder]
  );

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return timelineEntries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.filterGroup !== categoryFilter) return false;
      if (!q) return true;
      return (
        entry.title.toLowerCase().includes(q) ||
        entry.location.toLowerCase().includes(q) ||
        entry.categoryLabel.toLowerCase().includes(q) ||
        entry.notes.toLowerCase().includes(q) ||
        entry.date.includes(q)
      );
    });
  }, [timelineEntries, categoryFilter, searchQuery]);

  const vehicleAttachments = useMemo(
    () =>
      attachments
        .filter((a) => a.vehicleId === vehicle.id)
        .sort((a, b) =>
          sortOrder === 'asc'
            ? a.attachmentDate.localeCompare(b.attachmentDate)
            : b.attachmentDate.localeCompare(a.attachmentDate)
        ),
    [attachments, vehicle.id, sortOrder]
  );

  const maintenanceStatusList = useMemo(() => {
    return maintenanceItems
      .filter((item) => item.vehicleId === vehicle.id)
      .map((item) => {
        const calc = computeMaintenanceStatus(item, vehicle, prefs);
        const localized = t.items[item.titleKey]?.title ?? item.titleKey;
        return { item, localized, calc };
      });
  }, [maintenanceItems, vehicle, prefs, t]);

  const totalInvested = useMemo(
    () =>
      timelineEntries.reduce((sum, entry) => {
        if (entry.cost === null) return sum;
        return sum + convertCurrency(entry.cost, entry.currency ?? 'BRL', prefs.currency);
      }, 0),
    [timelineEntries, prefs.currency]
  );

  const maintenanceCount = useMemo(
    () =>
      logs.filter(
        (l) =>
          l.vehicleId === vehicle.id &&
          l.category !== MaintenanceCategory.FUEL &&
          l.category !== MaintenanceCategory.EXPENSE
      ).length,
    [logs, vehicle.id]
  );

  const buildSummaryDossierText = (maxChars?: number) => {
    const orderedNewestFirst = [...timelineEntries].sort((a, b) => b.date.localeCompare(a.date));
    const urgentReminders = maintenanceStatusList
      .filter(
        ({ calc }) =>
          calc.status === MaintenanceStatus.OVERDUE || calc.status === MaintenanceStatus.ATTENTION
      )
      .slice(0, 4)
      .map(({ localized, calc }) => ({
        title: localized,
        statusLabel: t.status[calc.status],
        dueSummary: calc.projectedDueDate
          ? `Previsto ${calc.projectedDueDate}`
          : `${Math.max(0, calc.daysRemaining)}d restantes`,
      }));

    return buildFullMedicalDossierText({
      vehicle,
      entries: orderedNewestFirst.map((e) => ({
        date: e.date,
        badgeLabel: e.categoryLabel,
        title: e.title,
        odometerKm: e.odometerKm,
        location: e.location,
        cost: e.cost,
        currency: e.currency,
        notes: e.notes,
      })),
      currency: prefs.currency,
      units: prefs.units,
      ownerEmail: cloudUserEmail,
      upcomingReminders: urgentReminders,
      maxChars,
    });
  };

  const handleDownloadPdf = async () => {
    setPdfActionState('download');
    setFeedback(null);
    try {
      const res = await generateVehicleFinalPdf({
        vehicle,
        maintenanceItems,
        logs,
        chargingSessions,
        attachments,
        prefs,
        t,
        ownerEmail: recipientEmail.trim() || cloudUserEmail,
      });
      downloadPdfBlob(res.blob, res.filename);
      setFeedback({
        type: 'success',
        message: `PDF "${res.filename}" gerado com ${timelineEntries.length} registro(s) e ${res.embeddedPhotosCount} foto(s) incorporada(s).`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Não foi possível gerar o PDF completo.',
      });
    } finally {
      setPdfActionState('idle');
    }
  };

  const handleSendPdfWhatsApp = async () => {
    setPdfActionState('whatsapp');
    setFeedback(null);
    try {
      const cleanPhone = whatsappInput.trim();
      if (cleanPhone && sanitizeWhatsAppNumber(cleanPhone, prefs.language)) {
        if (cleanPhone !== (prefs.whatsappNumber ?? '').trim()) {
          onUpdatePrefs({ whatsappNumber: cleanPhone });
        }
      }

      const res = await generateVehicleFinalPdf({
        vehicle,
        maintenanceItems,
        logs,
        chargingSessions,
        attachments,
        prefs,
        t,
        ownerEmail: recipientEmail.trim() || cloudUserEmail,
      });

      const summary = buildSummaryDossierText(1400);
      const shareStatus = await sharePdfViaWebShare({
        file: res.file,
        title: `Relatório Final — ${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
        text: summary,
      });

      if (shareStatus === 'shared') {
        setFeedback({
          type: 'success',
          message: `PDF "${res.filename}" compartilhado diretamente com ${res.embeddedPhotosCount} foto(s).`,
        });
        return;
      }

      if (shareStatus === 'cancelled') {
        return;
      }

      // Fallback for desktop browsers that don't support sharing files via navigator.share:
      // 1. Download the real PDF file with all photos
      // 2. Open WhatsApp Web/App with full text summary + notice of attached PDF filename
      downloadPdfBlob(res.blob, res.filename);
      const messageWithPdfNote = `${summary}\n\n*Anexo em PDF gerado:* ${res.filename} (${res.embeddedPhotosCount} foto(s) incluída(s)).`;
      const targetPhone = sanitizeWhatsAppNumber(
        cleanPhone || prefs.whatsappNumber,
        prefs.language
      )
        ? cleanPhone || prefs.whatsappNumber
        : undefined;
      const waUrl = buildWhatsAppShareUrl(messageWithPdfNote, targetPhone, prefs.language);
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setFeedback({
        type: 'success',
        message: `PDF "${res.filename}" baixado com ${res.embeddedPhotosCount} foto(s) e WhatsApp aberto — basta anexar o PDF baixado na conversa.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Erro ao preparar o PDF para o WhatsApp.',
      });
    } finally {
      setPdfActionState('idle');
    }
  };

  const handleSendPdfEmail = async () => {
    setPdfActionState('email');
    setFeedback(null);
    try {
      const targetEmail = recipientEmail.trim() || cloudUserEmail || '';
      const res = await generateVehicleFinalPdf({
        vehicle,
        maintenanceItems,
        logs,
        chargingSessions,
        attachments,
        prefs,
        t,
        ownerEmail: targetEmail || null,
      });

      const summary = buildSummaryDossierText();
      const shareStatus = await sharePdfViaWebShare({
        file: res.file,
        title: `Relatório Final — ${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
        text: summary.replace(/\*/g, '').slice(0, 1200),
      });

      if (shareStatus === 'shared') {
        setFeedback({
          type: 'success',
          message: `PDF "${res.filename}" enviado para compartilhamento por e-mail com ${res.embeddedPhotosCount} foto(s).`,
        });
        return;
      }

      if (shareStatus === 'cancelled') {
        return;
      }

      // Desktop fallback: download the real PDF with photos and launch default mail client
      downloadPdfBlob(res.blob, res.filename);
      const emailBody = `${summary}\n\nArquivo PDF completo com ${res.embeddedPhotosCount} foto(s) baixado: ${res.filename} (anexe este arquivo ao e-mail antes de enviar).`;
      const mailtoUrl = buildMedicalDossierEmailUrl({
        recipientEmail: targetEmail,
        vehicle,
        dossierText: emailBody,
      });
      window.location.href = mailtoUrl;

      setFeedback({
        type: 'success',
        message: `PDF "${res.filename}" baixado com ${res.embeddedPhotosCount} foto(s) e seu cliente de e-mail foi aberto${targetEmail ? ` para ${targetEmail}` : ''} — anexe o PDF baixado.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao gerar PDF para e-mail.',
      });
    } finally {
      setPdfActionState('idle');
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!cloudUserId) {
      onOpenCloudSettings();
      return;
    }

    setUploadingPhoto(true);
    setFeedback(null);
    try {
      await syncVehicleToCloud(cloudUserId, vehicle);
      const uploaded = await uploadVehicleAttachment({
        userId: cloudUserId,
        vehicleId: vehicle.id,
        file,
        category: uploadCategory,
        attachmentDate: todayIso(),
        notes: uploadNotes.trim() || `Registro visual — ${vehicle.make} ${vehicle.model}`,
      });
      onAttachmentCreated(uploaded);
      setUploadNotes('');
      setFeedback({
        type: 'success',
        message: `Arquivo "${uploaded.fileName}" salvo e já incluído no Relatório Final e no PDF.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao enviar foto.',
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveAttachment = async (att: VehicleAttachment) => {
    if (!cloudUserId) return;
    setFeedback(null);
    try {
      await deleteVehicleAttachment(cloudUserId, att);
      onAttachmentDeleted(att.id);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao remover anexo.',
      });
    }
  };

  const renderCategoryIcon = (entry: FinalReportTimelineItem) => {
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

  const isGeneratingPdf = pdfActionState !== 'idle';

  return (
    <div className="space-y-6">
      {/* Export & Dispatch Action Panel */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden print:hidden">
        <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              Relatório Final — {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Registro total do início ao fim com todos os serviços, gastos e fotos prontos para exportar ou enviar em PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {pdfActionState === 'download' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>Baixar PDF Completo</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => void handleSendPdfWhatsApp()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {pdfActionState === 'whatsapp' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              <span>Enviar PDF no WhatsApp</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => void handleSendPdfEmail()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {pdfActionState === 'email' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span>Enviar PDF por E-mail</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              title="Imprimir página do relatório"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        {/* Recipient Config Strip */}
        <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <input
              type="tel"
              aria-label="WhatsApp de destino para o relatório em PDF"
              placeholder="WhatsApp de destino (+55 11 99999-8888)"
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              className="w-full max-w-xs px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <input
              type="email"
              aria-label="E-mail de destino para o relatório em PDF"
              placeholder="E-mail de destino (comprador, oficina ou seu)"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full max-w-sm px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {feedback && (
          <div
            className={`px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 text-xs ${
              feedback.type === 'success'
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20'
                : 'text-red-700 dark:text-red-400 bg-red-50/60 dark:bg-red-950/20'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </section>

      {/* Printable / Inspectable Complete Dossier Body */}
      <div className="space-y-6">
        {/* Identification & 4-Metric Summary Strip */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                Dossiê Técnico Completo · Emissão {todayIso()}
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {vehicle.make} {vehicle.model} ({vehicle.year}) · Placa{' '}
                <span className="font-mono">{vehicle.plate}</span>
              </h3>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {t.vehicleTypes[vehicle.vehicleType ?? 'car']}
              {vehicle.engineDisplacementCc ? ` · ${vehicle.engineDisplacementCc}cc` : ''} ·{' '}
              {t.powertrain[vehicle.powertrain]}
            </div>
          </div>

          {/* 4-Metric Lifetime Strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 tabular-nums">
            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Eventos totais
              </span>
              <span className="font-mono text-xl font-semibold text-slate-900 dark:text-slate-100">
                {timelineEntries.length}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Manutenções
              </span>
              <span className="font-mono text-xl font-semibold text-blue-600 dark:text-blue-400">
                {maintenanceCount}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Fotos e anexos
              </span>
              <span className="font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {vehicleAttachments.length}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Investimento total
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalInvested, prefs.currency)}
              </span>
            </div>
          </div>

          {/* Vehicle Specs Key-Value Grid */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Odômetro atual</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatDistance(vehicle.odometerKm, prefs.units)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Calibragem recomendada</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {vehicle.tirePressurePsi}
                {vehicle.rearTirePressurePsi ? ` / ${vehicle.rearTirePressurePsi}` : ''} PSI
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Licenciamento / ITV</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {isDateRecorded(vehicle.documentExpiryDate)
                  ? vehicle.documentExpiryDate
                  : t.health.notRecorded}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Apólice de Seguro</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {isDateRecorded(vehicle.insuranceExpiryDate)
                  ? vehicle.insuranceExpiryDate
                  : t.health.notRecorded}
              </div>
            </div>
            {(cloudUserEmail || prefs.whatsappNumber) && (
              <>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Proprietário</div>
                  <div className="mt-0.5 font-mono text-slate-700 dark:text-slate-200 truncate">
                    {cloudUserEmail || 'Conta local'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">WhatsApp</div>
                  <div className="mt-0.5 font-mono text-slate-700 dark:text-slate-200">
                    {formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language) || 'Não informado'}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Chronological Complete History Section */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Registro Cronológico Completo ({filteredEntries.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tudo que foi realizado e registrado no veículo com datas, quilometragem, oficinas, valores e fotos vinculadas
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSortOrder('asc')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    sortOrder === 'asc'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Do início ao fim
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('desc')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    sortOrder === 'desc'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Mais recentes
                </button>
              </div>
            </div>
          </div>

          {/* Search & Category Filters */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30 print:hidden">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
              {(
                [
                  { id: 'all', label: 'Tudo' },
                  { id: 'maintenance', label: 'Manutenções' },
                  { id: 'fuel', label: 'Abastecimentos' },
                  { id: 'ev', label: 'Recargas EV' },
                  { id: 'expense', label: 'Gastos & Docs' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === tab.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar serviço, oficina, peça ou data..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-10 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {timelineEntries.length === 0
                ? 'Ainda não há registros lançados para este veículo. Registre uma manutenção ou adicione fotos para compor o relatório final.'
                : 'Nenhum registro encontrado para este filtro ou busca.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEntries.map((entry, idx) => {
                const convertedCost =
                  entry.cost !== null
                    ? convertCurrency(entry.cost, entry.currency ?? 'BRL', prefs.currency)
                    : null;
                return (
                  <div key={entry.id} className="px-5 py-4 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 tabular-nums">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5">{renderCategoryIcon(entry)}</div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-mono text-slate-400">
                              #{String(idx + 1).padStart(2, '0')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                              {entry.date}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{entry.categoryLabel}</span>
                            {entry.odometerKm !== null && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono">
                                  {formatDistance(entry.odometerKm, prefs.units)}
                                </span>
                              </>
                            )}
                            {entry.location && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{entry.location}</span>
                              </>
                            )}
                          </div>
                          <h4 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {entry.title}
                          </h4>
                        </div>
                      </div>

                      {convertedCost !== null && (
                        <div className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 pl-6 sm:pl-0">
                          {formatCurrency(convertedCost, prefs.currency)}
                        </div>
                      )}
                    </div>

                    {entry.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pl-6 leading-relaxed">
                        {entry.notes}
                      </p>
                    )}

                    {entry.attachments.length > 0 && (
                      <div className="pl-6 flex flex-wrap gap-2.5 pt-1">
                        {entry.attachments.map((att) => {
                          const isImage = att.mimeType.startsWith('image/');
                          const safeHref = isSafeHttpsUrl(att.signedUrl) ? att.signedUrl : undefined;
                          return (
                            <div
                              key={att.id}
                              className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 max-w-xs"
                            >
                              {isImage && safeHref ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="w-12 h-12 rounded-md overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 block"
                                >
                                  <img
                                    src={safeHref}
                                    alt={att.fileName}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ) : (
                                <div className="w-12 h-12 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5 text-slate-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {att.fileName}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {ATTACHMENT_CATEGORY_LABELS[att.fileCategory] ?? att.fileCategory}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Complete Photo & Document Gallery */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Galeria Completa de Fotos, Notas e Comprovantes ({vehicleAttachments.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Todas as imagens registradas neste veículo — incluídas automaticamente no PDF final
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleUploadPhoto}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUploadPhoto}
                className="hidden"
              />

              {cloudUserId ? (
                <>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as AttachmentCategory)}
                    aria-label="Categoria da foto"
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="vehicle_photo">Foto do Veículo</option>
                    <option value="receipt">Nota / Recibo</option>
                    <option value="inspection">Vistoria / Peça</option>
                    <option value="document">ITV / Documento</option>
                    <option value="insurance">Seguro</option>
                    <option value="diagnostic">Laudo / Scanner</option>
                  </select>
                  <input
                    type="text"
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder="Legenda opcional..."
                    className="w-36 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>Tirar Foto</span>
                  </button>
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Galeria</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCloudSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>Entrar na conta para anexar fotos</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-5">
            {attachmentsLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando fotos e comprovantes...</span>
              </div>
            ) : vehicleAttachments.length === 0 ? (
              <p className="py-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Nenhuma foto ou documento anexado a este veículo até o momento.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleAttachments.map((att) => {
                  const isImage = att.mimeType.startsWith('image/');
                  const safeHref = isSafeHttpsUrl(att.signedUrl) ? att.signedUrl : undefined;
                  return (
                    <article
                      key={att.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/60 dark:bg-slate-950/30 flex flex-col"
                    >
                      {isImage && safeHref ? (
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(att)}
                          className="aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-800 block text-left"
                        >
                          <img
                            src={safeHref}
                            alt={att.fileName}
                            className="w-full h-full object-cover hover:scale-[1.02] transition-transform"
                          />
                        </button>
                      ) : (
                        <div className="aspect-[4/3] w-full bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400">
                          <FileText className="w-8 h-8" />
                          <span className="text-xs font-medium">Documento PDF</span>
                        </div>
                      )}

                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            <span className="font-mono">{att.attachmentDate}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ATTACHMENT_CATEGORY_LABELS[att.fileCategory] ?? att.fileCategory}</span>
                          </div>
                          <div className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {att.fileName}
                          </div>
                          {att.notes && (
                            <p className="mt-1 text-slate-600 dark:text-slate-400 line-clamp-2">
                              {att.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 pt-1.5 border-t border-slate-200 dark:border-slate-800 print:hidden">
                          {safeHref && (
                            <>
                              <a
                                href={safeHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <span>Abrir</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <a
                                href={safeHref}
                                download={att.fileName}
                                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:underline"
                              >
                                <Download className="w-3 h-3" />
                                <span>Baixar</span>
                              </a>
                            </>
                          )}
                          {cloudUserId && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveAttachment(att)}
                              className="ml-auto text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                              aria-label="Excluir anexo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Preventive Maintenance Snapshot */}
        {maintenanceStatusList.length > 0 && (
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Quadro Preventivo no Momento da Emissão
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-5 font-medium">Item</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Último registro</th>
                    <th className="py-2.5 px-5 font-medium text-right">Próxima previsão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {maintenanceStatusList.map(({ item, localized, calc }) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-5 font-medium text-slate-900 dark:text-slate-100">
                        {localized}
                      </td>
                      <td className="py-2.5 px-4">
                        {calc.status === MaintenanceStatus.OVERDUE ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{t.status[calc.status]}</span>
                          </span>
                        ) : calc.status === MaintenanceStatus.ATTENTION ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{t.status[calc.status]}</span>
                          </span>
                        ) : calc.status === MaintenanceStatus.ON_TRACK ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{t.status[calc.status]}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{t.status[calc.status]}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {isDateRecorded(item.lastCheckedDate)
                          ? `${item.lastCheckedDate} · ${formatDistance(item.lastCheckedKm, prefs.units)}`
                          : t.health.notRecorded}
                      </td>
                      <td className="py-2.5 px-5 font-mono text-right text-slate-700 dark:text-slate-300">
                        {calc.projectedDueDate || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Lightbox Modal for Photos */}
      {previewAttachment && isSafeHttpsUrl(previewAttachment.signedUrl) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 print:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {previewAttachment.fileName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {previewAttachment.attachmentDate} ·{' '}
                  {ATTACHMENT_CATEGORY_LABELS[previewAttachment.fileCategory] ??
                    previewAttachment.fileCategory}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.signedUrl}
                  download={previewAttachment.fileName}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  aria-label={t.actions.close}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="bg-slate-100 dark:bg-slate-950 max-h-[75vh] flex items-center justify-center p-4">
              <img
                src={previewAttachment.signedUrl}
                alt={previewAttachment.fileName}
                className="max-h-[68vh] w-auto object-contain rounded-lg"
              />
            </div>
            {previewAttachment.notes && (
              <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                {previewAttachment.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
