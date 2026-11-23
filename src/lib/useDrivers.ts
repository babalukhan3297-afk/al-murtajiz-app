import { useMemo } from "react";
import { useAppState } from "./session";
import { categoryFromName } from "./rules";
import { fallbackPosition, type Driver } from "./drivers";

/** Sheet drivers plus drivers registered on this phone that haven't synced yet. */
export function useAllDrivers(sheet: Driver[]): Driver[] {
  const s = useAppState();
  return useMemo(() => {
    const byId = new Map(sheet.map((d) => [d.id, d] as const));
    for (const acc of Object.values(s.accounts)) {
      const p = acc.driver;
      if (!p) continue;
      const id = `91${p.contact}`;
      const existing = byId.get(id);
      const online = !!acc.duty;
      if (existing) {
        byId.set(id, { ...existing, online });
        continue;
      }
      const pos = fallbackPosition(id);
      byId.set(id, {
        id,
        name: p.name,
        category: p.category,
        categorySlug: categoryFromName(p.category),
        phone: id,
        altPhone: p.altContact ? `91${p.altContact}` : "",
        whatsapp: `91${p.whatsapp}`,
        address: p.address,
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
    return [...byId.values()];
  }, [sheet, s.accounts]);
}
