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
import { getUi } from '../data/uiTranslations';
import {
  AttachmentCategory,
  ChargingSession,
  LanguageCode,
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
  buildVehicleTimelineEntries,
  downloadPdfBlob,
  FinalReportTimelineItem,
  generateVehicleFinalPdf,
  getLocalizedAttachmentLabels,
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

const FINAL_REPORT_COPY: Record<
  LanguageCode,
  {
    titlePrefix: string;
    duePlannedPrefix: string;
    daysLeftSuffix: string;
    pdfErrorFallback: string;
    shareTitlePrefix: string;
    pdfSharedOk: (filename: string, photos: number) => string;
    pdfAttachedWaNote: (filename: string, photos: number) => string;
    pdfWaFallbackOk: (filename: string, photos: number) => string;
    pdfWaError: string;
    pdfEmailSharedOk: (filename: string, photos: number) => string;
    pdfEmailBodyNote: (filename: string, photos: number) => string;
    pdfEmailFallbackOk: (filename: string, photos: number, targetEmail: string) => string;
    pdfEmailError: string;
    visualNotePrefix: string;
    photoSavedOk: (fileName: string) => string;
    photoUploadErr: string;
    attDeleteErr: string;
    printTitle: string;
    waInputAria: string;
    emailInputAria: string;
    emailInputPlaceholder: string;
    issuedPrefix: string;
    platePrefix: string;
    currentOdometer: string;
    recommendedTire: string;
    licenseLabel: string;
    insuranceLabel: string;
    ownerLabel: string;
    localAccount: string;
    notInformed: string;
    timelineSubtitle: string;
    filterAll: string;
    filterMaint: string;
    filterFuel: string;
    filterEv: string;
    filterExpense: string;
    searchPlaceholder: string;
    filteredEmpty: string;
    photoCategoryAria: string;
    pdfDocumentLabel: string;
    signInPhotosBtn: string;
  }
> = {
  pt: {
    titlePrefix: 'Relatório Final',
    duePlannedPrefix: 'Previsto',
    daysLeftSuffix: 'd restantes',
    pdfErrorFallback: 'Não foi possível gerar o PDF completo.',
    shareTitlePrefix: 'Relatório Final',
    pdfSharedOk: (f, p) => `PDF "${f}" compartilhado diretamente com ${p} foto(s).`,
    pdfAttachedWaNote: (f, p) => `*Anexo em PDF gerado:* ${f} (${p} foto(s) incluída(s)).`,
    pdfWaFallbackOk: (f, p) =>
      `PDF "${f}" baixado com ${p} foto(s) e WhatsApp aberto — basta anexar o PDF baixado na conversa.`,
    pdfWaError: 'Erro ao preparar o PDF para o WhatsApp.',
    pdfEmailSharedOk: (f, p) => `PDF "${f}" enviado para compartilhamento por e-mail com ${p} foto(s).`,
    pdfEmailBodyNote: (f, p) =>
      `Arquivo PDF completo com ${p} foto(s) baixado: ${f} (anexe este arquivo ao e-mail antes de enviar).`,
    pdfEmailFallbackOk: (f, p, em) =>
      `PDF "${f}" baixado com ${p} foto(s) e seu cliente de e-mail foi aberto${em ? ` para ${em}` : ''} — anexe o PDF baixado.`,
    pdfEmailError: 'Erro ao gerar PDF para e-mail.',
    visualNotePrefix: 'Registro visual',
    photoSavedOk: (n) => `Arquivo "${n}" salvo e já incluído no Relatório Final e no PDF.`,
    photoUploadErr: 'Erro ao enviar foto.',
    attDeleteErr: 'Erro ao remover anexo.',
    printTitle: 'Imprimir página do relatório',
    waInputAria: 'WhatsApp de destino para o relatório em PDF',
    emailInputAria: 'E-mail de destino para o relatório em PDF',
    emailInputPlaceholder: 'E-mail de destino (comprador, oficina ou seu)',
    issuedPrefix: 'Emissão',
    platePrefix: 'Placa',
    currentOdometer: 'Odômetro atual',
    recommendedTire: 'Calibragem recomendada',
    licenseLabel: 'Licenciamento / Inspeção',
    insuranceLabel: 'Apólice de Seguro',
    ownerLabel: 'Proprietário',
    localAccount: 'Conta local',
    notInformed: 'Não informado',
    timelineSubtitle:
      'Tudo que foi realizado e registrado no veículo com datas, quilometragem, oficinas, valores e fotos vinculadas',
    filterAll: 'Tudo',
    filterMaint: 'Manutenções',
    filterFuel: 'Abastecimentos',
    filterEv: 'Recargas EV',
    filterExpense: 'Gastos & Docs',
    searchPlaceholder: 'Filtrar serviço, oficina, peça ou data...',
    filteredEmpty: 'Nenhum registro encontrado para este filtro ou busca.',
    photoCategoryAria: 'Categoria da foto',
    pdfDocumentLabel: 'Documento PDF',
    signInPhotosBtn: 'Entrar na conta para anexar fotos',
  },
  en: {
    titlePrefix: 'Final Report',
    duePlannedPrefix: 'Due',
    daysLeftSuffix: 'd left',
    pdfErrorFallback: 'Could not generate the complete PDF.',
    shareTitlePrefix: 'Final Report',
    pdfSharedOk: (f, p) => `PDF "${f}" shared directly with ${p} photo(s).`,
    pdfAttachedWaNote: (f, p) => `*PDF Attachment generated:* ${f} (${p} photo(s) included).`,
    pdfWaFallbackOk: (f, p) =>
      `PDF "${f}" downloaded with ${p} photo(s) and WhatsApp opened — attach the downloaded PDF in the chat.`,
    pdfWaError: 'Error preparing the PDF for WhatsApp.',
    pdfEmailSharedOk: (f, p) => `PDF "${f}" ready to share by email with ${p} photo(s).`,
    pdfEmailBodyNote: (f, p) =>
      `Complete PDF file with ${p} photo(s) downloaded: ${f} (attach this file to your email before sending).`,
    pdfEmailFallbackOk: (f, p, em) =>
      `PDF "${f}" downloaded with ${p} photo(s) and your email client opened${em ? ` for ${em}` : ''} — attach the downloaded PDF.`,
    pdfEmailError: 'Error generating PDF for email.',
    visualNotePrefix: 'Visual record',
    photoSavedOk: (n) => `File "${n}" saved and included in the Final Report and PDF.`,
    photoUploadErr: 'Error uploading photo.',
    attDeleteErr: 'Error deleting attachment.',
    printTitle: 'Print report page',
    waInputAria: 'Destination WhatsApp for PDF report',
    emailInputAria: 'Destination email for PDF report',
    emailInputPlaceholder: 'Destination email (buyer, workshop, or yours)',
    issuedPrefix: 'Issued',
    platePrefix: 'Plate',
    currentOdometer: 'Current odometer',
    recommendedTire: 'Recommended tire pressure',
    licenseLabel: 'Registration / Inspection',
    insuranceLabel: 'Insurance Policy',
    ownerLabel: 'Owner',
    localAccount: 'Local account',
    notInformed: 'Not provided',
    timelineSubtitle:
      'Everything performed and logged for the vehicle with dates, mileage, workshops, costs, and attached photos',
    filterAll: 'All',
    filterMaint: 'Maintenance',
    filterFuel: 'Refueling',
    filterEv: 'EV Charging',
    filterExpense: 'Expenses & Docs',
    searchPlaceholder: 'Filter service, workshop, part, or date...',
    filteredEmpty: 'No records found for this filter or search.',
    photoCategoryAria: 'Photo category',
    pdfDocumentLabel: 'PDF Document',
    signInPhotosBtn: 'Sign in to attach photos',
  },
  es: {
    titlePrefix: 'Informe Final',
    duePlannedPrefix: 'Previsto',
    daysLeftSuffix: 'd restantes',
    pdfErrorFallback: 'No se pudo generar el PDF completo.',
    shareTitlePrefix: 'Informe Final',
    pdfSharedOk: (f, p) => `PDF "${f}" compartido directamente con ${p} foto(s).`,
    pdfAttachedWaNote: (f, p) => `*Adjunto en PDF generado:* ${f} (${p} foto(s) incluida(s)).`,
    pdfWaFallbackOk: (f, p) =>
      `PDF "${f}" descargado con ${p} foto(s) y WhatsApp abierto — solo adjunta el PDF descargado en el chat.`,
    pdfWaError: 'Error al preparar el PDF para WhatsApp.',
    pdfEmailSharedOk: (f, p) => `PDF "${f}" enviado para compartir por correo con ${p} foto(s).`,
    pdfEmailBodyNote: (f, p) =>
      `Archivo PDF completo con ${p} foto(s) descargado: ${f} (adjunta este archivo al correo antes de enviarlo).`,
    pdfEmailFallbackOk: (f, p, em) =>
      `PDF "${f}" descargado con ${p} foto(s) y cliente de correo abierto${em ? ` para ${em}` : ''} — adjunta el PDF descargado.`,
    pdfEmailError: 'Error al generar el PDF para correo.',
    visualNotePrefix: 'Registro visual',
    photoSavedOk: (n) => `Archivo "${n}" guardado e incluido en el Informe Final y el PDF.`,
    photoUploadErr: 'Error al subir la foto.',
    attDeleteErr: 'Error al eliminar el adjunto.',
    printTitle: 'Imprimir página del informe',
    waInputAria: 'WhatsApp de destino para el informe en PDF',
    emailInputAria: 'Correo electrónico de destino para el informe en PDF',
    emailInputPlaceholder: 'Correo de destino (comprador, taller o tuyo)',
    issuedPrefix: 'Emisión',
    platePrefix: 'Matrícula',
    currentOdometer: 'Odómetro actual',
    recommendedTire: 'Presión recomendada',
    licenseLabel: 'Permiso / ITV',
    insuranceLabel: 'Póliza de Seguro',
    ownerLabel: 'Propietario',
    localAccount: 'Cuenta local',
    notInformed: 'No indicado',
    timelineSubtitle:
      'Todo lo realizado y registrado en el vehículo con fechas, kilometraje, talleres, importes y fotos vinculadas',
    filterAll: 'Todo',
    filterMaint: 'Mantenimientos',
    filterFuel: 'Repostajes',
    filterEv: 'Cargas EV',
    filterExpense: 'Gastos y Docs',
    searchPlaceholder: 'Filtrar servicio, taller, pieza o fecha...',
    filteredEmpty: 'No se encontraron registros para este filtro o búsqueda.',
    photoCategoryAria: 'Categoría de la foto',
    pdfDocumentLabel: 'Documento PDF',
    signInPhotosBtn: 'Inicia sesión para adjuntar fotos',
  },
  de: {
    titlePrefix: 'Abschlussbericht',
    duePlannedPrefix: 'Fällig',
    daysLeftSuffix: 'T verbleibend',
    pdfErrorFallback: 'Vollständiges PDF konnte nicht erstellt werden.',
    shareTitlePrefix: 'Abschlussbericht',
    pdfSharedOk: (f, p) => `PDF "${f}" direkt mit ${p} Foto(s) geteilt.`,
    pdfAttachedWaNote: (f, p) => `*PDF-Anhang erstellt:* ${f} (${p} Foto(s) enthalten).`,
    pdfWaFallbackOk: (f, p) =>
      `PDF "${f}" mit ${p} Foto(s) heruntergeladen und WhatsApp geöffnet — fügen Sie das PDF im Chat hinzu.`,
    pdfWaError: 'Fehler beim Vorbereiten des PDFs für WhatsApp.',
    pdfEmailSharedOk: (f, p) => `PDF "${f}" mit ${p} Foto(s) für E-Mail-Versand bereit.`,
    pdfEmailBodyNote: (f, p) =>
      `Vollständiges PDF mit ${p} Foto(s) heruntergeladen: ${f} (bitte vor dem Senden an die E-Mail anhängen).`,
    pdfEmailFallbackOk: (f, p, em) =>
      `PDF "${f}" mit ${p} Foto(s) heruntergeladen und E-Mail-Client geöffnet${em ? ` für ${em}` : ''} — bitte PDF anhängen.`,
    pdfEmailError: 'Fehler beim Erstellen des PDFs für E-Mail.',
    visualNotePrefix: 'Fotonachweis',
    photoSavedOk: (n) => `Datei "${n}" gespeichert und im Abschlussbericht sowie PDF enthalten.`,
    photoUploadErr: 'Fehler beim Hochladen des Fotos.',
    attDeleteErr: 'Fehler beim Löschen des Anhangs.',
    printTitle: 'Berichtsseite drucken',
    waInputAria: 'Ziel-WhatsApp für PDF-Bericht',
    emailInputAria: 'Ziel-E-Mail für PDF-Bericht',
    emailInputPlaceholder: 'Ziel-E-Mail (Käufer, Werkstatt oder Ihre)',
    issuedPrefix: 'Ausgestellt',
    platePrefix: 'Kennzeichen',
    currentOdometer: 'Aktueller Kilometerstand',
    recommendedTire: 'Empfohlener Reifendruck',
    licenseLabel: 'Zulassung / TÜV',
    insuranceLabel: 'Versicherungspolice',
    ownerLabel: 'Inhaber',
    localAccount: 'Lokales Konto',
    notInformed: 'Nicht angegeben',
    timelineSubtitle:
      'Alle durchgeführten und erfassten Arbeiten mit Datum, Kilometerstand, Werkstätten, Kosten und Fotos',
    filterAll: 'Alle',
    filterMaint: 'Wartungen',
    filterFuel: 'Tankvorgänge',
    filterEv: 'EV-Ladungen',
    filterExpense: 'Ausgaben & Dok.',
    searchPlaceholder: 'Service, Werkstatt, Teil oder Datum filtern...',
    filteredEmpty: 'Keine Einträge für diesen Filter oder diese Suche gefunden.',
    photoCategoryAria: 'Fotokategorie',
    pdfDocumentLabel: 'PDF-Dokument',
    signInPhotosBtn: 'Anmelden, um Fotos anzuhängen',
  },
  fr: {
    titlePrefix: 'Rapport Final',
    duePlannedPrefix: 'Prévu',
    daysLeftSuffix: 'j restants',
    pdfErrorFallback: 'Impossible de générer le PDF complet.',
    shareTitlePrefix: 'Rapport Final',
    pdfSharedOk: (f, p) => `PDF "${f}" partagé directement avec ${p} photo(s).`,
    pdfAttachedWaNote: (f, p) => `*Pièce jointe PDF générée :* ${f} (${p} photo(s) incluse(s)).`,
    pdfWaFallbackOk: (f, p) =>
      `PDF "${f}" téléchargé avec ${p} photo(s) et WhatsApp ouvert — joignez le PDF téléchargé dans la discussion.`,
    pdfWaError: 'Erreur lors de la préparation du PDF pour WhatsApp.',
    pdfEmailSharedOk: (f, p) => `PDF "${f}" prêt pour le partage par e-mail avec ${p} photo(s).`,
    pdfEmailBodyNote: (f, p) =>
      `Fichier PDF complet avec ${p} photo(s) téléchargé : ${f} (joignez ce fichier à l’e-mail avant l’envoi).`,
    pdfEmailFallbackOk: (f, p, em) =>
      `PDF "${f}" téléchargé avec ${p} photo(s) et client e-mail ouvert${em ? ` pour ${em}` : ''} — joignez le PDF.`,
    pdfEmailError: 'Erreur lors de la génération du PDF pour e-mail.',
    visualNotePrefix: 'Trace visuelle',
    photoSavedOk: (n) => `Fichier "${n}" enregistré et inclus dans le Rapport Final et le PDF.`,
    photoUploadErr: 'Erreur lors de l’envoi de la photo.',
    attDeleteErr: 'Erreur lors de la suppression de la pièce jointe.',
    printTitle: 'Imprimer la page du rapport',
    waInputAria: 'WhatsApp destinataire pour le rapport PDF',
    emailInputAria: 'E-mail destinataire pour le rapport PDF',
    emailInputPlaceholder: 'E-mail destinataire (acheteur, garage ou le vôtre)',
    issuedPrefix: 'Émission',
    platePrefix: 'Immatriculation',
    currentOdometer: 'Kilométrage actuel',
    recommendedTire: 'Pression recommandée',
    licenseLabel: 'Contrôle Technique / Carte grise',
    insuranceLabel: 'Police d’Assurance',
    ownerLabel: 'Propriétaire',
    localAccount: 'Compte local',
    notInformed: 'Non précisé',
    timelineSubtitle:
      'Tout ce qui a été réalisé et enregistré sur le véhicule avec dates, kilométrage, garages, montants et photos',
    filterAll: 'Tout',
    filterMaint: 'Entretiens',
    filterFuel: 'Pleins',
    filterEv: 'Recharges EV',
    filterExpense: 'Frais & Docs',
    searchPlaceholder: 'Filtrer service, garage, pièce ou date...',
    filteredEmpty: 'Aucun enregistrement trouvé pour ce filtre ou cette recherche.',
    photoCategoryAria: 'Catégorie de la photo',
    pdfDocumentLabel: 'Document PDF',
    signInPhotosBtn: 'Se connecter pour joindre des photos',
  },
};

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
  const ui = getUi(prefs.language);
  const fCopy = FINAL_REPORT_COPY[prefs.language] ?? FINAL_REPORT_COPY.en;
  const attachmentLabels = useMemo(
    () => getLocalizedAttachmentLabels(prefs.language),
    [prefs.language]
  );

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
        language: prefs.language,
      }),
    [vehicle, logs, chargingSessions, attachments, prefs.currency, sortOrder, prefs.language]
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
          ? `${fCopy.duePlannedPrefix} ${calc.projectedDueDate}`
          : `${Math.max(0, calc.daysRemaining)}${fCopy.daysLeftSuffix}`,
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
      language: prefs.language,
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
        message: ui.finalReportUi.pdfGeneratedMsg,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : fCopy.pdfErrorFallback,
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
        title: `${fCopy.shareTitlePrefix} — ${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
        text: summary,
      });

      if (shareStatus === 'shared') {
        setFeedback({
          type: 'success',
          message: fCopy.pdfSharedOk(res.filename, res.embeddedPhotosCount),
        });
        return;
      }

      if (shareStatus === 'cancelled') {
        return;
      }

      // Fallback for desktop browsers that don't support sharing files via navigator.share:
      downloadPdfBlob(res.blob, res.filename);
      const messageWithPdfNote = `${summary}\n\n${fCopy.pdfAttachedWaNote(res.filename, res.embeddedPhotosCount)}`;
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
        message: fCopy.pdfWaFallbackOk(res.filename, res.embeddedPhotosCount),
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : fCopy.pdfWaError,
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
        title: `${fCopy.shareTitlePrefix} — ${vehicle.make} ${vehicle.model} (${vehicle.plate})`,
        text: summary.replace(/\*/g, '').slice(0, 1200),
      });

      if (shareStatus === 'shared') {
        setFeedback({
          type: 'success',
          message: fCopy.pdfEmailSharedOk(res.filename, res.embeddedPhotosCount),
        });
        return;
      }

      if (shareStatus === 'cancelled') {
        return;
      }

      // Desktop fallback: download the real PDF with photos and launch default mail client
      downloadPdfBlob(res.blob, res.filename);
      const emailBody = `${summary}\n\n${fCopy.pdfEmailBodyNote(res.filename, res.embeddedPhotosCount)}`;
      const mailtoUrl = buildMedicalDossierEmailUrl({
        recipientEmail: targetEmail,
        vehicle,
        dossierText: emailBody,
        language: prefs.language,
      });
      window.location.href = mailtoUrl;

      setFeedback({
        type: 'success',
        message: fCopy.pdfEmailFallbackOk(res.filename, res.embeddedPhotosCount, targetEmail),
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : fCopy.pdfEmailError,
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
        notes: uploadNotes.trim() || `${fCopy.visualNotePrefix} — ${vehicle.make} ${vehicle.model}`,
      });
      onAttachmentCreated(uploaded);
      setUploadNotes('');
      setFeedback({
        type: 'success',
        message: fCopy.photoSavedOk(uploaded.fileName),
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : fCopy.photoUploadErr,
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
        message: err instanceof Error ? err.message : fCopy.attDeleteErr,
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
      <section className="autolife-glass rounded-2xl overflow-hidden print:hidden">
        <div className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
              {fCopy.titlePrefix} — {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {ui.finalReportUi.headerSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => void handleDownloadPdf()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {pdfActionState === 'download' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{ui.finalReportUi.downloadPdfBtn}</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => void handleSendPdfWhatsApp()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {pdfActionState === 'whatsapp' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              <span>{ui.finalReportUi.sendWaPdfBtn}</span>
            </button>

            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={() => void handleSendPdfEmail()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {pdfActionState === 'email' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              )}
              <span>{ui.finalReportUi.sendEmailBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors whitespace-nowrap shrink-0"
              title={fCopy.printTitle}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{ui.finalReportUi.printBtn}</span>
            </button>
          </div>
        </div>

        {/* Recipient Config Strip */}
        <div className="px-5 py-3 bg-slate-50/70 dark:bg-[#081020]/50 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <input
              type="tel"
              aria-label={fCopy.waInputAria}
              placeholder={`${ui.finalReportUi.quickSendWaLabel} (${ui.whatsapp.inputPlaceholder})`}
              value={whatsappInput}
              onChange={(e) => setWhatsappInput(e.target.value)}
              className="w-full max-w-xs px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
            <input
              type="email"
              aria-label={fCopy.emailInputAria}
              placeholder={fCopy.emailInputPlaceholder}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full max-w-sm px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {feedback && (
          <div
            className={`px-5 py-2.5 border-t border-slate-200/80 dark:border-white/10 text-xs ${
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
        <section className="autolife-glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                {ui.finalReportUi.headerBadge} · {fCopy.issuedPrefix} {todayIso()}
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {vehicle.make} {vehicle.model} ({vehicle.year}) · {fCopy.platePrefix}{' '}
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
          <div className="grid grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/10 border-b border-slate-200/80 dark:border-white/10 tabular-nums">
            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {ui.finalReportUi.kpiEvents}
              </span>
              <span className="font-mono text-xl font-semibold text-slate-900 dark:text-slate-100">
                {timelineEntries.length}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {ui.finalReportUi.kpiMaintenances}
              </span>
              <span className="font-mono text-xl font-semibold text-blue-600 dark:text-blue-400">
                {maintenanceCount}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {ui.finalReportUi.kpiPhotosDocs}
              </span>
              <span className="font-mono text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                {vehicleAttachments.length}
              </span>
            </div>

            <div className="px-5 py-3.5 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {ui.finalReportUi.kpiTotalInvested}
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalInvested, prefs.currency)}
              </span>
            </div>
          </div>

          {/* Vehicle Specs Key-Value Grid */}
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs tabular-nums">
            <div>
              <div className="text-slate-500 dark:text-slate-400">{fCopy.currentOdometer}</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatDistance(vehicle.odometerKm, prefs.units)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">{fCopy.recommendedTire}</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {vehicle.tirePressurePsi}
                {vehicle.rearTirePressurePsi ? ` / ${vehicle.rearTirePressurePsi}` : ''} PSI
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">{fCopy.licenseLabel}</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {isDateRecorded(vehicle.documentExpiryDate)
                  ? vehicle.documentExpiryDate
                  : t.health.notRecorded}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">{fCopy.insuranceLabel}</div>
              <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                {isDateRecorded(vehicle.insuranceExpiryDate)
                  ? vehicle.insuranceExpiryDate
                  : t.health.notRecorded}
              </div>
            </div>
            {(cloudUserEmail || prefs.whatsappNumber) && (
              <>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">{fCopy.ownerLabel}</div>
                  <div className="mt-0.5 font-mono text-slate-700 dark:text-slate-200 truncate">
                    {cloudUserEmail || fCopy.localAccount}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {ui.whatsapp.buttonLabel}
                  </div>
                  <div className="mt-0.5 font-mono text-slate-700 dark:text-slate-200">
                    {formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language) ||
                      fCopy.notInformed}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Chronological Complete History Section */}
        <section className="autolife-glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {ui.finalReportUi.timelineTitle} ({filteredEntries.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fCopy.timelineSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSortOrder('asc')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    sortOrder === 'asc'
                      ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {ui.finalReportUi.sortOldest}
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder('desc')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    sortOrder === 'desc'
                      ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {ui.finalReportUi.sortNewest}
                </button>
              </div>
            </div>
          </div>

          {/* Search & Category Filters */}
          <div className="px-5 py-3 border-b border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#081020]/50 print:hidden">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10 rounded-xl w-fit">
              {(
                [
                  { id: 'all', label: fCopy.filterAll },
                  { id: 'maintenance', label: fCopy.filterMaint },
                  { id: 'fuel', label: fCopy.filterFuel },
                  { id: 'ev', label: fCopy.filterEv },
                  { id: 'expense', label: fCopy.filterExpense },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    categoryFilter === tab.id
                      ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
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
                placeholder={fCopy.searchPlaceholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-10 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {timelineEntries.length === 0
                ? ui.finalReportUi.timelineEmpty
                : fCopy.filteredEmpty}
            </div>
          ) : (
            <div className="divide-y divide-slate-200/80 dark:divide-white/10">
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
                                  {attachmentLabels[att.fileCategory] ?? att.fileCategory}
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
        <section className="autolife-glass rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {ui.finalReportUi.galleryTitle} ({vehicleAttachments.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {ui.finalReportUi.galleryConnectHint}
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
                    aria-label={fCopy.photoCategoryAria}
                    className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-800 dark:text-slate-200"
                  >
                    <option value="vehicle_photo">{attachmentLabels.vehicle_photo}</option>
                    <option value="receipt">{attachmentLabels.receipt}</option>
                    <option value="inspection">{attachmentLabels.inspection}</option>
                    <option value="document">{attachmentLabels.document}</option>
                    <option value="insurance">{attachmentLabels.insurance}</option>
                    <option value="diagnostic">{attachmentLabels.diagnostic}</option>
                  </select>
                  <input
                    type="text"
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    placeholder={ui.finalReportUi.uploadNotesPlaceholder}
                    className="w-36 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 text-white whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <span>{ui.medicalUi.takePhotoBtn}</span>
                  </button>
                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => galleryInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap shrink-0 disabled:opacity-60"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>{ui.medicalUi.galleryBtn}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCloudSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>{fCopy.signInPhotosBtn}</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-5">
            {attachmentsLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{ui.vaultUi.loading}</span>
              </div>
            ) : vehicleAttachments.length === 0 ? (
              <p className="py-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {ui.finalReportUi.galleryEmpty}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleAttachments.map((att) => {
                  const isImage = att.mimeType.startsWith('image/');
                  const safeHref = isSafeHttpsUrl(att.signedUrl) ? att.signedUrl : undefined;
                  return (
                    <article
                      key={att.id}
                      className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-slate-50/60 dark:bg-[#081020]/60 flex flex-col"
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
                          <span className="text-xs font-medium">{fCopy.pdfDocumentLabel}</span>
                        </div>
                      )}

                      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            <span className="font-mono">{att.attachmentDate}</span>
                            <span aria-hidden="true">·</span>
                            <span>{attachmentLabels[att.fileCategory] ?? att.fileCategory}</span>
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
                                <span>{ui.finalReportUi.openBtn}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <a
                                href={safeHref}
                                download={att.fileName}
                                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:underline"
                              >
                                <Download className="w-3 h-3" />
                                <span>{ui.finalReportUi.downloadBtn}</span>
                              </a>
                            </>
                          )}
                          {cloudUserId && (
                            <button
                              type="button"
                              onClick={() => void handleRemoveAttachment(att)}
                              className="ml-auto text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                              aria-label={ui.finalReportUi.deleteAria}
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
          <section className="autolife-glass rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10">
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                {ui.finalReportUi.snapshotTitle}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-5 font-medium">{ui.finalReportUi.snapshotColItem}</th>
                    <th className="py-2.5 px-4 font-medium">{ui.finalReportUi.snapshotColStatus}</th>
                    <th className="py-2.5 px-4 font-medium">{ui.finalReportUi.snapshotColLast}</th>
                    <th className="py-2.5 px-5 font-medium text-right">
                      {ui.finalReportUi.snapshotColNext}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-white/10">
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/85 backdrop-blur-xs print:hidden"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="autolife-glass rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {previewAttachment.fileName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {previewAttachment.attachmentDate} ·{' '}
                  {attachmentLabels[previewAttachment.fileCategory] ??
                    previewAttachment.fileCategory}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewAttachment.signedUrl}
                  download={previewAttachment.fileName}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-200"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{ui.finalReportUi.downloadBtn}</span>
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
            <div className="bg-slate-100 dark:bg-[#040812] max-h-[75vh] flex items-center justify-center p-4">
              <img
                src={previewAttachment.signedUrl}
                alt={previewAttachment.fileName}
                className="max-h-[68vh] w-auto object-contain rounded-xl"
              />
            </div>
            {previewAttachment.notes && (
              <div className="px-4 py-2.5 border-t border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
                {previewAttachment.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
