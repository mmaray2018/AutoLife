import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Award,
  Check,
  Copy,
  FileText,
  Gauge,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
  ShieldOff,
  X,
} from 'lucide-react';
import { Translations } from '../data/i18n';
import {
  getOrCreatePassportShare,
  updatePassportShareSettings,
} from '../services/enterpriseRepository';
import {
  MaintenanceItem,
  MaintenanceStatus,
  OdometerEvent,
  PassportSnapshotPayload,
  ServiceLog,
  UserPreferences,
  Vehicle,
  VehicleAttachment,
  VehiclePassportShare,
} from '../types/autolife';
import {
  computeMaintenanceStatus,
  formatCurrency,
  formatDistance,
  isDateRecorded,
  todayIso,
} from '../utils/autolife';
import { convertCurrency } from '../utils/billing';
import { buildVehicleWhatsAppText } from '../utils/whatsapp';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface VehiclePassportModalProps {
  vehicle: Vehicle;
  maintenanceItems: MaintenanceItem[];
  logs: ServiceLog[];
  attachments: VehicleAttachment[];
  odometerEvents: OdometerEvent[];
  prefs: UserPreferences;
  t: Translations;
  cloudUserId: string | null;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  onClose: () => void;
}

export function VehiclePassportModal({
  vehicle,
  maintenanceItems,
  logs,
  attachments,
  odometerEvents,
  prefs,
  t,
  cloudUserId,
  onUpdatePrefs,
  onClose,
}: VehiclePassportModalProps) {
  const [share, setShare] = useState<VehiclePassportShare | null>(null);
  const [includeExpenses, setIncludeExpenses] = useState(false);
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const vehicleLogs = useMemo(
    () =>
      logs
        .filter((l) => l.vehicleId === vehicle.id)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [logs, vehicle.id]
  );

  const compliance = useMemo(() => {
    const vItems = maintenanceItems.filter((i) => i.vehicleId === vehicle.id);
    let onTrack = 0;
    let attention = 0;
    let overdue = 0;
    for (const item of vItems) {
      const s = computeMaintenanceStatus(item, vehicle, prefs).status;
      if (s === MaintenanceStatus.ON_TRACK) onTrack++;
      else if (s === MaintenanceStatus.ATTENTION) attention++;
      else if (s === MaintenanceStatus.OVERDUE) overdue++;
    }
    return { onTrack, attention, overdue, total: vItems.length };
  }, [maintenanceItems, vehicle, prefs]);

  const combinedOdometerTimeline = useMemo(() => {
    const points: Array<{ odometerKm: number; recordedAt: string; source: string }> = [];
    for (const ev of odometerEvents) {
      if (ev.vehicleId === vehicle.id) {
        points.push({
          odometerKm: ev.odometerKm,
          recordedAt: ev.recordedAt.slice(0, 10),
          source: ev.source,
        });
      }
    }
    for (const log of vehicleLogs) {
      points.push({
        odometerKm: log.odometerKm,
        recordedAt: log.date,
        source: 'service_log',
      });
    }
    if (points.length === 0 || !points.some((p) => p.odometerKm === vehicle.odometerKm)) {
      points.push({
        odometerKm: vehicle.odometerKm,
        recordedAt: todayIso(),
        source: 'current',
      });
    }
    const dedup = new Map<string, { odometerKm: number; recordedAt: string; source: string }>();
    for (const pt of points) {
      const key = `${pt.recordedAt}:${pt.odometerKm}`;
      if (!dedup.has(key)) dedup.set(key, pt);
    }
    return Array.from(dedup.values()).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }, [odometerEvents, vehicleLogs, vehicle.id, vehicle.odometerKm]);

  const snapshot = useMemo<PassportSnapshotPayload>(() => {
    return {
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        vehicleType: vehicle.vehicleType ?? 'car',
        engineDisplacementCc: vehicle.engineDisplacementCc,
        powertrain: vehicle.powertrain,
        odometerKm: vehicle.odometerKm,
        documentExpiryDate: isDateRecorded(vehicle.documentExpiryDate)
          ? vehicle.documentExpiryDate
          : undefined,
        insuranceExpiryDate: isDateRecorded(vehicle.insuranceExpiryDate)
          ? vehicle.insuranceExpiryDate
          : undefined,
      },
      compliance,
      odometerHistory: combinedOdometerTimeline,
      serviceHistory: vehicleLogs.map((l) => ({
        date: l.date,
        title: l.title,
        odometerKm: l.odometerKm,
        workshopName: l.workshopName,
        ...(includeExpenses ? { cost: l.cost, currency: l.currency ?? prefs.currency } : {}),
      })),
      documentsSummary: includeDocuments
        ? attachments.map((a) => ({
            fileCategory: a.fileCategory,
            fileName: a.fileName,
            attachmentDate: a.attachmentDate,
          }))
        : [],
      generatedAt: new Date().toISOString(),
    };
  }, [
    vehicle,
    compliance,
    combinedOdometerTimeline,
    vehicleLogs,
    includeExpenses,
    includeDocuments,
    attachments,
    prefs.currency,
  ]);

  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://autolifeworld.duckdns.org';
    if (share?.shareToken) {
      return `${origin}/?passport=${encodeURIComponent(share.shareToken)}`;
    }
    return `${origin}/?plate=${encodeURIComponent(vehicle.plate)}`;
  }, [share?.shareToken, vehicle.plate]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(shareUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [shareUrl]);

  useEffect(() => {
    if (!cloudUserId) return;
    let active = true;
    setShareBusy(true);
    setShareError(null);
    getOrCreatePassportShare({
      userId: cloudUserId,
      vehicleId: vehicle.id,
      includeExpenses,
      includeDocuments,
      snapshot,
    })
      .then((res) => {
        if (!active) return;
        if (res) {
          setShare(res);
          setIncludeExpenses(res.includeExpenses);
          setIncludeDocuments(res.includeDocuments);
        }
      })
      .catch((err) => {
        if (active) {
          setShareError(
            err instanceof Error ? err.message : 'Não foi possível gerar link verificável.'
          );
        }
      })
      .finally(() => {
        if (active) setShareBusy(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudUserId, vehicle.id]);

  const handleSyncShareOptions = async (patch: {
    isActive?: boolean;
    includeExpenses?: boolean;
    includeDocuments?: boolean;
  }) => {
    const nextExp = patch.includeExpenses ?? includeExpenses;
    const nextDocs = patch.includeDocuments ?? includeDocuments;
    if (patch.includeExpenses !== undefined) setIncludeExpenses(nextExp);
    if (patch.includeDocuments !== undefined) setIncludeDocuments(nextDocs);

    if (!share) return;
    setShareBusy(true);
    setShareError(null);
    try {
      const updated = await updatePassportShareSettings(share.id, {
        isActive: patch.isActive,
        includeExpenses: nextExp,
        includeDocuments: nextDocs,
        snapshot: {
          ...snapshot,
          serviceHistory: vehicleLogs.map((l) => ({
            date: l.date,
            title: l.title,
            odometerKm: l.odometerKm,
            workshopName: l.workshopName,
            ...(nextExp ? { cost: l.cost, currency: l.currency ?? prefs.currency } : {}),
          })),
          documentsSummary: nextDocs
            ? attachments.map((a) => ({
                fileCategory: a.fileCategory,
                fileName: a.fileName,
                attachmentDate: a.attachmentDate,
              }))
            : [],
        },
      });
      if (updated) setShare(updated);
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : 'Erro ao atualizar configurações de compartilhamento.'
      );
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const totalInvestment = vehicleLogs.reduce(
    (acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full p-6 sm:p-8 space-y-6 my-8">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Award className="w-3.5 h-3.5" />
              <span>AutoLife World · Passaporte Digital do Veículo</span>
            </div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {vehicle.make} {vehicle.model} ({vehicle.year})
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
              {t.vehicleTypes[vehicle.vehicleType ?? 'car']}
              {vehicle.engineDisplacementCc ? ` ${vehicle.engineDisplacementCc}cc` : ''} · Placa:{' '}
              <span className="font-mono">{vehicle.plate}</span> · {t.powertrain[vehicle.powertrain]} ·{' '}
              <span className="font-mono">{formatDistance(vehicle.odometerKm, prefs.units)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 print:hidden"
            aria-label={t.actions.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Itens em dia</div>
            <div className="mt-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {compliance.onTrack} / {compliance.total}
            </div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Registros verificados</div>
            <div className="mt-1 font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
              {vehicleLogs.length}
            </div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Investimento ({prefs.currency})
            </div>
            <div className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(totalInvestment, prefs.currency)}
            </div>
          </div>
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400">Emissão</div>
            <div className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
              {todayIso()}
            </div>
          </div>
        </div>

        {/* QR Code + Authorized Sharing Controls */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 grid grid-cols-1 sm:grid-cols-[152px_1fr] gap-5 items-center">
          <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-lg border border-slate-200 mx-auto sm:mx-0">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code Passaporte do Veículo" className="w-32 h-32" />
            ) : (
              <QrCode className="w-24 h-24 text-slate-400" />
            )}
            <span className="mt-1.5 text-[10px] font-mono text-slate-500">QR Consulta Pública</span>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                {share?.isActive === false ? (
                  <ShieldOff className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>Compartilhamento Autorizado por QR Code</span>
              </div>
              {share && (
                <button
                  type="button"
                  disabled={shareBusy}
                  onClick={() => void handleSyncShareOptions({ isActive: !share.isActive })}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    share.isActive
                      ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30'
                  }`}
                >
                  {share.isActive ? 'Link Ativo (Revogar)' : 'Link Revogado (Reativar)'}
                </button>
              )}
            </div>

            {cloudUserId ? (
              <>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700 dark:text-slate-300">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeExpenses}
                      disabled={shareBusy}
                      onChange={(e) =>
                        void handleSyncShareOptions({ includeExpenses: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Exibir valores de despesas</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDocuments}
                      disabled={shareBusy}
                      onChange={(e) =>
                        void handleSyncShareOptions({ includeDocuments: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    <span>Exibir lista de documentos</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white whitespace-nowrap shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Entre na sua conta em Configurações para ativar o link público verificável com revogação instantânea.
              </p>
            )}

            {shareBusy && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Atualizando Passaporte verificável...</span>
              </div>
            )}
            {shareError && <p className="text-xs text-amber-600 dark:text-amber-400">{shareError}</p>}
          </div>
        </div>

        {/* Immutable Odometer Timeline */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Gauge className="w-3.5 h-3.5" />
            <span>Histórico Imutável de Quilometragem</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-32 overflow-y-auto tabular-nums">
            {combinedOdometerTimeline.map((pt, idx) => (
              <div
                key={`${pt.recordedAt}-${pt.odometerKm}-${idx}`}
                className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 text-xs"
              >
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatDistance(pt.odometerKm, prefs.units)}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {pt.recordedAt}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Timeline */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Histórico Cronológico de Manutenção
          </h3>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-52 overflow-y-auto tabular-nums">
            {vehicleLogs.length === 0 ? (
              <p className="py-4 text-xs text-slate-500">Nenhum registro histórico lançado ainda.</p>
            ) : (
              vehicleLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0">
                    <span className="font-mono text-slate-500 mr-2">{log.date}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {log.title}
                    </span>
                    <span className="text-slate-500 ml-2">({log.workshopName})</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 font-mono">
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatDistance(log.odometerKm, prefs.units)}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(
                        convertCurrency(log.cost, log.currency ?? 'BRL', prefs.currency),
                        prefs.currency
                      )}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap justify-between items-center gap-2 pt-2 print:hidden">
          <WhatsAppConnectButton
            whatsappNumber={prefs.whatsappNumber}
            language={prefs.language}
            label="Enviar Passaporte no WhatsApp"
            message={`${buildVehicleWhatsAppText({ vehicle, units: prefs.units })}\nPassaporte Digital: ${shareUrl}`}
            onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              {t.actions.close}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PublicPassportViewProps {
  share: VehiclePassportShare | null;
  loading: boolean;
  error: string | null;
  onExitPublicView: () => void;
}

export function PublicPassportView({
  share,
  loading,
  error,
  onExitPublicView,
}: PublicPassportViewProps) {
  const snap = share?.passportSnapshot;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
            <Award className="w-5 h-5" />
            <span>AutoLife World · Consulta Verificada</span>
          </div>
          <button
            type="button"
            onClick={onExitPublicView}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Abrir Aplicativo
          </button>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-2">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-slate-500">Verificando Passaporte Digital do Veículo...</p>
          </div>
        ) : error || !snap ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3">
            <ShieldOff className="w-9 h-9 text-amber-500 mx-auto" />
            <h1 className="font-display text-lg font-bold">Passaporte Indisponível</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {error || 'Este link não existe, expirou ou foi revogado pelo proprietário.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Passaporte Digital Autenticado</span>
              </div>
              <h1 className="font-display text-2xl font-bold mt-1">
                {snap.vehicle.make} {snap.vehicle.model} ({snap.vehicle.year})
              </h1>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                Placa: <span className="font-mono font-semibold">{snap.vehicle.plate}</span> ·{' '}
                Odômetro atual:{' '}
                <span className="font-mono font-semibold">
                  {snap.vehicle.odometerKm.toLocaleString('pt-BR')} km
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 tabular-nums">
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Saúde Preventiva</div>
                <div className="mt-1 font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {snap.compliance.onTrack} / {snap.compliance.total} em dia
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Registros de Odômetro</div>
                <div className="mt-1 font-mono text-base font-bold">
                  {snap.odometerHistory.length} marcos
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="text-xs text-slate-500">Atualizado em</div>
                <div className="mt-1 font-mono text-sm font-semibold">
                  {snap.generatedAt.slice(0, 10)}
                </div>
              </div>
            </div>

            {snap.odometerHistory.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Linha Imutável de Quilometragem</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 tabular-nums">
                  {snap.odometerHistory.map((pt, idx) => (
                    <div
                      key={`${pt.recordedAt}-${pt.odometerKm}-${idx}`}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="font-mono font-bold">
                        {pt.odometerKm.toLocaleString('pt-BR')} km
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">{pt.recordedAt}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500">Histórico de Manutenções</h2>
              {snap.serviceHistory.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhum serviço público registrado.</p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 tabular-nums">
                  {snap.serviceHistory.map((item, idx) => (
                    <div
                      key={`${item.date}-${idx}`}
                      className="py-2.5 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <span className="font-mono text-slate-500 mr-2">{item.date}</span>
                        <span className="font-semibold">{item.title}</span>
                        <span className="text-slate-500 ml-2">({item.workshopName})</span>
                      </div>
                      <div className="font-mono shrink-0 flex items-center gap-3">
                        <span>{item.odometerKm.toLocaleString('pt-BR')} km</span>
                        {typeof item.cost === 'number' && (
                          <span className="font-semibold">
                            {formatCurrency(item.cost, item.currency ?? 'BRL')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {snap.documentsSummary && snap.documentsSummary.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documentos Comprovados ({snap.documentsSummary.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {snap.documentsSummary.map((doc, idx) => (
                    <div
                      key={`${doc.fileName}-${idx}`}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <span className="truncate font-medium">{doc.fileName}</span>
                      <span className="font-mono text-[11px] text-slate-500 shrink-0">
                        {doc.attachmentDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
