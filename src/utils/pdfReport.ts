import { jsPDF } from 'jspdf';
import { TRANSLATIONS, Translations } from '../data/i18n';
import { getUi } from '../data/uiTranslations';
import {
  AttachmentCategory,
  ChargingSession,
  LanguageCode,
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

export function getLocalizedAttachmentLabels(
  language: LanguageCode = 'pt'
): Record<AttachmentCategory, string> {
  return getUi(language).medicalUi.attachmentCategories;
}

export const ATTACHMENT_CATEGORY_LABELS: Record<AttachmentCategory, string> =
  getUi('pt').medicalUi.attachmentCategories;

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
  language?: LanguageCode;
}): FinalReportTimelineItem[] {
  const {
    vehicle,
    logs,
    chargingSessions,
    attachments,
    currency,
    order = 'asc',
    language = 'pt',
  } = params;

  const ui = getUi(language);
  const tr = TRANSLATIONS[language] ?? TRANSLATIONS.en;
  const attLabels = ui.medicalUi.attachmentCategories;
  const entries: FinalReportTimelineItem[] = [];

  for (const log of logs) {
    if (log.vehicleId !== vehicle.id) continue;
    const logAttachments = attachments.filter((a) => a.serviceLogId === log.id);
    let categoryLabel = ui.medicalUi.kindMaintenance;
    let filterGroup: FinalReportTimelineItem['filterGroup'] = 'maintenance';

    if (log.category === MaintenanceCategory.REVISION) {
      categoryLabel = tr.categories?.revision ?? ui.medicalUi.kindRevision;
    } else if (log.category === MaintenanceCategory.FUEL) {
      categoryLabel = tr.categories?.fuel ?? ui.medicalUi.kindFuel;
      filterGroup = 'fuel';
    } else if (log.category === MaintenanceCategory.EXPENSE) {
      categoryLabel = tr.categories?.expense ?? ui.medicalUi.kindExpense;
      filterGroup = 'expense';
    } else if (log.category === MaintenanceCategory.DOCUMENTATION) {
      categoryLabel = tr.categories?.documentation ?? attLabels.document;
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
      categoryLabel: ui.pdfUi.timelineBadges.evCharge,
      title: `${ui.pdfUi.timelineBadges.evCharge} ${chg.powerType} · ${chg.energyKwh.toFixed(1)} kWh (${chg.socStart}% -> ${chg.socEnd}%)`,
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
      categoryLabel: attLabels[att.fileCategory] ?? ui.pdfUi.timelineBadges.photoPrefix,
      title: att.fileName,
      odometerKm: null,
      location: ui.vaultUi.title,
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

  const ui = getUi(prefs.language);
  const tr = t ?? TRANSLATIONS[prefs.language] ?? TRANSLATIONS.en;
  const p = ui.pdfUi;
  const attLabels = ui.medicalUi.attachmentCategories;

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
    language: prefs.language,
  });

  const vehicleAttachments = attachments.filter((a) => a.vehicleId === vehicle.id);
  const imageAttachments = vehicleAttachments.filter((a) => a.mimeType.startsWith('image/'));

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
  doc.text(pdfSafe(`AutoLife World - ${p.headerSubtitle}`), margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(
    pdfSafe(
      `${vehicle.make} ${vehicle.model} (${vehicle.year}) · ${p.plateLabel} ${vehicle.plate} · ${p.issuedLabel} ${todayIso()}`
    ),
    margin,
    19.5
  );

  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text(pdfSafe(ui.finalReportUi.headerSubtitle), margin, 26);

  y = 40;

  // 2. Identification & Specs Grid
  drawSectionHeading(`1. ${p.vehicleLabel} · ${p.powertrainLabel}`);

  const vehicleTypeText =
    vehicle.vehicleType === 'motorcycle'
      ? `${ui.vehicleColors.categoryLabels.moto}${vehicle.engineDisplacementCc ? ` (${vehicle.engineDisplacementCc} cc)` : ''}`
      : ui.vehicleColors.categoryLabels.sedan;
  const tiresText = vehicle.rearTirePressurePsi
    ? `${vehicle.tirePressurePsi} PSI / ${vehicle.rearTirePressurePsi} PSI`
    : `${vehicle.tirePressurePsi} PSI`;

  const specRows: Array<[string, string, string, string]> = [
    [
      `${p.vehicleLabel} / ${p.yearLabel}`,
      `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
      p.plateLabel,
      `${vehicle.plate} · ${vehicleTypeText}`,
    ],
    [
      p.powertrainLabel,
      vehicle.powertrain.toUpperCase(),
      p.odometerLabel,
      formatDistance(vehicle.odometerKm, prefs.units),
    ],
    [
      p.colorLabel,
      vehicle.color || p.notInformed,
      'PSI',
      `${tiresText} (${vehicle.weeklyKm ?? 250} km/w)`,
    ],
    [
      p.docExpiryLabel,
      isDateRecorded(vehicle.documentExpiryDate) ? vehicle.documentExpiryDate : p.notInformed,
      p.insExpiryLabel,
      isDateRecorded(vehicle.insuranceExpiryDate) ? vehicle.insuranceExpiryDate : p.notInformed,
    ],
  ];

  if (ownerEmail || prefs.whatsappNumber) {
    specRows.push([
      p.ownerLabel,
      ownerEmail || p.notInformed,
      'WhatsApp',
      formatWhatsAppDisplay(prefs.whatsappNumber, prefs.language) || p.notInformed,
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
    { label: p.summaryEvents, value: String(timeline.length) },
    { label: p.summaryMaintenances, value: String(serviceCount) },
    { label: p.timelineBadges.evCharge, value: String(chargeCount) },
    { label: p.summaryPhotos, value: String(vehicleAttachments.length) },
    { label: `${p.summaryTotal} (${prefs.currency})`, value: formatCurrency(totalInvested, prefs.currency) },
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

  // 4. Complete Chronological History
  drawSectionHeading(`2. ${p.timelineTitle}`);

  if (timeline.length === 0) {
    ensureSpace(10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(pdfSafe(p.emptyTimeline), margin, y);
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
        ? (doc.splitTextToSize(pdfSafe(entry.notes), contentWidth - 6) as string[])
        : [];
      const titleLines = doc.splitTextToSize(
        pdfSafe(`${idx + 1}. ${entry.title}`),
        contentWidth - 45
      ) as string[];

      const blockHeight = 12 + titleLines.length * 4.2 + noteLines.length * 3.8;
      ensureSpace(blockHeight + 4);

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
          `${p.colDate}: ${entry.date}  |  ${p.colCategory}: ${entry.categoryLabel}  |  ${p.colKm}: ${kmText}  |  ${p.colWorkshop}: ${entry.location || '—'}`
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
                `${p.timelineBadges.photoPrefix} ${att.fileName} (${attLabels[att.fileCategory] ?? att.fileCategory})`
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
              pdfSafe(`${p.timelineBadges.photoPrefix} ${att.fileName} (${att.attachmentDate})`),
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
    drawSectionHeading(`3. ${p.preventiveTitle}`);

    for (const item of vehicleChecklist) {
      const calc = computeMaintenanceStatus(item, vehicle, prefs);
      const itemTitle = tr.items?.[item.titleKey]?.title ?? item.titleKey;
      const statusText =
        calc.status === MaintenanceStatus.OVERDUE
          ? tr.status.overdue
          : calc.status === MaintenanceStatus.ATTENTION
          ? tr.status.attention
          : calc.status === MaintenanceStatus.ON_TRACK
          ? tr.status.on_track
          : tr.status.pending;

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
        ? `${p.colLastRecord}: ${item.lastCheckedDate} (${formatDistance(item.lastCheckedKm, prefs.units)})`
        : `${p.colLastRecord}: ${p.notInformed}`;
      const nextStr = calc.projectedDueDate ? `${p.colNextDue}: ${calc.projectedDueDate}` : '';
      doc.text(pdfSafe([lastStr, nextStr].filter(Boolean).join(' · ')), margin + 102, y, {
        maxWidth: contentWidth - 102,
      });

      y += 5.5;
    }

    y += 3;
  }

  // 6. Complete Photo & Document Gallery
  if (vehicleAttachments.length > 0) {
    drawSectionHeading(`4. ${p.photosSectionTitle} (${vehicleAttachments.length})`);

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
          `${att.attachmentDate} · ${attLabels[att.fileCategory] ?? att.fileCategory}\n${att.fileName}${att.notes ? ` — ${att.notes}` : ''}`
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
        doc.text(pdfSafe(att.fileName), xPos + 4, y + 11, { maxWidth: cardW - 8 });
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
  for (let pIdx = 1; pIdx <= totalPages; pIdx += 1) {
    doc.setPage(pIdx);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      pdfSafe(`AutoLife World · ${vehicle.make} ${vehicle.model} (${vehicle.plate}) · ${p.footerRight}`),
      margin,
      pageHeight - 8
    );
    doc.text(
      pdfSafe(`${p.pageLabel} ${pIdx} ${p.ofLabel} ${totalPages}`),
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  const safeModel = `${vehicle.make}-${vehicle.model}-${vehicle.plate}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-');
  const filename = `${p.filenamePrefix}-${safeModel}-${todayIso()}.pdf`;

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

export function generateFleetSummaryPdf(params: {
  organizationName: string;
  vehicles: Vehicle[];
  maintenanceItems: MaintenanceItem[];
  logs: ServiceLog[];
  chargingSessions: ChargingSession[];
  prefs: UserPreferences;
}): { blob: Blob; filename: string } {
  const { organizationName, vehicles, maintenanceItems, logs, chargingSessions, prefs } = params;
  const ui = getUi(prefs.language);
  const tr = TRANSLATIONS[prefs.language] ?? TRANSLATIONS.en;
  const p = ui.pdfUi;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(pdfSafe(`AutoLife World · ${ui.analyticsUi.title}`), margin, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    pdfSafe(`${organizationName || ui.garageUi.fleet.title} · ${p.issuedLabel} ${todayIso()} · ${vehicles.length} ${ui.plansUi.vehicleUnit}(s)`),
    margin,
    21
  );

  y = 38;
  const currentMonth = todayIso().slice(0, 7);
  const monthlySpend =
    logs
      .filter((l) => l.date.startsWith(currentMonth))
      .reduce((acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency), 0) +
    chargingSessions
      .filter((c) => c.date.startsWith(currentMonth))
      .reduce((acc, c) => acc + convertCurrency(c.cost, c.currency ?? 'BRL', prefs.currency), 0);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(
    pdfSafe(
      `${p.summaryTotal} (${currentMonth}): ${formatCurrency(monthlySpend, prefs.currency)} · ${p.odometerLabel}: ${formatDistance(
        vehicles.reduce((acc, v) => acc + v.odometerKm, 0),
        prefs.units
      )}`
    ),
    margin,
    y
  );
  y += 8;

  for (const v of vehicles) {
    if (y > pageHeight - 28) {
      doc.addPage();
      y = 18;
    }
    const vItems = maintenanceItems.filter((i) => i.vehicleId === v.id);
    const overdue = vItems.filter(
      (i) => computeMaintenanceStatus(i, v, prefs).status === MaintenanceStatus.OVERDUE
    ).length;
    const attention = vItems.filter(
      (i) => computeMaintenanceStatus(i, v, prefs).status === MaintenanceStatus.ATTENTION
    ).length;
    const vSpend = logs
      .filter((l) => l.vehicleId === v.id)
      .reduce((acc, l) => acc + convertCurrency(l.cost, l.currency ?? 'BRL', prefs.currency), 0);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(
      pdfSafe(`${v.make} ${v.model} (${v.year}) · ${v.plate}`),
      margin,
      y
    );
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      pdfSafe(
        `${p.odometerLabel}: ${formatDistance(v.odometerKm, prefs.units)} · ${tr.status.overdue}: ${overdue} · ${tr.status.attention}: ${attention} · ${p.summaryTotal}: ${formatCurrency(
          vSpend,
          prefs.currency
        )} · ${ui.garageUi.fleet.colDriver}: ${v.assignedMemberName || ui.garageUi.fleet.unassigned}`
      ),
      margin,
      y
    );
    y += 4.5;
    doc.text(
      pdfSafe(
        `${p.docExpiryLabel}: ${isDateRecorded(v.documentExpiryDate) ? v.documentExpiryDate : p.notInformed} · ${p.insExpiryLabel}: ${
          isDateRecorded(v.insuranceExpiryDate) ? v.insuranceExpiryDate : p.notInformed
        }`
      ),
      margin,
      y
    );
    doc.setTextColor(15, 23, 42);
    y += 5;
  }

  const filename = `${p.filenamePrefix}-Fleet-${todayIso()}.pdf`;
  return { blob: doc.output('blob'), filename };
}
