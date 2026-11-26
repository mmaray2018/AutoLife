import { useState } from 'react';
import { Bike, Car, X } from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  CurrencyCode,
  MaintenanceItem,
  PowertrainType,
  Vehicle,
  VehicleType,
} from '../types/autolife';

interface LogCheckModalProps {
  vehicle: Vehicle;
  items: MaintenanceItem[];
  initialItem: MaintenanceItem | null;
  currency: CurrencyCode;
  t: Translations;
  onClose: () => void;
  onSave: (payload: {
    itemId: string;
    odometerKm: number;
    cost: number;
    workshopName: string;
    notes: string;
  }) => void;
}

export function LogCheckModal({
  vehicle,
  items,
  initialItem,
  currency,
  t,
  onClose,
  onSave,
}: LogCheckModalProps) {
  const vehicleItems = items.filter((i) => i.vehicleId === vehicle.id);
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItem?.id ?? vehicleItems[0]?.id ?? ''
  );
  const [odometerKm, setOdometerKm] = useState<string>(String(vehicle.odometerKm));
  const [cost, setCost] = useState<string>('0');
  const [workshopName, setWorkshopName] = useState<string>('Verificação Própria');
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    onSave({
      itemId: selectedItemId,
      odometerKm: Math.max(vehicle.odometerKm, Number(odometerKm) || vehicle.odometerKm),
      cost: Math.max(0, Number(cost) || 0),
      workshopName: workshopName.trim() || 'AutoLife',
      notes: notes.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {t.health.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {vehicle.make} {vehicle.model}
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              {vehicleItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {t.items[it.titleKey]?.title ?? it.titleKey}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t.health.odometerLabel} (km)
              </label>
              <input
                type="number"
                min={0}
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t.health.costLabel} ({currency})
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.health.workshopLabel}
            </label>
            <input
              type="text"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {t.health.notesLabel}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t.actions.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddVehicleModalProps {
  t: Translations;
  onClose: () => void;
  onAdd: (vehicle: Vehicle) => void;
}

export function AddVehicleModal({ t, onClose, onAdd }: AddVehicleModalProps) {
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2025');
  const [plate, setPlate] = useState('');
  const [powertrain, setPowertrain] = useState<PowertrainType>(PowertrainType.GASOLINE);
  const [cc, setCc] = useState('');
  const [frontPsi, setFrontPsi] = useState('34');
  const [rearPsi, setRearPsi] = useState('34');
  const [odometerKm, setOdometerKm] = useState('0');
  const [weeklyKm, setWeeklyKm] = useState('250');
  const [documentExpiryDate, setDocumentExpiryDate] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [fleetGroup, setFleetGroup] = useState<'personal' | 'fleet'>('personal');

  const handleSwitchVehicleType = (nextType: VehicleType) => {
    setVehicleType(nextType);
    if (nextType === 'motorcycle') {
      if (powertrain === PowertrainType.DIESEL || powertrain === PowertrainType.HYBRID) {
        setPowertrain(PowertrainType.GASOLINE);
      }
      setFrontPsi('29');
      setRearPsi('36');
      setCc(cc || '250');
    } else {
      setFrontPsi('34');
      setRearPsi('34');
      setCc('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!make.trim() || !model.trim()) return;

    const isElectric = powertrain === PowertrainType.ELECTRIC;
    const isMoto = vehicleType === 'motorcycle';
    const parsedCc = Number(cc);
    const parsedWeekly = Math.max(20, Number(weeklyKm) || 250);

    onAdd({
      id: `veh-${Date.now()}`,
      vehicleType,
      make: make.trim(),
      model: model.trim(),
      year: Number(year) || 2025,
      plate: plate.trim().toUpperCase() || '—',
      powertrain,
      engineDisplacementCc: !isElectric && parsedCc > 0 ? Math.round(parsedCc) : undefined,
      odometerKm: Math.max(0, Number(odometerKm) || 0),
      fleetGroup,
      drivingProfile: parsedWeekly >= 500 ? 'urban_severe' : 'mixed',
      weeklyKm: parsedWeekly,
      batteryCapacityKwh: isElectric ? (isMoto ? 5.2 : 64) : undefined,
      consumptionKwhPer100Km: isElectric ? (isMoto ? 4.2 : 16.5) : undefined,
      estimatedRangeKm: isElectric ? (isMoto ? 130 : 390) : undefined,
      batterySohPercent: isElectric ? 99 : undefined,
      tirePressurePsi: Math.max(15, Number(frontPsi) || (isMoto ? 29 : 34)),
      rearTirePressurePsi: Math.max(15, Number(rearPsi) || (isMoto ? 34 : 34)),
      documentExpiryDate: documentExpiryDate.trim(),
      insuranceExpiryDate: insuranceExpiryDate.trim(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-5 my-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {t.actions.addVehicle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle Type Selector (Car vs Motorcycle) */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => handleSwitchVehicleType('car')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
              vehicleType === 'car'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>{t.vehicleTypes.car}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchVehicleType('motorcycle')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-colors ${
              vehicleType === 'motorcycle'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>{t.vehicleTypes.motorcycle}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Marca
              </label>
              <input
                type="text"
                required
                placeholder="Marca do fabricante"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Modelo
              </label>
              <input
                type="text"
                required
                placeholder="Modelo e versão"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Ano
              </label>
              <input
                type="number"
                min={1980}
                max={2027}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Placa
              </label>
              <input
                type="text"
                placeholder="Placa do veículo"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono uppercase rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Cilindrada (cc)
              </label>
              <input
                type="number"
                min={0}
                max={7000}
                disabled={powertrain === PowertrainType.ELECTRIC}
                placeholder={vehicleType === 'motorcycle' ? '160 / 500' : '1000 / 2000'}
                value={powertrain === PowertrainType.ELECTRIC ? '' : cc}
                onChange={(e) => setCc(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Motorização
              </label>
              <select
                value={powertrain}
                onChange={(e) => setPowertrain(e.target.value as PowertrainType)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value={PowertrainType.GASOLINE}>
                  {t.powertrain[PowertrainType.GASOLINE]}
                </option>
                {vehicleType === 'car' && (
                  <>
                    <option value={PowertrainType.DIESEL}>
                      {t.powertrain[PowertrainType.DIESEL]}
                    </option>
                    <option value={PowertrainType.HYBRID}>
                      {t.powertrain[PowertrainType.HYBRID]}
                    </option>
                  </>
                )}
                <option value={PowertrainType.ELECTRIC}>
                  {t.powertrain[PowertrainType.ELECTRIC]}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t.health.odometerLabel} (km)
              </label>
              <input
                type="number"
                min={0}
                value={odometerKm}
                onChange={(e) => setOdometerKm(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                PSI Dianteiro
              </label>
              <input
                type="number"
                min={15}
                max={65}
                value={frontPsi}
                onChange={(e) => setFrontPsi(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                PSI Traseiro
              </label>
              <input
                type="number"
                min={15}
                max={65}
                value={rearPsi}
                onChange={(e) => setRearPsi(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Uso (km/sem)
              </label>
              <input
                type="number"
                min={20}
                max={3000}
                value={weeklyKm}
                onChange={(e) => setWeeklyKm(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t.garage.docLicense} (opcional)
              </label>
              <input
                type="date"
                value={documentExpiryDate}
                onChange={(e) => setDocumentExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {t.garage.docInsurance} (opcional)
              </label>
              <input
                type="date"
                value={insuranceExpiryDate}
                onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Perfil de Uso (Particular ou Empresa)
            </label>
            <select
              value={fleetGroup}
              onChange={(e) => setFleetGroup(e.target.value as 'personal' | 'fleet')}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="personal">{t.garage.modePersonal}</option>
              <option value="fleet">{t.garage.modeFleet}</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t.actions.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
