import {
  ChargingSession,
  CurrencyCode,
  LanguageCode,
  NetworkPartner,
  ServiceLog,
  UnitSystem,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import { formatCurrency, formatDistance, isDateRecorded } from './autolife';
import { convertCurrency } from './billing';

export function sanitizeWhatsAppNumber(
  raw?: string | null,
  language: LanguageCode = 'pt'
): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Se o usuario digitou DDD + numero brasileiro sem +55, completa com 55
  const normalized =
    !trimmed.startsWith('+') &&
    language === 'pt' &&
    (digits.length === 10 || digits.length === 11) &&
    !digits.startsWith('55')
      ? `55${digits}`
      : digits;

  if (normalized.length < 8 || normalized.length > 15) return '';
  return normalized;
}

export function formatWhatsAppDisplay(
  raw?: string | null,
  language: LanguageCode = 'pt'
): string {
  const digits = sanitizeWhatsAppNumber(raw, language);
  if (!digits) return '';
  return `+${digits}`;
}

export function buildWhatsAppUrl(
  rawPhone: string | undefined | null,
  language: LanguageCode,
  message: string
): string | null {
  const digits = sanitizeWhatsAppNumber(rawPhone, language);
  if (!digits) return null;
  const trimmedMsg = message.trim().slice(0, 1800);
  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmedMsg)}`;
}

export function buildWhatsAppShareUrl(
  message: string,
  rawPhone?: string | null,
  language: LanguageCode = 'pt'
): string {
  const trimmedMsg = message.trim().slice(0, 1800);
  const digits = sanitizeWhatsAppNumber(rawPhone, language);
  if (digits) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(trimmedMsg)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(trimmedMsg)}`;
}

const WA_I18N: Record<
  LanguageCode,
  {
    preventiveHeader: string;
    preTripHeader: string;
    defaultLogBadge: string;
    evChargeHeader: string;
    vehicleSummaryHeader: string;
    partnerHeader: string;
    dossierHeader: string;
    vehicle: string;
    model: string;
    plate: string;
    odometer: string;
    powertrain: string;
    tires: string;
    service: string;
    status: string;
    forecast: string;
    everyDays: string;
    days: string;
    notInformed: string;
    details: string;
    plannedDist: string;
    date: string;
    km: string;
    done: string;
    workshop: string;
    amount: string;
    notes: string;
    receipt: string;
    station: string;
    energy: string;
    file: string;
    tempLink: string;
    docExpiry: string;
    insExpiry: string;
    place: string;
    address: string;
    itemsCheck: string;
    totalRecorded: string;
    itemsCount: string;
    ownerEmail: string;
    upcomingReminders: string;
    chronologicalHistory: string;
    noEntries: string;
    moreRecordsPrefix: string;
    moreRecordsSuffix: string;
    obsPrefix: string;
    emailSubjectPrefix: string;
  }
