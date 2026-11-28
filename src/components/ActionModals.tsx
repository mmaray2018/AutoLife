import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Bike,
  Camera,
  Car,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  CurrencyCode,
  MaintenanceItem,
  ParsedVehicleDocument,
  PowertrainType,
  UserPreferences,
  UserSubscriptionRecord,
  Vehicle,
  VehicleType,
} from '../types/autolife';
import { isBusinessPlan } from '../utils/billing';
import {
  VEHICLE_COLOR_SWATCHES,
  resolveVehicleColorStyle,
} from '../utils/vehicleVisualResolver';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="autolife-glass rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {t.health.modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
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
  prefs: UserPreferences;
  vehiclesCount: number;
  vehicleLimit: number | null;
  subscriptionStatus?: UserSubscriptionRecord['status'];
  initialVehicle?: Vehicle | null;
  cloudUserId?: string | null;
  onOpenPlans?: () => void;
  onClose: () => void;
  onAdd: (vehicle: Vehicle, documentFile?: File) => void;
}

function readFileAsBase64(file: File): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      const base64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
      if (!base64) {
        reject(new Error('Arquivo vazio ou ilegível.'));
        return;
      }
      const fallbackMime =
        file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
      resolve({
        mimeType: file.type || fallbackMime,
        data: base64,
      });
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

async function prepareDocumentPayload(file: File): Promise<{ mimeType: string; data: string }> {
  const mime = (file.type || '').toLowerCase();
  const isPdf = mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    if (file.size > 9.5 * 1024 * 1024) {
      throw new Error('O PDF excede o limite de 9,5 MB.');
    }
    return readFileAsBase64(file);
  }

  // Keep image OCR sharp (max 1800px) while preventing multi-MB camera uploads from stalling
  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode_failed'));
      el.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);

    const maxDim = 1800;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round((img.naturalWidth || 1280) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || 720) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      const base64 = dataUrl.split(',')[1] || '';
      if (base64) {
        return { mimeType: 'image/jpeg', data: base64 };
      }
    }
  } catch {
    // Fallback to raw file base64 (e.g. HEIC)
  }

  if (file.size > 9.5 * 1024 * 1024) {
    throw new Error('A imagem excede o limite de 9,5 MB.');
  }
  return readFileAsBase64(file);
}

function mapFuelTypeToPowertrain(fuelRaw: string, currentType: VehicleType): PowertrainType {
  const s = fuelRaw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!s) return PowertrainType.GASOLINE;
  if (/\b(eletric|electric|bev|zero emiss|ev)\b/.test(s)) return PowertrainType.ELECTRIC;
  if (/\b(hibrid|hybrid|phev|hev|mhev)\b/.test(s)) {
    return currentType === 'motorcycle' ? PowertrainType.GASOLINE : PowertrainType.HYBRID;
  }
  if (/\b(diesel|gasoleo|gasoil)\b/.test(s)) {
    return currentType === 'motorcycle' ? PowertrainType.GASOLINE : PowertrainType.DIESEL;
  }
  return PowertrainType.GASOLINE;
}

function parseDisplacementToCc(raw: string): string {
  const clean = raw.trim().toLowerCase().replace(',', '.');
  if (!clean || clean === 'ev') return '';
  const match = clean.match(/(\d+(?:\.\d+)?)/);
  if (!match) return '';
  const val = Number.parseFloat(match[1]);
  if (!Number.isFinite(val) || val <= 0) return '';
  // Convert liter notation like "1.0", "1.6", "2.0" into cc when explicitly small decimal
  if (val < 12 && (clean.includes('.') || /\bl\b|litro|liter/.test(clean))) {
    return String(Math.round(val * 1000));
  }
  return String(Math.round(val));
}

