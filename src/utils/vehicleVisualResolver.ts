import { getUi } from '../data/uiTranslations';
import { LanguageCode, PowertrainType, Vehicle, VehicleAttachment } from '../types/autolife';

export const VEHICLE_STUDIO_ASSETS = {
  carSedan: '/src/assets/images/vehicle_car_sedan_1795879054668.jpg',
  carEv: '/src/assets/images/vehicle_car_ev_1795879054504.jpg',
  motoStreet: '/src/assets/images/vehicle_moto_street_1795879054979.jpg',
  motoTrail: '/src/assets/images/vehicle_moto_trail_1795879055908.jpg',
} as const;

export interface VehicleColorSwatch {
  id: string;
  label: string;
  primaryHex: string;
  highlightHex: string;
  shadowHex: string;
  borderHex: string;
  searchKeywordEn: string;
  aliases: string[];
}

export const VEHICLE_COLOR_SWATCHES: VehicleColorSwatch[] = [
  {
    id: 'white',
    label: 'Branco',
    primaryHex: '#f1f5f9',
    highlightHex: '#ffffff',
    shadowHex: '#cbd5e1',
    borderHex: '#94a3b8',
    searchKeywordEn: 'white',
    aliases: ['branco', 'branca', 'white', 'blanco', 'blanca', 'blanc', 'weiss', 'weiß', 'perola', 'pérola', 'pearl'],
  },
  {
    id: 'black',
    label: 'Preto',
    primaryHex: '#1e293b',
    highlightHex: '#475569',
    shadowHex: '#090d16',
    borderHex: '#475569',
    searchKeywordEn: 'black',
    aliases: ['preto', 'preta', 'black', 'negro', 'negra', 'noir', 'schwarz', 'ebony'],
  },
  {
    id: 'silver',
    label: 'Prata',
    primaryHex: '#cbd5e1',
    highlightHex: '#f1f5f9',
    shadowHex: '#94a3b8',
    borderHex: '#94a3b8',
    searchKeywordEn: 'silver',
    aliases: ['prata', 'prateado', 'prateada', 'silver', 'plata', 'argent', 'silber'],
  },
  {
    id: 'gray',
    label: 'Cinza',
    primaryHex: '#64748b',
    highlightHex: '#94a3b8',
    shadowHex: '#334155',
    borderHex: '#64748b',
    searchKeywordEn: 'gray',
    aliases: ['cinza', 'cinzento', 'cinzenta', 'grafite', 'gray', 'grey', 'gris', 'grau', 'graphite', 'chumbo'],
  },
  {
    id: 'red',
    label: 'Vermelho',
    primaryHex: '#dc2626',
    highlightHex: '#f87171',
    shadowHex: '#7f1d1d',
    borderHex: '#ef4444',
    searchKeywordEn: 'red',
    aliases: ['vermelho', 'vermelha', 'red', 'rojo', 'roja', 'rouge', 'rot', 'vinho', 'bordo', 'bordô', 'crimson'],
  },
  {
    id: 'blue',
    label: 'Azul',
    primaryHex: '#2563eb',
    highlightHex: '#60a5fa',
    shadowHex: '#1e3a8a',
    borderHex: '#3b82f6',
    searchKeywordEn: 'blue',
    aliases: ['azul', 'blue', 'bleu', 'blau', 'marinho', 'navy', 'ciano', 'cyan', 'cobalt'],
  },
  {
    id: 'green',
    label: 'Verde',
    primaryHex: '#16a34a',
    highlightHex: '#4ade80',
    shadowHex: '#14532d',
    borderHex: '#22c55e',
    searchKeywordEn: 'green',
    aliases: ['verde', 'green', 'vert', 'grun', 'grün', 'musgo', 'emerald'],
  },
  {
    id: 'yellow',
    label: 'Amarelo',
    primaryHex: '#eab308',
    highlightHex: '#fde047',
    shadowHex: '#a16207',
    borderHex: '#facc15',
    searchKeywordEn: 'yellow',
    aliases: ['amarelo', 'amarela', 'yellow', 'amarillo', 'amarilla', 'jaune', 'gelb', 'dourado', 'dourada', 'gold'],
  },
  {
    id: 'brown',
    label: 'Marrom',
    primaryHex: '#78350f',
    highlightHex: '#b45309',
    shadowHex: '#451a03',
    borderHex: '#92400e',
    searchKeywordEn: 'brown',
    aliases: ['marrom', 'brown', 'marron', 'marrón', 'braun', 'bronze', 'bege', 'beige', 'cafe', 'café'],
  },
  {
    id: 'orange',
    label: 'Laranja',
    primaryHex: '#ea580c',
    highlightHex: '#fb923c',
    shadowHex: '#9a3412',
    borderHex: '#f97316',
    searchKeywordEn: 'orange',
    aliases: ['laranja', 'orange', 'naranja', 'copper', 'cobre'],
  },
];