> = {
  pt: {
    preventiveHeader: 'AutoLife World — Serviço Preventivo',
    preTripHeader: 'AutoLife World — Checklist Pré-Viagem',
    defaultLogBadge: 'Registro da Ficha Médica',
    evChargeHeader: 'AutoLife World — Recarga EV',
    vehicleSummaryHeader: 'AutoLife World — Resumo do Veículo',
    partnerHeader: 'AutoLife World — Solicitação de Serviço / Atendimento',
    dossierHeader: 'AutoLife World — Ficha Técnica e Histórico Completo',
    vehicle: 'Veículo',
    model: 'Modelo',
    plate: 'Placa',
    odometer: 'Odômetro atual',
    powertrain: 'Motorização',
    tires: 'Pneus',
    service: 'Serviço',
    status: 'Status',
    forecast: 'Previsão',
    everyDays: 'a cada',
    days: 'dias',
    notInformed: 'Não informado',
    details: 'Detalhes',
    plannedDist: 'Distância prevista',
    date: 'Data',
    km: 'Km',
    done: 'O que foi feito',
    workshop: 'Oficina / Local',
    amount: 'Valor',
    notes: 'Observações',
    receipt: 'Nota / Comprovante',
    station: 'Estação',
    energy: 'Energia',
    file: 'Arquivo',
    tempLink: 'Link privado temporário',
    docExpiry: 'Vencimento Documento/ITV',
    insExpiry: 'Vencimento Seguro',
    place: 'Local',
    address: 'Endereço',
    itemsCheck: 'Itens para verificar',
    totalRecorded: 'Total registrado',
    itemsCount: 'itens',
    ownerEmail: 'Proprietário / E-mail',
    upcomingReminders: 'Próximos Lembretes (Não esquecer):',
    chronologicalHistory: 'Histórico Cronológico:',
    noEntries: 'Nenhum registro lançado até o momento.',
    moreRecordsPrefix: '... e mais',
    moreRecordsSuffix: 'registro(s) no histórico completo.',
    obsPrefix: 'Obs',
    emailSubjectPrefix: 'AutoLife — Ficha Técnica Completa',
  },
  en: {
    preventiveHeader: 'AutoLife World — Preventive Service',
    preTripHeader: 'AutoLife World — Pre-Trip Checklist',
    defaultLogBadge: 'Medical Record Entry',
    evChargeHeader: 'AutoLife World — EV Charge',
    vehicleSummaryHeader: 'AutoLife World — Vehicle Summary',
    partnerHeader: 'AutoLife World — Service Request',
    dossierHeader: 'AutoLife World — Full Technical & Service History',
    vehicle: 'Vehicle',
    model: 'Model',
    plate: 'Plate',
    odometer: 'Current odometer',
    powertrain: 'Powertrain',
    tires: 'Tires',
    service: 'Service',
    status: 'Status',
    forecast: 'Projected due',
    everyDays: 'every',
    days: 'days',
    notInformed: 'Not informed',
    details: 'Details',
    plannedDist: 'Planned distance',
    date: 'Date',
    km: 'Mileage',
    done: 'Work performed',
    workshop: 'Workshop / Place',
    amount: 'Amount',
    notes: 'Notes',
    receipt: 'Receipt / Attachment',
    station: 'Station',
    energy: 'Energy',
    file: 'File',
    tempLink: 'Temporary private link',
    docExpiry: 'Registration / Inspection Due',
    insExpiry: 'Insurance Expiry',
    place: 'Location',
    address: 'Address',
    itemsCheck: 'Items to inspect',
    totalRecorded: 'Total recorded',
    itemsCount: 'items',
    ownerEmail: 'Owner / Email',
    upcomingReminders: 'Upcoming Reminders (Do not forget):',
    chronologicalHistory: 'Chronological History:',
    noEntries: 'No records logged yet.',
    moreRecordsPrefix: '... and',
    moreRecordsSuffix: 'more record(s) in full history.',
    obsPrefix: 'Note',
    emailSubjectPrefix: 'AutoLife — Complete Vehicle Dossier',
  },
  es: {
    preventiveHeader: 'AutoLife World — Servicio Preventivo',
    preTripHeader: 'AutoLife World — Checklist Pre-Viaje',
    defaultLogBadge: 'Registro de Ficha Médica',
    evChargeHeader: 'AutoLife World — Carga EV',
    vehicleSummaryHeader: 'AutoLife World — Resumen del Vehículo',
    partnerHeader: 'AutoLife World — Solicitud de Servicio / Atención',
    dossierHeader: 'AutoLife World — Ficha Técnica e Historial Completo',
    vehicle: 'Vehículo',
    model: 'Modelo',
    plate: 'Matrícula',
    odometer: 'Odómetro actual',
    powertrain: 'Motorización',
    tires: 'Neumáticos',
    service: 'Servicio',
    status: 'Estado',
    forecast: 'Previsión',
    everyDays: 'cada',
    days: 'días',
    notInformed: 'No informado',
    details: 'Detalles',
    plannedDist: 'Distancia prevista',
    date: 'Fecha',
    km: 'Km',
    done: 'Trabajo realizado',
    workshop: 'Taller / Lugar',
    amount: 'Importe',
    notes: 'Observaciones',
    receipt: 'Factura / Comprobante',
    station: 'Estación',
    energy: 'Energía',
    file: 'Archivo',
    tempLink: 'Enlace privado temporal',
    docExpiry: 'Vencimiento Documentación / ITV',
    insExpiry: 'Vencimiento Seguro',
    place: 'Lugar',
    address: 'Dirección',
    itemsCheck: 'Elementos a revisar',
    totalRecorded: 'Total registrado',
    itemsCount: 'elementos',
    ownerEmail: 'Propietario / Correo',
    upcomingReminders: 'Próximos Recordatorios (No olvidar):',
    chronologicalHistory: 'Historial Cronológico:',
    noEntries: 'Ningún registro guardado por el momento.',
    moreRecordsPrefix: '... y',
    moreRecordsSuffix: 'registro(s) más en el historial completo.',
    obsPrefix: 'Obs',
    emailSubjectPrefix: 'AutoLife — Ficha Técnica Completa',
  },
  de: {
    preventiveHeader: 'AutoLife World — Vorsorgeservice',
    preTripHeader: 'AutoLife World — Reise-Checkliste',
    defaultLogBadge: 'Eintrag in der Fahrzeugakte',
    evChargeHeader: 'AutoLife World — EV-Ladevorgang',
    vehicleSummaryHeader: 'AutoLife World — Fahrzeugübersicht',
    partnerHeader: 'AutoLife World — Serviceanfrage',
    dossierHeader: 'AutoLife World — Vollständige Fahrzeug- & Servicehistorie',
    vehicle: 'Fahrzeug',
    model: 'Modell',
    plate: 'Kennzeichen',
    odometer: 'Aktueller Kilometerstand',
    powertrain: 'Antrieb',
    tires: 'Reifen',
    service: 'Service',
    status: 'Status',
    forecast: 'Fälligkeit',
    everyDays: 'alle',
    days: 'Tage',
    notInformed: 'Nicht angegeben',
    details: 'Details',
    plannedDist: 'Geplante Strecke',
    date: 'Datum',
    km: 'Stand',
    done: 'Durchgeführt',
    workshop: 'Werkstatt / Ort',
    amount: 'Betrag',
    notes: 'Notizen',
    receipt: 'Beleg / Nachweis',
    station: 'Ladestation',
    energy: 'Energie',
    file: 'Datei',
    tempLink: 'Temporärer Privatlink',
    docExpiry: 'TÜV / Zulassung fällig',
    insExpiry: 'Versicherungsablauf',
    place: 'Standort',
    address: 'Adresse',
    itemsCheck: 'Zu prüfende Punkte',
    totalRecorded: 'Gesamt erfasst',
    itemsCount: 'Einträge',
    ownerEmail: 'Halter / E-Mail',
    upcomingReminders: 'Anstehende Erinnerungen:',
    chronologicalHistory: 'Chronologische Historie:',
    noEntries: 'Noch keine Einträge erfasst.',
    moreRecordsPrefix: '... und',
    moreRecordsSuffix: 'weitere Einträge in der Gesamthistorie.',
    obsPrefix: 'Anm.',
    emailSubjectPrefix: 'AutoLife — Vollständige Fahrzeugakte',
  },
  fr: {
    preventiveHeader: 'AutoLife World — Entretien Préventif',
    preTripHeader: 'AutoLife World — Checklist Avant-Départ',
    defaultLogBadge: 'Entrée du Carnet Médical',
    evChargeHeader: 'AutoLife World — Recharge EV',
    vehicleSummaryHeader: 'AutoLife World — Résumé du Véhicule',
    partnerHeader: 'AutoLife World — Demande de Service',
    dossierHeader: 'AutoLife World — Fiche Technique & Historique Complet',
    vehicle: 'Véhicule',
    model: 'Modèle',
    plate: 'Plaque',
    odometer: 'Kilométrage actuel',
    powertrain: 'Motorisation',
    tires: 'Pneus',
    service: 'Service',
    status: 'Statut',
    forecast: 'Échéance prévue',
    everyDays: 'tous les',
    days: 'jours',
    notInformed: 'Non renseigné',
    details: 'Détails',
    plannedDist: 'Distance prévue',
    date: 'Date',
    km: 'Compteur',
    done: 'Intervention',
    workshop: 'Atelier / Lieu',
    amount: 'Montant',
    notes: 'Observations',
    receipt: 'Facture / Justificatif',
    station: 'Station',
    energy: 'Énergie',
    file: 'Fichier',
    tempLink: 'Lien privé temporaire',
    docExpiry: 'Échéance Contrôle / Immat.',
    insExpiry: 'Échéance Assurance',
    place: 'Lieu',
    address: 'Adresse',
    itemsCheck: 'Points à vérifier',
    totalRecorded: 'Total enregistré',
    itemsCount: 'éléments',
    ownerEmail: 'Propriétaire / E-mail',
    upcomingReminders: 'Prochains Rappels (À ne pas oublier) :',
    chronologicalHistory: 'Historique Chronologique :',
    noEntries: 'Aucun enregistrement pour le moment.',
    moreRecordsPrefix: '... et',
    moreRecordsSuffix: 'autre(s) entrée(s) dans l’historique complet.',
    obsPrefix: 'Note',
    emailSubjectPrefix: 'AutoLife — Fiche Technique Complète',
  },
};

