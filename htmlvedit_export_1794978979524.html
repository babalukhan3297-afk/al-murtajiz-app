import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, MessageCircle, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MobileShell, ScreenLoading } from "@/components/app/MobileShell";
import { DriverAvatar } from "@/components/app/DriverAvatar";
import { StarRating } from "@/components/app/StarRating";
import { driversQuery } from "@/lib/sheets.functions";
import { updateAccount, useRequireSession } from "@/lib/session";
import { useAllDrivers } from "@/lib/useDrivers";
import { formatPhone, withCountryCode } from "@/lib/drivers";
import { useSheetSubmit } from "@/lib/useSheet";

export const Route = createFileRoute("/driver/$driverId")({
  head: () => ({
    meta: [
      { title: "Driver Details — AL MURTAJIZ" },
      { name: "description", content: "Call, WhatsApp and rate your AL MURTAJIZ driver in Shirpur." },
      { property: "og:title", content: "Driver Details — AL MURTAJIZ" },
      { property: "og:description", content: "Call, WhatsApp and rate your AL MURTAJIZ driver in Shirpur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(driversQuery),
  component: DriverContactScreen,
});

function DriverContactScreen() {
  const { driverId } = Route.useParams();
  const router = useRouter();
  const { ready, session, account } = useRequireSession({ requireProfile: true });
  const { data } = useSuspenseQuery(driversQuery);
  const drivers = useAllDrivers(data.drivers);
  const driver = drivers.find((d) => d.id === driverId);
  const submit = useSheetSubmit();
  const previous = account?.ratings?.[driverId] ?? 0;
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!ready || !session) {
    return (
      <MobileShell>
        <ScreenLoading />
      </MobileShell>
    );
  }

  if (!driver) {
    return (
      <MobileShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="font-display text-xl font-bold">Driver not found</p>
          <p className="text-sm text-muted-foreground">This driver may have gone off duty.</p>
          <Button asChild variant="brand" className="rounded-xl">
            <Link to="/home">Back to home</Link>
          </Button>
        </div>
      </MobileShell>
    );
  }

  const current = stars || previous;
  const waText = encodeURIComponent(`Assalamu Alaikum ${driver.name}, I found you on AL MURTAJIZ. Are you available for a ride?`);

  async function rate(): Promise<void> {
    if (!session || !driver) return;
    if (!current) return void toast.error("Tap the stars to choose a rating.");
    setBusy(true);
    updateAccount(session.mobile, (a) => ({ ...a, ratings: { ...(a.ratings ?? {}), [driver.id]: current } }));
    await submit(
      { action: "rateDriver", Phone: withCountryCode(driver.phone || driver.id), Rating: current, Rated_By: `91${session.mobile}` },
      "Thanks! Your rating was sent.",
    );
    setBusy(false);
  }

  const contacts = [
    { label: "Contact Number", value: driver.phone, href: `tel:+${withCountryCode(driver.phone)}`, icon: Phone, variant: "brand" as const },
    { label: "Alternate Number", value: driver.altPhone, href: `tel:+${withCountryCode(driver.altPhone)}`, icon: PhoneCall, variant: "soft" as const },
    { label: "WhatsApp Message", value: driver.whatsapp, href: `https://wa.me/${withCountryCode(driver.whatsapp)}?text=${waText}`, icon: MessageCircle, variant: "saffron" as const },
  ];

  return (
    <MobileShell>
      <header className="bg-hero relative rounded-b-[2rem] px-5 pb-20 pt-6 text-primary-foreground">
        <button type="button" aria-label="Back" onClick={() => router.history.back()} className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
          <ArrowLeft className="size-5" />
        </button>
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-saffron">Your driver</p>
      </header>

      <main className="relative z-10 -mt-16 space-y-4 px-4">
        <section className="rounded-3xl border bg-card p-5 text-center shadow-lift">
          <DriverAvatar name={driver.name} photo={driver.photoUrl || undefined} className="mx-auto -mt-14 size-28 rounded-3xl border-4 border-card text-3xl shadow-soft" />
          <h1 className="mt-3 font-display text-2xl font-bold">{driver.name}</h1>
          <p className="text-sm font-semibold text-primary">{driver.category || "Driver"}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <StarRating value={driver.rating ?? 0} size="sm" />
            <span className="text-sm font-bold">{driver.rating != null ? driver.rating.toFixed(1) : "New"}</span>
            <span className="text-sm text-muted-foreground">
              ({driver.reviews != null ? `${driver.reviews} reviews` : "no reviews yet"})
            </span>
          </div>
          <p className="mt-4 flex gap-2 rounded-2xl bg-muted p-3 text-left text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            {driver.address || "Address not provided"}
          </p>
        </section>

        <section className="space-y-2.5">
          {contacts.map((c) => {
            const Icon = c.icon;
            return c.value ? (
              <Button key={c.label} asChild variant={c.variant} size="xl" className="h-auto w-full justify-start rounded-2xl py-3">
                <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-card/25">
                    <Icon className="!size-5" />
                  </span>
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-xs font-medium opacity-80">{c.label}</span>
                    <span className="font-display text-base font-bold">{formatPhone(c.value)}</span>
                  </span>
                </a>
              </Button>
            ) : (
              <div key={c.label} className="flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                <Icon className="size-5" /> {c.label} not provided
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border bg-card p-5 text-center shadow-soft">
          <h2 className="font-display text-lg font-bold">Rate the Driver</h2>
          <p className="text-sm text-muted-foreground">How was your ride with {driver.name.split(" ")[0]}?</p>
          <div className="mt-3 flex justify-center">
            <StarRating value={current} onChange={setStars} size="lg" />
          </div>
          <Button variant="brand" size="xl" className="mt-4 w-full" onClick={rate} disabled={busy || !current}>
            {busy ? "Sending…" : "Submit Rating"}
          </Button>
        </section>
      </main>
    </MobileShell>
  );
}
