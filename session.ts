import { useEffect, useSyncExternalStore } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { AreaRateItem } from "./drivers";
import { needsPassengerProfile, type Role, type Subscription } from "./rules";

export type PassengerProfile = {
  name: string;
  contact: string;
  photo?: string | undefined;
};

export type DriverProfile = {
  name: string;
  address: string;
  serviceArea?: string | undefined;
  areaRates?: AreaRateItem[] | undefined;
  contact: string;
  altContact: string;
  whatsapp: string;
  category: string;
  photo?: string | undefined;
};

export type Account = {
  mobile: string;
  role: Role;
  passwordHash?: string | undefined;
  credentialId?: string | undefined;
  profile?: PassengerProfile | undefined;
  driver?: DriverProfile | undefined;
  duty?: boolean | undefined;
  ratings?: Record<string, number> | undefined;
  subscription?: Subscription | undefined;
  trialUsedAt?: string | undefined;
};

export type AppState = {
  session: { mobile: string; role: Role } | null;
  accounts: Record<string, Account>;
  lastMobile?: string | undefined;
};

const KEY = "almurtajiz:v1";
const EMPTY: AppState = { session: null, accounts: {} };
let state: AppState | null = null;
const listeners = new Set<() => void>();

function load(): AppState {
  if (state) return state;
  try {
    const raw = window.localStorage.getItem(KEY);
    state = raw ? { ...EMPTY, ...(JSON.parse(raw) as AppState) } : EMPTY;
  } catch {
    state = EMPTY;
  }
  return state;
}

export function getState() {
  return typeof window === "undefined" ? EMPTY : load();
}

export function setState(update: (s: AppState) => AppState) {
  state = update(load());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function updateAccount(mobile: string, patch: (a: Account) => Account) {
  setState((s) => {
    const current = s.accounts[mobile] ?? { mobile, role: "passenger" as Role };
    return { ...s, accounts: { ...s.accounts, [mobile]: patch(current) } };
  });
}

export function signIn(mobile: string, role: Role) {
  setState((s) => {
    const existing = s.accounts[mobile];
    const account: Account = { ...(existing ?? { mobile }), mobile, role };
    return {
      ...s,
      session: { mobile, role },
      lastMobile: mobile,
      accounts: { ...s.accounts, [mobile]: account },
    };
  });
}

export function signOut() {
  setState((s) => ({ ...s, session: null }));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => EMPTY);
}

export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Redirects to login when signed out, and first-time passengers to the profile form. */
export function useRequireSession(opts: { requireProfile?: boolean } = {}) {
  const s = useAppState();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const session = s.session;
  const account = session ? s.accounts[session.mobile] : undefined;
  const mustFillProfile =
    !!session && !!opts.requireProfile && needsPassengerProfile(session.role, !!account?.profile);

  useEffect(() => {
    if (!hydrated) return;
    if (!session) navigate({ to: "/" });
    else if (mustFillProfile) navigate({ to: "/home" });
  }, [hydrated, session, mustFillProfile, navigate]);

  const ready = hydrated && !!session && !!account && !mustFillProfile;
  return { ready, session, account, state: s };
}

export async function hashPassword(mobile: string, password: string) {
  const data = new TextEncoder().encode(`almurtajiz:${mobile}:${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