function waCopy(lang?: LanguageCode) {
  return WA_I18N[lang ?? 'pt'] ?? WA_I18N.en;
}

export function buildMaintenanceWhatsAppText(params: {
  vehicle: Vehicle;
  serviceTitle: string;
  statusLabel: string;
  projectedDueDate: string;
  effectiveIntervalDays: number;
  effectiveIntervalKm: number;
  units: UnitSystem;
  notes?: string;
  language?: LanguageCode;
}): string {
  const {
    vehicle,
    serviceTitle,
    statusLabel,
    projectedDueDate,
    effectiveIntervalDays,
    effectiveIntervalKm,
    units,
    notes,
    language,
  } = params;
  const c = waCopy(language);

  const lines = [
    `*${c.preventiveHeader}*`,
    `${c.vehicle}: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${c.plate} ${vehicle.plate}`,
    `${c.odometer}: ${formatDistance(vehicle.odometerKm, units)}`,
    `${c.service}: ${serviceTitle}`,
    `${c.status}: ${statusLabel}`,
    `${c.forecast}: ${projectedDueDate || c.notInformed} (${c.everyDays} ${effectiveIntervalDays} ${c.days} / ${formatDistance(effectiveIntervalKm, units)})`,
  ];
  if (notes) lines.push(`${c.details}: ${notes}`);
  return lines.join('\n');
}