export function AddVehicleModal({
  t,
  prefs,
  vehiclesCount,
  vehicleLimit,
  subscriptionStatus,
  initialVehicle = null,
  cloudUserId = null,
  onOpenPlans,
  onClose,
  onAdd,
}: AddVehicleModalProps) {
  const isEditing = Boolean(initialVehicle);
  const hasBusinessAccess = isBusinessPlan(prefs.activePlan);
  const isExpiredLocked = !isEditing && subscriptionStatus === 'expired' && vehiclesCount >= 1;
  const isLimitReached =
    !isEditing &&
    (isExpiredLocked || (vehicleLimit !== null && vehiclesCount >= vehicleLimit));

  const [vehicleType, setVehicleType] = useState<VehicleType>(
    initialVehicle?.vehicleType ?? 'car'
  );
  const [make, setMake] = useState(initialVehicle?.make ?? '');
  const [model, setModel] = useState(initialVehicle?.model ?? '');
  const [year, setYear] = useState(String(initialVehicle?.year ?? 2025));
  const [plate, setPlate] = useState(
    initialVehicle?.plate && initialVehicle.plate !== '—' ? initialVehicle.plate : ''
  );
  const [color, setColor] = useState(initialVehicle?.color ?? '');
  const [vinOrRenavam, setVinOrRenavam] = useState(initialVehicle?.vinOrRenavam ?? '');
  const [powertrain, setPowertrain] = useState<PowertrainType>(
    initialVehicle?.powertrain ?? PowertrainType.GASOLINE
  );
  const [cc, setCc] = useState(
    initialVehicle?.engineDisplacementCc ? String(initialVehicle.engineDisplacementCc) : ''
  );
  const [frontPsi, setFrontPsi] = useState(
    String(initialVehicle?.tirePressurePsi ?? (initialVehicle?.vehicleType === 'motorcycle' ? 29 : 34))
  );
  const [rearPsi, setRearPsi] = useState(
    String(initialVehicle?.rearTirePressurePsi ?? (initialVehicle?.vehicleType === 'motorcycle' ? 36 : 34))
  );
  const [odometerKm, setOdometerKm] = useState(String(initialVehicle?.odometerKm ?? 0));
  const [weeklyKm, setWeeklyKm] = useState(String(initialVehicle?.weeklyKm ?? 250));
  const [documentExpiryDate, setDocumentExpiryDate] = useState(
    initialVehicle?.documentExpiryDate ?? ''
  );
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState(
    initialVehicle?.insuranceExpiryDate ?? ''
  );
  const [fleetGroup, setFleetGroup] = useState<'personal' | 'fleet'>(
    initialVehicle?.fleetGroup ?? (hasBusinessAccess ? 'fleet' : 'personal')
  );

  // Optional Worldwide Document OCR State
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [docParsing, setDocParsing] = useState(false);
  const [docBanner, setDocBanner] = useState<{
    kind: 'success' | 'warning';
    text: string;
  } | null>(null);
  const [capturedDocFile, setCapturedDocFile] = useState<File | null>(null);
  const [saveDocToVault, setSaveDocToVault] = useState(true);

  const resolvedColorStyle = resolveVehicleColorStyle(color);

  const handleSwitchVehicleType = (nextType: VehicleType) => {
    setVehicleType(nextType);
    if (nextType === 'motorcycle') {
      if (powertrain === PowertrainType.DIESEL || powertrain === PowertrainType.HYBRID) {
        setPowertrain(PowertrainType.GASOLINE);
      }
      setFrontPsi('29');
      setRearPsi('36');
      setCc((prev) => prev || '250');
    } else {
      setFrontPsi('34');
      setRearPsi('34');
    }
  };

  const handleDocumentSelected = async (file: File | undefined) => {
    if (!file) return;
    setDocParsing(true);
    setDocBanner(null);
    setCapturedDocFile(file);

    try {
      const payload = await prepareDocumentPayload(file);
      const res = await fetch('/api/vehicles/parse-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: payload.data,
          mimeType: payload.mimeType,
          language: prefs.language,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Partial<ParsedVehicleDocument> & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          data.error ||
            'Não foi possível ler o documento automaticamente. Você pode preencher manualmente.'
        );
      }

      const nextType: VehicleType =
        data.vehicleCategory === 'motorcycle' ? 'motorcycle' : 'car';
      setVehicleType(nextType);
      if (nextType === 'motorcycle') {
        setFrontPsi('29');
        setRearPsi('36');
      } else {
        setFrontPsi('34');
        setRearPsi('34');
      }

      if (data.brand) setMake(data.brand);
      if (data.model) setModel(data.model);
      if (data.year && data.year >= 1900 && data.year <= 2030) {
        setYear(String(data.year));
      }
      if (data.color) setColor(data.color);
      if (data.licensePlate) setPlate(data.licensePlate);
      if (data.fuelType) {
        setPowertrain(mapFuelTypeToPowertrain(data.fuelType, nextType));
      }
      if (data.engineDisplacement) {
        const parsedCc = parseDisplacementToCc(data.engineDisplacement);
        if (parsedCc) setCc(parsedCc);
      }
      if (data.licensingDueDate) setDocumentExpiryDate(data.licensingDueDate);
      if (data.vinOrRenavam) setVinOrRenavam(data.vinOrRenavam);

      setDocBanner({
        kind: 'success',
        text: 'Dados extraídos do documento — confira antes de salvar',
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Leitura automática indisponível no momento. Preencha manualmente abaixo.';
      setDocBanner({
        kind: 'warning',
        text: `${msg} O cadastro manual continua funcionando normalmente.`,
      });
    } finally {
      setDocParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!make.trim() || !model.trim()) return;

    const isElectric = powertrain === PowertrainType.ELECTRIC;
    const isMoto = vehicleType === 'motorcycle';
    const parsedCc = Number(cc);
    const parsedWeekly = Math.max(20, Number(weeklyKm) || 250);

    const vehiclePayload: Vehicle = {
      ...(initialVehicle ?? {}),
      id: initialVehicle?.id ?? `veh-${Date.now()}`,
      vehicleType,
      make: make.trim(),
      model: model.trim(),
      year: Number(year) || 2025,
      plate: plate.trim().toUpperCase() || '—',
      color: color.trim() || undefined,
      vinOrRenavam: vinOrRenavam.trim().toUpperCase() || undefined,
      powertrain,
      engineDisplacementCc: !isElectric && parsedCc > 0 ? Math.round(parsedCc) : undefined,
      odometerKm: Math.max(0, Number(odometerKm) || 0),
      fleetGroup,
      drivingProfile:
        initialVehicle?.drivingProfile ?? (parsedWeekly >= 500 ? 'urban_severe' : 'mixed'),
      weeklyKm: parsedWeekly,
      batteryCapacityKwh: isElectric
        ? initialVehicle?.batteryCapacityKwh ?? (isMoto ? 5.2 : 64)
        : undefined,
      consumptionKwhPer100Km: isElectric
        ? initialVehicle?.consumptionKwhPer100Km ?? (isMoto ? 4.2 : 16.5)
        : undefined,
      estimatedRangeKm: isElectric
        ? initialVehicle?.estimatedRangeKm ?? (isMoto ? 130 : 390)
        : undefined,
      batterySohPercent: isElectric ? initialVehicle?.batterySohPercent ?? 99 : undefined,
      tirePressurePsi: Math.max(15, Number(frontPsi) || (isMoto ? 29 : 34)),
      rearTirePressurePsi: Math.max(15, Number(rearPsi) || (isMoto ? 36 : 34)),
      documentExpiryDate: documentExpiryDate.trim(),
      insuranceExpiryDate: insuranceExpiryDate.trim(),
    };

    const fileToAttach =
      capturedDocFile && saveDocToVault && cloudUserId ? capturedDocFile : undefined;
    onAdd(vehiclePayload, fileToAttach);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="autolife-glass rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            {isEditing ? 'Editar Veículo' : t.actions.addVehicle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLimitReached ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  {isExpiredLocked
                    ? 'Assinatura expirada para novos cadastros'
                    : `Limite de ${vehicleLimit} veículo(s) atingido`}
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {isExpiredLocked
                  ? 'Seus veículos e históricos continuam preservados e acessíveis. Renove ou contrate um plano para liberar novos cadastros.'
                  : hasBusinessAccess
                  ? `Sua empresa já utiliza ${vehiclesCount} de ${vehicleLimit} veículos contratados. Contrate uma faixa maior (25, 50 ou 100 veículos) para expandir sua frota.`
                  : 'O Plano Particular contempla 1 veículo. Para cadastrar mais veículos ou gerenciar frota empresarial, escolha um Plano Frotas.'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300"
              >
                {t.actions.close}
              </button>
              {onOpenPlans && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPlans();
                  }}
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {hasBusinessAccess ? 'Expandir Frota' : 'Ver Planos de Frota'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Optional Worldwide Document OCR Block */}
            <div className="rounded-xl border border-sky-400/40 dark:border-sky-400/35 bg-sky-50/70 dark:bg-[#081529]/90 p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Preencher com foto do documento (Opcional)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    CRLV, Title, DUA, Carte Grise ou documento veicular de qualquer país (JPG, PNG, WEBP ou PDF).
                  </p>
                </div>
              </div>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  void handleDocumentSelected(f);
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  void handleDocumentSelected(f);
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={docParsing}
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors disabled:opacity-60"
                >
                  {docParsing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{docParsing ? 'Lendo...' : 'Usar Câmera'}</span>
                </button>
                <button
                  type="button"
                  disabled={docParsing}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-sky-300 dark:border-sky-400/40 bg-white dark:bg-[#0c1629] text-sky-700 dark:text-sky-200 hover:bg-sky-50 dark:hover:bg-[#101d36] transition-colors disabled:opacity-60"
                >
                  {docParsing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Enviar Foto / PDF</span>
                </button>
              </div>

              {docBanner && (
                <div
                  className={`rounded-lg px-3 py-2 text-xs flex items-start gap-2 ${
                    docBanner.kind === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {docBanner.kind === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  )}
                  <span>{docBanner.text}</span>
                </div>
              )}

              {capturedDocFile && (
                <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={saveDocToVault && Boolean(cloudUserId)}
                    disabled={!cloudUserId}
                    onChange={(e) => setSaveDocToVault(e.target.checked)}
                    className="rounded border-slate-300 dark:border-white/20 text-sky-600 focus:ring-sky-500"
                  />
                  <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span className="truncate">
                    {cloudUserId
                      ? `Salvar "${capturedDocFile.name}" nos anexos do veículo`
                      : `Entre na conta nuvem para salvar "${capturedDocFile.name}" nos anexos`}
                  </span>
                </label>
              )}
            </div>

            {/* Vehicle Type Selector (Car vs Motorcycle) */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#081020] border border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleSwitchVehicleType('car')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  vehicleType === 'car'
                    ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>{t.vehicleTypes.car}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchVehicleType('motorcycle')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  vehicleType === 'motorcycle'
                    ? 'bg-white dark:bg-[#101d36] text-slate-900 dark:text-sky-100 shadow-sm'
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
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Vehicle Color Picker (Swatches + Custom Text) */}
              <div className="space-y-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#081020]/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Cor do veículo
                  </label>
                  {resolvedColorStyle.hasColor && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 dark:text-sky-200">
                      <span
                        className="w-3 h-3 rounded-full border border-white/40 shadow-xs"
                        style={{ backgroundColor: resolvedColorStyle.primaryHex }}
                      />
                      <span>{resolvedColorStyle.displayName}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {VEHICLE_COLOR_SWATCHES.map((swatch) => {
                    const isSelected =
                      color.trim().toLowerCase() === swatch.label.toLowerCase();
                    const isLightSwatch =
                      swatch.id === 'white' || swatch.id === 'silver' || swatch.id === 'yellow';
                    return (
                      <button
                        key={swatch.id}
                        type="button"
                        onClick={() => setColor(swatch.label)}
                        title={swatch.label}
                        aria-label={`Cor ${swatch.label}`}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform border ${
                          isSelected
                            ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-white dark:ring-offset-[#081020] scale-110'
                            : 'hover:scale-105 opacity-90 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: swatch.primaryHex,
                          borderColor: swatch.borderHex,
                        }}
                      >
                        {isSelected && (
                          <Check
                            className={`w-3.5 h-3.5 ${
                              isLightSwatch ? 'text-slate-900' : 'text-white'
                            }`}
                            strokeWidth={2.5}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="Ou digite qualquer cor (ex: Branco Pérola, Azul Marinho, Verde Musgo)"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0c1629] text-slate-900 dark:text-slate-100"
                />
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
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono uppercase rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100 disabled:opacity-50"
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
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
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
                    className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  VIN / Chassi / RENAVAM (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Código identificador do documento (se aplicável)"
                  value={vinOrRenavam}
                  onChange={(e) => setVinOrRenavam(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                />
              </div>

              {hasBusinessAccess && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Classificação do Veículo na Empresa
                  </label>
                  <select
                    value={fleetGroup}
                    onChange={(e) => setFleetGroup(e.target.value as 'personal' | 'fleet')}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-[#081020] text-slate-900 dark:text-slate-100"
                  >
                    <option value="fleet">{t.garage.modeFleet}</option>
                    <option value="personal">{t.garage.modePersonal}</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
                >
                  {t.actions.save}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

interface DeleteVehicleConfirmModalProps {
  vehicle: Vehicle;
  logsCount: number;
  chargesCount: number;
  itemsCount: number;
  attachmentsCount: number;
  t: Translations;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteVehicleConfirmModal({
  vehicle,
  logsCount,
  chargesCount,
  itemsCount,
  attachmentsCount,
  t,
  onClose,
  onConfirm,
}: DeleteVehicleConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040812]/80 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="autolife-glass rounded-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Remover veículo e histórico?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <p>
            Você está prestes a apagar{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </strong>{' '}
            · Placa <span className="font-mono font-semibold">{vehicle.plate}</span>.
          </p>
          <p className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl p-3 leading-relaxed tabular-nums">
            Ao apagar o veículo, <strong>todo o histórico vinculado também será excluído permanentemente</strong>:
            <br />
            {logsCount} registro(s) de manutenção/gastos · {chargesCount} recarga(s) EV ·{' '}
            {itemsCount} item(ns) preventivo(s)
            {attachmentsCount > 0 ? ` · ${attachmentsCount} foto(s)/anexo(s)` : ''}.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {t.actions.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-red-600 hover:bg-red-500 text-white whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Apagar Veículo e Histórico</span>
          </button>
        </div>
      </div>
    </div>
  );
}
