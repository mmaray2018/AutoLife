import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bike,
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
import { getUi } from '../data/uiTranslations';
import { CARE_GUIDES } from '../data/seedData';
import {
  ChargingSession,
  LanguageCode,
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
import {
  getLocalizedColorLabel,
  resolveVehicleColorStyle,
} from '../utils/vehicleVisualResolver';
import { ResilientImage } from './ResilientImage';
import { VehicleFinalReportTab } from './VehicleFinalReportTab';
import { VehicleVisual } from './VehicleVisual';
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

const HEALTH_EXTRA_COPY: Record<
  LanguageCode,
  {
    groupSafetySub: string;
    groupMotorSub: string;
    groupDocsSub: string;
    preTripMotoTires: (f: number, r: number) => string;
    preTripMotoChain: string;
    preTripMotoBrakes: string;
    preTripMotoDocs: (doc: string) => string;
    preTripMotoEvStops: (dist: string, stops: number) => string;
    preTripMotoEvOk: (dist: string) => string;
    preTripMotoOil: string;
    preTripCarTires: (psi: number) => string;
    preTripCarCoolant: string;
    preTripCarBrakes: string;
    preTripCarDocs: (doc: string) => string;
    preTripCarEvStops: (dist: string, stops: number) => string;
    preTripCarEvOk: (dist: string) => string;
    preTripCarOil: string;
    profileUrbanLong: string;
    profileHighwayLong: string;
    profileMixedLong: string;
    profileLabelShort: string;
    shortUrban: string;
    shortHighway: string;
    shortMixed: string;
    monitoredOf: (checked: number, total: number) => string;
    startPreventiveHint: string;
    savedLogsSuffix: string;
    healthProgressAria: (pct: number) => string;
    registerShort: string;
    nextStepsAria: string;
    showingPriorities: (shown: number, total: number) => string;
    driverKmCritical: string;
    driverKmWarn: string;
    driverDateCritical: string;
    driverDateWarn: string;
    driverBoth: string;
    driverPending: string;
    pendingSummary: string;
    exceededByKm: (dist: string, dueDate: string) => string;
    overdueDaysAgo: (days: number, dueDate: string) => string;
    deadlineExceededImmediate: (dueDate: string) => string;
    dueInDaysOnly: (days: number, dueDate: string) => string;
    dueInDaysAndKm: (days: number, dueDate: string, dist: string) => string;
    regShort: string;
    cycleProgressAria: (title: string, pct: number) => string;
    dueDatePrefix: string;
    noExpiry: string;
    lastShort: string;
    noRenewalSaved: string;
    collapseAll: string;
    expandAll: string;
    emptyFilter: string;
    itemSingular: string;
    itemPlural: string;
    overdueBadge: (n: number) => string;
    attentionBadge: (n: number) => string;
    onTrackBadge: (n: number) => string;
    hideBtn: string;
    openBtn: string;
    plannedPrefix: string;
    noDateLabel: string;
    rowProgressAria: (pct: number) => string;
    noInitialRecord: string;
    termSuffix: string;
    historyCount: (n: number) => string;
    usageByKm: string;
    docTermLabel: string;
    usageByTime: string;
    expiresPrefix: string;
    daysUnit: string;
    lastServiceHistory: string;
    forThisVehicle: (typeLabel: string) => string;
    verifiedSuffix: string;
  }
> = {
  pt: {
    groupSafetySub: 'Freios, calibragem de pneus, desgaste e suspensão',
    groupMotorSub: 'Óleo, arrefecimento, bateria, transmissão e revisões periódicas',
    groupDocsSub: 'Licenciamento, vistoria obrigatória e vencimento do seguro',
    preTripMotoTires: (f, r) => `Calibrar pneus a frio: ${f} PSI dianteiro e ${r} PSI traseiro`,
    preTripMotoChain:
      'Conferir folga da corrente (20–30 mm) e lubrificação com a moto desligada no cavalete',
    preTripMotoBrakes:
      'Testar manete e pedal de freio, conferir farol, luz de freio, setas e retrovisores',
    preTripMotoDocs: (d) => `Validar documento (${d}), capacete/viseira e seguro`,
    preTripMotoEvStops: (dist, s) =>
      `Viagem de ${dist}: programar ${s} recarga(s) no percurso`,
    preTripMotoEvOk: (dist) => `Autonomia elétrica estimada cobre ${dist} com folga`,
    preTripMotoOil:
      'Checar óleo com a moto reta na vertical em piso plano (nunca no descanso lateral)',
    preTripCarTires: (psi) => `Calibrar pneus a frio em ${psi} PSI (incluindo estepe)`,
    preTripCarCoolant:
      'Conferir visualmente líquido de arrefecimento entre MIN e MAX com o motor frio (nunca abrir a tampa quente)',
    preTripCarBrakes:
      'Testar resposta do pedal de freio e verificar faróis, setas e limpadores',
    preTripCarDocs: (d) => `Validar licenciamento (${d}) e itens obrigatórios no porta-malas`,
    preTripCarEvStops: (dist, s) =>
      `Viagem de ${dist}: programar ${s} parada(s) de recarga rápida no trajeto`,
    preTripCarEvOk: (dist) => `Autonomia estimada cobre ${dist} com margem de segurança`,
    preTripCarOil: 'Conferir nível do óleo na vareta em piso plano antes de pegar a estrada',
    profileUrbanLong: 'Uso Urbano Severo (-35% intervalo)',
    profileHighwayLong: 'Uso Rodoviário (+15% intervalo)',
    profileMixedLong: 'Uso Misto',
    profileLabelShort: 'Perfil',
    shortUrban: 'Urbano',
    shortHighway: 'Rodoviário',
    shortMixed: 'Misto',
    monitoredOf: (c, tot) => `${c} de ${tot} itens monitorados`,
    startPreventiveHint: 'Registre a primeira checagem para calcular os próximos prazos reais.',
    savedLogsSuffix: 'registro(s) salvos',
    healthProgressAria: (pct) => `Saúde do veículo: ${pct}%`,
    registerShort: 'Registrar',
    nextStepsAria: 'Próximos passos de manutenção',
    showingPriorities: (s, tot) =>
      `Exibindo ${s} de ${tot} prioridade${tot > 1 ? 's' : ''}`,
    driverKmCritical: 'Crítico por KM',
    driverKmWarn: 'Alerta por KM',
    driverDateCritical: 'Crítico por Data',
    driverDateWarn: 'Alerta por Data',
    driverBoth: 'Por Data e KM',
    driverPending: 'Aguardando 1º registro',
    pendingSummary: 'Registre a primeira checagem para iniciar o acompanhamento',
    exceededByKm: (dist, due) => `Excedido em ${dist}${due ? ` · Prev. ${due}` : ''}`,
    overdueDaysAgo: (d, due) => `Vencido há ${d}d${due ? ` · ${due}` : ''}`,
    deadlineExceededImmediate: (due) => `Prazo excedido · ${due || 'Ação imediata'}`,
    dueInDaysOnly: (d, due) => `Vence em ${d}d · ${due}`,
    dueInDaysAndKm: (d, due, dist) => `Vence em ${d}d · ${due} · Restam ${dist}`,
    regShort: 'reg.',
    cycleProgressAria: (title, pct) => `${title}: ${pct}% do ciclo`,
    dueDatePrefix: 'Prazo',
    noExpiry: 'Sem validade',
    lastShort: 'Últ.',
    noRenewalSaved: 'Sem renovação salva',
    collapseAll: 'Recolher todas',
    expandAll: 'Expandir todas',
    emptyFilter: 'Nenhum item encontrado para este filtro ou busca.',
    itemSingular: 'item',
    itemPlural: 'itens',
    overdueBadge: (n) => `${n} vencido${n > 1 ? 's' : ''}`,
    attentionBadge: (n) => `${n} atenção`,
    onTrackBadge: (n) => `${n} em dia`,
    hideBtn: 'Ocultar',
    openBtn: 'Abrir',
    plannedPrefix: 'Previsto',
    noDateLabel: 'Sem data',
    rowProgressAria: (pct) => `Progresso de uso: ${pct}%`,
    noInitialRecord: 'Sem registro inicial',
    termSuffix: 'prazo',
    historyCount: (n) => (n > 0 ? `${n} histórico${n > 1 ? 's' : ''}` : '0 histórico'),
    usageByKm: 'Uso por quilometragem',
    docTermLabel: 'Prazo do documento',
    usageByTime: 'Uso por tempo',
    expiresPrefix: 'Vence',
    daysUnit: 'dias',
    lastServiceHistory: 'Último serviço no histórico:',
    forThisVehicle: (tl) => `Para este ${tl}`,
    verifiedSuffix: 'verificados',
  },
  en: {
    groupSafetySub: 'Brakes, tire pressure, wear, and suspension',
    groupMotorSub: 'Oil, coolant, battery, transmission, and scheduled services',
    groupDocsSub: 'Registration, mandatory inspection, and insurance expiry',
    preTripMotoTires: (f, r) => `Set cold tire pressure: ${f} PSI front and ${r} PSI rear`,
    preTripMotoChain:
      'Check chain slack (20–30 mm) and lubrication with the bike off on its stand',
    preTripMotoBrakes:
      'Test brake lever and pedal, check headlight, brake light, turn signals, and mirrors',
    preTripMotoDocs: (d) => `Verify registration (${d}), helmet/visor, and insurance`,
    preTripMotoEvStops: (dist, s) => `${dist} trip: plan ${s} charging stop(s) on route`,
    preTripMotoEvOk: (dist) => `Estimated EV range covers ${dist} comfortably`,
    preTripMotoOil:
      'Check oil with the motorcycle upright on level ground (never on the side stand)',
    preTripCarTires: (psi) => `Set cold tire pressure to ${psi} PSI (including spare)`,
    preTripCarCoolant:
      'Visually inspect coolant level between MIN and MAX on a cold engine (never open hot)',
    preTripCarBrakes: 'Test brake pedal feel and check headlights, signals, and wipers',
    preTripCarDocs: (d) => `Verify registration (${d}) and required trunk emergency gear`,
    preTripCarEvStops: (dist, s) =>
      `${dist} trip: schedule ${s} fast-charging stop(s) along the route`,
    preTripCarEvOk: (dist) => `Estimated range covers ${dist} with safety margin`,
    preTripCarOil: 'Check engine oil level on the dipstick on level ground before departure',
    profileUrbanLong: 'Severe Urban (-35% interval)',
    profileHighwayLong: 'Highway (+15% interval)',
    profileMixedLong: 'Mixed Use',
    profileLabelShort: 'Profile',
    shortUrban: 'Urban',
    shortHighway: 'Highway',
    shortMixed: 'Mixed',
    monitoredOf: (c, tot) => `${c} of ${tot} items monitored`,
    startPreventiveHint: 'Log your first check to calculate upcoming due dates.',
    savedLogsSuffix: 'saved record(s)',
    healthProgressAria: (pct) => `Vehicle health: ${pct}%`,
    registerShort: 'Log',
    nextStepsAria: 'Next maintenance steps',
    showingPriorities: (s, tot) => `Showing ${s} of ${tot} priorit${tot > 1 ? 'ies' : 'y'}`,
    driverKmCritical: 'Critical by Distance',
    driverKmWarn: 'Alert by Distance',
    driverDateCritical: 'Critical by Date',
    driverDateWarn: 'Alert by Date',
    driverBoth: 'By Date & Distance',
    driverPending: 'Awaiting 1st record',
    pendingSummary: 'Log the first check to begin tracking',
    exceededByKm: (dist, due) => `Exceeded by ${dist}${due ? ` · Est. ${due}` : ''}`,
    overdueDaysAgo: (d, due) => `Overdue by ${d}d${due ? ` · ${due}` : ''}`,
    deadlineExceededImmediate: (due) => `Deadline exceeded · ${due || 'Immediate action'}`,
    dueInDaysOnly: (d, due) => `Due in ${d}d · ${due}`,
    dueInDaysAndKm: (d, due, dist) => `Due in ${d}d · ${due} · ${dist} left`,
    regShort: 'log(s)',
    cycleProgressAria: (title, pct) => `${title}: ${pct}% of cycle`,
    dueDatePrefix: 'Due',
    noExpiry: 'No expiry',
    lastShort: 'Last',
    noRenewalSaved: 'No renewal logged',
    collapseAll: 'Collapse all',
    expandAll: 'Expand all',
    emptyFilter: 'No items match this filter or search.',
    itemSingular: 'item',
    itemPlural: 'items',
    overdueBadge: (n) => `${n} overdue`,
    attentionBadge: (n) => `${n} attention`,
    onTrackBadge: (n) => `${n} on track`,
    hideBtn: 'Hide',
    openBtn: 'Open',
    plannedPrefix: 'Due',
    noDateLabel: 'No date',
    rowProgressAria: (pct) => `Cycle usage: ${pct}%`,
    noInitialRecord: 'No initial record',
    termSuffix: 'term',
    historyCount: (n) => `${n} log${n === 1 ? '' : 's'}`,
    usageByKm: 'Distance usage',
    docTermLabel: 'Document deadline',
    usageByTime: 'Time usage',
    expiresPrefix: 'Due',
    daysUnit: 'days',
    lastServiceHistory: 'Last service in history:',
    forThisVehicle: (tl) => `For this ${tl}`,
    verifiedSuffix: 'verified',
  },
  es: {
    groupSafetySub: 'Frenos, presión de neumáticos, desgaste y suspensión',
    groupMotorSub: 'Aceite, refrigerante, batería, transmisión y revisiones periódicas',
    groupDocsSub: 'Permiso de circulación, ITV obligatoria y vencimiento del seguro',
    preTripMotoTires: (f, r) => `Calibrar neumáticos en frío: ${f} PSI delante y ${r} PSI detrás`,
    preTripMotoChain:
      'Revisar holgura de la cadena (20–30 mm) y lubricación con la moto apagada en el caballete',
    preTripMotoBrakes:
      'Probar maneta y pedal de freno, revisar faro, luz de freno, intermitentes y espejos',
    preTripMotoDocs: (d) => `Validar documentación (${d}), casco/pantalla y seguro`,
    preTripMotoEvStops: (dist, s) =>
      `Viaje de ${dist}: programar ${s} recarga(s) en el recorrido`,
    preTripMotoEvOk: (dist) => `La autonomía eléctrica estimada cubre ${dist} con margen`,
    preTripMotoOil:
      'Comprobar el aceite con la moto recta en suelo plano (nunca en la pata lateral)',
    preTripCarTires: (psi) => `Calibrar neumáticos en frío a ${psi} PSI (incluida rueda de repuesto)`,
    preTripCarCoolant:
      'Revisar visualmente el refrigerante entre MIN y MAX con el motor frío (no abrir en caliente)',
    preTripCarBrakes:
      'Probar respuesta del pedal de freno y verificar faros, intermitentes y limpiaparabrisas',
    preTripCarDocs: (d) => `Validar permiso / ITV (${d}) y equipo obligatorio en el maletero`,
    preTripCarEvStops: (dist, s) =>
      `Viaje de ${dist}: programar ${s} parada(s) de carga rápida en ruta`,
    preTripCarEvOk: (dist) => `La autonomía estimada cubre ${dist} con margen de seguridad`,
    preTripCarOil: 'Comprobar el nivel de aceite en la varilla en suelo plano antes de salir',
    profileUrbanLong: 'Uso Urbano Severo (-35% intervalo)',
    profileHighwayLong: 'Carretera (+15% intervalo)',
    profileMixedLong: 'Uso Mixto',
    profileLabelShort: 'Perfil',
    shortUrban: 'Urbano',
    shortHighway: 'Carretera',
    shortMixed: 'Mixto',
    monitoredOf: (c, tot) => `${c} de ${tot} elementos monitorizados`,
    startPreventiveHint: 'Registra la primera revisión para calcular las próximas fechas reales.',
    savedLogsSuffix: 'registro(s) guardados',
    healthProgressAria: (pct) => `Salud del vehículo: ${pct}%`,
    registerShort: 'Registrar',
    nextStepsAria: 'Próximos pasos de mantenimiento',
    showingPriorities: (s, tot) =>
      `Mostrando ${s} de ${tot} prioridad${tot > 1 ? 'es' : ''}`,
    driverKmCritical: 'Crítico por KM',
    driverKmWarn: 'Alerta por KM',
    driverDateCritical: 'Crítico por Fecha',
    driverDateWarn: 'Alerta por Fecha',
    driverBoth: 'Por Fecha y KM',
    driverPending: 'Esperando 1.er registro',
    pendingSummary: 'Registra el primer control para iniciar el seguimiento',
    exceededByKm: (dist, due) => `Excedido en ${dist}${due ? ` · Prev. ${due}` : ''}`,
    overdueDaysAgo: (d, due) => `Vencido hace ${d}d${due ? ` · ${due}` : ''}`,
    deadlineExceededImmediate: (due) => `Plazo excedido · ${due || 'Acción inmediata'}`,
    dueInDaysOnly: (d, due) => `Vence en ${d}d · ${due}`,
    dueInDaysAndKm: (d, due, dist) => `Vence en ${d}d · ${due} · Faltan ${dist}`,
    regShort: 'reg.',
    cycleProgressAria: (title, pct) => `${title}: ${pct}% del ciclo`,
    dueDatePrefix: 'Plazo',
    noExpiry: 'Sin caducidad',
    lastShort: 'Últ.',
    noRenewalSaved: 'Sin renovación guardada',
    collapseAll: 'Contraer todas',
    expandAll: 'Expandir todas',
    emptyFilter: 'No se encontraron elementos para este filtro o búsqueda.',
    itemSingular: 'elemento',
    itemPlural: 'elementos',
    overdueBadge: (n) => `${n} vencido${n > 1 ? 's' : ''}`,
    attentionBadge: (n) => `${n} atención`,
    onTrackBadge: (n) => `${n} al día`,
    hideBtn: 'Ocultar',
    openBtn: 'Abrir',
    plannedPrefix: 'Previsto',
    noDateLabel: 'Sin fecha',
    rowProgressAria: (pct) => `Progreso de uso: ${pct}%`,
    noInitialRecord: 'Sin registro inicial',
    termSuffix: 'plazo',
    historyCount: (n) => (n > 0 ? `${n} historial${n > 1 ? 'es' : ''}` : '0 historial'),
    usageByKm: 'Uso por kilometraje',
    docTermLabel: 'Plazo del documento',
    usageByTime: 'Uso por tiempo',
    expiresPrefix: 'Vence',
    daysUnit: 'días',
    lastServiceHistory: 'Último servicio en el historial:',
    forThisVehicle: (tl) => `Para este ${tl}`,
    verifiedSuffix: 'verificados',
  },
  de: {
    groupSafetySub: 'Bremsen, Reifendruck, Verschleiß und Fahrwerk',
    groupMotorSub: 'Öl, Kühlmittel, Batterie, Antrieb und regelmäßige Inspektionen',
    groupDocsSub: 'Zulassung, TÜV/HU und Versicherungsablauf',
    preTripMotoTires: (f, r) => `Kalt-Reifendruck prüfen: ${f} PSI vorn und ${r} PSI hinten`,
    preTripMotoChain:
      'Kettenspiel (20–30 mm) und Schmierung bei ausgeschaltetem Motor auf dem Ständer prüfen',
    preTripMotoBrakes:
      'Bremshebel/-pedal testen, Scheinwerfer, Bremslicht, Blinker und Spiegel prüfen',
    preTripMotoDocs: (d) => `Dokumente (${d}), Helm/Visier und Versicherung prüfen`,
    preTripMotoEvStops: (dist, s) => `Fahrt über ${dist}: ${s} Ladestopp(s) einplanen`,
    preTripMotoEvOk: (dist) => `Geschätzte E-Reichweite deckt ${dist} bequem ab`,
    preTripMotoOil:
      'Ölstand bei aufrecht stehendem Motorrad auf ebenem Boden prüfen (nicht auf Seitenständer)',
    preTripCarTires: (psi) => `Kalt-Reifendruck auf ${psi} PSI einstellen (inkl. Reserverad)`,
    preTripCarCoolant:
      'Kühlmittelstand bei kaltem Motor zwischen MIN und MAX prüfen (niemals heiß öffnen)',
    preTripCarBrakes: 'Bremspedal testen sowie Scheinwerfer, Blinker und Wischer prüfen',
    preTripCarDocs: (d) => `Zulassung / TÜV (${d}) und Pflichtausrüstung im Kofferraum prüfen`,
    preTripCarEvStops: (dist, s) =>
      `Fahrt über ${dist}: ${s} Schnellladestopp(s) unterwegs einplanen`,
    preTripCarEvOk: (dist) => `Geschätzte Reichweite deckt ${dist} sicher ab`,
    preTripCarOil: 'Motorölstand am Peilstab auf ebenem Untergrund vor Fahrtantritt prüfen',
    profileUrbanLong: 'Starker Stadtverkehr (-35% Intervall)',
    profileHighwayLong: 'Autobahn (+15% Intervall)',
    profileMixedLong: 'Gemischte Nutzung',
    profileLabelShort: 'Profil',
    shortUrban: 'Stadt',
    shortHighway: 'Autobahn',
    shortMixed: 'Gemischt',
    monitoredOf: (c, tot) => `${c} von ${tot} Punkten überwacht`,
    startPreventiveHint: 'Erste Prüfung erfassen, um echte Fälligkeiten zu berechnen.',
    savedLogsSuffix: 'gespeicherte(r) Eintrag/Einträge',
    healthProgressAria: (pct) => `Fahrzeugzustand: ${pct}%`,
    registerShort: 'Erfassen',
    nextStepsAria: 'Nächste Wartungsschritte',
    showingPriorities: (s, tot) => `${s} von ${tot} Priorität${tot > 1 ? 'en' : ''} angezeigt`,
    driverKmCritical: 'Kritisch nach km',
    driverKmWarn: 'Warnung nach km',
    driverDateCritical: 'Kritisch nach Datum',
    driverDateWarn: 'Warnung nach Datum',
    driverBoth: 'Nach Datum & km',
    driverPending: 'Wartet auf 1. Eintrag',
    pendingSummary: 'Erste Prüfung erfassen, um die Verfolgung zu starten',
    exceededByKm: (dist, due) => `Überschritten um ${dist}${due ? ` · Fällig ${due}` : ''}`,
    overdueDaysAgo: (d, due) => `Überfällig seit ${d}T${due ? ` · ${due}` : ''}`,
    deadlineExceededImmediate: (due) => `Frist überschritten · ${due || 'Sofort handeln'}`,
    dueInDaysOnly: (d, due) => `Fällig in ${d}T · ${due}`,
    dueInDaysAndKm: (d, due, dist) => `Fällig in ${d}T · ${due} · Noch ${dist}`,
    regShort: 'Eintr.',
    cycleProgressAria: (title, pct) => `${title}: ${pct}% des Zyklus`,
    dueDatePrefix: 'Frist',
    noExpiry: 'Kein Ablaufdatum',
    lastShort: 'Zuletzt',
    noRenewalSaved: 'Keine Verlängerung erfasst',
    collapseAll: 'Alle einklappen',
    expandAll: 'Alle ausklappen',
    emptyFilter: 'Keine Einträge für diesen Filter oder diese Suche.',
    itemSingular: 'Eintrag',
    itemPlural: 'Einträge',
    overdueBadge: (n) => `${n} überfällig`,
    attentionBadge: (n) => `${n} fällig`,
    onTrackBadge: (n) => `${n} aktuell`,
    hideBtn: 'Ausblenden',
    openBtn: 'Öffnen',
    plannedPrefix: 'Fällig',
    noDateLabel: 'Kein Datum',
    rowProgressAria: (pct) => `Zyklusnutzung: ${pct}%`,
    noInitialRecord: 'Kein Ersteintrag',
    termSuffix: 'Frist',
    historyCount: (n) => `${n} Verlauf/Verläufe`,
    usageByKm: 'Kilometer-Nutzung',
    docTermLabel: 'Dokumentfrist',
    usageByTime: 'Zeit-Nutzung',
    expiresPrefix: 'Läuft ab',
    daysUnit: 'Tage',
    lastServiceHistory: 'Letzter Service im Verlauf:',
    forThisVehicle: (tl) => `Für dieses ${tl}`,
    verifiedSuffix: 'geprüft',
  },
  fr: {
    groupSafetySub: 'Freins, pression des pneus, usure et suspension',
    groupMotorSub: 'Huile, refroidissement, batterie, transmission et révisions périodiques',
    groupDocsSub: 'Carte grise, contrôle technique et échéance d’assurance',
    preTripMotoTires: (f, r) => `Pression des pneus à froid : ${f} PSI avant et ${r} PSI arrière`,
    preTripMotoChain:
      'Vérifier la tension de chaîne (20–30 mm) et le graissage moto éteinte sur béquille',
    preTripMotoBrakes:
      'Tester levier et pédale de frein, vérifier phare, feu stop, clignotants et rétroviseurs',
    preTripMotoDocs: (d) => `Valider les documents (${d}), casque/visière et assurance`,
    preTripMotoEvStops: (dist, s) =>
      `Trajet de ${dist} : planifier ${s} recharge(s) sur le parcours`,
    preTripMotoEvOk: (dist) => `L’autonomie électrique estimée couvre ${dist} largement`,
    preTripMotoOil:
      'Vérifier l’huile moto droite sur sol plat (jamais sur béquille latérale)',
    preTripCarTires: (psi) => `Gonfler les pneus à froid à ${psi} PSI (roue de secours incluse)`,
    preTripCarCoolant:
      'Contrôler visuellement le liquide de refroidissement entre MIN et MAX moteur froid',
    preTripCarBrakes:
      'Tester la pédale de frein et vérifier phares, clignotants et essuie-glaces',
    preTripCarDocs: (d) => `Valider contrôle technique (${d}) et équipements obligatoires`,
    preTripCarEvStops: (dist, s) =>
      `Trajet de ${dist} : prévoir ${s} arrêt(s) de recharge rapide`,
    preTripCarEvOk: (dist) => `L’autonomie estimée couvre ${dist} avec marge de sécurité`,
    preTripCarOil: 'Vérifier le niveau d’huile sur sol plat avant le départ',
    profileUrbanLong: 'Urbain Sévère (-35% intervalle)',
    profileHighwayLong: 'Autoroute (+15% intervalle)',
    profileMixedLong: 'Usage Mixte',
    profileLabelShort: 'Profil',
    shortUrban: 'Urbain',
    shortHighway: 'Autoroute',
    shortMixed: 'Mixte',
    monitoredOf: (c, tot) => `${c} sur ${tot} éléments suivis`,
    startPreventiveHint: 'Enregistrez le premier contrôle pour calculer les échéances réelles.',
    savedLogsSuffix: 'enregistrement(s)',
    healthProgressAria: (pct) => `Santé du véhicule : ${pct}%`,
    registerShort: 'Enregistrer',
    nextStepsAria: 'Prochaines étapes d’entretien',
    showingPriorities: (s, tot) => `Affichage de ${s} sur ${tot} priorité${tot > 1 ? 's' : ''}`,
    driverKmCritical: 'Critique par km',
    driverKmWarn: 'Alerte par km',
    driverDateCritical: 'Critique par date',
    driverDateWarn: 'Alerte par date',
    driverBoth: 'Par date & km',
    driverPending: 'En attente du 1er suivi',
    pendingSummary: 'Enregistrez le premier contrôle pour démarrer le suivi',
    exceededByKm: (dist, due) => `Dépassé de ${dist}${due ? ` · Prév. ${due}` : ''}`,
    overdueDaysAgo: (d, due) => `En retard de ${d}j${due ? ` · ${due}` : ''}`,
    deadlineExceededImmediate: (due) => `Échéance dépassée · ${due || 'Action immédiate'}`,
    dueInDaysOnly: (d, due) => `Dans ${d}j · ${due}`,
    dueInDaysAndKm: (d, due, dist) => `Dans ${d}j · ${due} · Reste ${dist}`,
    regShort: 'enr.',
    cycleProgressAria: (title, pct) => `${title} : ${pct}% du cycle`,
    dueDatePrefix: 'Échéance',
    noExpiry: 'Sans échéance',
    lastShort: 'Dern.',
    noRenewalSaved: 'Aucun renouvellement enregistré',
    collapseAll: 'Tout réduire',
    expandAll: 'Tout développer',
    emptyFilter: 'Aucun élément trouvé pour ce filtre ou cette recherche.',
    itemSingular: 'élément',
    itemPlural: 'éléments',
    overdueBadge: (n) => `${n} en retard`,
    attentionBadge: (n) => `${n} attention`,
    onTrackBadge: (n) => `${n} à jour`,
    hideBtn: 'Masquer',
    openBtn: 'Ouvrir',
    plannedPrefix: 'Prévu',
    noDateLabel: 'Sans date',
    rowProgressAria: (pct) => `Utilisation du cycle : ${pct}%`,
    noInitialRecord: 'Aucun suivi initial',
    termSuffix: 'délai',
    historyCount: (n) => `${n} historique${n > 1 ? 's' : ''}`,
    usageByKm: 'Usage kilométrique',
    docTermLabel: 'Échéance du document',
    usageByTime: 'Usage temporel',
    expiresPrefix: 'Expire',
    daysUnit: 'jours',
    lastServiceHistory: 'Dernier service dans l’historique :',
    forThisVehicle: (tl) => `Pour ce ${tl}`,
    verifiedSuffix: 'vérifiés',
  },
};

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
  const ui = getUi(prefs.language);
  const hCopy = HEALTH_EXTRA_COPY[prefs.language] ?? HEALTH_EXTRA_COPY.en;

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

  const healthSummary = useMemo(() => {
    const checkedCount = counts.onTrack + counts.attention + counts.overdue;
    const totalCount = enrichedItems.length;
    if (totalCount === 0 || checkedCount === 0) {
      return {
        percent: 0,
        checkedCount,
        totalCount,
        statusLabel: ui.healthUi.statusBadge.pending,
        tone: 'neutral' as const,
      };
    }

    const rawScore =
      (counts.onTrack * 100 + counts.attention * 60 + counts.overdue * 15) / checkedCount;
    const percent = Math.max(0, Math.min(100, Math.round(rawScore)));

    if (percent >= 85 && counts.overdue === 0) {
      return {
        percent,
        checkedCount,
        totalCount,
        statusLabel: ui.healthUi.statusBadge.excellent,
        tone: 'good' as const,
      };
    }
    if (percent >= 70) {
      return {
        percent,
        checkedCount,
        totalCount,
        statusLabel: ui.healthUi.statusBadge.good,
        tone: 'good' as const,
      };
    }
    if (percent >= 45) {
      return {
        percent,
        checkedCount,
        totalCount,
        statusLabel: ui.healthUi.statusBadge.attention,
        tone: 'warn' as const,
      };
    }
    return {
      percent,
      checkedCount,
      totalCount,
      statusLabel: ui.healthUi.statusBadge.critical,
      tone: 'critical' as const,
    };
  }, [counts, enrichedItems.length, ui.healthUi.statusBadge]);

  const quickShortcuts = useMemo(() => {
    const oilItem = enrichedItems.find((e) => e.item.category === MaintenanceCategory.OIL);
    const revisionOrChainItem =
      enrichedItems.find(
        (e) =>
          e.item.id !== oilItem?.item.id &&
          (e.item.category === MaintenanceCategory.REVISION ||
            e.item.category === MaintenanceCategory.CHAIN_DRIVE ||
            e.item.category === MaintenanceCategory.BRAKES)
      ) ?? enrichedItems.find((e) => e.item.id !== oilItem?.item.id);
    const docItem = enrichedItems.find(
      (e) =>
        e.item.category === MaintenanceCategory.DOCUMENTATION &&
        e.item.id !== oilItem?.item.id &&
        e.item.id !== revisionOrChainItem?.item.id
    );

    return [oilItem, revisionOrChainItem, docItem].filter(
      (entry): entry is NonNullable<typeof entry> => Boolean(entry)
    );
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
        title: ui.healthUi.groups.safety,
        subtitle: hCopy.groupSafetySub,
      },
      {
        id: 'motor',
        title: ui.healthUi.groups.engine,
        subtitle: hCopy.groupMotorSub,
      },
      {
        id: 'documents',
        title: ui.healthUi.groups.docs,
        subtitle: hCopy.groupDocsSub,
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
  }, [filteredItems, ui.healthUi.groups, hCopy]);

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
    const docValue = isDateRecorded(vehicle.documentExpiryDate)
      ? vehicle.documentExpiryDate
      : t.health.notRecorded;
    const distLabel = formatDistance(tripKm, prefs.units);

    if (isMoto) {
      const frontPsi = vehicle.tirePressurePsi;
      const rearPsi =
        (vehicle.rearTirePressurePsi ?? vehicle.tirePressurePsi + 4) + (heavyLoad ? 3 : 0);
      const list = [
        {
          id: 'pt-moto-tires',
          label: hCopy.preTripMotoTires(frontPsi, rearPsi),
        },
        {
          id: 'pt-moto-chain',
          label: hCopy.preTripMotoChain,
        },
        {
          id: 'pt-moto-brakes',
          label: hCopy.preTripMotoBrakes,
        },
        {
          id: 'pt-moto-docs',
          label: hCopy.preTripMotoDocs(docValue),
        },
      ];
      if (vehicle.powertrain === PowertrainType.ELECTRIC) {
        const range = vehicle.estimatedRangeKm ?? 130;
        const stops =
          tripKm > range * 0.8 ? Math.ceil((tripKm - range * 0.8) / (range * 0.65)) : 0;
        list.push({
          id: 'pt-moto-ev',
          label: stops > 0 ? hCopy.preTripMotoEvStops(distLabel, stops) : hCopy.preTripMotoEvOk(distLabel),
        });
      } else {
        list.push({
          id: 'pt-moto-oil',
          label: hCopy.preTripMotoOil,
        });
      }
      return list;
    }

    const adjustedPsi = vehicle.tirePressurePsi + (heavyLoad ? 3 : 0);
    const list = [
      {
        id: 'pt-tires',
        label: hCopy.preTripCarTires(adjustedPsi),
      },
      {
        id: 'pt-coolant',
        label: hCopy.preTripCarCoolant,
      },
      {
        id: 'pt-brakes',
        label: hCopy.preTripCarBrakes,
      },
      {
        id: 'pt-docs',
        label: hCopy.preTripCarDocs(docValue),
      },
    ];

    if (vehicle.powertrain === PowertrainType.ELECTRIC) {
      const range = vehicle.estimatedRangeKm ?? 390;
      const stops = tripKm > range * 0.8 ? Math.ceil((tripKm - range * 0.8) / (range * 0.65)) : 0;
      list.push({
        id: 'pt-ev',
        label: stops > 0 ? hCopy.preTripCarEvStops(distLabel, stops) : hCopy.preTripCarEvOk(distLabel),
      });
    } else {
      list.push({
        id: 'pt-oil',
        label: hCopy.preTripCarOil,
      });
    }
    return list;
  }, [vehicle, isMoto, heavyLoad, tripKm, prefs.units, hCopy, t.health.notRecorded]);

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
        <div className="autolife-health-hero rounded-2xl p-10 text-center space-y-4">
          <Car className="w-10 h-10 text-sky-500 dark:text-sky-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              {ui.healthUi.emptyTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {ui.healthUi.emptyDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddVehicle}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-sky-500 dark:hover:bg-sky-400 text-white dark:text-slate-950 text-sm font-semibold transition-colors"
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
      ? hCopy.profileUrbanLong
      : vehicle.drivingProfile === 'highway'
      ? hCopy.profileHighwayLong
      : hCopy.profileMixedLong;

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

  const heroBarClass =
    healthSummary.tone === 'critical'
      ? 'bg-gradient-to-r from-red-500 to-rose-400'
      : healthSummary.tone === 'warn'
      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
      : healthSummary.tone === 'good'
      ? 'bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400'
      : 'bg-slate-300 dark:bg-slate-700';

  const heroScoreTextClass =
    healthSummary.tone === 'critical'
      ? 'text-red-600 dark:text-red-400'
      : healthSummary.tone === 'warn'
      ? 'text-amber-600 dark:text-amber-400'
      : healthSummary.tone === 'good'
      ? 'text-sky-600 dark:text-sky-300'
      : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="space-y-6">
      {/* Page Title, Section Switcher & Pre-Trip Action */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 text-balance">
            {t.health.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t.health.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0c1629] border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setActiveSection('checklist')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'checklist'
                  ? 'bg-white dark:bg-sky-500/20 text-slate-900 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Checklist &amp; Lembretes
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('guides')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'guides'
                  ? 'bg-white dark:bg-sky-500/20 text-slate-900 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guias Ilustrados</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('report')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeSection === 'report'
                  ? 'bg-white dark:bg-sky-500/20 text-slate-900 dark:text-sky-300 shadow-sm'
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
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-sky-400/30 bg-white dark:bg-[#0c1629] text-slate-800 dark:text-sky-200 hover:bg-slate-100 dark:hover:bg-[#101d36] text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Compass className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>Pré-Viagem 60s</span>
          </button>
        </div>
      </div>

      {activeSection === 'checklist' && (
        <>
          {/* Active Vehicle Showcase + Glowing Cyan-Blue Hero Card "Saúde & Manutenção" */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Active Vehicle Visual Card (Car or Motorcycle) */}
            <section className="lg:col-span-5 autolife-glass rounded-2xl overflow-hidden flex flex-col justify-between">
              <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-900">
                <VehicleVisual
                  vehicle={vehicle}
                  attachments={attachments}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060b16] via-[#060b16]/35 to-transparent" />
                <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-300">
                      {isMoto ? (
                        <Bike className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Car className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>
                        {t.vehicleTypes[vehicle.vehicleType ?? 'car']}
                        {isMoto && vehicle.engineDisplacementCc
                          ? ` ${vehicle.engineDisplacementCc}cc`
                          : ''}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{t.powertrain[vehicle.powertrain]}</span>
                    </div>
                    <h2 className="mt-0.5 font-display text-lg sm:text-xl font-bold text-white truncate">
                      {vehicle.make} {vehicle.model}
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-semibold text-white">{vehicle.year}</div>
                    <div className="font-mono text-[11px] text-slate-300">{vehicle.plate}</div>
                    {vehicle.color && (
                      <div className="mt-0.5 inline-flex items-center justify-end gap-1 text-[10px] text-slate-200">
                        <span
                          className="w-2 h-2 rounded-full border border-white/50 shrink-0"
                          style={{
                            backgroundColor: resolveVehicleColorStyle(vehicle.color).primaryHex,
                          }}
                        />
                        <span>{vehicle.color}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 text-xs tabular-nums">
                <div className="pr-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Odômetro</div>
                  <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {formatDistance(vehicle.odometerKm, prefs.units)}
                  </div>
                </div>
                <div className="px-3">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Calibragem</div>
                  <div className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {isMoto
                      ? `${vehicle.tirePressurePsi}/${vehicle.rearTirePressurePsi ?? vehicle.tirePressurePsi + 4} PSI`
                      : `${vehicle.tirePressurePsi} PSI`}
                  </div>
                </div>
                <div className="pl-3 min-w-0">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Perfil</div>
                  <div className="mt-0.5 font-medium text-slate-800 dark:text-sky-200 truncate" title={profileLabel}>
                    {vehicle.drivingProfile === 'urban_severe'
                      ? 'Urbano'
                      : vehicle.drivingProfile === 'highway'
                      ? 'Rodoviário'
                      : 'Misto'}
                  </div>
                </div>
              </div>
            </section>

            {/* Hero Card: Saúde & Manutenção (Glowing Neon Cyan-Blue Border) */}
            <section
              className="lg:col-span-7 autolife-health-hero rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5"
              aria-label={t.nav.health}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    <Activity className="w-4 h-4 shrink-0" />
                    <span>{t.nav.health}</span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {healthSummary.checkedCount > 0
                      ? `${healthSummary.checkedCount} de ${healthSummary.totalCount} itens monitorados`
                      : 'Comece o acompanhamento preventivo'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-300/80">
                    {nextReminderItem
                      ? `${t.health.nextDue}: ${nextReminderItem.localized.title} (${nextReminderItem.projectedDueDate})`
                      : 'Registre a primeira checagem para calcular os próximos prazos reais.'}
                  </p>
                </div>

                <div className="sm:text-right shrink-0 tabular-nums">
                  <div className={`font-display text-2xl sm:text-3xl font-bold ${heroScoreTextClass}`}>
                    {healthSummary.checkedCount > 0 ? `${healthSummary.percent}%` : '—'}
                    <span className="text-sm sm:text-base font-semibold ml-1.5">
                      · {healthSummary.statusLabel}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {logs.filter((l) => l.vehicleId === vehicle.id).length} registro(s) salvos
                  </div>
                </div>
              </div>

              {/* Main Health Bar */}
              <div className="space-y-2">
                <div
                  className="h-3 w-full rounded-full bg-slate-200/80 dark:bg-[#060b16] border border-slate-300/50 dark:border-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={healthSummary.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Saúde do veículo: ${healthSummary.percent}%`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${heroBarClass}`}
                    style={{
                      width: `${
                        healthSummary.checkedCount > 0 ? Math.max(6, healthSummary.percent) : 0
                      }%`,
                    }}
                  />
                </div>

                {/* Compact 4-Metric Status Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 tabular-nums">
                  <div className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#060b16]/70 border border-slate-200/80 dark:border-white/10 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.health.onTrackCount}
                    </span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {counts.onTrack}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#060b16]/70 border border-slate-200/80 dark:border-white/10 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.health.attentionCount}
                    </span>
                    <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {counts.attention}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#060b16]/70 border border-slate-200/80 dark:border-white/10 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.health.overdueCount}
                    </span>
                    <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                      {counts.overdue}
                    </span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-[#060b16]/70 border border-slate-200/80 dark:border-white/10 flex items-baseline justify-between gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.status[MaintenanceStatus.PENDING]}
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
                      {counts.pending}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Maintenance Indicators / 1-Tap Log Shortcuts */}
              {quickShortcuts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {quickShortcuts.map((entry) => (
                    <button
                      key={`hero-quick-${entry.item.id}`}
                      type="button"
                      onClick={() => onOpenLogModal(entry.item)}
                      className="text-left p-3 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-50/80 dark:bg-[#081020]/80 hover:border-sky-400/60 dark:hover:border-sky-400/50 hover:bg-white dark:hover:bg-[#101d36] transition-colors flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {entry.localized.title}
                        </span>
                        <Wrench className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                        {renderStatusIndicator(entry.status)}
                        <span className="font-mono text-slate-500 dark:text-slate-400 truncate">
                          {entry.projectedDueDate || 'Registrar'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
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
                      className={`autolife-glass ${borderTone} rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4`}
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
            <div className="autolife-glass rounded-2xl p-3.5 sm:px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#081020] border border-slate-200/80 dark:border-white/10 rounded-xl overflow-x-auto max-w-full">
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
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-sky-500 ${
                      statusFilter === tab.id
                        ? 'bg-white dark:bg-sky-500/20 text-slate-900 dark:text-sky-300 shadow-sm'
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
                    className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-sky-500"
                  />
                </div>

                {categoryGroups.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAllCategories}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0c1629] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#101d36] transition-colors whitespace-nowrap shrink-0"
                  >
                    {allExpanded ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>{hCopy.collapseAll}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>{hCopy.expandAll}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {categoryGroups.length === 0 ? (
              <div className="autolife-glass rounded-2xl p-10 text-center space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {hCopy.emptyFilter}
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
                    {ui.healthUi.actions.clearFilters}
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
                      className="autolife-glass rounded-2xl overflow-hidden"
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
                              {group.entries.length === 1 ? hCopy.itemSingular : hCopy.itemPlural}
                            </span>
                            {group.overdue > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {hCopy.overdueBadge(group.overdue)}
                                </span>
                              </>
                            )}
                            {group.attention > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-amber-600 dark:text-amber-400">
                                  {hCopy.attentionBadge(group.attention)}
                                </span>
                              </>
                            )}
                            {group.overdue === 0 && group.attention === 0 && group.onTrack > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                  {hCopy.onTrackBadge(group.onTrack)}
                                </span>
                              </>
                            )}
                          </div>

                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <span>{isExpanded ? hCopy.hideBtn : hCopy.openBtn}</span>
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
                                            ? `${hCopy.plannedPrefix} ${projectedDueDate}`
                                            : hCopy.noDateLabel}
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
                                          aria-label={hCopy.rowProgressAria(usagePercent)}
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
                                              ? hCopy.noInitialRecord
                                              : isDoc
                                              ? `${dayPercent}% ${hCopy.termSuffix}`
                                              : triggerDriver === 'km'
                                              ? `${formatDistance(kmElapsed, prefs.units)}/${formatDistance(
                                                  effectiveIntervalKm,
                                                  prefs.units
                                                )}`
                                              : `${daysElapsed}/${effectiveIntervalDays}d`}
                                          </span>
                                          <span aria-hidden="true">·</span>
                                          <span>{hCopy.historyCount(historyLogsCount)}</span>
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
                                        <span>{ui.healthUi.actions.details}</span>
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
                                        <span>{hCopy.registerShort}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded Row Details */}
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
                                                {hCopy.usageByKm}
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
                                              {isDoc ? hCopy.docTermLabel : hCopy.usageByTime}
                                            </span>
                                            <span className="font-mono text-slate-700 dark:text-slate-200">
                                              {isDoc
                                                ? `${
                                                    projectedDueDate
                                                      ? `${hCopy.expiresPrefix} ${projectedDueDate}`
                                                      : hCopy.noDateLabel
                                                  } (${dayPercent}%)`
                                                : `${daysElapsed} / ${effectiveIntervalDays} ${hCopy.daysUnit} (${dayPercent}%)`}
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
                                          <span>{hCopy.lastServiceHistory}</span>
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
                                            label={ui.whatsapp.buttonLabel}
                                            title={ui.healthUi.card.sendWhatsappTitle}
                                            message={buildMaintenanceWhatsAppText({
                                              vehicle,
                                              serviceTitle: localized.title,
                                              statusLabel: t.status[status],
                                              projectedDueDate,
                                              effectiveIntervalDays,
                                              effectiveIntervalKm,
                                              units: prefs.units,
                                              language: prefs.language,
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
                                              title={ui.healthUi.card.addCalendarTitle}
                                            >
                                              <CalendarPlus className="w-3.5 h-3.5" />
                                              <span>{ui.healthUi.actions.schedule}</span>
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

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0c1629] border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto max-w-full shrink-0">
              {(
                [
                  {
                    id: 'active',
                    label: hCopy.forThisVehicle(t.vehicleTypes[vehicle.vehicleType ?? 'car']),
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    guideScope === tab.id
                      ? 'bg-white dark:bg-sky-500/20 text-slate-900 dark:text-sky-300 shadow-sm'
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
                  className="autolife-glass rounded-2xl overflow-hidden flex flex-col"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="autolife-glass rounded-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                  {ui.healthUi.preTrip.title}
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
                  {ui.healthUi.preTrip.distanceLabel}
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
                  {ui.healthUi.preTrip.loadLabel}
                </label>
                <select
                  value={heavyLoad ? 'heavy' : 'normal'}
                  onChange={(e) => setHeavyLoad(e.target.value === 'heavy')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="normal">
                    {isMoto
                      ? ui.healthUi.preTrip.soloOption
                      : ui.healthUi.preTrip.normalCarOption}
                  </option>
                  <option value="heavy">
                    {isMoto
                      ? ui.healthUi.preTrip.heavyMotoOption
                      : ui.healthUi.preTrip.heavyCarOption}
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
                {preTripCompletedCount} / {preTripChecklist.length} {hCopy.verifiedSuffix}
              </span>
              <div className="flex items-center gap-2">
                <WhatsAppConnectButton
                  whatsappNumber={prefs.whatsappNumber}
                  language={prefs.language}
                  label={ui.healthUi.preTrip.sendWa}
                  message={buildPreTripWhatsAppText({
                    vehicle,
                    tripKm,
                    checklistLabels: preTripChecklist.map((c) => c.label),
                    units: prefs.units,
                    language: prefs.language,
                  })}
                  onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                />
                <button
                  type="button"
                  onClick={() => setShowPreTripModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-medium"
                >
                  {preTripCompletedCount === preTripChecklist.length
                    ? ui.healthUi.preTrip.readyBtn
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
