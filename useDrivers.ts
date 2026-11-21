import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppState } from "./session";
import { categoryFromName } from "./rules";
import {
  digits,
  fallbackPosition,
  normalizeDriver,
  parseAreaRates,
  type Driver,
} from "./drivers";
import { supabaseFetch } from "./supabase";

function normalizePhoneKey(raw: string): string {
  const d = digits(raw);
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d;
}

/** Remote drivers (Supabase) plus drivers registered on this phone that haven't synced yet. */
export function useAllDrivers(remoteDrivers: Driver[]): Driver[] {
  const s = useAppState();
  return useMemo(() => {
    const byKey = new Map<string, Driver>();

    for (const d of remoteDrivers) {
      const key = normalizePhoneKey(d.phone) || d.id;
      byKey.set(key, d);
    }

    for (const acc of Object.values(s.accounts)) {
      const p = acc.driver;
      if (!p) continue;
      const cleanPhone = normalizePhoneKey(p.contact);
      const id = `91${cleanPhone}`;
      const existing = byKey.get(cleanPhone);
      const online = !!acc.duty;

      const localAreaRates = parseAreaRates(
        (p as Record<string, unknown>).areaRates ??
          (p as Record<string, unknown>).area_rates
      );

      if (existing) {
        byKey.set(cleanPhone, {
          ...existing,
          online,
          areaRates:
            localAreaRates.length > 0 ? localAreaRates : existing.areaRates,
        });
        continue;
      }

      const pos = fallbackPosition(id);
      const serviceArea =
        p.address ||
        localAreaRates
          .map((item) => item.area)
          .filter(Boolean)
          .join(", ");

      byKey.set(cleanPhone, {
        id,
        name: p.name,
        category: p.category,
        categorySlug: categoryFromName(p.category),
        phone: cleanPhone,
        altPhone: p.altContact ? `91${normalizePhoneKey(p.altContact)}` : "",
        whatsapp: `91${normalizePhoneKey(p.whatsapp || cleanPhone)}`,
        address: serviceArea,
        serviceArea,
        areaRates: localAreaRates,
        photoUrl: p.photo ?? "",
        rating: null,
        totalRides: null,
        reviews: null,
        status: online ? "Online" : "Offline",
        online,
        lat: pos.lat,
        lng: pos.lng,
        hasRealLocation: false,
        local: true,
      });
    }

    return [...byKey.values()];
  }, [remoteDrivers, s.accounts]);
}

/** Fetches drivers directly from Supabase and merges with local phone-registered drivers. */
export function useSupabaseDrivers() {
  const [remoteDrivers, setRemoteDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await supabaseFetch<
      Record<string, unknown>[]
    >("drivers?select=*&order=updated_at.desc");

    if (fetchErr || !Array.isArray(data)) {
      setError("Couldn't reach the driver list right now.");
    } else {
      const normalized = data
        .map((row, idx) => normalizeDriver(row, idx))
        .filter((d): d is Driver => d !== null);
      setRemoteDrivers(normalized);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const drivers = useAllDrivers(remoteDrivers);

  return {
    drivers,
    remoteDrivers,
    loading,
    error,
    refresh,
  };
}
