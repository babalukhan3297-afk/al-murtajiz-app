import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Crown, Gift, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  plansWithPrices,
  subscriptionStatus,
  TRIAL,
  trialOfferVisible,
  type AppSettings,
  type Plan,
} from "@/lib/rules";
import { updateAccount, type Account } from "@/lib/session";
import { claimTrial } from "@/lib/sheets.functions";
import { formatDate } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function PlansSection({ account, settings }: { account: Account; settings: AppSettings }) {
  const plans = plansWithPrices(settings.prices);
  const status = subscriptionStatus(account.subscription, new Date(), plans);
  const activeId = status.state === "active" || status.state === "expiring" ? status.plan.id : null;
  const onTrial = activeId === "trial";

  // Check if trial was already used on this mobile number (even after logout & re-login)
  const localTrialKey = `almurtajiz_trial_used_${account.mobile}`;
  const usedInStorage =
    typeof window !== "undefined" ? localStorage.getItem(localTrialKey) === "true" : false;
  const alreadyUsedTrial = Boolean(account.trialUsedAt) || usedInStorage;

  // Check if the 30-day global/offer window has expired
  const offerExpired = !trialOfferVisible(settings);
  const isTrialBlurredAndLocked = !onTrial && (alreadyUsedTrial || offerExpired);

  // Show No. 1 Free Trial card to drivers (active, available, or blurred/expired)
  const isDriver = account.role === "driver";

  const claim = useServerFn(claimTrial);
  const [busy, setBusy] = useState(false);

  function activate(plan: Plan): void {
    updateAccount(account.mobile, (a) => ({
      ...a,
      subscription: { planId: plan.id, startedAt: new Date().toISOString() },
    }));
    toast.success(`${plan.name} plan activated`, { description: `Valid for ${plan.days} days.` });
  }

  async function startTrial(): Promise<void> {
    if (isTrialBlurredAndLocked) {
      return void toast.error("Free trial is no longer available for this mobile number.");
    }
    setBusy(true);
    try {
      const res = await claim({ data: { Phone: `91${account.mobile}` } });
      if (res.alreadyUsed) {
        if (typeof window !== "undefined") {
          localStorage.setItem(localTrialKey, "true");
        }
        updateAccount(account.mobile, (a) => ({
          ...a,
          trialUsedAt: a.trialUsedAt ?? new Date().toISOString(),
        }));
        return void toast.error("This mobile number has already used the 30-day free trial.");
      }
      const now = new Date().toISOString();
      if (typeof window !== "undefined") {
        localStorage.setItem(localTrialKey, "true");
      }
      updateAccount(account.mobile, (a) => ({
        ...a,
        trialUsedAt: now,
        subscription: { planId: "trial", startedAt: now },
      }));
      toast.success("30-Day Free Trial started!", { description: "Enjoy 30 days free as a driver." });
    } catch {
      toast.error("Couldn't start the trial. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      {status.state !== "none" && (
        <div
          className={cn(
            "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold",
            status.state === "active" ? "bg-online-soft text-primary-deep" : "bg-accent text-accent-foreground",
          )}
        >
          <span className="flex items-center gap-2">
            <Crown className="size-4" /> {status.plan.name}
          </span>
          <span>
            {status.state === "expired"
              ? `Expired ${formatDate(status.expiresAt)}`
              : `${status.daysLeft} days left`}
          </span>
        </div>
      )}

      {/* No. 1: 30-Day Free Trial Plan (First-time drivers only; blurs & locks after 30 days or 1 use) */}
      {isDriver && (
        <article
          className={cn(
            "relative overflow-hidden rounded-3xl border-2 border-dashed border-saffron bg-card p-4 shadow-soft transition-all",
            onTrial && "border-solid border-primary",
            isTrialBlurredAndLocked && "pointer-events-none select-none border-muted opacity-60 blur-[1.5px]",
          )}
        >
          <span className="absolute -top-2.5 right-4 rounded-full bg-saffron-gradient px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-saffron-foreground">
            {isTrialBlurredAndLocked ? "Trial Used / Expired" : "No. 1 · First-Time Drivers"}
          </span>

          <PlanHead
            name="Free Trial Plan"
            days={30}
            priceLabel="FREE"
            icon={<Gift className="size-5 text-saffron" />}
          />
          <Features list={TRIAL.features} />

          {onTrial && status.state !== "none" ? (
            <ActiveNote until={status.expiresAt} />
          ) : isTrialBlurredAndLocked ? (
            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground">
              <Lock className="size-3.5" /> 30-Day Free Trial Already Used or Expired
            </div>
          ) : (
            <Button
              variant="saffron"
              className="mt-3 w-full rounded-xl"
              onClick={startTrial}
              disabled={busy}
            >
              {busy ? "Starting…" : "Start 30-Day Free Trial"}
            </Button>
          )}
        </article>
      )}

      {/* Paid Plans (Monthly, Quarterly, Yearly) */}
      {plans.map((p) => {
        const active = p.id === activeId;
        const popular = p.id === "quarterly";
        return (
          <article
            key={p.id}
            className={cn(
              "relative rounded-3xl border bg-card p-4 shadow-soft",
              active && "border-2 border-primary",
              popular && !active && "border-saffron",
            )}
          >
            {popular && (
              <span className="absolute -top-2.5 right-4 rounded-full bg-saffron-gradient px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-saffron-foreground">
                Most popular
              </span>
            )}
            <PlanHead name={p.name} days={p.days} priceLabel={`₹${p.price}`} />
            <Features list={p.features} />
            {active && status.state !== "none" ? (
              <ActiveNote until={status.expiresAt} />
            ) : (
              <Button
                variant={popular ? "saffron" : "brand"}
                className="mt-3 w-full rounded-xl"
                onClick={() => activate(p)}
              >
                Choose {p.name}
              </Button>
            )}
          </article>
        );
      })}
    </section>
  );
}

function PlanHead({
  name,
  days,
  priceLabel,
  icon,
}: {
  name: string;
  days: number;
  priceLabel: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-1.5 font-display text-lg font-bold">
          {icon}
          {name}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">Valid for {days} days</p>
      </div>
      <p className="text-right font-display text-2xl font-bold text-primary">
        {priceLabel}
        <span className="block text-[11px] font-semibold text-muted-foreground">/ {days} days</span>
      </p>
    </div>
  );
}

function Features({ list }: { list: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {list.map((f) => (
        <li key={f} className="flex items-center gap-2 text-sm">
          <Check className="size-4 shrink-0 text-online" /> {f}
        </li>
      ))}
    </ul>
  );
}

function ActiveNote({ until }: { until: Date }) {
  return (
    <p className="mt-3 rounded-xl bg-online-soft px-3 py-2 text-center text-sm font-semibold text-primary-deep">
      Active · valid until {formatDate(until)}
    </p>
  );
}
