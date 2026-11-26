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

export function buildMaintenanceWhatsAppText(params: {
  vehicle: Vehicle;
  serviceTitle: string;
  statusLabel: string;
  projectedDueDate: string;
  effectiveIntervalDays: number;
  effectiveIntervalKm: number;
  units: UnitSystem;
  notes?: string;
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
  } = params;

  const lines = [
    `*AutoLife World — Serviço Preventivo*`,
    `Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · Placa ${vehicle.plate}`,
    `Odômetro atual: ${formatDistance(vehicle.odometerKm, units)}`,
    `Serviço: ${serviceTitle}`,
    `Status: ${statusLabel}`,
    `Previsão: ${projectedDueDate || 'Não informado'} (a cada ${effectiveIntervalDays} dias / ${formatDistance(effectiveIntervalKm, units)})`,
  ];
  if (notes) lines.push(`Detalhes: ${notes}`);
  return lines.join('\n');
}

export function buildPreTripWhatsAppText(params: {
  vehicle: Vehicle;
  tripKm: number;
  checklistLabels: string[];
  units: UnitSystem;
}): string {
  const { vehicle, tripKm, checklistLabels, units } = params;
  return [
    `*AutoLife World — Checklist Pré-Viagem*`,
    `Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${vehicle.plate}`,
    `Distância prevista: ${formatDistance(tripKm, units)}`,
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
}): string {
  const { vehicle, log, currency, units, badgeLabel, attachmentUrl } = params;
  const converted = convertCurrency(log.cost, log.currency ?? 'BRL', currency);
  const lines = [
    `*AutoLife World — ${badgeLabel || 'Registro da Ficha Médica'}*`,
    `Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · Placa ${vehicle.plate}`,
    `Data: ${log.date}`,
    `Km: ${formatDistance(log.odometerKm, units)}`,
    `O que foi feito: ${log.title}`,
    `Oficina / Local: ${log.workshopName}`,
    `Valor: ${formatCurrency(converted, currency)}`,
  ];
  if (log.notes) lines.push(`Observações: ${log.notes}`);
  if (attachmentUrl) lines.push(`Nota / Comprovante: ${attachmentUrl}`);
  return lines.join('\n');
}

export function buildChargingSessionWhatsAppText(params: {
  vehicle: Vehicle;
  session: ChargingSession;
  currency: CurrencyCode;
}): string {
  const { vehicle, session, currency } = params;
  const converted = convertCurrency(session.cost, session.currency ?? 'BRL', currency);
  return [
    `*AutoLife World — Recarga EV*`,
    `Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · Placa ${vehicle.plate}`,
    `Data: ${session.date}`,
    `Estação: ${session.stationName} (${session.powerType})`,
    `Energia: ${session.energyKwh.toFixed(1)} kWh (${session.socStart}% → ${session.socEnd}%)`,
    `Valor: ${formatCurrency(converted, currency)}`,
  ].join('\n');
}

export function buildAttachmentWhatsAppText(params: {
  vehicle: Vehicle;
  attachment: VehicleAttachment;
  categoryLabel: string;
}): string {
  const { vehicle, attachment, categoryLabel } = params;
  const lines = [
    `*AutoLife World — ${categoryLabel}*`,
    `Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · Placa ${vehicle.plate}`,
    `Arquivo: ${attachment.fileName}`,
    `Data: ${attachment.attachmentDate}`,
  ];
  if (attachment.notes) lines.push(`Observações: ${attachment.notes}`);
  if (attachment.signedUrl) lines.push(`Link privado temporário: ${attachment.signedUrl}`);
  return lines.join('\n');
}

export function buildVehicleWhatsAppText(params: {
  vehicle: Vehicle;
  units: UnitSystem;
}): string {
  const { vehicle, units } = params;
  return [
    `*AutoLife World — Resumo do Veículo*`,
    `Modelo: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
    `Placa: ${vehicle.plate}`,
    `Odômetro: ${formatDistance(vehicle.odometerKm, units)}`,
    `Vencimento Documento/ITV: ${isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : 'Não informado'}`,
    `Vencimento Seguro: ${isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : 'Não informado'}`,
  ].join('\n');
}

export function buildPartnerWhatsAppText(params: {
  partner: NetworkPartner;
  vehicle: Vehicle | null;
  urgentTitles: string[];
  units: UnitSystem;
}): string {
  const { partner, vehicle, urgentTitles, units } = params;
  const lines = [
    `*AutoLife World — Solicitação de Serviço / Atendimento*`,
    `Local: ${partner.name}`,
    `Endereço: ${partner.address} — ${partner.city}`,
  ];
  if (vehicle) {
    lines.push(
      `Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year}) · Placa ${vehicle.plate} · ${formatDistance(vehicle.odometerKm, units)}`
    );
  }
  if (urgentTitles.length > 0) {
    lines.push(`Itens para verificar: ${urgentTitles.join(', ')}`);
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
}): string {
  const {
    vehicle,
    entries,
    currency,
    units,
    ownerEmail,
    upcomingReminders = [],
    maxChars,
  } = params;

  const totalCost = entries.reduce((sum, entry) => {
    if (entry.cost === null) return sum;
    return sum + convertCurrency(entry.cost, entry.currency ?? 'BRL', currency);
  }, 0);

  const headerLines: string[] = [
    `*AutoLife World — Ficha Técnica e Histórico Completo*`,
    `Veículo: ${vehicle.make} ${vehicle.model} (${vehicle.year})`,
    `Placa: ${vehicle.plate} · Motorização: ${vehicle.powertrain.toUpperCase()}`,
    `Odômetro atual: ${formatDistance(vehicle.odometerKm, units)}`,
    `Pneus: ${vehicle.tirePressurePsi} PSI${vehicle.rearTirePressurePsi ? ` / ${vehicle.rearTirePressurePsi} PSI` : ''}`,
    `Doc/ITV: ${isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : 'Não informado'} · Seguro: ${isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : 'Não informado'}`,
    `Total registrado (${entries.length} itens): ${formatCurrency(totalCost, currency)}`,
  ];

  if (ownerEmail) {
    headerLines.push(`Proprietário / E-mail: ${ownerEmail}`);
  }

  if (upcomingReminders.length > 0) {
    headerLines.push('', `*Próximos Lembretes (Não esquecer):*`);
    for (const rem of upcomingReminders.slice(0, 4)) {
      headerLines.push(`• ${rem.title} [${rem.statusLabel}] — ${rem.dueSummary}`);
    }
  }

  headerLines.push('', `*Histórico Cronológico:*`);

  if (entries.length === 0) {
    headerLines.push('Nenhum registro lançado até o momento.');
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
      lines.push(`... e mais ${remaining} registro(s) no histórico completo.`);
      break;
    }

    lines.push(entryLine);
    if (!maxChars && entry.notes) {
      lines.push(`  Obs: ${entry.notes}`);
    }
    includedCount++;
  }

  return lines.join('\n');
}

export function buildMedicalDossierEmailUrl(params: {
  recipientEmail: string;
  vehicle: Vehicle;
  dossierText: string;
}): string {
  const { recipientEmail, vehicle, dossierText } = params;
  const cleanEmail = recipientEmail.trim();
  const subject = `AutoLife — Ficha Técnica Completa · ${vehicle.make} ${vehicle.model} (${vehicle.plate})`;
  const safeBody = dossierText.replace(/\*/g, '').slice(0, 1700);
  return `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(safeBody)}`;
}

