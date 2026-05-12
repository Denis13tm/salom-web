import { SALOM_API_URL } from "./salomOperator";
import { getStoredServiceZoneId, setStoredServiceZoneId } from "./salomOperator";

export type PublicServiceZone = {
  id: string;
  name: string;
  slug: string;
  /** Xarita markazi (DB); yo‘q bo‘lsa butun O‘zbekiston umumiy ko‘rinish */
  centerLat: number | null;
  centerLng: number | null;
  /** Boshlang‘ich xizmat narxi (pickup zonasi) */
  starterFeeUzs: number | null;
  waitingFreeMinutes: number | null;
  waitingFeePerMinuteUzs: number | null;
  pricingProfile: {
    id: string;
    name: string;
    cityKmRateUzs: number;
    outsideKmRateUzs: number;
    freeWaitMinutes: number;
    waitPerMinuteUzs: number;
    rings: {
      id: string;
      code: string;
      name: string;
      radiusFromKm: number;
      radiusToKm: number | null;
      starterFeeUzs: number;
      distanceRateUzs: number | null;
      sortOrder: number;
    }[];
  } | null;
};

let cache: { zones: PublicServiceZone[]; at: number } | null = null;
const TTL_MS = 60_000;

export function fetchPublicServiceZones(): Promise<PublicServiceZone[]> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return Promise.resolve(cache.zones);
  }
  return fetch(`${SALOM_API_URL}/api/v1/public/service-zones`)
    .then((r) => {
      if (!r.ok) throw new Error("service-zones");
      return r.json() as Promise<PublicServiceZone[]>;
    })
    .then((raw) => {
      const zones: PublicServiceZone[] = raw.map((z) => ({
        id: z.id,
        name: z.name,
        slug: z.slug,
        centerLat: z.centerLat ?? null,
        centerLng: z.centerLng ?? null,
        starterFeeUzs: z.starterFeeUzs ?? null,
        waitingFreeMinutes: z.waitingFreeMinutes ?? null,
        waitingFeePerMinuteUzs: z.waitingFeePerMinuteUzs ?? null,
        pricingProfile: z.pricingProfile ?? null,
      }));
      cache = { zones, at: Date.now() };
      return zones;
    });
}

export function clearPublicServiceZonesCache() {
  cache = null;
}

export function publicZoneLabel(zones: PublicServiceZone[] | null, id: string): string | null {
  return zones?.find((z) => z.id === id)?.name ?? null;
}

/** Butun O‘zbekiston (Carto Voyager) — zoom in qilib istalgan shahar yorlig‘i ochiladi */
const UZ_OVERVIEW = { lng: 64.25, lat: 41.35, zoom: 5.85 } as const;

/**
 * Operator xaritasi: DB dagi xizmat zonasi markazi yoki umumiy O‘zbekiston ko‘rinishi.
 */
export function mapFocusForServiceZone(
  zones: PublicServiceZone[] | null | undefined,
  zoneId: string,
): { lng: number; lat: number; zoom: number } {
  const z = zones?.find((x) => x.id === zoneId);
  const lat = z?.centerLat;
  const lng = z?.centerLng;
  if (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    typeof lng === "number" &&
    Number.isFinite(lng)
  ) {
    return { lng, lat, zoom: 11.35 };
  }
  return { ...UZ_OVERVIEW };
}

/**
 * Ayni vaqtdagi `value` ro‘yxatda bo‘lmasa, `onChange` orqali to‘g‘ri ID qayta tanlanadi
 * (tizim yoki foydalanuvchi o‘rnatgan default UUID — DBdagi shaharlar ro‘yxatiga tushmasligi mumkin).
 */
export function pickValidServiceZoneId(
  zones: PublicServiceZone[] | null | undefined,
  value: string,
): { id: string; changed: boolean } {
  if (zones == null || zones.length === 0) {
    return { id: value, changed: false };
  }
  if (zones.some((z) => z.id === value)) {
    return { id: value, changed: false };
  }
  const stored = getStoredServiceZoneId();
  const fromStored = stored && zones.some((z) => z.id === stored) ? stored : null;
  const next = fromStored ?? zones[0]!.id;
  return { id: next, changed: next !== value };
}
