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
import { TRANSLATIONS, Translations } from '../data/i18n';
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
import { downloadPdfBlob, generateVehicleFinalPdf, getLocalizedAttachmentLabels } from '../utils/pdfReport';
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

interface MedicalExtraCopy {
  headerTitle: string;
  plateLabel: string;
  tiresLabel: string;
  shareHistoryBtn: string;
  shareHistoryTitle: string;
  addRecordBtn: string;
  attentionRadarLabel: string;
  overdueCount: (n: number) => string;
  soonCount: (n: number) => string;
  dueSoonCount: (n: number) => string;
  noUrgencies: string;
  activeChecklistHint: string;
  docsInsuranceLabel: string;
  bothRegular: string;
  datesNotInformed: string;
  checkExpiries: string;
  docShort: string;
  insShort: string;
  lastServiceLabel: string;
  noRecordShort: string;
  registerFirstMaintHint: string;
  documentedInvestmentLabel: string;
  recordCount: (n: number) => string;
  attachmentCount: (n: number) => string;
  radarHeading: string;
  radarSubheading: string;
  attentionTab: (n: number) => string;
  allTab: (n: number) => string;
  expandBtn: string;
  collapseBtn: string;
  registerNowBtn: string;
  calendarBtn: string;
  calendarTitle: string;
  calendarFilePrefix: string;
  remindBtn: string;
  remindTitle: string;
  whatsappLabel: string;
  changeBtn: string;
  waPlaceholder: string;
  saveBtn: string;
  cancelBtn: string;
  emailAria: string;
  emailPlaceholder: string;
  sendToMyWaBtn: string;
  configureWaBtn: string;
  configureWaHint: string;
  sendByEmailBtn: string;
  emailOpenedFeedback: (email: string) => string;
  emailMissingFeedback: string;
  copiedBtn: string;
  copySheetBtn: string;
  fullPdfBtn: string;
  filterAllCount: (n: number) => string;
  filterMaintRevisions: string;
  filterFuels: string;
  filterEvCharges: string;
  filterExpensesNotes: string;
  loadingRecord: string;
  emptyHistoryTitle: string;
  emptyHistoryBody: string;
  addFirstRecordBtn: string;
  noFilterResults: string;
  clearFiltersBtn: string;
  itemCount: (n: number) => string;
  waShareBtn: string;
  overdueAgo: (days: number) => string;
  dueInDays: (days: number) => string;
  orWord: string;
  badgeMaintenance: string;
  badgeRevision: string;
  badgeFuel: string;
  badgeExpense: string;
  badgeEvCharge: string;
  evChargeTitle: (powerType: string, kwh: string, socStart: number, socEnd: number) => string;
  defaultBadgeDoc: string;
  privateArchive: string;
  authUploadError: string;
  defaultStation: string;
  defaultFuelStation: string;
  defaultWorkshop: string;
  chargeNote: (station: string, kwh: number) => string;
  defaultRevisionTitle: string;
  defaultFuelTitle: string;
  defaultExpenseTitle: string;
  defaultMaintTitle: string;
  saveRecordError: string;
  uploadPhotoError: string;
  deleteAttachmentError: string;
  waInvalidMsg: string;
  waSavedMsg: string;
  dossierCopiedMsg: string;
  copyFallbackMsg: string;
  pdfGeneratedMsg: (filename: string, photos: number) => string;
  pdfErrorMsg: string;
  docLicenseTitle: string;
  docInsuranceTitle: string;
  closeAria: string;
  catOil: string;
  catBrakes: string;
  catTires: string;
  catCoolant: string;
  catBattery: string;
  catSuspension: string;
  catTimingBelt: string;
  catChainDrive: string;
  catDocumentation: string;
}

