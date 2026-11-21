import { categoryFromName, isOnDuty, type CategorySlug } from "./rules";

export type AreaRateItem = {
  area: string;
  rate: string;
};

export const MAX_AREA_RATES = 60;

export const ALLOWED_CATEGORIES = [
  "3-Wheeler Auto",
  "Load Vehicle",
  "4-Wheeler",
  "Category 4",
] as const;

export type DriverCategory = (typeof ALLOWED_CATEGORIES)[number];

export type Driver = {
  id: string;
  name: string;
  category: string;
  categorySlug: CategorySlug | null;
  phone: string;
  altPhone: string;
  whatsapp: string;
  address: string;
  serviceArea: string;
  areaRates: AreaRateItem[];
  photoUrl: string;
  rating: number | null;
  totalRides: number | null;
  reviews: number | null;
  status: string;
  online: boolean;
  lat: number;
  lng: number;
  hasRealLocation: boolean;
  local?: boolean | undefined;
};

export const SHIRPUR = { lat: 21.3486, lng: 74.8806 };

type Row = Record<string, unknown>;

function pick(row: Row, ...names: string[]): unknown {
  const wanted = names.map((n) => n.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (wanted.includes(key) && v !== "" && v != null) return v;
  }
  return undefined;
}

const str = (v: unknown) => (v == null ? "" : String(v).trim());

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(str(v));
  return Number.isFinite(n) ? n : null;
};

export const digits = (v: unknown) => str(v).replace(/\D/g, "");

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Spread drivers without coordinates around Shirpur so they appear on the map. */
export function fallbackPosition(id: string) {
  const h = hash(id);
  const angle = ((h % 360) * Math.PI) / 180;
  const r = 0.004 + (((h >>> 9) % 100) / 100) * 0.014;
  return {
    lat: SHIRPUR.lat + Math.sin(angle) * r,
    lng: SHIRPUR.lng + Math.cos(angle) * r,
  };
}

/** Parses and normalizes driver manual Area + Rate pairs (up to MAX_AREA_RATES = 60). */
export function parseAreaRates(raw: unknown): AreaRateItem[] {
  let parsed: unknown = raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  const result: AreaRateItem[] = [];
  for (const item of parsed) {
    if (result.length >= MAX_AREA_RATES) break;
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const area = str(obj.area ?? obj.location ?? obj.place);
    const rate = str(obj.rate ?? obj.fare ?? obj.price ?? obj.amount);
    if (!area && !rate) continue;
    result.push({ area, rate });
  }

  return result;
}

/** Cleanly prepares Area + Rate entries before saving/editing in Supabase (max 60). */
export function sanitizeAreaRatesForSave(items: AreaRateItem[]): AreaRateItem[] {
  const cleaned: AreaRateItem[] = [];
  for (const item of items) {
    if (cleaned.length >= MAX_AREA_RATES) break;
    const area = str(item.area);
    const rate = str(item.rate);
    if (!area || !rate) continue;
    cleaned.push({ area, rate });
  }
  return cleaned;
}

function resolveOnline(row: Row, status: string): boolean {
  const rawAvail = pick(row, "is_available", "isAvailable", "available");
  if (typeof rawAvail === "boolean") return rawAvail;
  if (typeof rawAvail === "string") {
    const lower = rawAvail.trim().toLowerCase();
    if (lower === "true" || lower === "online" || lower === "available") return true;
    if (lower === "false" || lower === "offline" || lower === "busy") return false;
  }
  return isOnDuty(status || "Online");
}

export function normalizeDriver(row: Row, index: number): Driver | null {
  const name = str(pick(row, "driver_name", "Driver_Name", "Name", "Full_Name", "full_name"));
  if (!name) return null;

  const phone = digits(
    pick(row, "phone", "Phone number", "Phone", "Contact", "Contact_Number", "Mobile")
  );
  const id = str(pick(row, "id")) || phone || `row${index}`;

  const lat = num(pick(row, "last_lat", "Latitude", "Lat", "lat"));
  const lng = num(pick(row, "last_lng", "Longitude", "Lng", "Long", "lng"));
  const pos = lat != null && lng != null ? { lat, lng } : fallbackPosition(id);

  const category = str(
    pick(row, "category", "Category", "vehicle_type", "Vehicle", "Vehicle_Type")
  );
  const status =
    str(pick(row, "status", "Status", "Duty")) ||
    (resolveOnline(row, "") ? "Online" : "Offline");

  const areaRates = parseAreaRates(
    pick(row, "area_rates", "areaRates", "rate_card", "rates")
  );

  const serviceArea =
    str(pick(row, "service_area", "serviceArea", "address", "Address", "Full_Address")) ||
    areaRates.map((x) => x.area).filter(Boolean).join(", ");

  return {
    id,
    name,
    category,
    categorySlug: categoryFromName(category),
    phone,
    altPhone: digits(
      pick(row, "alt_phone", "Alternate_Phone", "Alternate", "Alternate_Mobile")
    ),
    whatsapp: digits(pick(row, "whatsapp", "WhatsApp", "Whatsapp_Number")) || phone,
    address: serviceArea,
    serviceArea,
    areaRates,
    photoUrl: str(pick(row, "photo_url", "Photo_URL", "Photo")),
    rating: num(pick(row, "rating", "Rating")),
    totalRides: num(pick(row, "total_rides", "Total_Rides", "Rides")),
    reviews: num(pick(row, "reviews", "Reviews", "Review_Count", "Total_Reviews")),
    status,
    online: resolveOnline(row, status),
    lat: pos.lat,
    lng: pos.lng,
    hasRealLocation: lat != null && lng != null,
  };
}

export function withCountryCode(d: string) {
  if (!d) return "";
  return d.length === 10 ? `91${d}` : d;
}

export function formatPhone(d: string) {
  const full = withCountryCode(d);
  if (full.length === 12 && full.startsWith("91")) {
    return `+91 ${full.slice(2, 7)} ${full.slice(7)}`;
  }
  return d ? `+${full}` : "—";
}

export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
