import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Gift } from "lucide-react";
import { MobileShell, ScreenLoading } from "@/components/app/MobileShell";
import { PlansSection } from "@/components/app/PlansSection";
import { settingsQuery } from "@/lib/sheets.functions";
import { useRequireSession } from "@/lib/session";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Free Trial & Premium Plans — AL MURTAJIZ" },
      { name: "description", content: "30 Days Free Trial for first-time drivers, plus Monthly, Quarterly and Yearly Premium plans." },
      { property: "og:title", content: "Free Trial & Premium Plans — AL MURTAJIZ" },
      { property: "og:description", content: "30 Days Free Trial for first-time drivers, plus Monthly, Quarterly and Yearly Premium plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: PremiumScreen,
});

function PremiumScreen() {
  const { ready, account } = useRequireSession({ requireProfile: true });
  const { data } = useSuspenseQuery(settingsQuery);

  if (!ready || !account) {
    return (
      <MobileShell>
        <ScreenLoading />
      </MobileShell>
    );
  }

  // Ek mobile number par sirf 1 baar trial allow karne ka check (logout/login ke baad bhi)
  const trialKey = `almurtajiz_trial_used_${account.mobile}`;
  const isTrialAlreadyUsed =
    typeof window !== "undefined" ? localStorage.getItem(trialKey) === "true" : false;

  // Automatic 30 days expiry check
  const isTrialExpired = data.settings.trialVisibleUntil
    ? new Date() > new Date(data.settings.trialVisibleUntil)
    : false;

  const showFreeTrialFirst = !isTrialAlreadyUsed && !isTrialExpired;

  return (
    <MobileShell>
      <header className="bg-hero rounded-b-[2rem] px-5 pb-6 pt-6 text-primary-foreground">
        <Link to="/home" aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
          <ArrowLeft className="size-5" />
        </Link>
        <p className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-saffron">
          {showFreeTrialFirst ? <Gift className="size-3.5" /> : <Crown className="size-3.5" />}
          {showFreeTrialFirst ? "30 Days Free Trial Available" : "Premium"}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">
          {showFreeTrialFirst ? "Free Trial & Premium Plans" : "Premium Plan"}
        </h1>
        <p className="text-sm opacity-75">
          {showFreeTrialFirst
            ? "First-time drivers get 30 days FREE trial (1 time per mobile number)."
            : "Pick the plan that suits you. Prices are set by AL MURTAJIZ."}
        </p>
      </header>
      <main className="px-4 pb-4 pt-5">
        <PlansSection account={account} settings={data.settings} />
      </main>
    </MobileShell>
  );
}
