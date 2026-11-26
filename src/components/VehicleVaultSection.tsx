import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Download,
  ExternalLink,
  FileText,
  FolderLock,
  ImagePlus,
  Loader2,
  Trash2,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { syncVehicleToCloud } from '../services/dataRepository';
import {
  deleteVehicleAttachment,
  listVehicleAttachments,
  uploadVehicleAttachment,
} from '../services/storageRepository';
import {
  AttachmentCategory,
  LanguageCode,
  UserPreferences,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import { todayIso } from '../utils/autolife';
import { buildAttachmentWhatsAppText } from '../utils/whatsapp';
import { WhatsAppConnectButton } from './WhatsAppConnectButton';

interface VehicleVaultSectionProps {
  activeVehicle: Vehicle;
  cloudUserId: string | null;
  onOpenCloudSettings: () => void;
  language: LanguageCode;
  whatsappNumber?: string;
  onUpdatePrefs: (partial: Partial<UserPreferences>) => void;
  externalAttachments?: VehicleAttachment[];
  externalLoading?: boolean;
  onAttachmentCreated?: (attachment: VehicleAttachment) => void;
  onAttachmentDeleted?: (attachmentId: string) => void;
}

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  receipt: 'Nota da Oficina / Recibo',
  insurance: 'Seguro',
  document: 'ITV / Licenciamento / CRLV',
  vehicle_photo: 'Foto do Veículo',
  inspection: 'Vistoria / Peça',
  diagnostic: 'Laudo / Scanner',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isSafeHttpsUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function VehicleVaultSection({
  activeVehicle,
  cloudUserId,
  onOpenCloudSettings,
  language,
  whatsappNumber,
  onUpdatePrefs,
  externalAttachments,
  externalLoading,
  onAttachmentCreated,
  onAttachmentDeleted,
}: VehicleVaultSectionProps) {
  const [internalAttachments, setInternalAttachments] = useState<VehicleAttachment[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<AttachmentCategory>('receipt');
  const [attachmentDate, setAttachmentDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const supabaseReady = isSupabaseConfigured();
  const usesExternal = externalAttachments !== undefined;
  const attachments = usesExternal ? externalAttachments : internalAttachments;
  const loading = usesExternal ? Boolean(externalLoading) : internalLoading;

  useEffect(() => {
    if (usesExternal) return;
    if (!cloudUserId || !supabaseReady) {
      setInternalAttachments([]);
      return;
    }
    let mounted = true;
    setInternalLoading(true);
    setErrorMsg(null);
    listVehicleAttachments(cloudUserId, activeVehicle.id)
      .then((rows) => {
        if (mounted) {
          setInternalAttachments(rows);
        }
      })
      .catch((err) => {
        if (mounted) {
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar os arquivos privados no momento.'
          );
        }
      })
      .finally(() => {
        if (mounted) setInternalLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [usesExternal, cloudUserId, activeVehicle.id, supabaseReady]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cloudUserId) return;

    setUploading(true);
    setErrorMsg(null);
    setFeedback(null);
    try {
      await syncVehicleToCloud(cloudUserId, activeVehicle);
      const created = await uploadVehicleAttachment({
        userId: cloudUserId,
        vehicleId: activeVehicle.id,
        file,
        category,
        attachmentDate,
        notes,
      });
      if (!usesExternal) {
        setInternalAttachments((prev) => [created, ...prev]);
      }
      onAttachmentCreated?.(created);
      setNotes('');
      setFeedback(
        `Foto/arquivo "${created.fileName}" (${formatFileSize(created.fileSizeBytes)}) salvo com acesso privado.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao enviar arquivo.');
    } finally {
      setUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleDelete = async (attachment: VehicleAttachment) => {
    if (!cloudUserId) return;
    setErrorMsg(null);
    setFeedback(null);
    try {
      await deleteVehicleAttachment(cloudUserId, attachment);
      if (!usesExternal) {
        setInternalAttachments((prev) => prev.filter((item) => item.id !== attachment.id));
      }
      onAttachmentDeleted?.(attachment.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao remover arquivo.');
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderLock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Fotos da Nota, Recibos &amp; Documentos (Privado)
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Nota da oficina, recibo, seguro e ITV de{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {activeVehicle.make} {activeVehicle.model}
            </strong>{' '}
            · Imagens comprimidas em JPG até 2 MB com acesso privado.
          </p>
        </div>

        {!cloudUserId && (
          <button
            type="button"
            onClick={onOpenCloudSettings}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0"
          >
            <span>Conectar Conta</span>
          </button>
        )}
      </div>

      {!supabaseReady ? (
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Cofre privado indisponível no momento.
        </p>
      ) : !cloudUserId ? (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Entre com sua conta (Google, Apple, Facebook ou e-mail) em{' '}
          <button
            type="button"
            onClick={onOpenCloudSettings}
            className="font-semibold text-blue-600 dark:text-blue-400 underline"
          >
            Configurações → Conta &amp; Nuvem
          </button>{' '}
          para tirar foto da nota da oficina, recibo, seguro ou ITV com acesso privado somente para você.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Tipo da nota / documento
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AttachmentCategory)}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                {(Object.keys(CATEGORY_LABELS) as AttachmentCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Data
              </label>
              <input
                type="date"
                value={attachmentDate}
                onChange={(e) => setAttachmentDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Observação (opcional)
              </label>
              <input
                type="text"
                maxLength={200}
                placeholder="Detalhes da nota ou documento"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="md:col-span-4 flex items-center gap-2">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleUploadFile}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleUploadFile}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white whitespace-nowrap disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                <span>Tirar Foto</span>
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap disabled:opacity-60"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Galeria</span>
              </button>
            </div>
          </div>

          {feedback && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">{feedback}</p>
          )}
          {errorMsg && (
            <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Carregando arquivos privados...</span>
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
              Nenhuma nota ou documento salvo ainda. Fotos são comprimidas automaticamente em JPG até 2 MB.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {attachments.map((att) => {
                const isImage = att.mimeType.startsWith('image/');
                const safeHref = isSafeHttpsUrl(att.signedUrl) ? att.signedUrl : undefined;
                return (
                  <div
                    key={att.id}
                    className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between"
                  >
                    {isImage && safeHref ? (
                      <div className="h-32 bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <img
                          src={safeHref}
                          alt={att.fileName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-20 bg-slate-100 dark:bg-slate-800/70 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-slate-400" />
                      </div>
                    )}

                    <div className="p-3 space-y-2">
                      <div>
                        <div className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          {CATEGORY_LABELS[att.fileCategory] ?? att.fileCategory}
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {att.fileName}
                        </div>
                        {att.notes && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {att.notes}
                          </div>
                        )}
                        <div className="text-[11px] font-mono text-slate-400 mt-1 tabular-nums">
                          {att.attachmentDate} · {formatFileSize(att.fileSizeBytes)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                        {safeHref ? (
                          <div className="flex items-center gap-2.5">
                            <a
                              href={safeHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <span>Ver</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <a
                              href={safeHref}
                              download={att.fileName}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Link expirado</span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <WhatsAppConnectButton
                            whatsappNumber={whatsappNumber}
                            language={language}
                            compact
                            label=""
                            title="Enviar documento/nota no WhatsApp cadastrado"
                            message={buildAttachmentWhatsAppText({
                              vehicle: activeVehicle,
                              attachment: att,
                              categoryLabel: CATEGORY_LABELS[att.fileCategory] ?? att.fileCategory,
                            })}
                            onSaveWhatsApp={(phone) => onUpdatePrefs({ whatsappNumber: phone })}
                          />
                          <button
                            type="button"
                            onClick={() => void handleDelete(att)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                            aria-label="Excluir arquivo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
