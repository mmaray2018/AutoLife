import { jsPDF } from 'jspdf';
import { Translations } from '../data/i18n';
import {
  AttachmentCategory,
  ChargingSession,
  MaintenanceCategory,
  MaintenanceItem,
  MaintenanceStatus,
  ServiceLog,
  UserPreferences,
  Vehicle,
  VehicleAttachment,
} from '../types/autolife';
import {
  computeMaintenanceStatus,
  formatCurrency,
  formatDistance,
  isDateRecorded,
  todayIso,
} from './autolife';
import { convertCurrency } from './billing';
import { formatWhatsAppDisplay } from './whatsapp';

export interface FinalReportTimelineItem {
  id: string;
  kind: 'log' | 'charge' | 'attachment';
  filterGroup: 'maintenance' | 'fuel' | 'ev' | 'expense';
  date: string;
  categoryLabel: string;
  title: string;
  odometerKm: number | null;
  location: string;
  cost: number | null;
  currency: UserPreferences['currency'];
  notes: string;
  attachments: VehicleAttachment[];
}

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  receipt: 'Nota da Oficina / Recibo',
  insurance: 'Apólice de Seguro',
  document: 'ITV / Licenciamento / CRLV',
  vehicle_photo: 'Foto do Veículo',
  inspection: 'Vistoria / Peça',
  diagnostic: 'Laudo / Scanner',
};

function pdfSafe(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/[•●▪▫]/g, '-')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function buildVehicleTimelineEntries(params: {
  vehicle: Vehicle;
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  currency: UserPreferences['currency'];
  order?: 'asc' | 'desc';
}): FinalReportTimelineItem[] {
  const {
    vehicle,
    logs,
    chargingSessions,
    attachments,
    currency,
    order = 'asc',
  } = params;

  const entries: FinalReportTimelineItem[] = [];

  for (const log of logs) {
    if (log.vehicleId !== vehicle.id) continue;
    const logAttachments = attachments.filter((a) => a.serviceLogId === log.id);
    let categoryLabel = 'Manutenção';
    let filterGroup: FinalReportTimelineItem['filterGroup'] = 'maintenance';

    if (log.category === MaintenanceCategory.REVISION) {
      categoryLabel = 'Revisão';
    } else if (log.category === MaintenanceCategory.FUEL) {
      categoryLabel = 'Abastecimento';
      filterGroup = 'fuel';
    } else if (log.category === MaintenanceCategory.EXPENSE) {
      categoryLabel = 'Gasto / Seguro';
      filterGroup = 'expense';
    } else if (log.category === MaintenanceCategory.DOCUMENTATION) {
      categoryLabel = 'Documentação';
      filterGroup = 'expense';
    }

    entries.push({
      id: `log-${log.id}`,
      kind: 'log',
      filterGroup,
      date: log.date,
      categoryLabel,
      title: log.title,
      odometerKm: log.odometerKm,
      location: log.workshopName,
      cost: log.cost,
      currency: log.currency ?? 'BRL',
      notes: log.notes,
      attachments: logAttachments,
    });
  }

  for (const chg of chargingSessions) {
    if (chg.vehicleId !== vehicle.id) continue;
    entries.push({
      id: `chg-${chg.id}`,
      kind: 'charge',
      filterGroup: 'ev',
      date: chg.date,
      categoryLabel: 'Recarga EV',
      title: `Recarga ${chg.powerType} · ${chg.energyKwh.toFixed(1)} kWh (${chg.socStart}% -> ${chg.socEnd}%)`,
      odometerKm: null,
      location: chg.stationName,
      cost: chg.cost,
      currency: chg.currency ?? 'BRL',
      notes: '',
      attachments: [],
    });
  }

  for (const att of attachments) {
    if (att.vehicleId !== vehicle.id || att.serviceLogId) continue;
    entries.push({
      id: `att-${att.id}`,
      kind: 'attachment',
      filterGroup: 'expense',
      date: att.attachmentDate,
      categoryLabel: ATTACHMENT_CATEGORY_LABELS[att.fileCategory] ?? 'Foto / Documento',
      title: att.fileName,
      odometerKm: null,
      location: 'Cofre Digital',
      cost: null,
      currency,
      notes: att.notes || '',
      attachments: [att],
    });
  }

  return entries.sort((a, b) =>
    order === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  );
}

interface LoadedPdfImage {
  dataUrl: string;
  width: number;
  height: number;
}

