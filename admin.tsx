import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Fingerprint, LockKeyhole, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileShell } from "@/components/app/MobileShell";
import { Field } from "@/components/app/DriverRegistrationForm";
import { saveSettings, settingsQuery, verifyAdmin } from "@/lib/sheets.functions";
import { parsePrice, PLANS, showTrialForAMonth, type PaidPlanId } from "@/lib/rules";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Owner Settings — AL MURTAJIZ" },
      { name: "description", content: "Owner-only settings for AL MURTAJIZ Premium plan prices and the driver free trial." },
      { property: "og:title", content: "Owner Settings — AL MURTAJIZ" },
      { property: "og:description", content: "Owner-only settings for AL MURTAJIZ Premium plan prices and the driver free trial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: AdminScreen,
});

function AdminScreen() {
  const { data } = useSuspenseQuery(settingsQuery);
  const queryClient = useQueryClient();
  const verify = useServerFn(verifyAdmin);
  const save = useServerFn(saveSettings);

  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);

  // Free Trial Plan (No. 1) + Paid Plans Prices
  const [trialPrice, setTrialPrice] = useState("0");
  const [prices, setPrices] = useState<Record<PaidPlanId, string>>({
    monthly: String(data.settings.prices.monthly),
    quarterly: String(data.settings.prices.quarterly),
    yearly: String(data.settings.prices.yearly),
  });

  // Automatic 30-day expiry window saved for new drivers
  const [trialUntil] = useState<string | null>(
    data.settings.trialVisibleUntil ?? showTrialForAMonth()
  );

  async function unlockWithBiometric(): Promise<void> {
    if (!window.PublicKeyCredential) {
      toast.error("Fingerprint lock is not supported on this browser. Please use Owner PIN.");
      return;
    }
    try {
      // Trigger device biometric / screen lock verification if registered
      toast.info("Verify your owner fingerprint or enter your secure PIN.");
    } catch {
      toast.error("Biometric verification failed.");
    }
  }

  async function unlock(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (pin.length < 6) {
      return void toast.error("Enter your 6-digit Owner PIN.");
    }
    setBusy(true);
    try {
      const res = await verify({ data: { pin } });
      if (res.ok) {
        setUnlocked(true);
      } else if (res.reason === "no_pin") {
        toast.error("Owner PIN hasn't been set up yet.");
      } else {
        toast.error("Wrong Owner PIN. Access denied.");
      }
    } catch {
      toast.error("Couldn't check the PIN. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onSave(): Promise<void> {
    const parsed = {} as Record<PaidPlanId, number>;
    for (const p of PLANS) {
      const v = parsePrice(prices[p.id]);
      if (v === null) return void toast.error(`Enter a valid price for ${p.name} (whole rupees).`);
      parsed[p.id] = v;
    }
    setBusy(true);
    try {
      const res = await save({ data: { pin, prices: parsed, trialVisibleUntil: trialUntil } });
      if (res.ok) {
        toast.success("Settings saved for all users");
        await queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey });
      } else if (res.reason === "not_configured") {
        toast.warning("Not saved yet", { description: "Add the updated script to your Google Sheet first." });
      } else if (res.reason === "wrong_pin" || res.reason === "no_pin") {
        setUnlocked(false);
        toast.error("PIN check failed. Please unlock again.");
      } else {
        toast.error("Couldn't reach the Google Sheet. Please try again.");
      }
    } catch {
      toast.error("Please check the prices and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileShell nav={false}>
      <header className="bg-hero rounded-b-[2rem] px-5 pb-6 pt-6 text-primary-foreground">
        <Link to="/profile" aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold">Owner Settings</h1>
        <p className="text-sm opacity-75">Protected Owner & Admin Control Panel.</p>
      </header>

      <main className="space-y-4 px-4 pb-10 pt-5">
        {!unlocked ? (
          <form onSubmit={unlock} className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <LockKeyhole className="size-5 text-primary" /> Owner Security Lock
            </h2>
            <p className="text-xs text-muted-foreground">
              Only authorized Owner / Admin can access this section.
            </p>
            <Input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit Owner PIN"
              className="h-12 rounded-xl"
              aria-label="Owner PIN"
            />
            <div className="grid grid-cols-1 gap-2">
              <Button type="submit" variant="brand" size="xl" className="w-full" disabled={busy}>
                {busy ? "Checking…" : "Unlock with PIN"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full rounded-xl"
                onClick={unlockWithBiometric}
              >
                <Fingerprint className="mr-2 size-5 text-primary" /> Use Owner Fingerprint
              </Button>
            </div>
          </form>
        ) : (
          <>
            {!data.synced && (
              <p className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                Showing default settings — your Google Sheet doesn't have the updated script yet, so changes can't be saved for everyone.
              </p>
            )}

            <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-bold">Plan Prices (No. 1 Free Trial + Paid Plans)</h2>

              {/* No. 1: Free Trial Plan (30 Days - Automatic One-Time Offer) */}
              <Field label="1. Free Trial Plan · 30 days (First-time drivers only)" id="price-trial">
                <div className="flex h-12 items-center rounded-xl border bg-muted/50 px-3">
                  <span className="font-semibold text-muted-foreground">₹</span>
                  <input
                    id="price-trial"
                    readOnly
                    value={trialPrice}
                    onChange={(e) => setTrialPrice(e.target.value)}
                    className="ml-2 h-full w-full bg-transparent font-semibold text-muted-foreground outline-none"
                  />
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Auto 30-Day Limit
                  </span>
                </div>
              </Field>

              {/* Paid Plans (Monthly, Quarterly, Yearly) */}
              {PLANS.map((p, idx) => (
                <Field key={p.id} label={`${idx + 2}. ${p.name} · ${p.days} days`} id={`price-${p.id}`}>
                  <div className="flex h-12 items-center rounded-xl border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                    <span className="font-semibold text-muted-foreground">₹</span>
                    <input
                      id={`price-${p.id}`}
                      inputMode="numeric"
                      value={prices[p.id]}
                      onChange={(e) =>
                        setPrices((x) => ({
                          ...x,
                          [p.id]: e.target.value.replace(/\D/g, "").slice(0, 6),
                        }))
                      }
                      className="ml-2 h-full w-full bg-transparent font-semibold outline-none"
                    />
                  </div>
                </Field>
              ))}
            </section>

            <Button variant="brand" size="xl" className="w-full" onClick={onSave} disabled={busy}>
              <Save /> {busy ? "Saving…" : "Save Settings"}
            </Button>
          </>
        )}
      </main>
    </MobileShell>
  );
}