export function buildPreTripWhatsAppText(params: {
  vehicle: Vehicle;
  tripKm: number;
  checklistLabels: string[];
  units: UnitSystem;
  language?: LanguageCode;
}): string {
  const { vehicle, tripKm, checklistLabels, units, language } = params;
  const c = waCopy(language);
  return [
    `*${c.preTripHeader}*`,
    `${c.vehicle}: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${vehicle.plate}`,
    `${c.plannedDist}: ${formatDistance(tripKm, units)}`,
    ...checklistLabels.map((item, i) => `${i + 1}. ${item}`),
  ].join('\n');
}

export function buildServiceLogWhatsAppText(params: {
  vehicle: Vehicle;
  log: ServiceLog;
  currency: CurrencyCode;
  units: UnitSystem;
  badgeLabel?: string;
  attachmentUrl?: string;
  language?: LanguageCode;
}): string {
  const { vehicle, log, currency, units, badgeLabel, attachmentUrl, language } = params;
  const c = waCopy(language);
  const converted = convertCurrency(log.cost, log.currency ?? 'BRL', currency);
  const lines = [
    `*AutoLife World — ${badgeLabel || c.defaultLogBadge}*`,
    `${c.vehicle}: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${c.plate} ${vehicle.plate}`,
    `${c.date}: ${log.date}`,
    `${c.km}: ${formatDistance(log.odometerKm, units)}`,
    `${c.done}: ${log.title}`,
    `${c.workshop}: ${log.workshopName}`,
    `${c.amount}: ${formatCurrency(converted, currency)}`,
  ];
  if (log.notes) lines.push(`${c.notes}: ${log.notes}`);
  if (attachmentUrl) lines.push(`${c.receipt}: ${attachmentUrl}`);
  return lines.join('\n');
}

