import { useMemo, useState } from 'react';
import { Leaf, Zap } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getUi } from '../data/uiTranslations';
import {
  ChargingSession,
  PowertrainType,
  ServiceLog,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { daysBetween, formatDistance, todayIso } from '../utils/autolife';

interface CarbonFootprintSectionProps {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  prefs: UserPreferences;
}

type GridMix = 'brazil' | 'global';

interface MonthlyCarbonDatum {
  monthKey: string;
  label: string;
  distanceKm: number;
  evDistanceKm: number;
  actualCo2Kg: number;
  avoidedCo2Kg: number;
  combustionBaselineKg: number;
}

interface VehicleCarbonDatum {
  id: string;
  name: string;
  powertrainLabel: string;
  monthlyKm: number;
  actualCo2Kg: number;
  avoidedCo2Kg: number;
  combustionBaselineKg: number;
}

const GRID_FACTORS_KG_PER_KWH: Record<GridMix, number> = {
  brazil: 0.095,
  global: 0.28,
};

function getRecentMonths(count: number, monthNames: string[]): { key: string; label: string; startIso: string; endIso: string; daysInMonth: number }[] {
  const now = new Date();
  const months: { key: string; label: string; startIso: string; endIso: string; daysInMonth: number }[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthIdx = d.getMonth();
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const mm = String(monthIdx + 1).padStart(2, '0');
    const key = `${year}-${mm}`;
    const label = `${(monthNames[monthIdx] ?? mm).slice(0, 3)}/${String(year).slice(-2)}`;
    months.push({
      key,
      label,
      startIso: `${key}-01`,
      endIso: `${key}-${String(daysInMonth).padStart(2, '0')}`,
      daysInMonth,
    });
  }
  return months;
}

function getEmissionFactors(vehicle: Vehicle, gridMix: GridMix): {
  actualKgPerKm: number;
  combustionBaselineKgPerKm: number;
} {
  const gridFactor = GRID_FACTORS_KG_PER_KWH[gridMix];
  const isMoto = vehicle.vehicleType === 'motorcycle';
  const cc = vehicle.engineDisplacementCc;

  if (isMoto) {
    let baseline = 0.072;
    if (cc && cc <= 200) baseline = 0.058;
    else if (cc && cc <= 500) baseline = 0.076;
    else if (cc && cc > 500) baseline = 0.105;

    if (vehicle.powertrain === PowertrainType.ELECTRIC) {
      const kwhPerKm = (vehicle.consumptionKwhPer100Km ?? 4.2) / 100;
      return {
        actualKgPerKm: kwhPerKm * gridFactor,
        combustionBaselineKgPerKm: baseline,
      };
    }
    if (vehicle.powertrain === PowertrainType.HYBRID) {
      return {
        actualKgPerKm: baseline * 0.65,
        combustionBaselineKgPerKm: baseline,
      };
    }
    return {
      actualKgPerKm: baseline,
      combustionBaselineKgPerKm: baseline,
    };
  }

  // Passenger Car factors (kg CO2e / km)
  let gasFactor = 0.172;
  if (cc && cc <= 1050) gasFactor = 0.148;
  else if (cc && cc >= 2000) gasFactor = 0.205;

  if (vehicle.powertrain === PowertrainType.ELECTRIC) {
    const kwhPerKm = (vehicle.consumptionKwhPer100Km ?? 16.5) / 100;
    return {
      actualKgPerKm: kwhPerKm * gridFactor,
      combustionBaselineKgPerKm: gasFactor,
    };
  }
  if (vehicle.powertrain === PowertrainType.HYBRID) {
    return {
      actualKgPerKm: 0.105,
      combustionBaselineKgPerKm: gasFactor,
    };
  }
  if (vehicle.powertrain === PowertrainType.DIESEL) {
    return {
      actualKgPerKm: 0.165,
      combustionBaselineKgPerKm: 0.165,
    };
  }
  return {
    actualKgPerKm: gasFactor,
    combustionBaselineKgPerKm: gasFactor,
  };
}

function estimateVehicleMonthKm(
  vehicle: Vehicle,
  monthStartIso: string,
  monthEndIso: string,
  monthKey: string,
  daysInMonth: number,
  vehicleLogs: ServiceLog[],
  vehicleCharges: ChargingSession[],
  today: string
): number {
  const defaultWeekly = vehicle.weeklyKm ?? (vehicle.fleetGroup === 'fleet' ? 600 : 250);
  const baselineMonthlyKm = Math.max(40, Math.round(defaultWeekly * (daysInMonth / 7)));

  // Build chronological odometer checkpoints: logs + current odometer
  const checkpoints = [
    ...vehicleLogs.map((l) => ({ date: l.date, km: l.odometerKm })),
    { date: today, km: vehicle.odometerKm },
  ]
    .filter((c) => Number.isFinite(c.km) && c.km >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let derivedKm: number | null = null;

  if (checkpoints.length >= 2) {
    // Find segment(s) overlapping this month to calculate real km/day from service history
    for (let i = 0; i < checkpoints.length - 1; i++) {
      const a = checkpoints[i];
      const b = checkpoints[i + 1];
      if (b.date < monthStartIso || a.date > monthEndIso) continue;
      const spanDays = Math.max(1, daysBetween(a.date, b.date));
      const deltaKm = Math.max(0, b.km - a.km);
      const dailyRate = deltaKm / spanDays;
      // Guard against unrealistically tiny or outlier gaps
      if (dailyRate >= 2 && dailyRate <= 600) {
        derivedKm = Math.round(dailyRate * daysInMonth);
        break;
      }
    }
  }

  let monthKm = derivedKm ?? baselineMonthlyKm;

  // For EVs with charging logs in this month, include kWh-based distance when larger
  if (vehicle.powertrain === PowertrainType.ELECTRIC) {
    const monthKwh = vehicleCharges
      .filter((c) => c.date.startsWith(monthKey))
      .reduce((acc, c) => acc + c.energyKwh, 0);
    if (monthKwh > 0) {
      const kwhPer100 = Math.max(2, vehicle.consumptionKwhPer100Km ?? 16.5);
      const chargedKm = Math.round((monthKwh / kwhPer100) * 100);
      monthKm = Math.max(monthKm, chargedKm);
    }
  }

  return monthKm;
}

export function CarbonFootprintSection({
  vehicles,
  activeVehicle,
  logs,
  chargingSessions,
  prefs,
}: CarbonFootprintSectionProps) {
  const bundle = getUi(prefs.language);
  const ui = bundle.carbonUi;
  const scopeUi = bundle.analyticsUi;
  const monthNames = bundle.medicalUi.monthNames;

  const [scope, setScope] = useState<'all' | 'car' | 'motorcycle' | 'active'>('all');
  const [gridMix, setGridMix] = useState<GridMix>('brazil');

  const scopedVehicles = useMemo(() => {
    if (scope === 'car') return vehicles.filter((v) => (v.vehicleType ?? 'car') === 'car');
    if (scope === 'motorcycle') return vehicles.filter((v) => v.vehicleType === 'motorcycle');
    if (scope === 'active') return activeVehicle ? [activeVehicle] : [];
    return vehicles;
  }, [vehicles, scope, activeVehicle]);

  const months = useMemo(() => getRecentMonths(6, monthNames), [monthNames]);
  const today = todayIso();

  // Monthly 6-month carbon series
  const monthlyData = useMemo<MonthlyCarbonDatum[]>(() => {
    return months.map((m) => {
      let distanceKm = 0;
      let evDistanceKm = 0;
      let actualCo2 = 0;
      let baselineCo2 = 0;

      for (const v of scopedVehicles) {
        const vLogs = logs.filter((l) => l.vehicleId === v.id);
        const vCharges = chargingSessions.filter((c) => c.vehicleId === v.id);
        const km = estimateVehicleMonthKm(
          v,
          m.startIso,
          m.endIso,
          m.key,
          m.daysInMonth,
          vLogs,
          vCharges,
          today
        );
        const { actualKgPerKm, combustionBaselineKgPerKm } = getEmissionFactors(v, gridMix);
        distanceKm += km;
        if (v.powertrain === PowertrainType.ELECTRIC || v.powertrain === PowertrainType.HYBRID) {
          evDistanceKm += km;
        }
        actualCo2 += km * actualKgPerKm;
        baselineCo2 += km * combustionBaselineKgPerKm;
      }

      const actualCo2Kg = Math.round(actualCo2 * 10) / 10;
      const combustionBaselineKg = Math.round(baselineCo2 * 10) / 10;
      const avoidedCo2Kg = Math.max(0, Math.round((combustionBaselineKg - actualCo2Kg) * 10) / 10);

      return {
        monthKey: m.key,
        label: m.label,
        distanceKm,
        evDistanceKm,
        actualCo2Kg,
        avoidedCo2Kg,
        combustionBaselineKg,
      };
    });
  }, [months, scopedVehicles, logs, chargingSessions, gridMix, today]);

  // Current month breakdown per vehicle
  const currentMonth = months[months.length - 1];
  const vehicleCarbonData = useMemo<VehicleCarbonDatum[]>(() => {
    return scopedVehicles.map((v) => {
      const vLogs = logs.filter((l) => l.vehicleId === v.id);
      const vCharges = chargingSessions.filter((c) => c.vehicleId === v.id);
      const monthlyKm = estimateVehicleMonthKm(
        v,
        currentMonth.startIso,
        currentMonth.endIso,
        currentMonth.key,
        currentMonth.daysInMonth,
        vLogs,
        vCharges,
        today
      );
      const { actualKgPerKm, combustionBaselineKgPerKm } = getEmissionFactors(v, gridMix);
      const actualCo2Kg = Math.round(monthlyKm * actualKgPerKm * 10) / 10;
      const combustionBaselineKg = Math.round(monthlyKm * combustionBaselineKgPerKm * 10) / 10;
      const avoidedCo2Kg = Math.max(
        0,
        Math.round((combustionBaselineKg - actualCo2Kg) * 10) / 10
      );

      const powertrainLabel =
        v.powertrain === PowertrainType.ELECTRIC
          ? ui.powertrainLabels.electric
          : v.powertrain === PowertrainType.HYBRID
          ? ui.powertrainLabels.hybrid
          : v.powertrain === PowertrainType.DIESEL
          ? ui.powertrainLabels.diesel
          : ui.powertrainLabels.combustion;

      return {
        id: v.id,
        name: `${v.make} ${v.model}`,
        powertrainLabel,
        monthlyKm,
        actualCo2Kg,
        avoidedCo2Kg,
        combustionBaselineKg,
      };
    });
  }, [scopedVehicles, logs, chargingSessions, currentMonth, gridMix, today, ui.powertrainLabels]);

  const kpis = useMemo(() => {
    const latest = monthlyData[monthlyData.length - 1] ?? {
      actualCo2Kg: 0,
      avoidedCo2Kg: 0,
      combustionBaselineKg: 0,
      distanceKm: 0,
    };
    const sixMonthAvoided = monthlyData.reduce((acc, m) => acc + m.avoidedCo2Kg, 0);
    const reductionPct =
      latest.combustionBaselineKg > 0
        ? Math.round((latest.avoidedCo2Kg / latest.combustionBaselineKg) * 100)
        : 0;
    const avgGramsPerKm =
      latest.distanceKm > 0
        ? Math.round((latest.actualCo2Kg * 1000) / latest.distanceKm)
        : 0;
    const annualTreesEquivalent = Math.round((latest.avoidedCo2Kg * 12) / 21.7);

    // Highest emitting non-EV candidate for "What-if Electrify" calculation
    const nonEvCandidates = vehicleCarbonData
      .filter((vc) => {
        const vObj = scopedVehicles.find((v) => v.id === vc.id);
        return vObj && vObj.powertrain !== PowertrainType.ELECTRIC;
      })
      .sort((a, b) => b.actualCo2Kg - a.actualCo2Kg);

    let topCandidateInsight: { name: string; extraMonthlySavingsKg: number } | null = null;
    if (nonEvCandidates.length > 0) {
      const top = nonEvCandidates[0];
      const vObj = scopedVehicles.find((v) => v.id === top.id)!;
      const evEquivalentFactor =
        ((vObj.vehicleType === 'motorcycle' ? 4.2 : 16.5) / 100) *
        GRID_FACTORS_KG_PER_KWH[gridMix];
      const evMonthlyCo2 = top.monthlyKm * evEquivalentFactor;
      const extraSavings = Math.max(0, Math.round((top.actualCo2Kg - evMonthlyCo2) * 10) / 10);
      if (extraSavings > 0) {
        topCandidateInsight = {
          name: top.name,
          extraMonthlySavingsKg: extraSavings,
        };
      }
    }

    return {
      monthlyActualKg: latest.actualCo2Kg,
      monthlyAvoidedKg: latest.avoidedCo2Kg,
      monthlyDistanceKm: latest.distanceKm,
      sixMonthAvoidedKg: Math.round(sixMonthAvoided * 10) / 10,
      reductionPct,
      avgGramsPerKm,
      annualTreesEquivalent,
      topCandidateInsight,
    };
  }, [monthlyData, vehicleCarbonData, scopedVehicles, gridMix]);

  const axisTickColor = prefs.theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = prefs.theme === 'dark' ? 'rgba(148,163,184,0.14)' : '#e2e8f0';

  const carCount = vehicles.filter((v) => (v.vehicleType ?? 'car') === 'car').length;
  const motoCount = vehicles.filter((v) => v.vehicleType === 'motorcycle').length;

  return (
    <section className="autolife-glass rounded-2xl p-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {ui.title}
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {ui.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={ui.title}
            value={gridMix}
            onChange={(e) => setGridMix(e.target.value as GridMix)}
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
          >
            <option value="brazil">{ui.gridBrazil}</option>
            <option value="global">{ui.gridGlobal}</option>
          </select>

          <div className="inline-flex flex-wrap rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] p-1 w-fit shrink-0">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                scope === 'all'
                  ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {scopeUi.scopeAll} ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setScope('car')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                scope === 'car'
                  ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {scopeUi.scopeCars} ({carCount})
            </button>
            <button
              type="button"
              onClick={() => setScope('motorcycle')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                scope === 'motorcycle'
                  ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {scopeUi.scopeMotos} ({motoCount})
            </button>
            <button
              type="button"
              onClick={() => setScope('active')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                scope === 'active'
                  ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {scopeUi.scopeActive}
            </button>
          </div>
        </div>
      </div>

      {/* Carbon KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ui.kpiMonthlyCo2}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
            {kpis.monthlyActualKg.toFixed(1)} kg CO₂
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {formatDistance(kpis.monthlyDistanceKm, prefs.units)} {ui.kpiEstMonthDist}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-emerald-950/25">
          <div className="text-xs text-emerald-700 dark:text-emerald-300">
            {ui.kpiAvoidedCo2}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
            -{kpis.monthlyAvoidedKg.toFixed(1)} kg
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
            {kpis.sixMonthAvoidedKg.toFixed(0)} kg · {ui.kpiAvoided6m}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ui.kpiReduction}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-sky-600 dark:text-sky-400">
            -{kpis.reductionPct}%
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            ~{kpis.annualTreesEquivalent} {ui.kpiTreesYear}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {ui.kpiIntensity}
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
            {kpis.avgGramsPerKm} g/km
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {ui.kpiEvTarget}: &lt; 25 g/km
          </div>
        </div>
      </div>

      {/* Dual Recharts Carbon Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: 6-Month CO2 Trend + EV Reduction Stack vs Combustion Baseline */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {ui.chartEvolutionTitle}
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart
                data={monthlyData}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => `${v} kg`}
                />
                <Tooltip
                  cursor={{
                    fill:
                      prefs.theme === 'dark'
                        ? 'rgba(56,189,248,0.08)'
                        : 'rgba(241,245,249,0.8)',
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as MonthlyCarbonDatum;
                    return (
                      <div className="autolife-glass rounded-xl px-3 py-2 shadow-lg text-xs space-y-1 tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.label} · {formatDistance(row.distanceKm, prefs.units)}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                          <span>{ui.tooltipReal}:</span>
                          <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                            {row.actualCo2Kg.toFixed(1)} kg CO₂
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                          <span>{ui.tooltipAvoided}:</span>
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            -{row.avoidedCo2Kg.toFixed(1)} kg CO₂
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/10 pt-1">
                          <span>{ui.tooltipBaseline}:</span>
                          <span className="font-mono font-semibold">
                            {row.combustionBaselineKg.toFixed(1)} kg CO₂
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="actualCo2Kg"
                  name={ui.legendReal}
                  stackId="carbon"
                  fill="#2563eb"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="avoidedCo2Kg"
                  name={ui.legendAvoided}
                  stackId="carbon"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="combustionBaselineKg"
                  name={ui.legendBaseline}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Per-Vehicle Monthly Emissions vs EV Savings */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {ui.chartPerVehicleTitle}
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={vehicleCarbonData}
                margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => `${v} kg`}
                />
                <Tooltip
                  cursor={{
                    fill:
                      prefs.theme === 'dark'
                        ? 'rgba(56,189,248,0.08)'
                        : 'rgba(241,245,249,0.8)',
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const row = payload[0].payload as VehicleCarbonDatum;
                    return (
                      <div className="autolife-glass rounded-xl px-3 py-2 shadow-lg text-xs space-y-1 tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.name} ({row.powertrainLabel})
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {ui.tooltipMonthlyDist}: {formatDistance(row.monthlyKm, prefs.units)}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                          <span>{ui.tooltipReal}:</span>
                          <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                            {row.actualCo2Kg.toFixed(1)} kg
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                          <span>{ui.tooltipAvoided}:</span>
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            -{row.avoidedCo2Kg.toFixed(1)} kg
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="actualCo2Kg"
                  name={ui.legendActualVehicle}
                  fill="#0284c7"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="avoidedCo2Kg"
                  name={ui.legendSavingsVehicle}
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Electrification Impact Simulator Callout */}
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-700/50 bg-emerald-50/40 dark:bg-emerald-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-slate-700 dark:text-slate-200 leading-relaxed">
            {kpis.topCandidateInsight ? (
              <>
                <strong>{ui.simPrefix}:</strong>{' '}
                <strong>{kpis.topCandidateInsight.name}</strong> {ui.simMiddle}{' '}
                <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                  {kpis.topCandidateInsight.extraMonthlySavingsKg.toFixed(1)} kg CO₂
                </strong>{' '}
                {ui.simMiddle2} (
                {Math.round((kpis.topCandidateInsight.extraMonthlySavingsKg * 12) / 21.7)}{' '}
                {ui.simTrees}).
              </>
            ) : (
              <>
                <strong>{ui.simAllEvTitle}:</strong>{' '}
                <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                  -{kpis.reductionPct}%
                </strong>{' '}
                {ui.simAllEvSuffix}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
