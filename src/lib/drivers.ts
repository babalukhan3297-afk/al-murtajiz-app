import { categoryFromName, isOnDuty, type CategorySlug } from "./rules";

export type Driver = {
  id: string;
  name: string;
  category: string;
  categorySlug: CategorySlug | null;
  phone: string;
  altPhone: string;
  whatsapp: string;
  address: string;
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
  const r = 0.004 + ((h >>> 9) % 100) / 100 * 0.014;
  return { lat: SHIRPUR.lat + Math.sin(angle) * r, lng: SHIRPUR.lng + Math.cos(angle) * r };
}

export function normalizeDriver(row: Row, index: number): Driver | null {
  const name = str(pick(row, "Driver_Name", "Name", "Full_Name"));
  if (!name) return null;
  const phone = digits(pick(row, "Phone number", "Phone", "Contact", "Contact_Number", "Mobile"));
  const id = phone || `row${index}`;
  const lat = num(pick(row, "Latitude", "Lat"));
  const lng = num(pick(row, "Longitude", "Lng", "Long"));
  const pos = lat != null && lng != null ? { lat, lng } : fallbackPosition(id);
  const category = str(pick(row, "Category", "Vehicle", "Vehicle_Type"));
  const status = str(pick(row, "Status", "Duty"));
  return {
    id,
    name,
    category,
    categorySlug: categoryFromName(category),
    phone,
    altPhone: digits(pick(row, "Alternate_Phone", "Alternate", "Alternate_Mobile")),
    whatsapp: digits(pick(row, "WhatsApp", "Whatsapp_Number")) || phone,
    address: str(pick(row, "Address", "Full_Address")),
    photoUrl: str(pick(row, "Photo_URL", "Photo")),
    rating: num(pick(row, "Rating")),
    totalRides: num(pick(row, "Total_Rides", "Rides")),
    reviews: num(pick(row, "Reviews", "Review_Count", "Total_Reviews")),
    status,
    online: isOnDuty(status),
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

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