async function fetchAttachmentAsJpegDataUrl(url?: string): Promise<LoadedPdfImage | null> {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'blob:' && parsed.protocol !== 'data:') {
      return null;
    }

    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;

    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Falha ao carregar imagem'));
        el.src = objectUrl;
      });

      const srcW = img.naturalWidth || img.width || 800;
      const srcH = img.naturalHeight || img.height || 600;
      const maxDim = 1100;
      const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
      const width = Math.max(1, Math.round(srcW * scale));
      const height = Math.max(1, Math.round(srcH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.82),
        width,
        height,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

export interface GeneratedVehiclePdfResult {
  blob: Blob;
  file: File;
  filename: string;
  embeddedPhotosCount: number;
  failedPhotosCount: number;
}

export async function generateVehicleFinalPdf(params: {
  vehicle: Vehicle;
  maintenanceItems: MaintenanceItem[];
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  attachments: VehicleAttachment[];
  prefs: UserPreferences;
  t?: Translations;
  ownerEmail?: string | null;
}): Promise<GeneratedVehiclePdfResult> {
  const {
    vehicle,
    maintenanceItems,
    logs,
    chargingSessions,
    attachments,
    prefs,
    t,
    ownerEmail,
  } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeading = (label: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(label), margin, y);
    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const timeline = buildVehicleTimelineEntries({
    vehicle,
    logs,
    chargingSessions,
    attachments,
    currency: prefs.currency,
    order: 'asc',
  });

  const vehicleAttachments = attachments.filter((a) => a.vehicleId === vehicle.id);
  const imageAttachments = vehicleAttachments.filter((a) => a.mimeType.startsWith('image/'));

  // Preload all vehicle photos in parallel so the PDF includes every image cleanly
  const loadedImageMap = new Map<string, LoadedPdfImage | null>();
  let embeddedPhotosCount = 0;
  let failedPhotosCount = 0;

  await Promise.all(
    imageAttachments.map(async (att) => {
      const loaded = await fetchAttachmentAsJpegDataUrl(att.signedUrl);
      loadedImageMap.set(att.id, loaded);
      if (loaded) embeddedPhotosCount += 1;
      else failedPhotosCount += 1;
    })
  );

  // 1. Dark Executive Report Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(
    pdfSafe(`AutoLife World - Relatório Final do Veículo`),
    margin,
    12
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(
    pdfSafe(
      `${vehicle.make} ${vehicle.model} (${vehicle.year}) · Placa ${vehicle.plate} · Emissão ${todayIso()}`
    ),
    margin,
    19.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    pdfSafe(
      `Registro cronológico completo do início ao fim, incluindo histórico de serviços, despesas e fotos.`
    ),
    margin,
    26
  );

  y = 40;

  // 2. Identification & Specs Grid
  drawSectionHeading('1. Identificação e Situação Atual do Veículo');

  const vehicleTypeText =
    vehicle.vehicleType === 'motorcycle'
      ? `Motocicleta${vehicle.engineDisplacementCc ? ` (${vehicle.engineDisplacementCc} cc)` : ''}`
      : 'Automóvel';
  const profileText =
    vehicle.drivingProfile === 'urban_severe'
      ? 'Urbano Severo'
      : vehicle.drivingProfile === 'highway'
      ? 'Rodoviário'
      : 'Misto';
  const tiresText = vehicle.rearTirePressurePsi
    ? `${vehicle.tirePressurePsi} PSI (diant.) / ${vehicle.rearTirePressurePsi} PSI (tras.)`
    : `${vehicle.tirePressurePsi} PSI`;

  const specRows: Array<[string, string, string, string]> = [
    [
      'Veículo / Ano',
      `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
      'Placa / Tipo',
      `${vehicle.plate} · ${vehicleTypeText}`,
    ],
    [
      'Motorização',
      vehicle.powertrain.toUpperCase(),
      'Odômetro Atual',
      formatDistance(vehicle.odometerKm, prefs.units),
    ],
    [
      'Perfil de Uso',
      `${profileText} (${vehicle.weeklyKm ?? 250} km/sem)`,
      'Calibragem Pneus',
      tiresText,
    ],
    [
      'Licenciamento / ITV',
      isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : 'Não informado',
      'Apólice de Seguro',
      isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : 'Não informado',
    ],
  ];

  if (ownerEmail || prefs.whatsappNumber) {
    specRows.push([
      'Proprietário (E-mail)',
      ownerEmail || 'Não informado',
      'WhatsApp Vinculado',
      formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language) || 'Não informado',
    ]);
  }

  doc.setFontSize(8.5);
  const colHalf = contentWidth / 2;
  for (const [k1, v1, k2, v2] of specRows) {
    ensureSpace(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(k1 + ':'), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(v1), margin + 35, y, { maxWidth: colHalf - 38 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(k2 + ':'), margin + colHalf, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(v2), margin + colHalf + 35, y, { maxWidth: colHalf - 36 });

    y += 5.5;
  }

  y += 3;

  // 3. Lifetime Summary Box
  const totalInvested = timeline.reduce((sum, entry) => {
    if (entry.cost === null) return sum;
    return sum + convertCurrency(entry.cost, entry.currency ?? 'BRL', prefs.currency);
  }, 0);
  const serviceCount = logs.filter((l) => l.vehicleId === vehicle.id).length;
  const chargeCount = chargingSessions.filter((c) => c.vehicleId === vehicle.id).length;

  ensureSpace(18);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

  const summaryCols = [
    { label: 'Eventos no Histórico', value: String(timeline.length) },
    { label: 'Manutenções / Gastos', value: String(serviceCount) },
    { label: 'Recargas EV', value: String(chargeCount) },
    { label: 'Fotos / Anexos', value: String(vehicleAttachments.length) },
    { label: `Investimento (${prefs.currency})`, value: formatCurrency(totalInvested, prefs.currency) },
  ];
  const cellW = contentWidth / summaryCols.length;
  summaryCols.forEach((cell, idx) => {
    const cx = margin + idx * cellW + 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(cell.label), cx, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(pdfSafe(cell.value), cx, y + 10.5);
  });

  y += 20;

  // 4. Complete Chronological History (Start to Finish)
  drawSectionHeading('2. Histórico Cronológico Completo (Do Início ao Fim)');

  if (timeline.length === 0) {
    ensureSpace(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pdfSafe('Nenhum registro de manutenção, abastecimento, recarga ou gasto lançado até o momento.'),
      margin,
      y
    );
    y += 8;
  } else {
    for (let idx = 0; idx < timeline.length; idx += 1) {
      const entry = timeline[idx];
      const costText =
        entry.cost !== null
          ? formatCurrency(
              convertCurrency(entry.cost, entry.currency ?? 'BRL', prefs.currency),
              prefs.currency
            )
          : '—';
      const kmText =
        entry.odometerKm !== null ? formatDistance(entry.odometerKm, prefs.units) : '—';

      const noteLines = entry.notes
        ? (doc.splitTextToSize(pdfSafe(`Detalhes: ${entry.notes}`), contentWidth - 6) as string[])
        : [];
      const titleLines = doc.splitTextToSize(
        pdfSafe(`${idx + 1}. ${entry.title}`),
        contentWidth - 45
      ) as string[];

      const blockHeight = 12 + titleLines.length * 4.2 + noteLines.length * 3.8;
      ensureSpace(blockHeight + 4);

      // Subtle entry header band
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, blockHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(titleLines, margin + 3, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(37, 99, 235);
      doc.text(pdfSafe(costText), pageWidth - margin - 3, y + 5, { align: 'right' });

      const metaY = y + 5 + titleLines.length * 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        pdfSafe(
          `Data: ${entry.date}  |  Tipo: ${entry.categoryLabel}  |  Km: ${kmText}  |  Local: ${entry.location || '—'}`
        ),
        margin + 3,
        metaY
      );

      if (noteLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(noteLines, margin + 3, metaY + 4.5);
      }

      y += blockHeight + 3;

      // Embed photos directly attached to this service log
      const entryImages = entry.attachments.filter((att) => att.mimeType.startsWith('image/'));
      if (entryImages.length > 0) {
        for (const att of entryImages) {
          const loaded = loadedImageMap.get(att.id);
          if (loaded) {
            const maxImgW = 72;
            const maxImgH = 48;
            const ratio = Math.min(maxImgW / loaded.width, maxImgH / loaded.height);
            const drawW = loaded.width * ratio;
            const drawH = loaded.height * ratio;
            ensureSpace(drawH + 9);

            doc.setDrawColor(203, 213, 225);
            doc.rect(margin + 3, y, drawW, drawH);
            doc.addImage(loaded.dataUrl, 'JPEG', margin + 3, y, drawW, drawH, undefined, 'FAST');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(
              pdfSafe(
                `Anexo: ${att.fileName} (${ATTACHMENT_CATEGORY_LABELS[att.fileCategory] ?? att.fileCategory})`
              ),
              margin + 3,
              y + drawH + 3.5
            );
            y += drawH + 7;
          } else {
            ensureSpace(6);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(
              pdfSafe(`Anexo registrado: ${att.fileName} (${att.attachmentDate})`),
              margin + 3,
              y + 3
            );
            y += 6;
          }
        }
      }
    }
  }

  y += 2;

  // 5. Preventive Maintenance Checklist Snapshot
  const vehicleChecklist = maintenanceItems.filter((item) => item.vehicleId === vehicle.id);
  if (vehicleChecklist.length > 0) {
    drawSectionHeading('3. Situação Atual do Plano Preventivo');

    for (const item of vehicleChecklist) {
      const calc = computeMaintenanceStatus(item, vehicle, prefs);
      const itemTitle = t?.items?.[item.titleKey]?.title ?? item.titleKey;
      const statusText =
        calc.status === MaintenanceStatus.OVERDUE
          ? 'Vencido'
          : calc.status === MaintenanceStatus.ATTENTION
          ? 'Atenção'
          : calc.status === MaintenanceStatus.ON_TRACK
          ? 'Em dia'
          : 'Pendente';

      ensureSpace(7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(pdfSafe(itemTitle), margin, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (calc.status === MaintenanceStatus.OVERDUE) doc.setTextColor(220, 38, 38);
      else if (calc.status === MaintenanceStatus.ATTENTION) doc.setTextColor(217, 119, 6);
      else if (calc.status === MaintenanceStatus.ON_TRACK) doc.setTextColor(22, 163, 74);
      else doc.setTextColor(100, 116, 139);

      doc.text(pdfSafe(statusText), margin + 78, y);

      doc.setTextColor(71, 85, 105);
      const lastStr = isDateRecorded(item.lastCheckedDate)
        ? `Último: ${item.lastCheckedDate} (${formatDistance(item.lastCheckedKm, prefs.units)})`
        : 'Último: Não registrado';
      const nextStr = calc.projectedDueDate ? `Previsto: ${calc.projectedDueDate}` : '';
      doc.text(pdfSafe([lastStr, nextStr].filter(Boolean).join(' · ')), margin + 102, y, {
        maxWidth: contentWidth - 102,
      });

      y += 5.5;
    }

    y += 3;
  }

  // 6. Complete Photo & Document Gallery (All Vehicle Attachments)
  if (vehicleAttachments.length > 0) {
    drawSectionHeading(
      `4. Galeria Completa de Fotos, Notas e Comprovantes (${vehicleAttachments.length})`
    );

    const chronologicalAttachments = [...vehicleAttachments].sort((a, b) =>
      a.attachmentDate.localeCompare(b.attachmentDate)
    );

    const colGap = 6;
    const cardW = (contentWidth - colGap) / 2;
    let colIdx = 0;
    let rowMaxH = 0;

    for (const att of chronologicalAttachments) {
      const loaded = loadedImageMap.get(att.id);
      const isImage = att.mimeType.startsWith('image/');
      const imgMaxH = 54;
      let drawW = cardW - 6;
      let drawH = isImage && loaded ? Math.min(imgMaxH, (drawW * loaded.height) / loaded.width) : 18;
      if (isImage && loaded && drawH === imgMaxH) {
        drawW = Math.min(cardW - 6, (drawH * loaded.width) / loaded.height);
      }

      const captionLines = doc.splitTextToSize(
        pdfSafe(
          `${att.attachmentDate} · ${ATTACHMENT_CATEGORY_LABELS[att.fileCategory] ?? att.fileCategory}\n${att.fileName}${att.notes ? ` — ${att.notes}` : ''}`
        ),
        cardW - 6
      ) as string[];
      const cardH = drawH + 8 + captionLines.length * 3.6;

      if (colIdx === 0) {
        ensureSpace(cardH + 4);
        rowMaxH = cardH;
      } else {
        rowMaxH = Math.max(rowMaxH, cardH);
      }

      const xPos = margin + colIdx * (cardW + colGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(xPos, y, cardW, cardH, 1.5, 1.5, 'FD');

      if (isImage && loaded) {
        const imgX = xPos + (cardW - drawW) / 2;
        doc.addImage(loaded.dataUrl, 'JPEG', imgX, y + 3, drawW, drawH, undefined, 'FAST');
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(
          pdfSafe(isImage ? 'Imagem indisponível offline' : 'Documento PDF anexado'),
          xPos + 4,
          y + 11
        );
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(captionLines, xPos + 3, y + drawH + 6.5);

      if (colIdx === 1) {
        y += rowMaxH + 5;
        colIdx = 0;
        rowMaxH = 0;
      } else {
        colIdx = 1;
      }
    }

    if (colIdx === 1) {
      y += rowMaxH + 5;
    }
  }

  // Page Footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      pdfSafe(`AutoLife World · Relatório Final ${vehicle.make} ${vehicle.model} (${vehicle.plate})`),
      margin,
      pageHeight - 8
    );
    doc.text(
      pdfSafe(`Página ${p} de ${totalPages}`),
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  const safeModel = `${vehicle.make}-${vehicle.model}-${vehicle.plate}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-');
  const filename = `Relatorio-Final-${safeModel}-${todayIso()}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], filename, { type: 'application/pdf' });

  return {
    blob,
    file,
    filename,
    embeddedPhotosCount,
    failedPhotosCount,
  };
}

export function downloadPdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canSharePdfFile(file: File): boolean {
  if (typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export async function sharePdfViaWebShare(params: {
  file: File;
  title: string;
  text: string;
}): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (!canSharePdfFile(params.file)) return 'unsupported';
  try {
    await navigator.share({
      title: params.title,
      text: params.text,
      files: [params.file],
    });
    return 'shared';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return 'cancelled';
    }
    return 'unsupported';
  }
}
