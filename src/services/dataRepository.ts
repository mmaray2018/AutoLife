import { supabase } from '../lib/supabaseClient';
import {
  ChargingSession,
  CountryCode,
  CurrencyCode,
  DrivingProfile,
  MaintenanceCategory,
  MaintenanceItem,
  PowertrainType,
  ServiceLog,
  UserPreferences,
  Vehicle,
  VehicleManualSpec,
  VehicleType,
} from '../types/autolife';
import { UNSET_DATE_SENTINEL, isDateRecorded } from '../utils/autolife';
import { inferCountryFromCurrency, normalizePlanTier } from '../utils/billing';

export interface CloudSnapshot {
  vehicles: Vehicle[];
  items: MaintenanceItem[];
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  prefs: UserPreferences | null;
  preferencesUntouched: boolean;
}

export async function fetchCloudSnapshot(userId: string): Promise<CloudSnapshot | null> {
  if (!supabase) return null;

  const [vehRes, itemRes, logRes, chgRes, prefRes] = await Promise.all([
    supabase.from('vehicles').select('*').eq('user_id', userId),
    supabase.from('maintenance_items').select('*').eq('user_id', userId),
    supabase.from('service_logs').select('*').eq('user_id', userId),
    supabase.from('charging_sessions').select('*').eq('user_id', userId),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (vehRes.error) throw vehRes.error;
  if (itemRes.error) throw itemRes.error;
  if (logRes.error) throw logRes.error;
  if (chgRes.error) throw chgRes.error;

  const vehicles: Vehicle[] = (vehRes.data ?? []).map((row) => {
    const rawManual =
      row.manual_spec && typeof row.manual_spec === 'object'
        ? (row.manual_spec as Record<string, unknown>)
        : null;
    const metaColor =
      typeof rawManual?.vehicleColor === 'string' ? rawManual.vehicleColor : undefined;
    const metaVin =
      typeof rawManual?.vinOrRenavam === 'string' ? rawManual.vinOrRenavam : undefined;
    const hydratedManualSpec =
      rawManual && typeof rawManual.vehicleSummary === 'string'
        ? (rawManual as unknown as VehicleManualSpec)
        : undefined;

    return {
      id: row.id,
      vehicleType: (row.vehicle_type as VehicleType) || 'car',
      make: row.make,
      model: row.model,
      year: row.year,
      plate: row.plate,
      color: (typeof row.color === 'string' && row.color.trim()) || metaColor || undefined,
      vinOrRenavam:
        (typeof row.vin_or_renavam === 'string' && row.vin_or_renavam.trim()) ||
        metaVin ||
        undefined,
      powertrain: row.powertrain as PowertrainType,
      engineDisplacementCc: row.engine_displacement_cc ?? undefined,
      odometerKm: row.odometer_km,
      fleetGroup: row.fleet_group,
      drivingProfile: (row.driving_profile as DrivingProfile) ?? 'mixed',
      weeklyKm: row.weekly_km ?? 250,
      batteryCapacityKwh: row.battery_capacity_kwh ?? undefined,
      consumptionKwhPer100Km: row.consumption_kwh_per_100km ?? undefined,
      estimatedRangeKm: row.estimated_range_km ?? undefined,
      batterySohPercent: row.battery_soh_percent ?? undefined,
      tirePressurePsi: row.tire_pressure_psi,
      rearTirePressurePsi: row.rear_tire_pressure_psi ?? undefined,
      documentExpiryDate: isDateRecorded(row.document_expiry_date) ? row.document_expiry_date : '',
      insuranceExpiryDate: isDateRecorded(row.insurance_expiry_date) ? row.insurance_expiry_date : '',
      manualSpec: hydratedManualSpec,
      organizationId: row.organization_id ?? undefined,
      assignedMemberName: row.assigned_member_name ?? '',
      assignedMemberEmail: row.assigned_member_email ?? '',
    };
  });

  const items: MaintenanceItem[] = (itemRes.data ?? []).map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    category: row.category as MaintenanceCategory,
    titleKey: row.title_key,
    descriptionKey: row.description_key,
    intervalDays: row.interval_days,
    intervalKm: row.interval_km,
    lastCheckedDate: isDateRecorded(row.last_checked_date) ? row.last_checked_date : '',
    lastCheckedKm: row.last_checked_km,
    notes: row.notes ?? undefined,
    safetyNoteKey: row.safety_note_key ?? undefined,
  }));

  const logs: ServiceLog[] = (logRes.data ?? []).map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    odometerKm: row.odometer_km,
    category: row.category as MaintenanceCategory,
    title: row.title,
    cost: Number(row.cost),
    currency: (row.currency as CurrencyCode) ?? 'BRL',
    workshopName: row.workshop_name,
    notes: row.notes ?? '',
  }));

  const chargingSessions: ChargingSession[] = (chgRes.data ?? []).map((row) => ({
    id: row.id,
    vehicleId: row.vehicle_id,
    date: row.date,
    stationName: row.station_name,
    powerType: row.power_type,
    energyKwh: Number(row.energy_kwh),
    cost: Number(row.cost),
    currency: (row.currency as CurrencyCode) ?? 'BRL',
    socStart: row.soc_start,
    socEnd: row.soc_end,
  }));

  const p = prefRes.data;
  const resolvedCurrency = ((p?.currency as CurrencyCode) ?? 'BRL') as CurrencyCode;
  const createdMs = p?.created_at ? new Date(p.created_at).getTime() : 0;
  const updatedMs = p?.updated_at ? new Date(p.updated_at).getTime() : 0;
  const preferencesUntouched = Boolean(
    !p ||
      (createdMs > 0 && updatedMs > 0 && Math.abs(updatedMs - createdMs) <= 5000)
  );
  const prefs: UserPreferences | null = p
    ? {
        language: p.language,
        units: p.units,
        currency: resolvedCurrency,
        countryCode: (p.country_code as CountryCode) || inferCountryFromCurrency(resolvedCurrency),
        theme: p.theme,
        oilReminderDays: p.oil_reminder_days,
        tireReminderDays: p.tire_reminder_days,
        coolantReminderDays: p.coolant_reminder_days,
        docReminderDays: p.doc_reminder_days,
        activePlan: normalizePlanTier(p.active_plan),
        whatsappNumber: p.whatsapp_number ?? '',
      }
    : null;

  return { vehicles, items, logs, chargingSessions, prefs, preferencesUntouched };
}