const MEDICAL_EXTRA_COPY: Record<LanguageCode, MedicalExtraCopy> = {
  pt: {
    headerTitle: 'Prontuário & Ficha Médica',
    plateLabel: 'Placa',
    tiresLabel: 'Pneus',
    shareHistoryBtn: 'Compartilhar Histórico',
    shareHistoryTitle: 'Gerar e enviar todo o histórico de manutenção via WhatsApp',
    addRecordBtn: 'Adicionar Registro',
    attentionRadarLabel: 'Radar de Atenção',
    overdueCount: (n) => `${n} vencido${n > 1 ? 's' : ''}`,
    soonCount: (n) => `${n} próximo${n > 1 ? 's' : ''}`,
    dueSoonCount: (n) => `${n} vence em breve`,
    noUrgencies: 'Sem urgências agora',
    activeChecklistHint: 'Checklist preventivo ativo',
    docsInsuranceLabel: 'Documentos & Seguro',
    bothRegular: 'Ambos regulares',
    datesNotInformed: 'Datas não informadas',
    checkExpiries: 'Conferir vencimentos',
    docShort: 'Doc',
    insShort: 'Seg',
    lastServiceLabel: 'Último Atendimento',
    noRecordShort: 'Nenhum registro',
    registerFirstMaintHint: 'Registre a primeira manutenção',
    documentedInvestmentLabel: 'Investimento Documentado',
    recordCount: (n) => `${n} registro${n === 1 ? '' : 's'}`,
    attachmentCount: (n) => `${n} anexo${n === 1 ? '' : 's'}`,
    radarHeading: 'Radar de Lembretes — Próximas Revisões e Prazos',
    radarSubheading: 'Registre em 1 clique ao realizar ou envie para sua agenda e WhatsApp para não esquecer',
    attentionTab: (n) => `Atenção (${n})`,
    allTab: (n) => `Todos (${n})`,
    expandBtn: 'Expandir',
    collapseBtn: 'Recolher',
    registerNowBtn: 'Registrar agora',
    calendarBtn: 'Agenda',
    calendarTitle: 'Salvar alerta no Google Agenda / Apple Calendar (.ics)',
    calendarFilePrefix: 'lembrete',
    remindBtn: 'Lembrar',
    remindTitle: 'Enviar este lembrete para o WhatsApp',
    whatsappLabel: 'WhatsApp:',
    changeBtn: 'Alterar',
    waPlaceholder: 'WhatsApp (+55 11 99999-8888)',
    saveBtn: 'Salvar',
    cancelBtn: 'Cancelar',
    emailAria: 'E-mail para envio da ficha',
    emailPlaceholder: 'email@exemplo.com',
    sendToMyWaBtn: 'Enviar para meu WhatsApp',
    configureWaBtn: 'Configurar WhatsApp',
    configureWaHint: 'Salve seu WhatsApp ao lado para envio direto em 1 clique.',
    sendByEmailBtn: 'Enviar Ficha por E-mail',
    emailOpenedFeedback: (email) => `Abrindo seu e-mail para ${email} (texto completo também copiado).`,
    emailMissingFeedback: 'Informe um e-mail acima para enviar a ficha técnica completa.',
    copiedBtn: 'Copiado',
    copySheetBtn: 'Copiar Ficha',
    fullPdfBtn: 'PDF Completo',
    filterAllCount: (n) => `Todos (${n})`,
    filterMaintRevisions: 'Manutenções & Revisões',
    filterFuels: 'Abastecimentos',
    filterEvCharges: 'Carregamentos EV',
    filterExpensesNotes: 'Gastos & Notas',
    loadingRecord: 'Carregando prontuário médico do veículo...',
    emptyHistoryTitle: 'Nenhum registro lançado no histórico deste veículo',
    emptyHistoryBody:
      'Clique em “Registrar agora” nos lembretes acima ou adicione manutenções, abastecimentos, recargas e fotos das notas fiscais para construir a ficha técnica completa.',
    addFirstRecordBtn: 'Adicionar Primeiro Registro',
    noFilterResults: 'Nenhum registro encontrado para essa busca ou filtro.',
    clearFiltersBtn: 'Limpar filtros',
    itemCount: (n) => `${n} ${n === 1 ? 'item' : 'itens'}`,
    waShareBtn: 'WhatsApp',
    overdueAgo: (d) => `Venceu há ${d}d`,
    dueInDays: (d) => `Vence em ${d}d`,
    orWord: 'ou',
    badgeMaintenance: 'Manutenção',
    badgeRevision: 'Revisão',
    badgeFuel: 'Abastecimento',
    badgeExpense: 'Gasto',
    badgeEvCharge: 'Carregamento EV',
    evChargeTitle: (pt, kwh, s, e) => `Recarga ${pt} · ${kwh} kWh (${s}% → ${e}%)`,
    defaultBadgeDoc: 'Nota / Documento',
    privateArchive: 'Arquivo Privado',
    authUploadError:
      'Entre com sua conta (Google, Apple, Facebook ou e-mail) para salvar a foto da nota no Storage privado.',
    defaultStation: 'Estação de Recarga',
    defaultFuelStation: 'Posto de Combustível',
    defaultWorkshop: 'Oficina / Registro Próprio',
    chargeNote: (station, kwh) => `Recarga ${station} (${kwh} kWh)`.slice(0, 200),
    defaultRevisionTitle: 'Revisão periódica',
    defaultFuelTitle: 'Abastecimento',
    defaultExpenseTitle: 'Despesa do veículo',
    defaultMaintTitle: 'Manutenção preventiva',
    saveRecordError: 'Não foi possível salvar o registro.',
    uploadPhotoError: 'Erro ao enviar foto da nota.',
    deleteAttachmentError: 'Erro ao remover anexo.',
    waInvalidMsg: 'Informe um WhatsApp válido com DDI/código de área (ex.: +55 11 99999-8888).',
    waSavedMsg: 'WhatsApp salvo permanentemente na conta.',
    dossierCopiedMsg: 'Ficha técnica completa copiada!',
    copyFallbackMsg: 'Use os botões de WhatsApp ou E-mail ao lado.',
    pdfGeneratedMsg: (filename, photos) =>
      `PDF "${filename}" gerado com ${photos} foto(s) incorporada(s).`,
    pdfErrorMsg: 'Não foi possível gerar o PDF.',
    docLicenseTitle: 'Licenciamento / ITV / CRLV',
    docInsuranceTitle: 'Apólice de Seguro',
    closeAria: 'Fechar',
    catOil: 'Óleo & Filtros',
    catBrakes: 'Freios',
    catTires: 'Pneus & Alinhamento',
    catCoolant: 'Arrefecimento',
    catBattery: 'Bateria',
    catSuspension: 'Suspensão',
    catTimingBelt: 'Correia Dentada',
    catChainDrive: 'Kit Relação / Corrente',
    catDocumentation: 'Documentação / ITV / Seguro',
  },
  en: {
    headerTitle: 'Vehicle Medical Record',
    plateLabel: 'Plate',
    tiresLabel: 'Tires',
    shareHistoryBtn: 'Share History',
    shareHistoryTitle: 'Generate and send the full maintenance history via WhatsApp',
    addRecordBtn: 'Add Record',
    attentionRadarLabel: 'Attention Radar',
    overdueCount: (n) => `${n} overdue`,
    soonCount: (n) => `${n} due soon`,
    dueSoonCount: (n) => `${n} due soon`,
    noUrgencies: 'No urgencies now',
    activeChecklistHint: 'Preventive checklist active',
    docsInsuranceLabel: 'Documents & Insurance',
    bothRegular: 'Both up to date',
    datesNotInformed: 'Dates not set',
    checkExpiries: 'Check expiry dates',
    docShort: 'Doc',
    insShort: 'Ins',
    lastServiceLabel: 'Last Service',
    noRecordShort: 'No records yet',
    registerFirstMaintHint: 'Log the first maintenance',
    documentedInvestmentLabel: 'Documented Investment',
    recordCount: (n) => `${n} record${n === 1 ? '' : 's'}`,
    attachmentCount: (n) => `${n} attachment${n === 1 ? '' : 's'}`,
    radarHeading: 'Reminder Radar — Upcoming Services & Deadlines',
    radarSubheading: 'Log in 1 click when done or send to your calendar and WhatsApp so you never miss it',
    attentionTab: (n) => `Attention (${n})`,
    allTab: (n) => `All (${n})`,
    expandBtn: 'Expand',
    collapseBtn: 'Collapse',
    registerNowBtn: 'Log now',
    calendarBtn: 'Calendar',
    calendarTitle: 'Save alert to Google Calendar / Apple Calendar (.ics)',
    calendarFilePrefix: 'reminder',
    remindBtn: 'Remind',
    remindTitle: 'Send this reminder to WhatsApp',
    whatsappLabel: 'WhatsApp:',
    changeBtn: 'Change',
    waPlaceholder: 'WhatsApp (+1 555 123 4567)',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    emailAria: 'Recipient email for medical sheet',
    emailPlaceholder: 'email@example.com',
    sendToMyWaBtn: 'Send to my WhatsApp',
    configureWaBtn: 'Set up WhatsApp',
    configureWaHint: 'Save your WhatsApp number on the left for 1-click sending.',
    sendByEmailBtn: 'Email Medical Sheet',
    emailOpenedFeedback: (email) => `Opening your email client for ${email} (full text also copied).`,
    emailMissingFeedback: 'Enter an email address above to send the full technical sheet.',
    copiedBtn: 'Copied',
    copySheetBtn: 'Copy Sheet',
    fullPdfBtn: 'Full PDF',
    filterAllCount: (n) => `All (${n})`,
    filterMaintRevisions: 'Maintenance & Services',
    filterFuels: 'Fuel Logs',
    filterEvCharges: 'EV Charging',
    filterExpensesNotes: 'Expenses & Receipts',
    loadingRecord: 'Loading vehicle medical record...',
    emptyHistoryTitle: 'No records logged for this vehicle yet',
    emptyHistoryBody:
      'Click "Log now" on the reminders above or add services, fuel logs, EV charges, and receipt photos to build the complete record.',
    addFirstRecordBtn: 'Add First Record',
    noFilterResults: 'No records found matching this search or filter.',
    clearFiltersBtn: 'Clear filters',
    itemCount: (n) => `${n} ${n === 1 ? 'item' : 'items'}`,
    waShareBtn: 'WhatsApp',
    overdueAgo: (d) => `Expired ${d}d ago`,
    dueInDays: (d) => `Due in ${d}d`,
    orWord: 'or',
    badgeMaintenance: 'Maintenance',
    badgeRevision: 'Inspection',
    badgeFuel: 'Fuel',
    badgeExpense: 'Expense',
    badgeEvCharge: 'EV Charge',
    evChargeTitle: (pt, kwh, s, e) => `${pt} Charge · ${kwh} kWh (${s}% → ${e}%)`,
    defaultBadgeDoc: 'Receipt / Document',
    privateArchive: 'Private Archive',
    authUploadError:
      'Sign in with your account (Google, Apple, Facebook, or email) to save receipt photos to private Storage.',
    defaultStation: 'Charging Station',
    defaultFuelStation: 'Fuel Station',
    defaultWorkshop: 'Workshop / Self-Logged',
    chargeNote: (station, kwh) => `Charge ${station} (${kwh} kWh)`.slice(0, 200),
    defaultRevisionTitle: 'Periodic inspection',
    defaultFuelTitle: 'Refueling',
    defaultExpenseTitle: 'Vehicle expense',
    defaultMaintTitle: 'Preventive maintenance',
    saveRecordError: 'Could not save the record.',
    uploadPhotoError: 'Failed to upload receipt photo.',
    deleteAttachmentError: 'Failed to delete attachment.',
    waInvalidMsg: 'Enter a valid WhatsApp number with country code (e.g. +1 555 123 4567).',
    waSavedMsg: 'WhatsApp number saved to your account.',
    dossierCopiedMsg: 'Full technical sheet copied!',
    copyFallbackMsg: 'Use the WhatsApp or Email buttons nearby.',
    pdfGeneratedMsg: (filename, photos) =>
      `PDF "${filename}" generated with ${photos} embedded photo(s).`,
    pdfErrorMsg: 'Could not generate the PDF.',
    docLicenseTitle: 'Registration / MOT / Inspection',
    docInsuranceTitle: 'Insurance Policy',
    closeAria: 'Close',
    catOil: 'Oil & Filters',
    catBrakes: 'Brakes',
    catTires: 'Tires & Alignment',
    catCoolant: 'Cooling System',
    catBattery: 'Battery',
    catSuspension: 'Suspension',
    catTimingBelt: 'Timing Belt',
    catChainDrive: 'Chain & Sprocket Kit',
    catDocumentation: 'Documents / MOT / Insurance',
  },
  es: {
    headerTitle: 'Historial y Ficha Médica',
    plateLabel: 'Matrícula',
    tiresLabel: 'Neumáticos',
    shareHistoryBtn: 'Compartir Historial',
    shareHistoryTitle: 'Generar y enviar todo el historial de mantenimiento por WhatsApp',
    addRecordBtn: 'Añadir Registro',
    attentionRadarLabel: 'Radar de Atención',
    overdueCount: (n) => `${n} vencido${n > 1 ? 's' : ''}`,
    soonCount: (n) => `${n} próximo${n > 1 ? 's' : ''}`,
    dueSoonCount: (n) => `${n} vence pronto`,
    noUrgencies: 'Sin urgencias ahora',
    activeChecklistHint: 'Checklist preventivo activo',
    docsInsuranceLabel: 'Documentos y Seguro',
    bothRegular: 'Ambos en regla',
    datesNotInformed: 'Fechas no indicadas',
    checkExpiries: 'Revisar vencimientos',
    docShort: 'Doc',
    insShort: 'Seg',
    lastServiceLabel: 'Último Servicio',
    noRecordShort: 'Sin registros',
    registerFirstMaintHint: 'Registra el primer mantenimiento',
    documentedInvestmentLabel: 'Inversión Documentada',
    recordCount: (n) => `${n} registro${n === 1 ? '' : 's'}`,
    attachmentCount: (n) => `${n} adjunto${n === 1 ? '' : 's'}`,
    radarHeading: 'Radar de Recordatorios — Próximas Revisiones y Plazos',
    radarSubheading: 'Registra en 1 clic al completarlo o envíalo a tu calendario y WhatsApp para no olvidarlo',
    attentionTab: (n) => `Atención (${n})`,
    allTab: (n) => `Todos (${n})`,
    expandBtn: 'Expandir',
    collapseBtn: 'Ocultar',
    registerNowBtn: 'Registrar ahora',
    calendarBtn: 'Agenda',
    calendarTitle: 'Guardar alerta en Google Calendar / Apple Calendar (.ics)',
    calendarFilePrefix: 'recordatorio',
    remindBtn: 'Recordar',
    remindTitle: 'Enviar este recordatorio a WhatsApp',
    whatsappLabel: 'WhatsApp:',
    changeBtn: 'Cambiar',
    waPlaceholder: 'WhatsApp (+34 612 345 678)',
    saveBtn: 'Guardar',
    cancelBtn: 'Cancelar',
    emailAria: 'Correo para enviar la ficha',
    emailPlaceholder: 'correo@ejemplo.com',
    sendToMyWaBtn: 'Enviar a mi WhatsApp',
    configureWaBtn: 'Configurar WhatsApp',
    configureWaHint: 'Guarda tu WhatsApp al lado para envío directo en 1 clic.',
    sendByEmailBtn: 'Enviar Ficha por Email',
    emailOpenedFeedback: (email) => `Abriendo tu correo para ${email} (texto completo también copiado).`,
    emailMissingFeedback: 'Indica un correo arriba para enviar la ficha técnica completa.',
    copiedBtn: 'Copiado',
    copySheetBtn: 'Copiar Ficha',
    fullPdfBtn: 'PDF Completo',
    filterAllCount: (n) => `Todos (${n})`,
    filterMaintRevisions: 'Mantenimiento y Revisiones',
    filterFuels: 'Repostajes',
    filterEvCharges: 'Cargas EV',
    filterExpensesNotes: 'Gastos y Facturas',
    loadingRecord: 'Cargando ficha médica del vehículo...',
    emptyHistoryTitle: 'No hay registros en el historial de este vehículo',
    emptyHistoryBody:
      'Haz clic en "Registrar ahora" en los recordatorios de arriba o añade mantenimientos, repostajes, cargas y fotos de facturas.',
    addFirstRecordBtn: 'Añadir Primer Registro',
    noFilterResults: 'No se encontraron registros para esa búsqueda o filtro.',
    clearFiltersBtn: 'Limpiar filtros',
    itemCount: (n) => `${n} ${n === 1 ? 'elemento' : 'elementos'}`,
    waShareBtn: 'WhatsApp',
    overdueAgo: (d) => `Venció hace ${d}d`,
    dueInDays: (d) => `Vence en ${d}d`,
    orWord: 'o',
    badgeMaintenance: 'Mantenimiento',
    badgeRevision: 'Revisión',
    badgeFuel: 'Repostaje',
    badgeExpense: 'Gasto',
    badgeEvCharge: 'Carga EV',
    evChargeTitle: (pt, kwh, s, e) => `Carga ${pt} · ${kwh} kWh (${s}% → ${e}%)`,
    defaultBadgeDoc: 'Factura / Documento',
    privateArchive: 'Archivo Privado',
    authUploadError:
      'Inicia sesión con tu cuenta (Google, Apple, Facebook o correo) para guardar fotos en el almacenamiento privado.',
    defaultStation: 'Estación de Carga',
    defaultFuelStation: 'Gasolinera',
    defaultWorkshop: 'Taller / Registro Propio',
    chargeNote: (station, kwh) => `Carga ${station} (${kwh} kWh)`.slice(0, 200),
    defaultRevisionTitle: 'Revisión periódica',
    defaultFuelTitle: 'Repostaje',
    defaultExpenseTitle: 'Gasto del vehículo',
    defaultMaintTitle: 'Mantenimiento preventivo',
    saveRecordError: 'No se pudo guardar el registro.',
    uploadPhotoError: 'Error al subir la foto de la factura.',
    deleteAttachmentError: 'Error al eliminar el adjunto.',
    waInvalidMsg: 'Indica un WhatsApp válido con código de país (ej.: +34 612 345 678).',
    waSavedMsg: 'WhatsApp guardado permanentemente en la cuenta.',
    dossierCopiedMsg: '¡Ficha técnica completa copiada!',
    copyFallbackMsg: 'Usa los botones de WhatsApp o Email al lado.',
    pdfGeneratedMsg: (filename, photos) =>
      `PDF "${filename}" generado con ${photos} foto(s) incrustada(s).`,
    pdfErrorMsg: 'No se pudo generar el PDF.',
    docLicenseTitle: 'Permiso / ITV / Circulación',
    docInsuranceTitle: 'Póliza de Seguro',
    closeAria: 'Cerrar',
    catOil: 'Aceite y Filtros',
    catBrakes: 'Frenos',
    catTires: 'Neumáticos y Alineación',
    catCoolant: 'Refrigeración',
    catBattery: 'Batería',
    catSuspension: 'Suspensión',
    catTimingBelt: 'Correa de Distribución',
    catChainDrive: 'Kit de Arrastre / Cadena',
    catDocumentation: 'Documentación / ITV / Seguro',
  },
  de: {
    headerTitle: 'Fahrzeugakte & Krankenblatt',
    plateLabel: 'Kennzeichen',
    tiresLabel: 'Reifen',
    shareHistoryBtn: 'Historie teilen',
    shareHistoryTitle: 'Gesamte Wartungshistorie über WhatsApp teilen',
    addRecordBtn: 'Eintrag hinzufügen',
    attentionRadarLabel: 'Aufmerksamkeits-Radar',
    overdueCount: (n) => `${n} überfällig`,
    soonCount: (n) => `${n} bald fällig`,
    dueSoonCount: (n) => `${n} bald fällig`,
    noUrgencies: 'Keine Dringlichkeiten',
    activeChecklistHint: 'Präventive Checkliste aktiv',
    docsInsuranceLabel: 'Dokumente & Versicherung',
    bothRegular: 'Beides aktuell',
    datesNotInformed: 'Daten nicht erfasst',
    checkExpiries: 'Fristen prüfen',
    docShort: 'Dok',
    insShort: 'Vers',
    lastServiceLabel: 'Letzter Service',
    noRecordShort: 'Keine Einträge',
    registerFirstMaintHint: 'Erste Wartung erfassen',
    documentedInvestmentLabel: 'Dokumentierte Ausgaben',
    recordCount: (n) => `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`,
    attachmentCount: (n) => `${n} ${n === 1 ? 'Anhang' : 'Anhänge'}`,
    radarHeading: 'Erinnerungs-Radar — Nächste Services & Fristen',
    radarSubheading: 'Mit 1 Klick erledigen oder für Kalender und WhatsApp exportieren',
    attentionTab: (n) => `Achtung (${n})`,
    allTab: (n) => `Alle (${n})`,
    expandBtn: 'Erweitern',
    collapseBtn: 'Einklappen',
    registerNowBtn: 'Jetzt erfassen',
    calendarBtn: 'Kalender',
    calendarTitle: 'Erinnerung in Google Kalender / Apple Kalender speichern (.ics)',
    calendarFilePrefix: 'erinnerung',
    remindBtn: 'Erinnern',
    remindTitle: 'Diese Erinnerung per WhatsApp senden',
    whatsappLabel: 'WhatsApp:',
    changeBtn: 'Ändern',
    waPlaceholder: 'WhatsApp (+49 170 1234567)',
    saveBtn: 'Speichern',
    cancelBtn: 'Abbrechen',
    emailAria: 'E-Mail für Fahrzeugakte',
    emailPlaceholder: 'email@beispiel.de',
    sendToMyWaBtn: 'An mein WhatsApp senden',
    configureWaBtn: 'WhatsApp einrichten',
    configureWaHint: 'Speichern Sie links Ihre WhatsApp-Nummer für den 1-Klick-Versand.',
    sendByEmailBtn: 'Akte per E-Mail senden',
    emailOpenedFeedback: (email) => `E-Mail-Programm für ${email} wird geöffnet (Volltext auch kopiert).`,
    emailMissingFeedback: 'Geben Sie oben eine E-Mail-Adresse ein.',
    copiedBtn: 'Kopiert',
    copySheetBtn: 'Akte kopieren',
    fullPdfBtn: 'Vollständiges PDF',
    filterAllCount: (n) => `Alle (${n})`,
    filterMaintRevisions: 'Wartung & Inspektion',
    filterFuels: 'Tanken',
    filterEvCharges: 'EV-Ladevorgänge',
    filterExpensesNotes: 'Ausgaben & Belege',
    loadingRecord: 'Digitale Fahrzeugakte wird geladen...',
    emptyHistoryTitle: 'Noch keine Einträge in dieser Fahrzeughistorie',
    emptyHistoryBody:
      'Klicken Sie oben auf „Jetzt erfassen“ oder fügen Sie Wartungen, Tankstopps, Ladevorgänge und Belegfotos hinzu.',
    addFirstRecordBtn: 'Ersten Eintrag erstellen',
    noFilterResults: 'Keine Einträge für diese Suche oder diesen Filter.',
    clearFiltersBtn: 'Filter zurücksetzen',
    itemCount: (n) => `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`,
    waShareBtn: 'WhatsApp',
    overdueAgo: (d) => `Vor ${d}T abgelaufen`,
    dueInDays: (d) => `Fällig in ${d}T`,
    orWord: 'oder',
    badgeMaintenance: 'Wartung',
    badgeRevision: 'Inspektion',
    badgeFuel: 'Tanken',
    badgeExpense: 'Ausgabe',
    badgeEvCharge: 'EV-Laden',
    evChargeTitle: (pt, kwh, s, e) => `${pt}-Laden · ${kwh} kWh (${s}% → ${e}%)`,
    defaultBadgeDoc: 'Beleg / Dokument',
    privateArchive: 'Privates Archiv',
    authUploadError:
      'Melden Sie sich mit Ihrem Konto (Google, Apple, Facebook oder E-Mail) an, um Fotos privat zu speichern.',
    defaultStation: 'Ladestation',
    defaultFuelStation: 'Tankstelle',
    defaultWorkshop: 'Werkstatt / Eigenleistung',
    chargeNote: (station, kwh) => `Ladevorgang ${station} (${kwh} kWh)`.slice(0, 200),
    defaultRevisionTitle: 'Periodische Inspektion',
    defaultFuelTitle: 'Betankung',
    defaultExpenseTitle: 'Fahrzeugausgabe',
    defaultMaintTitle: 'Präventive Wartung',
    saveRecordError: 'Eintrag konnte nicht gespeichert werden.',
    uploadPhotoError: 'Fehler beim Hochladen des Belegfotos.',
    deleteAttachmentError: 'Fehler beim Entfernen des Anhangs.',
    waInvalidMsg: 'Geben Sie eine gültige WhatsApp-Nummer mit Landesvorwahl ein (z. B. +49 170 1234567).',
    waSavedMsg: 'WhatsApp dauerhaft im Konto gespeichert.',
    dossierCopiedMsg: 'Vollständige Fahrzeugakte kopiert!',
    copyFallbackMsg: 'Nutzen Sie die WhatsApp- oder E-Mail-Buttons daneben.',
    pdfGeneratedMsg: (filename, photos) =>
      `PDF „${filename}“ mit ${photos} eingebettetem Foto(s) erstellt.`,
    pdfErrorMsg: 'PDF konnte nicht erstellt werden.',
    docLicenseTitle: 'Zulassung / TÜV / HU',
    docInsuranceTitle: 'Versicherungspolice',
    closeAria: 'Schließen',
    catOil: 'Öl & Filter',
    catBrakes: 'Bremsen',
    catTires: 'Reifen & Achse',
    catCoolant: 'Kühlsystem',
    catBattery: 'Batterie',
    catSuspension: 'Fahrwerk',
    catTimingBelt: 'Zahnriemen',
    catChainDrive: 'Kettensatz',
    catDocumentation: 'Dokumente / TÜV / Versicherung',
  },
  fr: {
    headerTitle: 'Carnet de Santé & Dossier',
    plateLabel: 'Plaque',
    tiresLabel: 'Pneus',
    shareHistoryBtn: 'Partager l’historique',
    shareHistoryTitle: 'Générer et envoyer tout l’historique d’entretien via WhatsApp',
    addRecordBtn: 'Ajouter une entrée',
    attentionRadarLabel: 'Radar d’Attention',
    overdueCount: (n) => `${n} en retard`,
    soonCount: (n) => `${n} bientôt dû${n > 1 ? 's' : ''}`,
    dueSoonCount: (n) => `${n} bientôt dû`,
    noUrgencies: 'Aucune urgence',
    activeChecklistHint: 'Checklist préventive active',
    docsInsuranceLabel: 'Documents & Assurance',
    bothRegular: 'Tous deux à jour',
    datesNotInformed: 'Dates non renseignées',
    checkExpiries: 'Vérifier les échéances',
    docShort: 'Doc',
    insShort: 'Assur',
    lastServiceLabel: 'Dernière Intervention',
    noRecordShort: 'Aucune entrée',
    registerFirstMaintHint: 'Enregistrez le premier entretien',
    documentedInvestmentLabel: 'Investissement Documenté',
    recordCount: (n) => `${n} entrée${n === 1 ? '' : 's'}`,
    attachmentCount: (n) => `${n} pièce${n === 1 ? '' : 's'} jointe${n === 1 ? '' : 's'}`,
    radarHeading: 'Radar de Rappels — Prochaines Révisions & Échéances',
    radarSubheading: 'Enregistrez en 1 clic une fois fait ou envoyez vers votre agenda et WhatsApp',
    attentionTab: (n) => `Attention (${n})`,
    allTab: (n) => `Tous (${n})`,
    expandBtn: 'Déplier',
    collapseBtn: 'Réduire',
    registerNowBtn: 'Enregistrer',
    calendarBtn: 'Agenda',
    calendarTitle: 'Enregistrer le rappel dans Google Agenda / Apple Calendar (.ics)',
    calendarFilePrefix: 'rappel',
    remindBtn: 'Rappeler',
    remindTitle: 'Envoyer ce rappel sur WhatsApp',
    whatsappLabel: 'WhatsApp :',
    changeBtn: 'Modifier',
    waPlaceholder: 'WhatsApp (+33 6 12 34 56 78)',
    saveBtn: 'Enregistrer',
    cancelBtn: 'Annuler',
    emailAria: 'E-mail pour envoyer le dossier',
    emailPlaceholder: 'email@exemple.fr',
    sendToMyWaBtn: 'Envoyer sur mon WhatsApp',
    configureWaBtn: 'Configurer WhatsApp',
    configureWaHint: 'Enregistrez votre WhatsApp à gauche pour l’envoi direct en 1 clic.',
    sendByEmailBtn: 'Envoyer par E-mail',
    emailOpenedFeedback: (email) => `Ouverture de votre messagerie vers ${email} (texte complet également copié).`,
    emailMissingFeedback: 'Indiquez un e-mail ci-dessus pour envoyer le dossier complet.',
    copiedBtn: 'Copié',
    copySheetBtn: 'Copier le dossier',
    fullPdfBtn: 'PDF Complet',
    filterAllCount: (n) => `Tous (${n})`,
    filterMaintRevisions: 'Entretiens & Révisions',
    filterFuels: 'Pleins carburant',
    filterEvCharges: 'Recharges EV',
    filterExpensesNotes: 'Frais & Factures',
    loadingRecord: 'Chargement du carnet de santé du véhicule...',
    emptyHistoryTitle: 'Aucune entrée enregistrée pour ce véhicule',
    emptyHistoryBody:
      'Cliquez sur « Enregistrer » dans les rappels ci-dessus ou ajoutez entretiens, pleins, recharges et photos de factures.',
    addFirstRecordBtn: 'Ajouter la première entrée',
    noFilterResults: 'Aucune entrée trouvée pour cette recherche ou ce filtre.',
    clearFiltersBtn: 'Effacer les filtres',
    itemCount: (n) => `${n} ${n === 1 ? 'élément' : 'éléments'}`,
    waShareBtn: 'WhatsApp',
    overdueAgo: (d) => `Expiré il y a ${d}j`,
    dueInDays: (d) => `Dans ${d}j`,
    orWord: 'ou',
    badgeMaintenance: 'Entretien',
    badgeRevision: 'Révision',
    badgeFuel: 'Carburant',
    badgeExpense: 'Frais',
    badgeEvCharge: 'Recharge EV',
    evChargeTitle: (pt, kwh, s, e) => `Recharge ${pt} · ${kwh} kWh (${s}% → ${e}%)`,
    defaultBadgeDoc: 'Facture / Document',
    privateArchive: 'Archives Privées',
    authUploadError:
      'Connectez-vous avec votre compte (Google, Apple, Facebook ou e-mail) pour sauvegarder les photos dans le stockage privé.',
    defaultStation: 'Borne de Recharge',
    defaultFuelStation: 'Station-service',
    defaultWorkshop: 'Garage / Entretien Perso',
    chargeNote: (station, kwh) => `Recharge ${station} (${kwh} kWh)`.slice(0, 200),
    defaultRevisionTitle: 'Révision périodique',
    defaultFuelTitle: 'Plein carburant',
    defaultExpenseTitle: 'Dépense véhicule',
    defaultMaintTitle: 'Entretien préventif',
    saveRecordError: 'Impossible d’enregistrer l’entrée.',
    uploadPhotoError: 'Erreur lors de l’envoi de la photo.',
    deleteAttachmentError: 'Erreur lors de la suppression de la pièce jointe.',
    waInvalidMsg: 'Indiquez un numéro WhatsApp valide avec l’indicatif pays (ex. : +33 6 12 34 56 78).',
    waSavedMsg: 'WhatsApp enregistré dans votre compte.',
    dossierCopiedMsg: 'Dossier technique complet copié !',
    copyFallbackMsg: 'Utilisez les boutons WhatsApp ou E-mail à côté.',
    pdfGeneratedMsg: (filename, photos) =>
      `PDF « ${filename} » généré avec ${photos} photo(s) intégrée(s).`,
    pdfErrorMsg: 'Impossible de générer le PDF.',
    docLicenseTitle: 'Carte grise / Contrôle technique',
    docInsuranceTitle: 'Contrat d’assurance',
    closeAria: 'Fermer',
    catOil: 'Huile & Filtres',
    catBrakes: 'Freins',
    catTires: 'Pneus & Géométrie',
    catCoolant: 'Refroidissement',
    catBattery: 'Batterie',
    catSuspension: 'Suspension',
    catTimingBelt: 'Courroie de distribution',
    catChainDrive: 'Kit chaîne',
    catDocumentation: 'Documents / CT / Assurance',
  },
};

