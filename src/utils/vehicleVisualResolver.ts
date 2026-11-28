import { PowertrainType, Vehicle, VehicleAttachment } from '../types/autolife';

export const VEHICLE_STUDIO_ASSETS = {
  carSedan: '/src/assets/images/vehicle_car_sedan_1795879054668.jpg',
  carEv: '/src/assets/images/vehicle_car_ev_1795879054504.jpg',
  motoStreet: '/src/assets/images/vehicle_moto_street_1795879054979.jpg',
  motoTrail: '/src/assets/images/vehicle_moto_trail_1795879055908.jpg',
} as const;

const CACHE_STORAGE_KEY = 'autolife_vehicle_img_cache_v1';
const HIT_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;

interface CacheEntry {
  url: string | null;
  ts: number;
}

const memoryCache = new Map<string, CacheEntry>();
const inflightLookups = new Map<string, Promise<string | null>>();

function normalizeLookupKey(vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model'>): string {
  const type = vehicle.vehicleType === 'motorcycle' ? 'moto' : 'car';
  const make = vehicle.make.trim().toLowerCase().replace(/\s+/g, ' ');
  const model = vehicle.model.trim().toLowerCase().replace(/\s+/g, ' ');
  return `${type}::${make}::${model}`;
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
  vehicle: Pick<Vehicle, 'vehicleType' | 'powertrain' | 'make' | 'model'> | null | undefined
): {
  src: string;
  isMoto: boolean;
  isEv: boolean;
  categoryLabel: string;
} {
  if (!vehicle) {
    return {
      src: VEHICLE_STUDIO_ASSETS.carSedan,
      isMoto: false,
      isEv: false,
      categoryLabel: 'Automóvel',
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
      categoryLabel: isTrailOrTouring ? 'Moto Trail / Touring' : 'Motocicleta',
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
    categoryLabel: isEv ? 'Elétrico / Híbrido' : isSuvOrEv ? 'SUV / Utilitário' : 'Automóvel',
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
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model'> | null | undefined
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
  vehicle: Pick<Vehicle, 'vehicleType' | 'make' | 'model'> | null | undefined
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

  const promise = fetchWikipediaVehicleThumbnail(vehicle)
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