export function getLocalizedColorLabel(colorIdOrText: string, language: LanguageCode): string {
  const ui = getUi(language).vehicleColors.labels;
  if (ui[colorIdOrText]) return ui[colorIdOrText];
  const normalized = normalizeColorToken(colorIdOrText);
  for (const swatch of VEHICLE_COLOR_SWATCHES) {
    if (swatch.id === normalized || swatch.aliases.some((a) => normalizeColorToken(a) === normalized)) {
      return ui[swatch.id] ?? swatch.label;
    }
  }
  return colorIdOrText;
}

export interface ResolvedVehicleColorStyle {
  hasColor: boolean;
  displayName: string;
  primaryHex: string;
  highlightHex: string;
  shadowHex: string;
  borderHex: string;
  searchKeywordEn: string;
}

function normalizeColorToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = Number.parseInt(full, 16);
  if (!Number.isFinite(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const adjust = (c: number) =>
    Math.max(
      0,
      Math.min(255, Math.round(factor >= 0 ? c + (255 - c) * factor : c * (1 + factor)))
    );
  return `#${[adjust(r), adjust(g), adjust(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function resolveVehicleColorStyle(colorText?: string): ResolvedVehicleColorStyle {
  const trimmed = (colorText ?? '').trim();
  if (!trimmed) {
    return {
      hasColor: false,
      displayName: '',
      primaryHex: '#38bdf8',
      highlightHex: '#7dd3fc',
      shadowHex: '#0369a1',
      borderHex: '#38bdf8',
      searchKeywordEn: '',
    };
  }

  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return {
      hasColor: true,
      displayName: trimmed.toUpperCase(),
      primaryHex: trimmed,
      highlightHex: shadeHex(trimmed, 0.35),
      shadowHex: shadeHex(trimmed, -0.45),
      borderHex: trimmed,
      searchKeywordEn: '',
    };
  }

  const normalized = normalizeColorToken(trimmed);
  for (const swatch of VEHICLE_COLOR_SWATCHES) {
    if (
      swatch.aliases.some(
        (alias) => normalized === alias || normalized.includes(alias)
      )
    ) {
      // Handle nuanced tones (e.g. "bege" -> warmer sand shade)
      if (normalized.includes('bege') || normalized.includes('beige')) {
        return {
          hasColor: true,
          displayName: trimmed,
          primaryHex: '#d6c3a5',
          highlightHex: '#efe4d2',
          shadowHex: '#9c8665',
          borderHex: '#bfa989',
          searchKeywordEn: 'beige',
        };
      }
      if (normalized.includes('vinho') || normalized.includes('bordo') || normalized.includes('burgundy')) {
        return {
          hasColor: true,
          displayName: trimmed,
          primaryHex: '#881337',
          highlightHex: '#be123c',
          shadowHex: '#4c0519',
          borderHex: '#9f1239',
          searchKeywordEn: 'burgundy',
        };
      }
      if (normalized.includes('dourad') || normalized.includes('gold')) {
        return {
          hasColor: true,
          displayName: trimmed,
          primaryHex: '#d4af37',
          highlightHex: '#f3e5ab',
          shadowHex: '#8a6d1c',
          borderHex: '#d4af37',
          searchKeywordEn: 'gold',
        };
      }
      return {
        hasColor: true,
        displayName: trimmed,
        primaryHex: swatch.primaryHex,
        highlightHex: swatch.highlightHex,
        shadowHex: swatch.shadowHex,
        borderHex: swatch.borderHex,
        searchKeywordEn: swatch.searchKeywordEn,
      };
    }
  }

  return {
    hasColor: true,
    displayName: trimmed,
    primaryHex: '#64748b',
    highlightHex: '#94a3b8',
    shadowHex: '#334155',
    borderHex: '#64748b',
    searchKeywordEn: normalized,
  };
}

const CACHE_STORAGE_KEY = 'autolife_vehicle_img_cache_v2';
const HIT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;

interface CacheEntry {
  url: string | null;
  ts: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inflightLookups = new Map<string, Promise<string | null>>();

function normalizeLookupKey(
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model' | 'color'>
): string {
  const type = vehicle.vehicleType === 'motorcycle' ? 'moto' : 'car';
  const make = vehicle.make.trim().toLowerCase().replace(/\s+/g, ' ');
  const model = vehicle.model.trim().toLowerCase().replace(/\s+/g, ' ');
  const colorStyle = resolveVehicleColorStyle(vehicle.color);
  const colorSlug = colorStyle.searchKeywordEn || normalizeColorToken(vehicle.color ?? '');
  return `${type}::${make}::${model}::${colorSlug}`;
}

export function isValidHttpsImageUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return false;
    const lowerPath = parsed.pathname.toLowerCase();
    // Skip vector flag/logo/placeholder icons that don't represent the vehicle
    if (lowerPath.endsWith('.svg')) return false;
    return true;
  } catch {
    return false;
  }
}

export function getUserVehiclePhotoUrl(
  vehicle: Pick<Vehicle, 'id'> | null | undefined,
  attachments: VehicleAttachment[] = []
): string | null {
  if (!vehicle) return null;
  const photos = attachments
    .filter(
      (att) =>
        att.vehicleId === vehicle.id &&
        att.fileCategory === 'vehicle_photo' &&
        isValidHttpsImageUrl(att.signedUrl)
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return photos[0]?.signedUrl ?? null;
}

export function resolveVehicleFallbackVisual(
  vehicle: Pick<Vehicle, 'vehicleType' | 'powertrain' | 'make' | 'model' | 'color'> | null | undefined,
  language: LanguageCode = 'pt'
): {
  src: string;
  isMoto: boolean;
  isEv: boolean;
  bodyStyle: 'sedan' | 'suv' | 'street' | 'trail';
  categoryLabel: string;
  colorStyle: ResolvedVehicleColorStyle;
} {
  const colorStyle = resolveVehicleColorStyle(vehicle?.color);
  const catLabels = getUi(language).vehicleColors.categoryLabels;
  if (!vehicle) {
    return {
      src: VEHICLE_STUDIO_ASSETS.carSedan,
      isMoto: false,
      isEv: false,
      bodyStyle: 'sedan',
      categoryLabel: catLabels.sedan,
      colorStyle,
    };
  }

  const isMoto = vehicle.vehicleType === 'motorcycle';
  const isEv =
    vehicle.powertrain === PowertrainType.ELECTRIC ||
    vehicle.powertrain === PowertrainType.HYBRID;
  const signature = `${vehicle.make} ${vehicle.model}`.toLowerCase();

  if (isMoto) {
    const isTrailOrTouring =
      /\b(gs|tiger|tenere|ténéré|africa|transalp|versys|v-strom|vstrom|tracer|multistrada|nc750|nc 750|xre|bros|lander|crosser|sahara|himalayan|trail|adventure|adv|touring|scrambler)\b/i.test(
        signature
      );
    return {
      src: isTrailOrTouring
        ? VEHICLE_STUDIO_ASSETS.motoTrail
        : VEHICLE_STUDIO_ASSETS.motoStreet,
      isMoto: true,
      isEv,
      bodyStyle: isTrailOrTouring ? 'trail' : 'street',
      categoryLabel: isTrailOrTouring ? catLabels.motoTrail : catLabels.moto,
      colorStyle,
    };
  }

  const isSuvOrEv =
    isEv ||
    /\b(suv|crossover|compass|renegade|commander|creta|tracker|t-cross|tcross|nivus|taos|tiguan|kicks|hr-v|hrv|zr-v|corolla cross|rav4|sw4|hilux|ranger|s10|toro|strada|duster|oroch|fastback|pulse|dolphin|yuan|seal|song|atto|model [3yxs]|taycan|etron|e-tron|ix|ex30|xc40|xc60|xc90|id\.?4|ev6|ioniq|kona)\b/i.test(
      signature
    );

  return {
    src: isSuvOrEv ? VEHICLE_STUDIO_ASSETS.carEv : VEHICLE_STUDIO_ASSETS.carSedan,
    isMoto: false,
    isEv,
    bodyStyle: isSuvOrEv ? 'suv' : 'sedan',
    categoryLabel: isEv ? catLabels.electric : isSuvOrEv ? catLabels.suv : catLabels.sedan,
    colorStyle,
  };
}

function readPersistentCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CacheEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePersistentCache(key: string, entry: CacheEntry): void {
  memoryCache.set(key, entry);
  try {
    const store = readPersistentCache();
    store[key] = entry;
    const keys = Object.keys(store);
    if (keys.length > MAX_CACHE_ENTRIES) {
      keys
        .sort((a, b) => (store[a]?.ts ?? 0) - (store[b]?.ts ?? 0))
        .slice(0, keys.length - MAX_CACHE_ENTRIES)
        .forEach((oldestKey) => {
          delete store[oldestKey];
        });
    }
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota issues silently
  }
}

export function getCachedDynamicVehicleImage(
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model' | 'color'> | null | undefined
): string | null | undefined {
  if (!vehicle) return null;
  const key = normalizeLookupKey(vehicle);
  const mem = memoryCache.get(key);
  if (mem) {
    const ttl = mem.url ? HIT_TTL_MS : MISS_TTL_MS;
    if (Date.now() - mem.ts < ttl) {
      return mem.url;
    }
    memoryCache.delete(key);
  }

  const persisted = readPersistentCache()[key];
  if (persisted && typeof persisted.ts === 'number') {
    const ttl = persisted.url ? HIT_TTL_MS : MISS_TTL_MS;
    if (Date.now() - persisted.ts < ttl) {
      if (persisted.url === null || isValidHttpsImageUrl(persisted.url)) {
        memoryCache.set(key, persisted);
        return persisted.url;
      }
    }
  }

  return undefined;
}

function buildWikipediaTitles(
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model'>
): string[] {
  const cleanMake = vehicle.make.trim().replace(/[^\p{L}\p{N}\s.-]/gu, '');
  const cleanModel = vehicle.model.trim().replace(/[^\p{L}\p{N}\s.-]/gu, '');
  if (!cleanMake || !cleanModel) return [];

  const combined = `${cleanMake} ${cleanModel}`.replace(/\s+/g, '_');
  const simplifiedModel = cleanModel
    .replace(/\b(flex|turbo|tsi|tfsi|gdi|hybrid|ev|4x4|awd|abs|cbs|ex|lx|se|lt|ltz|highline|comfortline|limited|sport|premier|edition)\b/gi, '')
    .trim()
    .replace(/\s+/g, '_');

  const candidates = new Set<string>();
  if (vehicle.vehicleType === 'motorcycle') {
    candidates.add(`${combined}_(motorcycle)`);
    candidates.add(`${combined}_motorcycle`);
    candidates.add(combined);
    if (simplifiedModel && simplifiedModel !== cleanModel.replace(/\s+/g, '_')) {
      candidates.add(`${cleanMake.replace(/\s+/g, '_')}_${simplifiedModel}`);
    }
  } else {
    candidates.add(combined);
    if (simplifiedModel && simplifiedModel !== cleanModel.replace(/\s+/g, '_')) {
      candidates.add(`${cleanMake.replace(/\s+/g, '_')}_${simplifiedModel}`);
    }
  }
  return Array.from(candidates).slice(0, 3);
}

interface WikimediaCommonsResponse {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{
          url?: string;
          thumburl?: string;
          mime?: string;
          width?: number;
          height?: number;
        }>;
      }
    >;
  };
}

async function fetchWikimediaColorVehicleImage(
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model' | 'color'>,
  colorKeyword: string
): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }
  const cleanMake = vehicle.make.trim().replace(/[^\p{L}\p{N}\s.-]/gu, '');
  const cleanModel = vehicle.model
    .trim()
    .replace(/[^\p{L}\p{N}\s.-]/gu, '')
    .replace(/\b(flex|turbo|tsi|tfsi|gdi|4x4|awd|abs|cbs|ex|lx|se|lt|ltz)\b/gi, '')
    .trim();
  if (!cleanMake || !cleanModel || !colorKeyword) return null;

  const isMoto = vehicle.vehicleType === 'motorcycle';
  const query = isMoto
    ? `${cleanMake} ${cleanModel} ${colorKeyword} motorcycle`
    : `${cleanMake} ${cleanModel} ${colorKeyword}`;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);
  try {
    const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=800&origin=*&format=json&gsrsearch=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as WikimediaCommonsResponse;
    const pages = Object.values(data.query?.pages ?? {});
    const makeToken = cleanMake.toLowerCase().split(/\s+/)[0] || '';
    const modelToken = cleanModel.toLowerCase().split(/\s+/)[0] || '';
    const colorLower = colorKeyword.toLowerCase();

    for (const page of pages) {
      const titleLower = (page.title ?? '').toLowerCase();
      if (
        /(interior|cockpit|dashboard|engine|wheel|rim|logo|emblem|badge|seat|crash|wreck|drawing|diagram|sketch)/i.test(
          titleLower
        )
      ) {
        continue;
      }
      const matchesVehicle =
        (makeToken && titleLower.includes(makeToken)) ||
        (modelToken && titleLower.includes(modelToken));
      if (!matchesVehicle || !titleLower.includes(colorLower)) continue;

      const info = page.imageinfo?.[0];
      if (!info) continue;
      if (!info.mime || !['image/jpeg', 'image/png', 'image/webp'].includes(info.mime)) {
        continue;
      }
      if ((info.width ?? 0) < 320 || (info.height ?? 0) < 180) continue;

      const candidateUrl = info.thumburl || info.url;
      if (isValidHttpsImageUrl(candidateUrl)) {
        return candidateUrl;
      }
    }
  } catch {
    // Silent fallback
  } finally {
    window.clearTimeout(timeoutId);
  }
  return null;
}

interface WikiSummaryResponse {
  type?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
  originalimage?: { source?: string; width?: number; height?: number };
}

async function fetchWikipediaVehicleThumbnail(
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model'>
): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }

  const titles = buildWikipediaTitles(vehicle);
  for (const title of titles) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 4500);
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as WikiSummaryResponse;
      if (data.type === 'disambiguation') continue;

      const textBlob = `${data.description ?? ''} ${data.extract ?? ''}`.toLowerCase();
      const looksAutomotive =
        /\b(car|automobile|sedan|hatchback|suv|crossover|pickup|truck|vehicle|electric|motorcycle|scooter|motorbike|superbike|sportbike|cruiser|enduro|produced by|manufactured by)\b/.test(
          textBlob
        );
      if (!looksAutomotive) continue;

      const candidateUrl = data.thumbnail?.source || data.originalimage?.source;
      if (isValidHttpsImageUrl(candidateUrl)) {
        return candidateUrl;
      }
    } catch {
      // Silent fallback on abort/offline/CORS failure
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  return null;
}

export async function lookupDynamicVehicleImage(
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model' | 'color'> | null | undefined
): Promise<string | null> {
  if (!vehicle || !vehicle.make.trim() || !vehicle.model.trim()) return null;

  const cached = getCachedDynamicVehicleImage(vehicle);
  if (cached !== undefined) {
    return cached;
  }

  const key = normalizeLookupKey(vehicle);
  const existingInflight = inflightLookups.get(key);
  if (existingInflight) {
    return existingInflight;
  }

  const colorStyle = resolveVehicleColorStyle(vehicle.color);

  const promise = (async () => {
    if (colorStyle.searchKeywordEn) {
      const coloredPhoto = await fetchWikimediaColorVehicleImage(
        vehicle,
        colorStyle.searchKeywordEn
      );
      if (coloredPhoto) return coloredPhoto;
    }
    return fetchWikipediaVehicleThumbnail(vehicle);
  })()
    .then((foundUrl) => {
      writePersistentCache(key, { url: foundUrl, ts: Date.now() });
      return foundUrl;
    })
    .catch(() => null)
    .finally(() => {
      inflightLookups.delete(key);
    });

  inflightLookups.set(key, promise);
  return promise;
}
