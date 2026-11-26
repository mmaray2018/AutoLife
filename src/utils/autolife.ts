import {
  CurrencyCode,
  DrivingProfile,
  MaintenanceCategory,
  MaintenanceItem,
  MaintenanceStatus,
  UnitSystem,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { CURRENCY_CATALOG } from './billing';

export const UNSET_DATE_SENTINEL = '1970-01-01';

export function isDateRecorded(dateIso?: string | null): dateIso is string {
  if (!dateIso) return false;
  const trimmed = dateIso.trim();
  return Boolean(trimmed && trimmed !== UNSET_DATE_SENTINEL);
}

export function daysBetween(dateIsoA: string, dateIsoB: string): number {
  const a = new Date(dateIsoA + 'T00:00:00');
  const b = new Date(dateIsoB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(dateIso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function getEffectiveIntervalDays(
  item: MaintenanceItem,
  prefs: UserPreferences
): number {
  if (item.category === MaintenanceCategory.OIL) return prefs.oilReminderDays;
  if (item.category === MaintenanceCategory.TIRES) return prefs.tireReminderDays;
  if (item.category === MaintenanceCategory.COOLANT) return prefs.coolantReminderDays;
  return item.intervalDays;
}

export function getSeverityMultiplier(
  category: MaintenanceCategory,
  profile?: DrivingProfile
): number {
  // Documentation & periodic inspection schedules don't compress legally with traffic,
  // whereas mechanical wear items (oil, brakes, battery, timing belt) wear faster in severe stop-and-go traffic.
  if (category === MaintenanceCategory.DOCUMENTATION) return 1.0;
  if (profile === 'urban_severe') return 0.65;
  if (profile === 'highway') return 1.15;
  return 1.0;
}

export function computeMaintenanceStatus(
  item: MaintenanceItem,
  vehicle: Vehicle,
  prefs: UserPreferences
): {
  status: MaintenanceStatus;
  daysElapsed: number;
  effectiveIntervalDays: number;
  effectiveIntervalKm: number;
  kmElapsed: number;
  daysRemaining: number;
  kmRemaining: number;
  projectedDueDate: string;
  severityMultiplier: number;
} {
  const today = todayIso();
  const severityMultiplier = getSeverityMultiplier(item.category, vehicle.drivingProfile);
  const effectiveIntervalDays = Math.max(
    5,
    Math.round(getEffectiveIntervalDays(item, prefs) * severityMultiplier)
  );
  const effectiveIntervalKm = Math.max(
    300,
    Math.round(item.intervalKm * severityMultiplier)
  );

  let docDaysLeft = Infinity;
  let earliestDocDate = '';
  if (item.category === MaintenanceCategory.DOCUMENTATION) {
    const hasDoc = isDateRecorded(vehicle.documentExpiryDate);
    const hasIns = isDateRecorded(vehicle.insuranceExpiryDate);
    const licDays = hasDoc ? daysBetween(today, vehicle.documentExpiryDate) : Infinity;
    const insDays = hasIns ? daysBetween(today, vehicle.insuranceExpiryDate) : Infinity;
    docDaysLeft = Math.min(licDays, insDays);
    if (hasDoc && hasIns) {
      earliestDocDate = licDays <= insDays ? vehicle.documentExpiryDate : vehicle.insuranceExpiryDate;
    } else if (hasDoc) {
      earliestDocDate = vehicle.documentExpiryDate;
    } else if (hasIns) {
      earliestDocDate = vehicle.insuranceExpiryDate;
    }
  }

  const hasRecordedCheck = isDateRecorded(item.lastCheckedDate);

  // Never show "Em dia" if the user has not logged any check or document expiry yet
  if (!hasRecordedCheck && docDaysLeft === Infinity) {
    return {
      status: MaintenanceStatus.PENDING,
      daysElapsed: 0,
      effectiveIntervalDays,
      effectiveIntervalKm,
      kmElapsed: 0,
      daysRemaining: effectiveIntervalDays,
      kmRemaining: effectiveIntervalKm,
      projectedDueDate: '',
      severityMultiplier,
    };
  }

  const daysElapsed = hasRecordedCheck ? Math.max(0, daysBetween(item.lastCheckedDate, today)) : 0;
  const kmElapsed = hasRecordedCheck ? Math.max(0, vehicle.odometerKm - item.lastCheckedKm) : 0;

  const daysRemaining = effectiveIntervalDays - daysElapsed;
  const kmRemaining = effectiveIntervalKm - kmElapsed;

  // Predict exact calendar date using weekly driving rate vs calendar interval
  const dailyKm = Math.max(5, (vehicle.weeklyKm ?? 250) / 7);
  const daysUntilKmDue = Math.round(kmRemaining / dailyKm);
  const effectiveDaysUntilDue = Math.min(daysRemaining, daysUntilKmDue);
  const projectedDueDate = hasRecordedCheck
    ? addDaysIso(today, effectiveDaysUntilDue)
    : earliestDocDate;

  let status = MaintenanceStatus.ON_TRACK;
  if ((hasRecordedCheck && (daysRemaining < 0 || kmRemaining < 0)) || docDaysLeft < 0) {
    status = MaintenanceStatus.OVERDUE;
  } else if (
    (hasRecordedCheck &&
      (daysRemaining <= Math.max(2, Math.round(effectiveIntervalDays * 0.2)) ||
        kmRemaining <= Math.max(100, Math.round(effectiveIntervalKm * 0.15)))) ||
    docDaysLeft <= prefs.docReminderDays
  ) {
    status = MaintenanceStatus.ATTENTION;
  }

  return {
    status,
    daysElapsed,
    effectiveIntervalDays,
    effectiveIntervalKm,
    kmElapsed,
    daysRemaining,
    kmRemaining,
    projectedDueDate,
    severityMultiplier,
  };
}

export function formatDistance(km: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = Math.round(km * 0.621371);
    return `${miles.toLocaleString()} mi`;
  }
  return `${Math.round(km).toLocaleString()} km`;
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const meta = CURRENCY_CATALOG[currency] ?? CURRENCY_CATALOG.BRL;
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    }).format(amount);
  } catch {
    const formattedNumber = amount.toLocaleString(meta.locale, {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    });
    return `${meta.symbol} ${formattedNumber}`;
  }
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const escaped = rows.map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  );
  const csvContent = escaped.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
