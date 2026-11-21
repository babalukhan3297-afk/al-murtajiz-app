import { subscriptionStatus } from "./rules";
import type { Account } from "./session";

export type Notice = {
  id: string;
  tone: "alert" | "warning" | "info";
  title: string;
  body: string;
  action?: { label: string; to: "/home" | "/premium" } | undefined;
};

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Alerts about plan expiry plus everyday reminders for this account. */
export function buildNotifications(account: Account | undefined, now: Date = new Date()): Notice[] {
  if (!account) return [];
  const out: Notice[] = [];
  const s = subscriptionStatus(account.subscription, now);
  const plans = { label: "View plans", to: "/premium" as const };
  if (s.state === "none") {
    out.push({ id: "sub-none", tone: "info", title: "Choose your Premium Plan", body: "Open the Premium section and pick a Monthly, Quarterly or Yearly plan to keep riding without interruption.", action: plans });
  } else if (s.state === "expired") {
    out.push({ id: "sub-expired", tone: "alert", title: `${s.plan.name} plan expired`, body: `Your plan expired on ${formatDate(s.expiresAt)}. Renew now to keep booking rides.`, action: { ...plans, label: "Renew plan" } });
  } else if (s.state === "expiring") {
    out.push({ id: "sub-expiring", tone: "warning", title: `Plan expiring in ${s.daysLeft} day${s.daysLeft === 1 ? "" : "s"}`, body: `Your ${s.plan.name} plan ends on ${formatDate(s.expiresAt)}. Renew early so you don't lose access.`, action: { ...plans, label: "Renew plan" } });
  } else {
    out.push({ id: "sub-active", tone: "info", title: `${s.plan.name} plan active`, body: `Valid until ${formatDate(s.expiresAt)} · ${s.daysLeft} days left. We'll remind you 7 days before it ends.` });
  }
  if (account.role === "driver" && !account.driver) {
    out.push({ id: "driver-reg", tone: "info", title: "Finish driver registration", body: "Fill the Driver Registration form so passengers can find you.", action: { label: "Open Home", to: "/home" } });
  } else if (account.role === "driver" && !account.duty) {
    out.push({ id: "driver-duty", tone: "info", title: "You're off duty", body: "Turn on Driver Duty from Home to appear on the passenger map.", action: { label: "Open Home", to: "/home" } });
  }
  if (account.role === "passenger" && !account.profile?.photo) {
    out.push({ id: "profile-photo", tone: "info", title: "Add a profile photo", body: "Drivers recognise you faster when your profile has a photo.", action: { label: "Open Passenger Form", to: "/home" } });
  }
  return out;
}

export const urgentCount = (n: Notice[]) => n.filter((x) => x.tone !== "info").length;
