import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpRight, CarTaxiFront, Crown, LogOut, MapPin, Pencil, Sparkles, UserRound, Users, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MobileShell, ScreenLoading } from "@/components/app/MobileShell";
import { NotAllowedDialog } from "@/components/app/NotAllowedDialog";
import { DriverRegistrationForm } from "@/components/app/DriverRegistrationForm";
import { DriverAvatar } from "@/components/app/DriverAvatar";
import { PassengerProfileForm } from "@/components/app/PassengerProfileForm";
import { driversQuery } from "@/lib/sheets.functions";
import { signOut, updateAccount, useRequireSession } from "@/lib/session";
import { canEnterDriverSection, CATEGORIES } from "@/lib/rules";
import { useAllDrivers } from "@/lib/useDrivers";
import { useSheetSubmit } from "@/lib/useSheet";
import { cn } from "@/lib/utils";
import autoImg from "@/assets/cat-auto.png";
import carImg from "@/assets/cat-car.png";
import loadingImg from "@/assets/cat-loading.png";
import busImg from "@/assets/cat-bus.png";

const IMAGES: Record<string, string> = { auto: autoImg, "four-wheeler": carImg, loading: loadingImg, bus: busImg };

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — AL MURTAJIZ" },
      { name: "description", content: "Choose an Auto, 4 Wheeler, Loading Auto or Bus and find drivers near you in Shirpur." },
      { property: "og:title", content: "Home — AL MURTAJIZ" },
      { property: "og:description", content: "Choose an Auto, 4 Wheeler, Loading Auto or Bus and find drivers near you in Shirpur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(driversQuery),
  component: HomeScreen,
});