export function buildChargingSessionWhatsAppText(params: {
  vehicle: Vehicle;
  session: ChargingSession;
  currency: CurrencyCode;
  language?: LanguageCode;
}): string {
  const { vehicle, session, currency, language } = params;
  const c = waCopy(language);
  const converted = convertCurrency(session.cost, session.currency ?? 'BRL', currency);
  return [
    `*${c.evChargeHeader}*`,
    `${c.vehicle}: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${c.plate} ${vehicle.plate}`,
    `${c.date}: ${session.date}`,
    `${c.station}: ${session.stationName} (${session.powerType})`,
    `${c.energy}: ${session.energyKwh.toFixed(1)} kWh (${session.socStart}% → ${session.socEnd}%)`,
    `${c.amount}: ${formatCurrency(converted, currency)}`,
  ].join('\n');
}

export function buildAttachmentWhatsAppText(params: {
  vehicle: Vehicle;
  attachment: VehicleAttachment;
  categoryLabel: string;
  language?: LanguageCode;
}): string {
  const { vehicle, attachment, categoryLabel, language } = params;
  const c = waCopy(language);
  const lines = [
    `*AutoLife World — ${categoryLabel}*`,
    `${c.vehicle}: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${c.plate} ${vehicle.plate}`,
    `${c.file}: ${attachment.fileName}`,
    `${c.date}: ${attachment.attachmentDate}`,
  ];
  if (attachment.notes) lines.push(`${c.notes}: ${attachment.notes}`);
  if (attachment.signedUrl) lines.push(`${c.tempLink}: ${attachment.signedUrl}`);
  return lines.join('\n');
}

