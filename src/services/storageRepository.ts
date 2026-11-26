import { supabase } from '../lib/supabaseClient';
import { AttachmentCategory, VehicleAttachment } from '../types/autolife';

export const AUTOLIFE_STORAGE_BUCKET = 'vehicle-attachments';
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const IMAGE_EXT_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function todayDateIso(): string {
  return new Date().toISOString().split('T')[0];
}

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0) return '';
  return name.slice(idx + 1).toLowerCase();
}

function sanitizeBaseName(rawName: string): string {
  const base = rawName.split(/[/\\]/).pop() || 'nota';
  const withoutExt = base.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  return cleaned.slice(0, 80) || 'nota';
}

function sanitizePathSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'item';
}

async function loadImageSource(file: File): Promise<{
  source: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width || 1280,
        height: bitmap.height || 720,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width || 1280,
        height: img.naturalHeight || img.height || 720,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível decodificar a imagem selecionada.'));
    };
    img.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao comprimir a imagem para JPG.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export async function compressImageToJpgUnder2Mb(
  file: File,
  fallbackMime: string
): Promise<{ file: File; mimeType: string; ext: string }> {
  const baseName = sanitizeBaseName(file.name);
  const targetName = `${baseName}.jpg`;

  let loaded: Awaited<ReturnType<typeof loadImageSource>> | null = null;
  try {
    loaded = await loadImageSource(file);
    const srcWidth = loaded.width;
    const srcHeight = loaded.height;

    const dimensionSteps = [1920, 1440, 1080, 800];
    const qualitySteps = [0.85, 0.72, 0.6, 0.48, 0.36];

    for (const maxDim of dimensionSteps) {
      const scale = Math.min(1, maxDim / Math.max(srcWidth, srcHeight));
      const width = Math.max(1, Math.round(srcWidth * scale));
      const height = Math.max(1, Math.round(srcHeight * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Contexto gráfico indisponível para compressão de foto.');
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(loaded.source, 0, 0, width, height);

      for (const quality of qualitySteps) {
        const blob = await canvasToJpegBlob(canvas, quality);
        if (blob.size <= MAX_ATTACHMENT_BYTES) {
          return {
            file: new File([blob], targetName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }),
            mimeType: 'image/jpeg',
            ext: 'jpg',
          };
        }
      }
    }
  } catch (err) {
    // If browser cannot decode (e.g. HEIC on non-Safari) but file is already <= 2 MB and allowed, upload directly
    const normalizedMime = fallbackMime === 'image/jpg' ? 'image/jpeg' : fallbackMime;
    if (
      file.size > 0 &&
      file.size <= MAX_ATTACHMENT_BYTES &&
      ALLOWED_IMAGE_MIME_TYPES.has(normalizedMime)
    ) {
      const ext = getFileExtension(file.name) || 'jpg';
      return { file, mimeType: normalizedMime, ext };
    }
    throw err instanceof Error
      ? err
      : new Error('Não foi possível processar a imagem selecionada.');
  } finally {
    loaded?.cleanup();
  }

  throw new Error('Não foi possível comprimir a foto abaixo de 2 MB em JPG.');
}

export async function listVehicleAttachments(
  userId: string,
  vehicleId: string
): Promise<VehicleAttachment[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('vehicle_attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('vehicle_id', vehicleId)
    .order('attachment_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Group signed URL requests per bucket so any legacy items still resolve if present
  const pathsByBucket = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = String(row.storage_bucket || AUTOLIFE_STORAGE_BUCKET);
    const list = pathsByBucket.get(bucket) ?? [];
    list.push(String(row.storage_path));
    pathsByBucket.set(bucket, list);
  }

  const signedMap = new Map<string, string>();
  for (const [bucket, paths] of pathsByBucket.entries()) {
    const { data: signedData } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, 3600);
    for (const item of signedData ?? []) {
      if (item.path && item.signedUrl) {
        signedMap.set(item.path, item.signedUrl);
      }
    }
  }

  return rows.map((row) => ({
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    serviceLogId: row.service_log_id ? String(row.service_log_id) : undefined,
    fileCategory: row.file_category as AttachmentCategory,
    attachmentDate: row.attachment_date
      ? String(row.attachment_date)
      : String(row.created_at).slice(0, 10),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    fileSizeBytes: Number(row.file_size_bytes),
    storageBucket: String(row.storage_bucket || AUTOLIFE_STORAGE_BUCKET),
    storagePath: String(row.storage_path),
    notes: row.notes ? String(row.notes) : '',
    createdAt: String(row.created_at),
    signedUrl: signedMap.get(String(row.storage_path)),
  }));
}

export async function uploadVehicleAttachment(params: {
  userId: string;
  vehicleId: string;
  file: File;
  category: AttachmentCategory;
  attachmentDate?: string;
  notes?: string;
  serviceLogId?: string;
}): Promise<VehicleAttachment> {
  if (!supabase) {
    throw new Error('Supabase não configurado.');
  }

  const { userId, vehicleId, file, category, notes, serviceLogId } = params;
  const attachmentDate = params.attachmentDate || todayDateIso();
  const rawMime = (file.type || '').toLowerCase();
  const extFromName = getFileExtension(file.name);
  const inferredImageMime = IMAGE_EXT_MIME_MAP[extFromName] || '';
  const effectiveImageMime =
    rawMime.startsWith('image/') || ALLOWED_IMAGE_MIME_TYPES.has(rawMime)
      ? rawMime
      : inferredImageMime;

  const isImage = Boolean(effectiveImageMime);
  const isPdf = rawMime === 'application/pdf' || (!rawMime && extFromName === 'pdf');

  if (!isImage && !isPdf) {
    throw new Error('Envie uma foto (JPG, PNG, WEBP, HEIC) ou arquivo PDF.');
  }

  let finalFile = file;
  let finalMime = 'application/pdf';
  let ext = 'pdf';

  if (isImage) {
    const compressed = await compressImageToJpgUnder2Mb(file, effectiveImageMime || 'image/jpeg');
    finalFile = compressed.file;
    finalMime = compressed.mimeType;
    ext = compressed.ext;
  } else if (finalFile.size <= 0 || finalFile.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('O PDF excede o limite de 2 MB.');
  }

  const safeVehicle = sanitizePathSegment(vehicleId);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const finalBase = sanitizeBaseName(finalFile.name);
  const finalName = `${uniquePrefix}-${finalBase}.${ext}`;

  // Exact required private folder layout: user_id / vehicle_id / nome-do-arquivo
  const storagePath = `${userId}/${safeVehicle}/${finalName}`;

  const { error: uploadError } = await supabase.storage
    .from(AUTOLIFE_STORAGE_BUCKET)
    .upload(storagePath, finalFile, {
      contentType: finalMime,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Erro no Storage ao salvar foto: ${uploadError.message}`);
  }

  const insertPayload = {
    user_id: userId,
    vehicle_id: vehicleId,
    service_log_id: serviceLogId ?? null,
    file_category: category,
    attachment_date: attachmentDate,
    file_name: finalFile.name,
    mime_type: finalMime,
    file_size_bytes: finalFile.size,
    storage_bucket: AUTOLIFE_STORAGE_BUCKET,
    storage_path: storagePath,
    notes: (notes ?? '').trim().slice(0, 300),
  };

  let { data: inserted, error: dbError } = await supabase
    .from('vehicle_attachments')
    .insert(insertPayload)
    .select('*')
    .single();

  // If service_log_id triggers a foreign-key race (23503), retry linking only to vehicle_id so photo is never lost
  if (dbError && dbError.code === '23503' && serviceLogId) {
    const retryRes = await supabase
      .from('vehicle_attachments')
      .insert({ ...insertPayload, service_log_id: null })
      .select('*')
      .single();
    inserted = retryRes.data;
    dbError = retryRes.error;
  }

  if (dbError || !inserted) {
    await supabase.storage.from(AUTOLIFE_STORAGE_BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(
      dbError?.message
        ? `Falha ao salvar registro da foto no banco: ${dbError.message}`
        : 'Falha ao registrar anexo na tabela vehicle_attachments.'
    );
  }

  const { data: signed } = await supabase.storage
    .from(AUTOLIFE_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  return {
    id: String(inserted.id),
    vehicleId: String(inserted.vehicle_id),
    serviceLogId: inserted.service_log_id ? String(inserted.service_log_id) : undefined,
    fileCategory: inserted.file_category as AttachmentCategory,
    attachmentDate: inserted.attachment_date
      ? String(inserted.attachment_date)
      : String(inserted.created_at).slice(0, 10),
    fileName: String(inserted.file_name),
    mimeType: String(inserted.mime_type),
    fileSizeBytes: Number(inserted.file_size_bytes),
    storageBucket: String(inserted.storage_bucket),
    storagePath: String(inserted.storage_path),
    notes: inserted.notes ? String(inserted.notes) : '',
    createdAt: String(inserted.created_at),
    signedUrl: signed?.signedUrl,
  };
}

export async function deleteVehicleAttachment(
  userId: string,
  attachment: VehicleAttachment
): Promise<void> {
  if (!supabase) return;

  const { error: storageErr } = await supabase.storage
    .from(attachment.storageBucket || AUTOLIFE_STORAGE_BUCKET)
    .remove([attachment.storagePath]);
  if (storageErr) throw storageErr;

  const { error: dbErr } = await supabase
    .from('vehicle_attachments')
    .delete()
    .eq('id', attachment.id)
    .eq('user_id', userId);
  if (dbErr) throw dbErr;
}