export async function syncVehicleToCloud(userId: string, v: Vehicle): Promise<void> {
  if (!supabase) return;
  const cleanColor = v.color?.trim() || '';
  const cleanVin = v.vinOrRenavam?.trim() || '';
  const manualMeta =
    v.manualSpec || cleanColor || cleanVin
      ? {
          ...(v.manualSpec ?? {}),
          ...(cleanColor ? { vehicleColor: cleanColor } : {}),
          ...(cleanVin ? { vinOrRenavam: cleanVin } : {}),
        }
      : null;

  const basePayload = {
    id: v.id,
    user_id: userId,
    vehicle_type: v.vehicleType ?? 'car',
    make: v.make,
    model: v.model,
    year: v.year,
    plate: v.plate,
    powertrain: v.powertrain,
    engine_displacement_cc: v.engineDisplacementCc ?? null,
    odometer_km: v.odometerKm,
    fleet_group: v.fleetGroup,
    driving_profile: v.drivingProfile ?? 'mixed',
    weekly_km: v.weeklyKm ?? 250,
    battery_capacity_kwh: v.batteryCapacityKwh ?? null,
    consumption_kwh_per_100km: v.consumptionKwhPer100Km ?? null,
    estimated_range_km: v.estimatedRangeKm ?? null,
    battery_soh_percent: v.batterySohPercent ?? null,
    tire_pressure_psi: v.tirePressurePsi,
    rear_tire_pressure_psi: v.rearTirePressurePsi ?? null,
    document_expiry_date: isDateRecorded(v.documentExpiryDate)
      ? v.documentExpiryDate
      : UNSET_DATE_SENTINEL,
    insurance_expiry_date: isDateRecorded(v.insuranceExpiryDate)
      ? v.insuranceExpiryDate
      : UNSET_DATE_SENTINEL,
    manual_spec: manualMeta,
  };

  const { error } = await supabase.from('vehicles').upsert({
    ...basePayload,
    color: cleanColor || null,
    vin_or_renavam: cleanVin || null,
    organization_id: v.organizationId ?? null,
    assigned_member_name: v.assignedMemberName ?? '',
    assigned_member_email: v.assignedMemberEmail ?? '',
  });

  if (error) {
    const msg = error.message?.toLowerCase() || '';
    if (
      msg.includes('color') ||
      msg.includes('vin_or_renavam') ||
      msg.includes('organization_id') ||
      msg.includes('assigned_member_name') ||
      msg.includes('assigned_member_email')
    ) {
      const retry = await supabase.from('vehicles').upsert(basePayload);
      if (retry.error) throw retry.error;
      return;
    }
    throw error;
  }
}