function HomeScreen() {
  const { ready, session, account } = useRequireSession();
  const [mode, setMode] = useState<"passenger" | "driver">("passenger");
  const [blocked, setBlocked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState(false);
  const { data } = useSuspenseQuery(driversQuery);
  const drivers = useAllDrivers(data.drivers);
  const submit = useSheetSubmit();

  const online = useMemo(() => drivers.filter((d) => d.online).length, [drivers]);

  if (!ready || !session || !account) {
    return (
      <MobileShell>
        <ScreenLoading />
      </MobileShell>
    );
  }

  const isDriver = canEnterDriverSection(session.role);
  const name = account.profile?.name ?? account.driver?.name ?? "there";
  const duty = !!account.duty && !!account.driver;

  function chooseMode(m: "passenger" | "driver"): void {
    if (m === "driver" && !isDriver) return setBlocked(true);
    setMode(m);
  }

  async function toggleDuty(v: boolean): Promise<void> {
    if (!session || !account) return;
    if (!isDriver) return setBlocked(true);
    if (!account.driver) {
      setMode("driver");
      return void toast.message("Register as a driver first", { description: "Fill the Driver Registration form to go on duty." });
    }
    updateAccount(session.mobile, (a) => ({ ...a, duty: v }));
    await submit(
      { action: "updateStatus", Phone: `91${account.driver.contact}`, Status: v ? "Online" : "Offline" },
      v ? "You're on duty — passengers can see you" : "You're off duty",
    );
  }

  return (
    <MobileShell>
      <header className="bg-hero relative overflow-hidden rounded-b-[2rem] px-5 pb-6 pt-8 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-saffron">
              <MapPin className="size-3.5" /> Shirpur
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold">Hi, {name.split(" ")[0]} 👋</h1>
            <p className="text-sm opacity-75">Logged in as {isDriver ? "Driver" : "Passenger"}</p>
          </div>
          <button
            type="button"
            aria-label="Log out"
            onClick={signOut}
            className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15"
          >
            <LogOut className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-primary-deep/60 p-1">
          {(["passenger", "driver"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => chooseMode(m)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                mode === m ? "bg-saffron-gradient text-saffron-foreground shadow-soft" : "text-primary-foreground/80",
              )}
            >
              {m === "passenger" ? <UserRound className="size-4" /> : <CarTaxiFront className="size-4" />}
              {m === "passenger" ? "Passenger" : "Driver"}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-6 px-4 pt-5">
        <section className="grid grid-cols-2 gap-3">
          <Link to="/premium" className="block" aria-label="Open Premium plans">
            <Stat icon={<Crown className="size-5" />} label="Subscription" value="Premium Plan" tone="saffron" />
          </Link>
          <Stat icon={<Users className="size-5" />} label="Active Users" value={String(online)} />
          <Stat icon={<UsersRound className="size-5" />} label="Members" value={String(drivers.length)} />
          <div className="flex flex-col justify-between rounded-2xl border bg-card p-3.5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="relative flex size-3">
                {duty && <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-online" />}
                <span className={cn("relative inline-flex size-3 rounded-full", duty ? "bg-online" : "bg-border")} />
              </span>
              <Switch
                checked={duty}
                onCheckedChange={toggleDuty}
                aria-label="Driver Duty"
                className="data-[state=checked]:bg-online"
              />
            </div>
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground">Driver Duty</p>
              <p className={cn("font-display text-lg font-bold", duty ? "text-online" : "text-muted-foreground")}>
                {duty ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        </section>

        {data.error && (
          <p className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">{data.error}</p>
        )}

        {mode === "passenger" ? (
          <section className="space-y-6">
            {!account.profile || editingPassenger ? (
              <>
                {!account.profile && session.role === "passenger" && (
                  <div className="flex gap-3 rounded-2xl bg-accent p-4 text-accent-foreground">
                    <Sparkles className="mt-0.5 size-5 shrink-0" />
                    <p className="text-sm font-medium">Welcome! Please fill the Passenger Form first to start booking rides.</p>
                  </div>
                )}
                <PassengerProfileForm account={account} onDone={() => setEditingPassenger(false)} />
              </>
            ) : (
              <div className="flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-soft">
                <DriverAvatar name={account.profile.name} photo={account.profile.photo} className="size-14 text-lg" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Passenger Form</p>
                  <p className="truncate font-display text-lg font-bold">{account.profile.name}</p>
                  <p className="text-xs text-muted-foreground">+91 {account.profile.contact}</p>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setEditingPassenger(true)}>
                  <Pencil /> Edit
                </Button>
              </div>
            )}
            {(account.profile || session.role === "driver") && (
            <div>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="font-display text-xl font-bold">Choose your ride</h2>
              <span className="text-xs text-muted-foreground">{online} drivers online</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c) => (
                <Link
                  key={c.slug}
                  to="/nearby/$category"
                  params={{ category: c.slug }}
                  className="group relative overflow-hidden rounded-3xl border bg-card p-3 shadow-soft transition-transform active:scale-[0.98]"
                >
                  <div className="aspect-square rounded-2xl bg-secondary/70 p-2">
                    <img src={IMAGES[c.slug]} alt={c.name} width={400} height={400} loading="lazy" className="size-full object-contain transition-transform group-hover:scale-105" />
                  </div>
                  <div className="mt-2.5 flex items-start justify-between gap-1">
                    <div>
                      <p className="font-display text-base font-bold leading-tight">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.tagline}</p>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-primary" />
                  </div>
                </Link>
              ))}
            </div>
            </div>
            )}
          </section>
        ) : account.driver && !editing ? (
          <section className="rounded-3xl border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-4">
              <DriverAvatar name={account.driver.name} photo={account.driver.photo} className="size-16 text-xl" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold">{account.driver.name}</p>
                <p className="text-sm text-muted-foreground">{account.driver.category}</p>
                <p className="truncate text-xs text-muted-foreground">{account.driver.address}</p>
              </div>
            </div>
            <div className={cn("mt-4 rounded-2xl px-4 py-3 text-sm font-semibold", duty ? "bg-online-soft text-primary-deep" : "bg-muted text-muted-foreground")}>
              {duty ? "You're visible to passengers on the map." : "Turn on Driver Duty to appear on the map."}
            </div>
            <Button variant="outline" className="mt-3 w-full rounded-xl" onClick={() => setEditing(true)}>
              <Pencil /> Edit details
            </Button>
          </section>
        ) : (
          <DriverRegistrationForm mobile={session.mobile} initial={account.driver} onDone={() => setEditing(false)} />
        )}
      </main>
      <NotAllowedDialog open={blocked} onOpenChange={setBlocked} />
    </MobileShell>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "saffron" }) {
  return (
    <div className={cn("rounded-2xl border p-3.5 shadow-soft", tone === "saffron" ? "bg-saffron-gradient text-saffron-foreground" : "bg-card")}>
      <div className={cn("flex size-9 items-center justify-center rounded-xl", tone === "saffron" ? "bg-card/40" : "bg-secondary text-secondary-foreground")}>
        {icon}
      </div>
      <p className={cn("mt-2 text-xs font-medium", tone === "saffron" ? "opacity-80" : "text-muted-foreground")}>{label}</p>
      <p className="font-display text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}