export function buildVehicleWhatsAppText(params: {
  vehicle: Vehicle;
  units: UnitSystem;
  language?: LanguageCode;
}): string {
  const { vehicle, units, language } = params;
  const c = waCopy(language);
  return [
    `*${c.vehicleSummaryHeader}*`,
    `${c.model}: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
    `${c.plate}: ${vehicle.plate}`,
    `${c.odometer}: ${formatDistance(vehicle.odometerKm, units)}`,
    `${c.docExpiry}: ${isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : c.notInformed}`,
    `${c.insExpiry}: ${isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : c.notInformed}`,
  ].join('\n');
}

export function buildPartnerWhatsAppText(params: {
  partner: NetworkPartner;
  vehicle: Vehicle | null;
  urgentTitles: string[];
  units: UnitSystem;
  language?: LanguageCode;
}): string {
  const { partner, vehicle, urgentTitles, units, language } = params;
  const c = waCopy(language);
  const lines = [
    `*${c.partnerHeader}*`,
    `${c.place}: ${partner.name}`,
    `${c.address}: ${partner.address} — ${partner.city}`,
  ];
  if (vehicle) {
    lines.push(
      `${c.vehicle}: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${c.plate} ${vehicle.plate} · ${formatDistance(vehicle.odometerKm, units)}`
    );
  }
  if (urgentTitles.length > 0) {
    lines.push(`${c.itemsCheck}: ${urgentTitles.join(', ')}`);
  }
  return lines.join('\n');
}

export interface FullMedicalDossierEntry {
  date: string;
  badgeLabel: string;
  title: string;
  odometerKm: number | null;
  location: string;
  cost: number | null;
  currency: CurrencyCode;
  notes?: string;
}

export interface UpcomingDossierReminder {
  title: string;
  statusLabel: string;
  dueSummary: string;
}

export function buildFullMedicalDossierText(params: {
  vehicle: Vehicle;
  entries: FullMedicalDossierEntry[];
  currency: CurrencyCode;
  units: UnitSystem;
  ownerEmail?: string | null;
  upcomingReminders?: UpcomingDossierReminder[];
  maxChars?: number;
  language?: LanguageCode;
}): string {
  const {
    vehicle,
    entries,
    currency,
    units,
    ownerEmail,
    upcomingReminders = [],
    maxChars,
    language,
  } = params;
  const c = waCopy(language);

  const totalCost = entries.reduce((sum, entry) => {
    if (entry.cost === null) return sum;
    return sum + convertCurrency(entry.cost, entry.currency ?? 'BRL', currency);
  }, 0);

  const headerLines: string[] = [
    `*${c.dossierHeader}*`,
    `${c.vehicle}: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
    `${c.plate}: ${vehicle.plate} · ${c.powertrain}: ${vehicle.powertrain.toUpperCase()}`,
    `${c.odometer}: ${formatDistance(vehicle.odometerKm, units)}`,
    `${c.tires}: ${vehicle.tirePressurePsi} PSI${vehicle.rearTirePressurePsi ? ` / ${vehicle.rearTirePressurePsi} PSI` : ''}`,
    `Doc/ITV: ${isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : c.notInformed} · ${c.insExpiry}: ${isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : c.notInformed}`,
    `${c.totalRecorded} (${entries.length} ${c.itemsCount}): ${formatCurrency(totalCost, currency)}`,
  ];

  if (ownerEmail) {
    headerLines.push(`${c.ownerEmail}: ${ownerEmail}`);
  }

  if (upcomingReminders.length > 0) {
    headerLines.push('', `*${c.upcomingReminders}*`);
    for (const rem of upcomingReminders.slice(0, 4)) {
      headerLines.push(`• ${rem.title} [${rem.statusLabel}] — ${rem.dueSummary}`);
    }
  }

  headerLines.push('', `*${c.chronologicalHistory}*`);

  if (entries.length === 0) {
    headerLines.push(c.noEntries);
    return headerLines.join('\n');
  }

  const lines = [...headerLines];
  let includedCount = 0;

  for (const entry of entries) {
    const kmPart = entry.odometerKm !== null ? ` · ${formatDistance(entry.odometerKm, units)}` : '';
    const costPart =
      entry.cost !== null
        ? ` · ${formatCurrency(convertCurrency(entry.cost, entry.currency ?? 'BRL', currency), currency)}`
        : '';
    const entryLine = `• ${entry.date} [${entry.badgeLabel}] ${entry.title}${kmPart} · ${entry.location}${costPart}`;

    if (maxChars && lines.join('\n').length + entryLine.length + 60 > maxChars) {
      const remaining = entries.length - includedCount;
      lines.push(`${c.moreRecordsPrefix} ${remaining} ${c.moreRecordsSuffix}`);
      break;
    }

    lines.push(entryLine);
    if (!maxChars && entry.notes) {
      lines.push(`  ${c.obsPrefix}: ${entry.notes}`);
    }
    includedCount++;
  }

  return lines.join('\n');
}

export function buildMedicalDossierEmailUrl(params: {
  recipientEmail: string;
  vehicle: Vehicle;
  dossierText: string;
  language?: LanguageCode;
}): string {
  const { recipientEmail, vehicle, dossierText, language } = params;
  const c = waCopy(language);
  const cleanEmail = recipientEmail.trim();
  const subject = `${c.emailSubjectPrefix} · ${vehicle.make} ${vehicle.model} (${vehicle.plate})`;
  const safeBody = dossierText.replace(/\*/g, '').slice(0, 1700);
  return `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(safeBody)}`;
}

