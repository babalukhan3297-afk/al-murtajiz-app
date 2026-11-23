import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Crosshair, MapPin, Navigation, RefreshCw, Star } from "lucide-react";
import { MobileShell, ScreenLoading } from "@/components/app/MobileShell";
import { RideMap } from "@/components/app/RideMap";
import { SwipeButton } from "@/components/app/SwipeButton";
import { DriverAvatar } from "@/components/app/DriverAvatar";
import { driversQuery } from "@/lib/sheets.functions";
import { useRequireSession } from "@/lib/session";
import { useAllDrivers } from "@/lib/useDrivers";
import { CATEGORIES } from "@/lib/rules";
import { distanceKm, SHIRPUR } from "@/lib/drivers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nearby/$category")({
  head: ({ params }) => {
    const c = CATEGORIES.find((x) => x.slug === params.category);
    const title = `Nearby ${c?.name ?? "Drivers"} — AL MURTAJIZ`;
    const description = `See ${c?.name ?? "drivers"} on duty near you in Shirpur on a live satellite map.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(driversQuery),
  component: NearbyScreen,
});

function NearbyScreen() {
  const { category } = Route.useParams();
  const navigate = useNavigate();
  const { ready } = useRequireSession({ requireProfile: true });
  const { data, isFetching } = useSuspenseQuery(driversQuery);
  const queryClient = useQueryClient();
  async function refresh(): Promise<void> {
    await queryClient.refetchQueries({ queryKey: driversQuery.queryKey });
    toast.success("Drivers updated", { duration: 1500 });
  }
  const all = useAllDrivers(data.drivers);
  const cat = CATEGORIES.find((c) => c.slug === category);
  const [user, setUser] = useState(SHIRPUR);
  const [located, setLocated] = useState<"pending" | "ok" | "denied">("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return setLocated("denied");
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setUser({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocated("ok");
      },
      () => setLocated("denied"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const drivers = useMemo(
    () =>
      all
        .filter((d) => d.online && (!cat || d.categorySlug === cat.slug))
        .map((d) => ({ ...d, km: distanceKm(user, d) }))
        .sort((a, b) => a.km - b.km),
    [all, cat, user],
  );
  const selected = drivers.find((d) => d.id === selectedId) ?? null;
  const nearShirpur = distanceKm(user, SHIRPUR) < 20;

  if (!ready) {
    return (
      <MobileShell>
        <ScreenLoading />
      </MobileShell>
    );
  }

  return (
    <MobileShell className="pb-48">
      <div className="relative h-[44vh] min-h-72">
        <RideMap user={user} drivers={drivers} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-4">
          <Link to="/home" aria-label="Back" className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-card shadow-lift">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            <div className="min-w-0 rounded-full bg-card px-4 py-2.5 shadow-lift">
              <p className="truncate font-display text-sm font-bold">{cat?.name ?? "All rides"} · {drivers.length} online</p>
            </div>
            <button
              type="button"
              aria-label="Refresh drivers"
              onClick={refresh}
              disabled={isFetching}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-lift disabled:opacity-70"
            >
              <RefreshCw className={cn("size-5", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <main className="relative -mt-6 space-y-3 rounded-t-[2rem] bg-background px-4 pt-5">
        <section className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-soft">
          <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
            <Crosshair className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Current Location</p>
            <p className="truncate font-semibold">
              {located === "ok" ? (nearShirpur ? "Shirpur, Maharashtra" : "Your location") : located === "pending" ? "Finding you…" : "Shirpur (location off)"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.lat.toFixed(4)}, {user.lng.toFixed(4)}
            </p>
          </div>
        </section>

        {selected ? (
          <section className="rounded-3xl border-2 border-primary bg-card p-4 shadow-lift">
            <div className="flex gap-4">
              <DriverAvatar name={selected.name} photo={selected.photoUrl || undefined} className="size-20 text-2xl" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">{selected.name}</p>
                <p className="text-xs font-semibold text-primary">{selected.category || "Driver"} · {selected.km.toFixed(1)} km away</p>
                <div className="mt-2 flex gap-2">
                  <span className="flex items-center gap-1 rounded-lg bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                    <Star className="size-3.5 fill-saffron text-saffron" /> {selected.rating != null ? selected.rating.toFixed(1) : "New"}
                  </span>
                  <span className="rounded-lg bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                    {selected.totalRides != null ? `${selected.totalRides} rides` : "Rides: —"}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-3 flex gap-2 rounded-xl bg-muted p-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              {selected.address || "Address not provided"}
            </p>
          </section>
        ) : (
          <p className="rounded-2xl bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
            {drivers.length ? "Tap a driver on the map or below to see details." : "No drivers on duty right now. Please check again soon."}
          </p>
        )}

        <section className="space-y-2 pb-4">
          <h2 className="px-1 font-display text-base font-bold">Drivers on duty</h2>
          {drivers.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setSelectedId(d.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left transition-colors",
                d.id === selectedId && "border-primary bg-secondary/60",
              )}
            >
              <DriverAvatar name={d.name} photo={d.photoUrl || undefined} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">{d.category} · {d.km.toFixed(1)} km</p>
              </div>
              <span className="flex items-center gap-1 text-sm font-bold">
                <Star className="size-4 fill-saffron text-saffron" /> {d.rating != null ? d.rating.toFixed(1) : "New"}
              </span>
              <Navigation className="size-4 text-primary" />
            </button>
          ))}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-24 z-20 mx-auto w-full max-w-md px-4">
        <SwipeButton
          label="Have a Nice Day"
          disabled={!selected}
          disabledLabel="Select a driver first"
          onComplete={() => selected && navigate({ to: "/driver/$driverId", params: { driverId: selected.id } })}
        />
      </div>
    </MobileShell>
  );
}
