import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, BellRing, Info } from "lucide-react";
import { MobileShell, ScreenLoading } from "@/components/app/MobileShell";
import { useRequireSession } from "@/lib/session";
import { buildNotifications } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — AL MURTAJIZ" },
      { name: "description", content: "Plan expiry alerts, renewal reminders and updates for your AL MURTAJIZ account." },
      { property: "og:title", content: "Notifications — AL MURTAJIZ" },
      { property: "og:description", content: "Plan expiry alerts, renewal reminders and updates for your AL MURTAJIZ account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsScreen,
});

const TONE = {
  alert: { icon: AlertTriangle, box: "border-destructive/40", badge: "bg-destructive text-destructive-foreground" },
  warning: { icon: BellRing, box: "border-saffron", badge: "bg-saffron-gradient text-saffron-foreground" },
  info: { icon: Info, box: "", badge: "bg-secondary text-secondary-foreground" },
} as const;

function NotificationsScreen() {
  const { ready, account } = useRequireSession({ requireProfile: true });
  if (!ready || !account) {
    return (
      <MobileShell>
        <ScreenLoading />
      </MobileShell>
    );
  }
  const notices = buildNotifications(account);
  return (
    <MobileShell>
      <header className="bg-hero rounded-b-[2rem] px-5 pb-6 pt-8 text-primary-foreground">
        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-saffron">
          <Bell className="size-3.5" /> Alerts
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">Notifications</h1>
        <p className="text-sm opacity-75">Plan expiry dates, renewals and reminders.</p>
      </header>
      <main className="space-y-3 px-4 pt-5">
        {notices.length === 0 && (
          <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
        )}
        {notices.map((n) => {
          const t = TONE[n.tone];
          const Icon = t.icon;
          return (
            <article key={n.id} className={cn("flex gap-3 rounded-2xl border bg-card p-4 shadow-soft", t.box)}>
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", t.badge)}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold leading-tight">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                {n.action && (
                  <Link to={n.action.to} className="mt-2 inline-block text-sm font-bold text-primary">
                    {n.action.label} →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </main>
    </MobileShell>
  );
}
