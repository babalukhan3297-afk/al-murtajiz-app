import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown } from "lucide-react";
import { MobileShell, ScreenLoading } from "@/components/app/MobileShell";
import { PlansSection } from "@/components/app/PlansSection";
import { settingsQuery } from "@/lib/sheets.functions";
import { useRequireSession } from "@/lib/session";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Premium Plans — AL MURTAJIZ" },
      { name: "description", content: "Compare Monthly, Quarterly and Yearly Premium plans, plus a free 1-month trial for drivers." },
      { property: "og:title", content: "Premium Plans — AL MURTAJIZ" },
      { property: "og:description", content: "Compare Monthly, Quarterly and Yearly Premium plans, plus a free 1-month trial for drivers." },
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
  return (
    <MobileShell>
      <header className="bg-hero rounded-b-[2rem] px-5 pb-6 pt-6 text-primary-foreground">
        <Link to="/home" aria-label="Back" className="flex size-10 items-center justify-center rounded-full bg-primary-foreground/15">
          <ArrowLeft className="size-5" />
        </Link>
        <p className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-saffron">
          <Crown className="size-3.5" /> Premium
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">Premium Plan</h1>
        <p className="text-sm opacity-75">Pick the plan that suits you. Prices are set by AL MURTAJIZ.</p>
      </header>
      <main className="px-4 pb-4 pt-5">
        <PlansSection account={account} settings={data.settings} />
      </main>
    </MobileShell>
  );
}
