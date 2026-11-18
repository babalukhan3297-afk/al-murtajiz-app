// Business rules for AL MURTAJIZ. Kept pure so they can be tested.

export type Role = "passenger" | "driver";

/** Drivers may use both sections; passengers may only use the Passenger section. */
export function canEnterDriverSection(role: Role): boolean {
  return role === "driver";
}

/** A passenger must fill the profile form before using the app. */
export function needsPassengerProfile(role: Role, hasProfile: boolean): boolean {
  return role === "passenger" && !hasProfile;
}

export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

/** Returns an error message, or null when the photo is acceptable (JPG/PNG, any file size). */
export function validatePhoto(file: { size: number; type: string }): string | null {
  if (!(ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return "Only JPG or PNG photos are allowed.";
  }
  return null;
}

/** A driver shows on the map unless their sheet status says they are off duty. */
export function isOnDuty(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return !["offline", "off", "off duty", "inactive", "no", "false", "0"].includes(s);
}

/** Indian mobile numbers: 10 digits starting 6-9 (an optional 91 prefix is stripped). */
export function normalizeMobile(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export const CATEGORIES = [
  { slug: "auto", name: "Auto Ride", tagline: "Quick hops across town" },
  { slug: "four-wheeler", name: "4 Wheeler", tagline: "Comfort cars & taxis" },
  { slug: "loading", name: "Loading Auto", tagline: "Move goods & luggage" },
  { slug: "bus", name: "Bus & Passenger", tagline: "Group & long routes" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function categoryFromName(name: string): CategorySlug | null {
  const n = squash(name);
  if (!n) return null;
  if (n.includes("loading")) return "loading";
  if (n.includes("bus") || n.includes("passenger")) return "bus";
  if (n.includes("4wheel") || n.includes("fourwheel") || n.includes("car") || n.includes("taxi"))
    return "four-wheeler";
  if (n.includes("auto") || n.includes("rickshaw")) return "auto";
  return null;
}

export const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: 99,
    days: 30,
    features: ["Book all 4 ride types", "Live satellite driver map", "Call & WhatsApp drivers"],
  },
  {
    id: "quarterly",
    name: "Quarterly",
    price: 249,
    days: 90,
    features: ["Everything in Monthly", "Priority driver listing", "3 months of rides"],
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 799,
    days: 365,
    features: ["Everything in Quarterly", "Best value for the year", "Expiry reminders all year"],
  },
] as const;

/** 1-month free trial, for drivers only, once per mobile number. */
export const TRIAL = {
  id: "trial",
  name: "Driver Free Trial",
  price: 0,
  days: 30,
  features: ["Free for 1 month", "Go on duty & get passengers", "One trial per mobile number"],
} as const;

export type PaidPlanId = (typeof PLANS)[number]["id"];
export type PlanId = PaidPlanId | "trial";
export type Plan = { id: PlanId; name: string; price: number; days: number; features: readonly string[] };
export type Subscription = { planId: PlanId; startedAt: string };

/** Owner-controlled settings: plan prices and how long the trial offer stays visible. */
export type AppSettings = { prices: Record<PaidPlanId, number>; trialVisibleUntil: string | null };

/** The trial offer shows for one month from launch unless the owner changes it. */
export const DEFAULT_SETTINGS: AppSettings = {
  prices: { monthly: 99, quarterly: 249, yearly: 799 },
  trialVisibleUntil: "2026-12-18T00:00:00.000Z",
};

/** Paid plans with the owner's prices applied (falls back to defaults for missing/invalid prices). */
export function plansWithPrices(prices: Partial<Record<PaidPlanId, number>> | undefined): Plan[] {
  return PLANS.map((p) => {
    const v = prices?.[p.id];
    return { ...p, price: typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : p.price };
  });
}

/** A valid owner price: whole rupees from 0 to 1,00,000. */
export function parsePrice(input: string): number | null {
  const t = input.trim();
  if (!/^\d{1,6}$/.test(t)) return null;
  const n = Number(t);
  return n <= 100000 ? n : null;
}

const DAY = 24 * 60 * 60 * 1000;

/** The trial offer hides automatically once its visible-until date has passed. */
export function trialOfferVisible(settings: Pick<AppSettings, "trialVisibleUntil">, now: Date = new Date()): boolean {
  if (!settings.trialVisibleUntil) return false;
  return new Date(settings.trialVisibleUntil).getTime() > now.getTime();
}

/** Owner action: make the trial offer visible for another month from now. */
export function showTrialForAMonth(now: Date = new Date()): string {
  return new Date(now.getTime() + TRIAL.days * DAY).toISOString();
}

/** Only drivers, only while the offer is visible, and only if this mobile number never used it. */
export function canClaimTrial(opts: { role: Role; offerVisible: boolean; alreadyUsed: boolean }): boolean {
  return opts.role === "driver" && opts.offerVisible && !opts.alreadyUsed;
}

/** Days before expiry when the "expiring soon" alert starts. */
export const EXPIRY_WARNING_DAYS = 7;

export type SubscriptionStatus =
  | { state: "none" }
  | { state: "active" | "expiring" | "expired"; plan: Plan; expiresAt: Date; daysLeft: number };

export function subscriptionStatus(
  sub: Subscription | undefined,
  now: Date = new Date(),
  plans: Plan[] = plansWithPrices(undefined),
): SubscriptionStatus {
  const plan = sub && (sub.planId === "trial" ? TRIAL : plans.find((p) => p.id === sub.planId));
  if (!sub || !plan) return { state: "none" };
  const expiresAt = new Date(new Date(sub.startedAt).getTime() + plan.days * DAY);
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / DAY);
  const state = daysLeft <= 0 ? "expired" : daysLeft <= EXPIRY_WARNING_DAYS ? "expiring" : "active";
  return { state, plan, expiresAt, daysLeft: Math.max(0, daysLeft) };
}