function formatMonthHeading(
  dateIso: string,
  monthNames: string[],
  otherHeading: string,
  language: LanguageCode
): string {
  const parts = dateIso.split('-');
  if (parts.length < 2) return otherHeading;
  const year = parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const monthName = monthNames[monthIdx] ?? parts[1];
  return language === 'pt' || language === 'es' ? `${monthName} de ${year}` : `${monthName} ${year}`;
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
  const ui = getUi(prefs.language);
  const mUi = ui.medicalUi;
  const mCopy = MEDICAL_EXTRA_COPY[prefs.language];
  const attLabels = getLocalizedAttachmentLabels(prefs.language);
  const localizedItems = TRANSLATIONS[prefs.language].items;

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
        t?.items?.[item.titleKey]?.title ?? localizedItems[item.titleKey]?.title ?? item.titleKey;

      let statusLabel = mUi.radarOnTrack;
      let dueSummary = '';
      let progressPercent = 0;
      let urgencyRank = 3;

      if (calc.status === MaintenanceStatus.PENDING) {
        statusLabel = mUi.radarWaiting;
        dueSummary = `${mUi.radarSuggestedCycle} ${calc.effectiveIntervalDays}d / ${formatDistance(calc.effectiveIntervalKm, prefs.units)}`;
        progressPercent = 15;
        urgencyRank = 2;
      } else {
        const dayRatio = calc.daysElapsed / Math.max(1, calc.effectiveIntervalDays);
        const kmRatio = calc.kmElapsed / Math.max(1, calc.effectiveIntervalKm);
        progressPercent = Math.min(100, Math.max(5, Math.round(Math.max(dayRatio, kmRatio) * 100)));

        if (calc.status === MaintenanceStatus.OVERDUE) {
          statusLabel = mUi.radarOverdue;
          urgencyRank = 0;
          const overDays = calc.daysRemaining < 0 ? `${Math.abs(calc.daysRemaining)}d ${mUi.radarOverdueByDays}` : '';
          const overKm =
            calc.kmRemaining < 0
              ? `${formatDistance(Math.abs(calc.kmRemaining), prefs.units)} ${mUi.radarOverdueByKm}`
              : '';
          dueSummary = [overDays, overKm].filter(Boolean).join(' · ') || mUi.radarImmediate;
        } else if (calc.status === MaintenanceStatus.ATTENTION) {
          statusLabel = mUi.radarDueSoon;
          urgencyRank = 1;
          dueSummary = `${mUi.radarDueIn} ${Math.max(0, calc.daysRemaining)}d ${mCopy.orWord} ${formatDistance(Math.max(0, calc.kmRemaining), prefs.units)}${calc.projectedDueDate ? ` (${calc.projectedDueDate})` : ''}`;
        } else {
          statusLabel = mUi.radarOnTrack;
          urgencyRank = 3;
          dueSummary = `${mUi.radarDueIn} ${Math.max(0, calc.daysRemaining)}d ${mCopy.orWord} ${formatDistance(Math.max(0, calc.kmRemaining), prefs.units)}${calc.projectedDueDate ? ` (${calc.projectedDueDate})` : ''}`;
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
        title: t?.garage?.docLicense ?? mCopy.docLicenseTitle,
        status,
        statusLabel:
          status === MaintenanceStatus.OVERDUE
            ? mUi.radarOverdue
            : status === MaintenanceStatus.ATTENTION
            ? mUi.radarDueSoon
            : mUi.radarOnTrack,
        dueSummary:
          daysLeft < 0
            ? `${mCopy.overdueAgo(Math.abs(daysLeft))} (${vehicle.documentExpiryDate})`
            : `${mCopy.dueInDays(daysLeft)} (${vehicle.documentExpiryDate})`,
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
        title: t?.garage?.docLicense ?? mCopy.docLicenseTitle,
        status: MaintenanceStatus.PENDING,
        statusLabel: mUi.radarNoDate,
        dueSummary: mUi.radarNoDateHint,
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
        title: t?.garage?.docInsurance ?? mCopy.docInsuranceTitle,
        status,
        statusLabel:
          status === MaintenanceStatus.OVERDUE
            ? mUi.radarOverdue
            : status === MaintenanceStatus.ATTENTION
            ? mUi.radarDueSoon
            : mUi.radarOnTrack,
        dueSummary:
          daysLeft < 0
            ? `${mCopy.overdueAgo(Math.abs(daysLeft))} (${vehicle.insuranceExpiryDate})`
            : `${mCopy.dueInDays(daysLeft)} (${vehicle.insuranceExpiryDate})`,
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
        title: t?.garage?.docInsurance ?? mCopy.docInsuranceTitle,
        status: MaintenanceStatus.PENDING,
        statusLabel: mUi.radarNoDate,
        dueSummary: mUi.radarNoDateHint,
        projectedDueDate: '',
        progressPercent: 0,
        effectiveIntervalDays: 365,
        effectiveIntervalKm: 0,
        category: MaintenanceCategory.DOCUMENTATION,
        urgencyRank: 2,
      });
    }

    return list.sort((a, b) => a.urgencyRank - b.urgencyRank || b.progressPercent - a.progressPercent);
  }, [maintenanceItems, vehicle, prefs, t, localizedItems, mUi, mCopy]);

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
      let badgeLabel = mCopy.badgeMaintenance;
      let filterGroup: Exclude<TimelineFilter, 'all'> = 'maintenance';

      if (log.category === MaintenanceCategory.REVISION) {
        badgeLabel = mCopy.badgeRevision;
      } else if (log.category === MaintenanceCategory.FUEL) {
        badgeLabel = mCopy.badgeFuel;
        filterGroup = 'fuel';
      } else if (log.category === MaintenanceCategory.EXPENSE) {
        badgeLabel = mCopy.badgeExpense;
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
        badgeLabel: mCopy.badgeEvCharge,
        title: mCopy.evChargeTitle(chg.powerType, chg.energyKwh.toFixed(1), chg.socStart, chg.socEnd),
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
        badgeLabel: attLabels[att.fileCategory] ?? mCopy.defaultBadgeDoc,
        title: att.fileName,
        odometerKm: null,
        location: mCopy.privateArchive,
        cost: null,
        currency: prefs.currency,
        notes: att.notes || '',
        attachments: [att],
      });
    }

    return entries.sort((a, b) => b.date.localeCompare(a.date));
  }, [logs, chargingSessions, attachments, vehicle.id, prefs.currency, mCopy, attLabels]);

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
      const monthKey = entry.date.slice(0, 7) || 'other';
      let bucket = map.get(monthKey);
      if (!bucket) {
        bucket = {
          monthKey,
          label: formatMonthHeading(entry.date, mUi.monthNames, mUi.otherRecordsHeading, prefs.language),
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
  }, [visibleEntries, prefs.currency, prefs.language, mUi.monthNames, mUi.otherRecordsHeading]);

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
        language: prefs.language,
      }),
    [vehicle, dossierEntries, prefs.currency, prefs.units, prefs.language, cloudUserEmail, upcomingDossierReminders]
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
        language: prefs.language,
      }),
    [vehicle, dossierEntries, prefs.currency, prefs.units, prefs.language, cloudUserEmail, upcomingDossierReminders]
  );

  const shareHistoryWhatsAppUrl = useMemo(() => {
    const activePhone = hasSavedWhatsapp ? prefs.whatsappNumber : whatsappInput;
    return buildWhatsAppShareUrl(waDossierText, activePhone, prefs.language);
  }, [waDossierText, hasSavedWhatsapp, prefs.whatsappNumber, whatsappInput, prefs.language]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (pendingFile && !cloudUserId) {
      setFormError(mCopy.authUploadError);
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
          stationName: workshopName.trim() || title.trim() || mCopy.defaultStation,
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
            notes: mCopy.chargeNote(newSession.stationName, kwh),
          });
          onAttachmentCreated(uploaded);
        }
      } else {
        const cleanTitle =
          title.trim() ||
          (recordKind === 'revision'
            ? mCopy.defaultRevisionTitle
            : recordKind === 'fuel'
            ? mCopy.defaultFuelTitle
            : recordKind === 'expense'
            ? mCopy.defaultExpenseTitle
            : mCopy.defaultMaintTitle);

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
            (recordKind === 'fuel' ? mCopy.defaultFuelStation : mCopy.defaultWorkshop),
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
      setFormError(err instanceof Error ? err.message : mCopy.saveRecordError);
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
      setTimelineError(err instanceof Error ? err.message : mCopy.uploadPhotoError);
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
      setTimelineError(err instanceof Error ? err.message : mCopy.deleteAttachmentError);
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
        language: prefs.language,
      })
    : null;

  const handleSaveWhatsappHere = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = whatsappInput.trim();
    if (!sanitizeWhatsAppNumber(clean, prefs.language)) {
      setWhatsappFeedback(mCopy.waInvalidMsg);
      return;
    }
    onUpdatePrefs({ whatsappNumber: clean });
    setEditingWhatsapp(false);
    setWhatsappFeedback(mCopy.waSavedMsg);
  };

  const handleCopyFullDossier = async () => {
    try {
      await navigator.clipboard.writeText(fullDossierText.replace(/\*/g, ''));
      setDossierCopied(true);
      setDossierFeedback(mCopy.dossierCopiedMsg);
      window.setTimeout(() => setDossierCopied(false), 2500);
    } catch {
      setDossierFeedback(mCopy.copyFallbackMsg);
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
      setDossierFeedback(mCopy.pdfGeneratedMsg(res.filename, res.embeddedPhotosCount));
    } catch (err) {
      setDossierFeedback(
        err instanceof Error ? err.message : mCopy.pdfErrorMsg
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
              {mCopy.headerTitle} — {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span>
              {mCopy.plateLabel} <span className="font-mono text-slate-700 dark:text-slate-300">{vehicle.plate}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">
              {formatDistance(vehicle.odometerKm, prefs.units)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{vehicle.powertrain.toUpperCase()}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {mCopy.tiresLabel} {vehicle.tirePressurePsi}
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
            title={mCopy.shareHistoryTitle}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{mCopy.shareHistoryBtn}</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            type="button"
            onClick={() => openModal('maintenance')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-sky-950/25"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{mCopy.addRecordBtn}</span>
          </button>
        </div>
      </div>

      {/* Zone 2: 4-Metric Clinical Summary Strip (Flat hairline-divided grid, zero nested cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 dark:divide-white/10 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/50 tabular-nums">
        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {mCopy.attentionRadarLabel}
          </div>
          {overdueCount > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {mCopy.overdueCount(overdueCount)}
                {attentionCount > 0 ? ` · ${mCopy.soonCount(attentionCount)}` : ''}
              </span>
            </div>
          ) : attentionCount > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <BellRing className="w-3.5 h-3.5 shrink-0" />
              <span>{mCopy.dueSoonCount(attentionCount)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{mCopy.noUrgencies}</span>
            </div>
          )}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {topUrgentReminder ? `${topUrgentReminder.title}` : mCopy.activeChecklistHint}
          </div>
        </div>

        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {mCopy.docsInsuranceLabel}
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {docLicenseOk && docInsuranceOk
              ? mCopy.bothRegular
              : !isDateRecorded(vehicle.documentExpiryDate) && !isDateRecorded(vehicle.insuranceExpiryDate)
              ? mCopy.datesNotInformed
              : mCopy.checkExpiries}
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
            {mCopy.docShort}: {isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : '—'} · {mCopy.insShort}:{' '}
            {isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : '—'}
          </div>
        </div>

        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {mCopy.lastServiceLabel}
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {latestEntry ? latestEntry.title : mCopy.noRecordShort}
          </div>
          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
            {latestEntry
              ? `${latestEntry.date}${
                  latestEntry.odometerKm !== null
                    ? ` · ${formatDistance(latestEntry.odometerKm, prefs.units)}`
                    : ''
                }`
              : mCopy.registerFirstMaintHint}
          </div>
        </div>

        <div className="px-5 py-3.5 space-y-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {mCopy.documentedInvestmentLabel}
          </div>
          <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalInvested, prefs.currency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {mCopy.recordCount(timelineEntries.length)} ·{' '}
            {mCopy.attachmentCount(vehicleAttachmentsCount)}
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
                  {mCopy.radarHeading}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {mCopy.radarSubheading}
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
                  {mCopy.attentionTab(urgentReminders.length)}
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
                  {mCopy.allTab(reminderEntries.length)}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setRemindersCollapsed((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap"
              >
                <span>{remindersCollapsed ? mCopy.expandBtn : mCopy.collapseBtn}</span>
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
                  language: prefs.language,
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
                        <span>{mCopy.registerNowBtn}</span>
                      </button>

                      {rem.projectedDueDate && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadCalendarEvent({
                              title: `${rem.title} — ${vehicle.make} ${vehicle.model}`,
                              description: `${vehicle.plate} · ${rem.dueSummary}`,
                              dateIso: rem.projectedDueDate,
                              filename: `${mCopy.calendarFilePrefix}-${vehicle.plate}-${rem.id}.ics`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 whitespace-nowrap shrink-0"
                          title={mCopy.calendarTitle}
                        >
                          <CalendarPlus className="w-3 h-3" />
                          <span>{mCopy.calendarBtn}</span>
                        </button>
                      )}

                      <WhatsAppConnectButton
                        whatsappNumber={prefs.whatsappNumber}
                        language={prefs.language}
                        compact
                        label={mCopy.remindBtn}
                        title={mCopy.remindTitle}
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
                    {mCopy.whatsappLabel}
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
                    {mCopy.changeBtn}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveWhatsappHere} className="flex items-center gap-1.5">
                  <input
                    type="tel"
                    placeholder={mCopy.waPlaceholder}
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    className="w-48 px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap shrink-0"
                  >
                    {mCopy.saveBtn}
                  </button>
                  {hasSavedWhatsapp && (
                    <button
                      type="button"
                      onClick={() => setEditingWhatsapp(false)}
                      className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800 dark:text-slate-400"
                    >
                      {mCopy.cancelBtn}
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
                aria-label={mCopy.emailAria}
                placeholder={mCopy.emailPlaceholder}
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
                <span>{mCopy.sendToMyWaBtn}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingWhatsapp(true);
                  setWhatsappFeedback(mCopy.configureWaHint);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{mCopy.configureWaBtn}</span>
              </button>
            )}

            {emailDossierUrl ? (
              <a
                href={emailDossierUrl}
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(fullDossierText.replace(/\*/g, ''))
                    .catch(() => {});
                  setDossierFeedback(mCopy.emailOpenedFeedback(cleanEmailTarget));
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 text-white transition-colors whitespace-nowrap shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{mCopy.sendByEmailBtn}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => setDossierFeedback(mCopy.emailMissingFeedback)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{mCopy.sendByEmailBtn}</span>
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
              <span>{dossierCopied ? mCopy.copiedBtn : mCopy.copySheetBtn}</span>
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
              <span>{mCopy.fullPdfBtn}</span>
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
            placeholder={mUi.timelineSearchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10 rounded-xl w-fit">
          {(
            [
              { id: 'all', label: mCopy.filterAllCount(timelineEntries.length) },
              { id: 'maintenance', label: mCopy.filterMaintRevisions },
              { id: 'fuel', label: mCopy.filterFuels },
              { id: 'ev', label: mCopy.filterEvCharges },
              { id: 'expense', label: mCopy.filterExpensesNotes },
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
            <span>{mCopy.loadingRecord}</span>
          </div>
        ) : timelineEntries.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
            <Stethoscope className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {mCopy.emptyHistoryTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {mCopy.emptyHistoryBody}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModal('maintenance')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{mCopy.addFirstRecordBtn}</span>
            </button>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mCopy.noFilterResults}
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              {mCopy.clearFiltersBtn}
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
                      {mCopy.itemCount(group.entries.length)}
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
                            {mUi.workshopLabel}{' '}
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
                                    title={mUi.photoCameraTitle}
                                  >
                                    {uploadingLogId === entry.serviceLogId ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Camera className="w-3 h-3" />
                                    )}
                                    <span>{mUi.photoCameraBtn}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={uploadingLogId === entry.serviceLogId}
                                    onClick={() => triggerInlineUpload(entry.serviceLogId!, 'gallery')}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                                    title={mUi.photoGalleryTitle}
                                  >
                                    <ImagePlus className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              <WhatsAppConnectButton
                                whatsappNumber={prefs.whatsappNumber}
                                language={prefs.language}
                                compact
                                label={mCopy.waShareBtn}
                                message={
                                  entry.sourceLog
                                    ? buildServiceLogWhatsAppText({
                                        vehicle,
                                        log: entry.sourceLog,
                                        currency: prefs.currency,
                                        units: prefs.units,
                                        badgeLabel: entry.badgeLabel,
                                        attachmentUrl: entry.attachments[0]?.signedUrl,
                                        language: prefs.language,
                                      })
                                    : entry.sourceCharge
                                    ? buildChargingSessionWhatsAppText({
                                        vehicle,
                                        session: entry.sourceCharge,
                                        currency: prefs.currency,
                                        language: prefs.language,
                                      })
                                    : entry.attachments[0]
                                    ? buildAttachmentWhatsAppText({
                                        vehicle,
                                        attachment: entry.attachments[0],
                                        categoryLabel: entry.badgeLabel,
                                        language: prefs.language,
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
                                          <span>{mUi.viewBtn}</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                        <a
                                          href={safeHref}
                                          download={att.fileName}
                                          className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:underline"
                                        >
                                          <Download className="w-2.5 h-2.5" />
                                          <span>{mUi.downloadBtn}</span>
                                        </a>
                                      </>
                                    )}
                                    {cloudUserId && (
                                      <button
                                        type="button"
                                        onClick={() => void handleDeleteAttachment(att)}
                                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 ml-auto"
                                        aria-label={mUi.deleteAttAria}
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
                    ? mUi.modalCompleteReminderTitle
                    : mUi.modalCreateTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {vehicle.make} {vehicle.model} · {vehicle.plate}
                  {linkedReminderItemId ? ` · ${mUi.modalAutoCycleNote}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label={mCopy.closeAria}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              {/* Record Kind */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10">
                {(
                  [
                    { id: 'maintenance', label: mUi.kindMaintenance },
                    { id: 'revision', label: mUi.kindRevision },
                    { id: 'fuel', label: mUi.kindFuel },
                    { id: 'ev_charge', label: mUi.kindEvCharge },
                    { id: 'expense', label: mUi.kindExpense },
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
                    {mUi.categoryLabel}
                  </label>
                  <select
                    value={maintenanceCategory}
                    onChange={(e) => setMaintenanceCategory(e.target.value as MaintenanceCategory)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  >
                    <option value={MaintenanceCategory.OIL}>{mCopy.catOil}</option>
                    <option value={MaintenanceCategory.BRAKES}>{mCopy.catBrakes}</option>
                    <option value={MaintenanceCategory.TIRES}>{mCopy.catTires}</option>
                    <option value={MaintenanceCategory.COOLANT}>{mCopy.catCoolant}</option>
                    <option value={MaintenanceCategory.BATTERY}>{mCopy.catBattery}</option>
                    <option value={MaintenanceCategory.SUSPENSION}>{mCopy.catSuspension}</option>
                    <option value={MaintenanceCategory.TIMING_BELT}>{mCopy.catTimingBelt}</option>
                    <option value={MaintenanceCategory.CHAIN_DRIVE}>{mCopy.catChainDrive}</option>
                    <option value={MaintenanceCategory.DOCUMENTATION}>{mCopy.catDocumentation}</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {mUi.dateLabel}
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
                      {prefs.units === 'imperial' ? 'Mi' : mUi.kmLabel}
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
                      {mUi.energyKwhLabel}
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
                      {mUi.powerTypeLabel}
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
                      {mUi.socStartLabel}
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
                      {mUi.socEndLabel}
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
                    {mUi.whatWasDoneLabel}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      recordKind === 'fuel'
                        ? mUi.placeholderFuel
                        : recordKind === 'revision'
                        ? mUi.placeholderRevision
                        : recordKind === 'expense'
                        ? mUi.placeholderExpense
                        : mUi.placeholderMaint
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
                      ? mUi.placeLabelStation
                      : recordKind === 'ev_charge'
                      ? mUi.placeLabelCharger
                      : mUi.placeLabelWorkshop}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      recordKind === 'fuel'
                        ? mUi.placePhStation
                        : recordKind === 'ev_charge'
                        ? mUi.placePhCharger
                        : mUi.placePhWorkshop
                    }
                    value={workshopName}
                    onChange={(e) => setWorkshopName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    {mUi.amountLabel} ({prefs.currency})
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
                    {mUi.notesLabel}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={mUi.notesPlaceholder}
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
                    {mUi.attachSectionTitle}
                  </span>
                  <select
                    value={pendingAttCategory}
                    onChange={(e) => setPendingAttCategory(e.target.value as AttachmentCategory)}
                    className="px-2 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200"
                  >
                    <option value="receipt">{attLabels.receipt}</option>
                    <option value="insurance">{attLabels.insurance}</option>
                    <option value="document">{attLabels.document}</option>
                    <option value="inspection">{attLabels.inspection}</option>
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
                    <span>{mUi.takePhotoBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => modalGalleryRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#081020] text-slate-700 dark:text-slate-200"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>{mUi.galleryBtn}</span>
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
                  {mCopy.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{mUi.saveRecordBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
