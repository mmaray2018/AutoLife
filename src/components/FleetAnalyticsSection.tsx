import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Area,
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
import {
  ChargingSession,
  ServiceLog,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { formatCurrency } from '../utils/autolife';
import { CURRENCY_CATALOG, convertCurrency } from '../utils/billing';

interface FleetAnalyticsSectionProps {
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  prefs: UserPreferences;
}

interface VehicleCostDatum {
  id: string;
  name: string;
  maintenanceCost: number;
  chargingCost: number;
  totalCost: number;
}

interface TrendDatum {
  date: string;
  label: string;
  maintenanceCost: number;
  chargingCost: number;
  energyKwh: number;
}

export function FleetAnalyticsSection({
  vehicles,
  activeVehicle,
  logs,
  chargingSessions,
  prefs,
}: FleetAnalyticsSectionProps) {
  const [trendScope, setTrendScope] = useState<'all' | 'car' | 'motorcycle' | 'active'>('all');
  const currencyMeta = CURRENCY_CATALOG[prefs.currency] ?? CURRENCY_CATALOG.BRL;

  const roundCurrency = (val: number) => {
    const factor = Math.pow(10, currencyMeta.decimals);
    return Math.round(val * factor) / factor;
  };

  const scopedVehicles = useMemo(() => {
    if (trendScope === 'car') return vehicles.filter((v) => (v.vehicleType ?? 'car') === 'car');
    if (trendScope === 'motorcycle') return vehicles.filter((v) => v.vehicleType === 'motorcycle');
    if (trendScope === 'active') return activeVehicle ? [activeVehicle] : [];
    return vehicles;
  }, [vehicles, trendScope, activeVehicle]);

  const scopedVehicleIds = useMemo(
    () => new Set(scopedVehicles.map((v) => v.id)),
    [scopedVehicles]
  );

  // Dataset 1: Total Maintenance vs Charging Costs across scoped vehicles
  const vehicleBreakdownData = useMemo<VehicleCostDatum[]>(() => {
    return scopedVehicles.map((v) => {
      const mCost = logs
        .filter((l) => l.vehicleId === v.id)
        .reduce(
          (acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency),
          0
        );
      const cCost = chargingSessions
        .filter((c) => c.vehicleId === v.id)
        .reduce(
          (acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency),
          0
        );

      const maintenanceCost = roundCurrency(mCost);
      const chargingCost = roundCurrency(cCost);
      return {
        id: v.id,
        name: `${v.make} ${v.model}`,
        maintenanceCost,
        chargingCost,
        totalCost: roundCurrency(maintenanceCost + chargingCost),
      };
    });
  }, [scopedVehicles, logs, chargingSessions, prefs.currency]);

  // Dataset 2: Chronological Maintenance + EV Charging Cost & kWh Trend
  const trendData = useMemo<TrendDatum[]>(() => {
    const scopedLogs = logs.filter((l) => scopedVehicleIds.has(l.vehicleId));
    const scopedCharges = chargingSessions.filter((c) => scopedVehicleIds.has(c.vehicleId));

    const map = new Map<
      string,
      { maintenanceCost: number; chargingCost: number; energyKwh: number }
    >();

    for (const log of scopedLogs) {
      const prev = map.get(log.date) ?? {
        maintenanceCost: 0,
        chargingCost: 0,
        energyKwh: 0,
      };
      prev.maintenanceCost += convertCurrency(
        log.cost,
        log.currency ?? 'BRL',
        prefs.currency
      );
      map.set(log.date, prev);
    }

    for (const session of scopedCharges) {
      const prev = map.get(session.date) ?? {
        maintenanceCost: 0,
        chargingCost: 0,
        energyKwh: 0,
      };
      prev.chargingCost += convertCurrency(
        session.cost,
        session.currency ?? 'BRL',
        prefs.currency
      );
      prev.energyKwh += session.energyKwh;
      map.set(session.date, prev);
    }

    return Array.from(map.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, vals]) => {
        const [, month, day] = date.split('-');
        return {
          date,
          label: day && month ? `${day}/${month}` : date,
          maintenanceCost: roundCurrency(vals.maintenanceCost),
          chargingCost: roundCurrency(vals.chargingCost),
          energyKwh: Math.round(vals.energyKwh * 10) / 10,
        };
      });
  }, [logs, chargingSessions, scopedVehicleIds, prefs.currency]);

  const fleetSummary = useMemo(() => {
    const totalMaintenance = vehicleBreakdownData.reduce(
      (acc, item) => acc + item.maintenanceCost,
      0
    );
    const totalCharging = vehicleBreakdownData.reduce(
      (acc, item) => acc + item.chargingCost,
      0
    );
    const totalEnergyKwh = chargingSessions
      .filter((s) => scopedVehicleIds.has(s.vehicleId))
      .reduce((acc, s) => acc + s.energyKwh, 0);
    return {
      totalMaintenance,
      totalCharging,
      totalCombined: totalMaintenance + totalCharging,
      totalEnergyKwh: Math.round(totalEnergyKwh * 10) / 10,
    };
  }, [vehicleBreakdownData, chargingSessions, scopedVehicleIds]);

  const axisTickColor = prefs.theme === 'dark' ? '#94a3b8' : '#64748b';
  const gridColor = prefs.theme === 'dark' ? 'rgba(148,163,184,0.14)' : '#e2e8f0';

  const carCount = vehicles.filter((v) => (v.vehicleType ?? 'car') === 'car').length;
  const motoCount = vehicles.filter((v) => v.vehicleType === 'motorcycle').length;

  return (
    <section className="autolife-glass rounded-2xl p-6 space-y-6">
      {/* Header + Scope Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Fleet Analytics · Custos &amp; Recargas
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comparativo de carros e motos: manutenção preventiva, recargas e TCO em {prefs.currency}
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] p-1 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setTrendScope('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              trendScope === 'all'
                ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Todos ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => setTrendScope('car')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              trendScope === 'car'
                ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Carros ({carCount})
          </button>
          <button
            type="button"
            onClick={() => setTrendScope('motorcycle')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              trendScope === 'motorcycle'
                ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Motos ({motoCount})
          </button>
          <button
            type="button"
            onClick={() => setTrendScope('active')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              trendScope === 'active'
                ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Ativo
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total em Manutenção (Frota)
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(fleetSummary.totalMaintenance, prefs.currency)}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total em Recargas EV
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(fleetSummary.totalCharging, prefs.currency)}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/60">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Energia Acumulada
          </div>
          <div className="mt-1 font-mono text-lg font-bold text-sky-600 dark:text-sky-400">
            {fleetSummary.totalEnergyKwh.toFixed(1)} kWh
          </div>
        </div>
      </div>

      {/* Dual Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Multi-Vehicle Total Maintenance vs EV Charging Breakdown */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Custo Total por Veículo ({prefs.currency})
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={vehicleBreakdownData}
                margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
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
                  width={68}
                  tickFormatter={(v) => formatCurrency(Number(v), prefs.currency)}
                />
                <Tooltip
                  cursor={{ fill: prefs.theme === 'dark' ? 'rgba(56,189,248,0.08)' : 'rgba(241,245,249,0.8)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    return (
                      <div className="autolife-glass rounded-xl px-3 py-2 shadow-lg text-xs space-y-1 tabular-nums">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {label}
                        </div>
                        {payload.map((entry) => (
                          <div
                            key={String(entry.dataKey)}
                            className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300"
                          >
                            <span>{entry.name}:</span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(Number(entry.value ?? 0), prefs.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="maintenanceCost"
                  name="Manutenção"
                  stackId="cost"
                  fill="#0284c7"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="chargingCost"
                  name="Recarga EV"
                  stackId="cost"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Chronological Maintenance Spend & Charging Energy Trend */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tendência Cronológica: Custos ({prefs.currency}) &amp; Energia (kWh)
          </div>
          {trendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-white/15 text-xs text-slate-500 dark:text-slate-400">
              Sem registros de manutenção ou recarga para este filtro.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={trendData}
                  margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="cost"
                    tick={{ fill: axisTickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={68}
                    tickFormatter={(v) => formatCurrency(Number(v), prefs.currency)}
                  />
                  <YAxis
                    yAxisId="kwh"
                    orientation="right"
                    tick={{ fill: '#10b981', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={46}
                    tickFormatter={(v) => `${v}kWh`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      const row = payload[0].payload as TrendDatum;
                      return (
                        <div className="autolife-glass rounded-xl px-3 py-2 shadow-lg text-xs space-y-1 tabular-nums">
                          <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                            {row.date}
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                            <span>Manutenção:</span>
                            <span className="font-mono font-semibold text-sky-600 dark:text-sky-400">
                              {formatCurrency(row.maintenanceCost, prefs.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                            <span>Recarga EV:</span>
                            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.chargingCost, prefs.currency)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                            <span>Energia:</span>
                            <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                              {row.energyKwh} kWh
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    yAxisId="cost"
                    type="monotone"
                    dataKey="maintenanceCost"
                    name="Manutenção"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.14}
                    strokeWidth={2}
                  />
                  <Bar
                    yAxisId="cost"
                    dataKey="chargingCost"
                    name="Custo Recarga"
                    fill="#0ea5e9"
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    yAxisId="kwh"
                    type="monotone"
                    dataKey="energyKwh"
                    name="Energia (kWh)"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10b981' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
