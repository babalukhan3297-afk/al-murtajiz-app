import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Gift, LockKeyhole, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MobileShell } from "@/components/app/MobileShell";
import { Field } from "@/components/app/DriverRegistrationForm";
import { saveSettings, settingsQuery, verifyAdmin } from "@/lib/sheets.functions";
import { parsePrice, PLANS, showTrialForAMonth, trialOfferVisible, type PaidPlanId } from "@/lib/rules";
import { formatDate } from "@/lib/notifications";

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
  const [prices, setPrices] = useState<Record<PaidPlanId, string>>({
    monthly: String(data.settings.prices.monthly),
    quarterly: String(data.settings.prices.quarterly),
    yearly: String(data.settings.prices.yearly),
  });
  const [trialUntil, setTrialUntil] = useState<string | null>(data.settings.trialVisibleUntil);
  const trialOn = trialOfferVisible({ trialVisibleUntil: trialUntil });

  async function unlock(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (pin.length < 4) return void toast.error("Enter your owner PIN.");
    setBusy(true);
    try {
      const res = await verify({ data: { pin } });
      if (res.ok) setUnlocked(true);
      else if (res.reason === "no_pin") toast.error("Owner PIN hasn't been set up yet.");
      else toast.error("Wrong PIN.");
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
        <p className="text-sm opacity-75">Set Premium prices and control the driver free trial.</p>
      </header>

      <main className="space-y-4 px-4 pb-10 pt-5">
        {!unlocked ? (
          <form onSubmit={unlock} className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <LockKeyhole className="size-5 text-primary" /> Owner PIN
            </h2>
            <Input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter owner PIN" className="h-12 rounded-xl" aria-label="Owner PIN" />
            <Button type="submit" variant="brand" size="xl" className="w-full" disabled={busy}>
              {busy ? "Checking…" : "Unlock"}
            </Button>
          </form>
        ) : (
          <>
            {!data.synced && (
              <p className="rounded-2xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                Showing default settings — your Google Sheet doesn't have the updated script yet, so changes can't be saved for everyone.
              </p>
            )}
            <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
              <h2 className="font-display text-lg font-bold">Premium Plan Prices</h2>
              {PLANS.map((p) => (
                <Field key={p.id} label={`${p.name} · ${p.days} days`} id={`price-${p.id}`}>
                  <div className="flex h-12 items-center rounded-xl border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                    <span className="font-semibold text-muted-foreground">₹</span>
                    <input
                      id={`price-${p.id}`}
                      inputMode="numeric"
                      value={prices[p.id]}
                      onChange={(e) => setPrices((x) => ({ ...x, [p.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                      className="ml-2 h-full w-full bg-transparent font-semibold outline-none"
                    />
                  </div>
                </Field>
              ))}
            </section>

            <section className="space-y-3 rounded-3xl border bg-card p-5 shadow-soft">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <Gift className="size-5 text-saffron" /> Driver Free Trial
              </h2>
              <p className="text-sm text-muted-foreground">
                {trialOn && trialUntil
                  ? `Visible to drivers until ${formatDate(new Date(trialUntil))}. It hides automatically after that.`
                  : "Hidden from drivers right now."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="soft" className="rounded-xl" onClick={() => setTrialUntil(showTrialForAMonth())}>
                  <Eye /> Show 1 month
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => setTrialUntil(null)} disabled={!trialOn}>
                  <EyeOff /> Hide now
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Each mobile number can use the trial only once.</p>
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