export async function deleteVehicleFromCloud(userId: string, vehicleId: string): Promise<void> {
  if (!supabase) return;

  // 1. Remove any attached photos/documents from private Storage buckets first
  const { data: attRows } = await supabase
    .from('vehicle_attachments')
    .select('storage_bucket, storage_path')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId);

  if (attRows && attRows.length > 0) {
    const pathsByBucket = new Map<string, string[]>();
    for (const row of attRows) {
      const bucket = String(row.storage_bucket || 'vehicle-attachments');
      const path = String(row.storage_path || '');
      if (!path) continue;
      const list = pathsByBucket.get(bucket) ?? [];
      list.push(path);
      pathsByBucket.set(bucket, list);
    }
    await Promise.all(
      Array.from(pathsByBucket.entries()).map(([bucket, paths]) =>
        supabase!.storage.from(bucket).remove(paths).catch(() => {})
      )
    );
  }

  // 2. Delete all related history tables for this vehicle
  await Promise.all([
    supabase.from('vehicle_attachments').delete().eq('user_id', userId).eq('vehicle_id', vehicleId),
    supabase.from('service_logs').delete().eq('user_id', userId).eq('vehicle_id', vehicleId),
    supabase.from('charging_sessions').delete().eq('user_id', userId).eq('vehicle_id', vehicleId),
    supabase.from('maintenance_items').delete().eq('user_id', userId).eq('vehicle_id', vehicleId),
  ]);

  // 3. Delete the vehicle itself
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function syncMaintenanceItemToCloud(
  userId: string,
  item: MaintenanceItem
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('maintenance_items').upsert({
    id: item.id,
    user_id: userId,
    vehicle_id: item.vehicleId,
    category: item.category,
    title_key: item.titleKey,
    description_key: item.descriptionKey,
    interval_days: item.intervalDays,
    interval_km: item.intervalKm,
    last_checked_date: isDateRecorded(item.lastCheckedDate)
      ? item.lastCheckedDate
      : UNSET_DATE_SENTINEL,
    last_checked_km: item.lastCheckedKm,
    notes: item.notes ?? null,
    safety_note_key: item.safetyNoteKey ?? null,
  });
  if (error) throw error;
}

export async function insertServiceLogToCloud(userId: string, log: ServiceLog): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('service_logs').upsert({
    id: log.id,
    user_id: userId,
    vehicle_id: log.vehicleId,
    date: log.date,
    odometer_km: log.odometerKm,
    category: log.category,
    title: log.title,
    cost: log.cost,
    currency: log.currency ?? 'BRL',
    workshop_name: log.workshopName,
    notes: log.notes,
  });
  if (error) throw error;
}

export async function insertChargingSessionToCloud(
  userId: string,
  session: ChargingSession
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('charging_sessions').upsert({
    id: session.id,
    user_id: userId,
    vehicle_id: session.vehicleId,
    date: session.date,
    station_name: session.stationName,
    power_type: session.powerType,
    energy_kwh: session.energyKwh,
    cost: session.cost,
    currency: session.currency ?? 'BRL',
    soc_start: session.socStart,
    soc_end: session.socEnd,
  });
  if (error) throw error;
}

export async function saveWhatsAppToUserMetadata(whatsappNumber: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.updateUser({
      data: { whatsapp_number: whatsappNumber.trim() },
    });
  } catch {
    // Non-fatal metadata sync fallback
  }
}

export async function syncPreferencesToCloud(
  userId: string,
  prefs: UserPreferences
): Promise<void> {
  if (!supabase) return;
  const canonicalPlan = normalizePlanTier(prefs.activePlan);
  const basePayload = {
    user_id: userId,
    language: prefs.language,
    units: prefs.units,
    currency: prefs.currency,
    theme: prefs.theme,
    active_plan: canonicalPlan,
    oil_reminder_days: prefs.oilReminderDays,
    tire_reminder_days: prefs.tireReminderDays,
    coolant_reminder_days: prefs.coolantReminderDays,
    doc_reminder_days: prefs.docReminderDays,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('user_preferences').upsert({
    ...basePayload,
    country_code: prefs.countryCode ?? inferCountryFromCurrency(prefs.currency),
    whatsapp_number: prefs.whatsappNumber ?? '',
  });

  if (error) {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('whatsapp_number') || msg.includes('country_code')) {
      const retry = await supabase.from('user_preferences').upsert(basePayload);
      if (retry.error) throw retry.error;
      return;
    }
    throw error;
  }
}

