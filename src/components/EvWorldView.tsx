import { useMemo, useRef, useState } from 'react';
import {
  BatteryCharging,
  Info,
  Plus,
  Route,
  Zap,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import { EV_HERO_IMAGE } from '../data/seedData';
import {
  ChargingSession,
  LanguageCode,
  PowertrainType,
  UserPreferences,
  Vehicle,
} from '../types/autolife';
import { formatCurrency, formatDistance, todayIso } from '../utils/autolife';
import { convertCurrency } from '../utils/billing';
import { buildChargingSessionWhatsAppText } from '../utils/whatsapp';
import { EvChargerLocatorSection } from './EvChargerLocatorSection';
import { ResilientImage } from './ResilientImage';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface EvWorldViewProps {
  vehicle: Vehicle | null;
  sessions: ChargingSession[];
  onAddSession: (session: ChargingSession) => void;
  prefs: UserPreferences;
  t: Translations;
  onOpenAddVehicle: () => void;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
}

interface EvCopy {
  socStartLabel: string;
  socEndLabel: string;
  stationPlaceholder: string;
  noSessions: string;
}

const EV_COPY: Record<LanguageCode, EvCopy> = {
  pt: {
    socStartLabel: 'Início %',
    socEndLabel: 'Fim %',
    stationPlaceholder: 'Estação / Wallbox',
    noSessions: 'Nenhuma recarga registrada para este veículo.',
  },
  en: {
    socStartLabel: 'Start %',
    socEndLabel: 'End %',
    stationPlaceholder: 'Station / Wallbox',
    noSessions: 'No charging sessions logged for this vehicle.',
  },
  es: {
    socStartLabel: 'Inicio %',
    socEndLabel: 'Fin %',
    stationPlaceholder: 'Estación / Wallbox',
    noSessions: 'No hay recargas registradas para este vehículo.',
  },
  de: {
    socStartLabel: 'Start %',
    socEndLabel: 'Ziel %',
    stationPlaceholder: 'Ladestation / Wallbox',
    noSessions: 'Keine Ladevorgänge für dieses Fahrzeug erfasst.',
  },
  fr: {
    socStartLabel: 'Début %',
    socEndLabel: 'Fin %',
    stationPlaceholder: 'Borne / Wallbox',
    noSessions: 'Aucune session de recharge enregistrée pour ce véhicule.',
  },
};

export function EvWorldView({
  vehicle,
  sessions,
  onAddSession,
  prefs,
  t,
  onOpenAddVehicle,
  onUpdatePrefs,
}: EvWorldViewProps) {
  const copy = EV_COPY[prefs.language] ?? EV_COPY.pt;
  const isEvOrHybrid =
    vehicle?.powertrain === PowertrainType.ELECTRIC ||
    vehicle?.powertrain === PowertrainType.HYBRID;

  // Trip planner state
  const [tripKm, setTripKm] = useState<number>(480);
  const [startSoc, setStartSoc] = useState<number>(85);
  const [chargerPowerKw, setChargerPowerKw] = useState<number>(150);

  // Charging session logger state
  const sessionFormRef = useRef<HTMLFormElement | null>(null);
  const [stationName, setStationName] = useState('');
  const [powerType, setPowerType] = useState<'DC' | 'AC'>('DC');
  const [energyKwh, setEnergyKwh] = useState('35');
  const [cost, setCost] = useState('72');
  const [socStart, setSocStart] = useState('20');
  const [socEnd, setSocEnd] = useState('80');

  const handleSelectStationForLog = (selectedName: string) => {
    setStationName(selectedName);
    sessionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const isMoto = vehicle?.vehicleType === 'motorcycle';
  const batteryKwh = vehicle?.batteryCapacityKwh ?? (isMoto ? 5.2 : 69);
  const consumptionPer100 =
    vehicle?.powertrain === PowertrainType.ELECTRIC
      ? vehicle.consumptionKwhPer100Km ?? (isMoto ? 4.2 : 16.8)
      : isMoto
      ? 4.5
      : 17.5;
  const maxRangeKm = Math.round((batteryKwh / consumptionPer100) * 100);

  const tripPlan = useMemo(() => {
    const startEnergyKwh = (startSoc / 100) * batteryKwh;
    const totalEnergyNeededKwh = (tripKm / 100) * consumptionPer100;
    const safetyReserveKwh = batteryKwh * 0.15; // Always keep 15% buffer
    const netDeficitKwh = Math.max(0, totalEnergyNeededKwh + safetyReserveKwh - startEnergyKwh);

    const usableStopKwh = batteryKwh * 0.65; // 15% -> 80% fast charge window
    const stopsNeeded = netDeficitKwh <= 0 ? 0 : Math.ceil(netDeficitKwh / usableStopKwh);

    const effectivePowerKw = chargerPowerKw * 0.78; // Real charging curve factor
    const chargeMinutes =
      netDeficitKwh <= 0 ? 0 : Math.round((netDeficitKwh / effectivePowerKw) * 60);

    const energyAtArrival =
      startEnergyKwh + stopsNeeded * usableStopKwh - totalEnergyNeededKwh;
    const arrivalSoc = Math.max(
      12,
      Math.min(95, Math.round((energyAtArrival / batteryKwh) * 100))
    );

    return {
      totalEnergyNeededKwh: totalEnergyNeededKwh.toFixed(1),
      stopsNeeded,
      chargeMinutes,
      arrivalSoc,
    };
  }, [tripKm, startSoc, chargerPowerKw, batteryKwh, consumptionPer100]);

  const vehicleSessions = useMemo(() => {
    if (!vehicle) return [];
    return sessions.filter((s) => s.vehicleId === vehicle.id);
  }, [sessions, vehicle]);

  if (!vehicle) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t.ev.title}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.ev.subtitle}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-4">
          <Zap className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              Nenhum veículo cadastrado
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Cadastre seu veículo elétrico, híbrido ou a combustão para planejar rotas e registrar recargas.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddVehicle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>{t.actions.addVehicle}</span>
          </button>
        </div>
      </div>
    );
  }

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    const kwh = Number(energyKwh);
    const val = Number(cost);
    const parsedStart = Math.min(100, Math.max(0, Number(socStart) || 20));
    const parsedEnd = Math.min(100, Math.max(parsedStart, Number(socEnd) || 80));
    if (!stationName.trim() || !Number.isFinite(kwh) || kwh <= 0) return;
    onAddSession({
      id: `chg-${Date.now()}`,
      vehicleId: vehicle.id,
      date: todayIso(),
      stationName: stationName.trim(),
      powerType,
      energyKwh: kwh,
      cost: Number.isFinite(val) ? val : 0,
      currency: prefs.currency,
      socStart: parsedStart,
      socEnd: parsedEnd,
    });
    setStationName('');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t.ev.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {t.ev.subtitle}
        </p>
      </div>

      {/* Technical Transparency Note */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>{t.ev.technicalNote}</p>
          {!isEvOrHybrid && (
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              {t.ev.nonEvNotice}
            </p>
          )}
        </div>
      </div>

      {/* Hero EV Card + 3 Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 min-h-[240px]">
          <ResilientImage
            src={EV_HERO_IMAGE}
            alt={t.ev.title}
            fallbackTitle={t.ev.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent flex flex-col justify-end p-6">
            <div className="text-xs font-medium text-slate-200">
              {t.vehicleTypes[vehicle.vehicleType ?? 'car']} · {vehicle.make} {vehicle.model} ·{' '}
              {t.powertrain[vehicle.powertrain]}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-white tabular-nums">
              {formatDistance(vehicle.estimatedRangeKm ?? maxRangeKm, prefs.units)}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 grid grid-cols-1 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.ev.batterySoh}
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {vehicle.batterySohPercent ?? 98}%
              </div>
            </div>
            <BatteryCharging className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.ev.estimatedRange}
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {formatDistance(vehicle.estimatedRangeKm ?? maxRangeKm, prefs.units)}
              </div>
            </div>
            <Route className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.ev.efficiency}
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {consumptionPer100} kWh/100km
              </div>
            </div>
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Interactive Trip Planner + Charging Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
              {t.ev.plannerTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="trip-km-input"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                {t.ev.tripDistance} (km)
              </label>
              <input
                id="trip-km-input"
                type="number"
                min={20}
                max={2000}
                value={tripKm}
                onChange={(e) => setTripKm(Math.max(10, Number(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="start-soc-input"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                {t.ev.startSoc}
              </label>
              <input
                id="start-soc-input"
                type="number"
                min={10}
                max={100}
                value={startSoc}
                onChange={(e) =>
                  setStartSoc(Math.min(100, Math.max(5, Number(e.target.value) || 0)))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="charger-kw-select"
                className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
              >
                {t.ev.chargerSpeed}
              </label>
              <select
                id="charger-kw-select"
                value={chargerPowerKw}
                onChange={(e) => setChargerPowerKw(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value={50}>50 kW DC</option>
                <option value={150}>150 kW DC</option>
                <option value={350}>350 kW DC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 tabular-nums">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t.ev.stopsNeeded}
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
                {tripPlan.stopsNeeded}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t.ev.estimatedChargeTime}
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
                {tripPlan.chargeMinutes} min
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {t.ev.arrivalSoc}
              </div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {tripPlan.arrivalSoc}%
              </div>
            </div>
          </div>
        </section>

        {/* Charging Sessions Log */}
        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t.ev.sessionsTitle}
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {formatCurrency(
                vehicleSessions.reduce(
                  (acc, s) => acc + convertCurrency(s.cost, s.currency ?? 'BRL', prefs.currency),
                  0
                ),
                prefs.currency
              )}
            </span>
          </div>

          <form ref={sessionFormRef} onSubmit={handleAddCharge} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder={copy.stationPlaceholder}
              className="sm:col-span-5 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <select
              value={powerType}
              onChange={(e) => setPowerType(e.target.value as 'AC' | 'DC')}
              className="sm:col-span-2 px-2 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="DC">DC</option>
              <option value="AC">AC</option>
            </select>
            <input
              type="number"
              step="0.1"
              value={energyKwh}
              onChange={(e) => setEnergyKwh(e.target.value)}
              placeholder="kWh"
              className="sm:col-span-2 px-2 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              step="0.1"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder={prefs.currency}
              className="sm:col-span-3 px-2 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <div className="sm:col-span-6 flex items-center gap-2">
              <label className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                {copy.socStartLabel}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={socStart}
                onChange={(e) => setSocStart(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-6 flex items-center gap-2">
              <label className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                {copy.socEndLabel}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={socEnd}
                onChange={(e) => setSocEnd(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="sm:col-span-12 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.actions.logCharge}</span>
            </button>
          </form>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
            {vehicleSessions.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                {copy.noSessions}
              </p>
            ) : (
              vehicleSessions.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {s.stationName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {s.date} · {s.powerType} · {s.socStart}% → {s.socEnd}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {s.energyKwh.toFixed(1)} kWh
                      </div>
                      <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatCurrency(
                          convertCurrency(s.cost, s.currency ?? 'BRL', prefs.currency),
                          prefs.currency
                        )}
                      </div>
                    </div>
                    <WhatsAppConnectButton
                      whatsappNumber={prefs.whatsappNumber}
                      language={prefs.language}
                      compact
                      label=""
                      title="Enviar recarga para WhatsApp cadastrado"
                      message={buildChargingSessionWhatsAppText({
                        vehicle,
                        session: s,
                        currency: prefs.currency,
                      })}
                      onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Real-time EV Charger Locator via Google Maps */}
      <EvChargerLocatorSection
        vehicle={vehicle}
        prefs={prefs}
        onSelectStationForLog={handleSelectStationForLog}
      />
    </div>
  );
}
