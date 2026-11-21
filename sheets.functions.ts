import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import {
  digits,
  MAX_AREA_RATES,
  normalizeDriver,
  sanitizeAreaRatesForSave,
  type Driver,
} from "./drivers";
import { DEFAULT_SETTINGS, type AppSettings, type PaidPlanId } from "./rules";
import { supabaseFetch } from "./supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(val: unknown): val is string {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

function cleanPhone10(raw: string): string {
  const d = digits(raw);
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d;
}

export const getDrivers = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ drivers: Driver[]; error: string | null }> => {
    const { data, error } = await supabaseFetch<Record<string, unknown>[]>(
      "drivers?select=*&order=updated_at.desc"
    );

    if (error || !Array.isArray(data)) {
      console.error("Supabase driver read failed:", error);
      return { drivers: [], error: "Couldn't reach the driver list right now." };
    }

    const drivers = data
      .map((row, idx) => normalizeDriver(row, idx))
      .filter((d): d is Driver => d !== null);

    return { drivers, error: null };
  }
);

export const driversQuery = queryOptions({
  queryKey: ["drivers"],
  queryFn: () => getDrivers(),
  staleTime: 60_000,
});

const phone = z.string().regex(/^\d{10,12}$/);
const photo = z.string().max(80_000).optional();

const areaRateItemSchema = z.object({
  area: z.string().trim().min(1).max(120),
  rate: z.string().trim().min(1).max(60),
});

const areaRatesListSchema = z.array(areaRateItemSchema).max(MAX_AREA_RATES);

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("registerDriver"),
    Driver_Name: z.string().trim().min(2).max(80),
    Category: z.string().max(40),
    Phone: phone,
    Alternate_Phone: phone.or(z.literal("")).optional().default(""),
    WhatsApp: phone.optional(),
    Address: z.string().trim().max(300).optional().default(""),
    Area_Rates: areaRatesListSchema.optional().default([]),
    Photo_URL: photo,
    Status: z.string().max(20).optional().default("Online"),
    Profile_Id: z.string().optional(),
  }),
  z.object({
    action: z.literal("updateAreaRates"),
    Phone: phone,
    Category: z.string().max(40).optional(),
    Address: z.string().trim().max(300).optional(),
    Area_Rates: areaRatesListSchema,
  }),
  z.object({
    action: z.literal("updateProfile"),
    Name: z.string().trim().min(2).max(80),
    Contact: phone,
    Login_Mobile: phone,
    Photo_URL: photo,
  }),
  z.object({
    action: z.literal("updateStatus"),
    Phone: phone,
    Status: z.enum(["Online", "Offline"]),
  }),
  z.object({
    action: z.literal("rateDriver"),
    Phone: phone,
    Rating: z.number().int().min(1).max(5),
    Rated_By: phone,
  }),
]);

export type SheetAction = z.infer<typeof actionSchema>;

export const submitToSheet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => actionSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; reason: string | null }> => {
    try {
      if (data.action === "registerDriver") {
        const p10 = cleanPhone10(data.Phone);
        const cleanRates = sanitizeAreaRatesForSave(data.Area_Rates ?? []);
        const derivedArea =
          data.Address.trim() ||
          cleanRates
            .map((r) => r.area)
            .filter(Boolean)
            .join(", ");
        const isOnline = (data.Status || "Online").toLowerCase() !== "offline";

        // Check if a driver record already exists for this 10-digit phone to preserve UUID id
        const { data: existingRows } = await supabaseFetch<
          Array<{ id?: string | null; profile_id?: string | null }>
        >(
          `drivers?phone=eq.${encodeURIComponent(p10)}&select=id,profile_id&limit=1`,
          {},
          true
        );

        const existingDriver =
          Array.isArray(existingRows) && existingRows[0] ? existingRows[0] : null;

        const resolvedId = isValidUuid(existingDriver?.id)
          ? existingDriver.id
          : typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : undefined;

        const resolvedProfileId = isValidUuid(data.Profile_Id)
          ? data.Profile_Id
          : isValidUuid(existingDriver?.profile_id)
            ? existingDriver.profile_id
            : null;

        const payload: Record<string, unknown> = {
          driver_name: data.Driver_Name,
          vehicle_type: data.Category,
          phone: p10,
          service_area: derivedArea,
          area_rates: cleanRates,
          photo_url: data.Photo_URL ?? "",
          is_available: isOnline,
          profile_id: resolvedProfileId,
          updated_at: new Date().toISOString(),
        };

        if (resolvedId) {
          payload.id = resolvedId;
        }

        const { error } = await supabaseFetch(
          "drivers?on_conflict=phone",
          {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(payload),
          },
          true
        );

        if (error) {
          console.error("Supabase registerDriver error:", error);
          return { ok: false, reason: "failed" };
        }
        return { ok: true, reason: null };
      }

      if (data.action === "updateAreaRates") {
        const p10 = cleanPhone10(data.Phone);
        const cleanRates = sanitizeAreaRatesForSave(data.Area_Rates);
        const derivedArea =
          (data.Address ?? "").trim() ||
          cleanRates
            .map((r) => r.area)
            .filter(Boolean)
            .join(", ");

        const patchBody: Record<string, unknown> = {
          area_rates: cleanRates,
          service_area: derivedArea,
          updated_at: new Date().toISOString(),
        };

        if (data.Category) {
          patchBody.vehicle_type = data.Category;
        }

        const { error } = await supabaseFetch(
          `drivers?phone=eq.${encodeURIComponent(p10)}`,
          {
            method: "PATCH",
            body: JSON.stringify(patchBody),
          },
          true
        );

        if (error) {
          console.error("Supabase updateAreaRates error:", error);
          return { ok: false, reason: "failed" };
        }
        return { ok: true, reason: null };
      }

      if (data.action === "updateProfile") {
        const login10 = cleanPhone10(data.Login_Mobile);
        const contact10 = cleanPhone10(data.Contact);

        const { error } = await supabaseFetch(
          "profiles?on_conflict=login_mobile",
          {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify({
              name: data.Name,
              contact: contact10,
              login_mobile: login10,
              photo_url: data.Photo_URL ?? "",
              updated_at: new Date().toISOString(),
            }),
          },
          true
        );

        if (error) {
          console.error("Supabase updateProfile error:", error);
          return { ok: false, reason: "failed" };
        }
        return { ok: true, reason: null };
      }

      if (data.action === "updateStatus") {
        const p10 = cleanPhone10(data.Phone);
        const { error } = await supabaseFetch(
          `drivers?phone=eq.${encodeURIComponent(p10)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              is_available: data.Status === "Online",
              updated_at: new Date().toISOString(),
            }),
          },
          true
        );

        if (error) {
          console.error("Supabase updateStatus error:", error);
          return { ok: false, reason: "failed" };
        }
        return { ok: true, reason: null };
      }

      if (data.action === "rateDriver") {
        const p10 = cleanPhone10(data.Phone);
        const { data: existing } = await supabaseFetch<
          Array<{ rating: number | null; reviews: number | null }>
        >(`drivers?phone=eq.${encodeURIComponent(p10)}&select=rating,reviews`);

        const current = Array.isArray(existing) && existing[0] ? existing[0] : null;
        const prevCount = current?.reviews ?? 0;
        const prevRating = current?.rating ?? data.Rating;
        const nextCount = prevCount + 1;
        const nextRating = Number(
          ((prevRating * prevCount + data.Rating) / nextCount).toFixed(2)
        );

        const { error } = await supabaseFetch(
          `drivers?phone=eq.${encodeURIComponent(p10)}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              rating: nextRating,
              reviews: nextCount,
              updated_at: new Date().toISOString(),
            }),
          },
          true
        );

        if (error) {
          console.error("Supabase rateDriver error:", error);
          return { ok: false, reason: "failed" };
        }
        return { ok: true, reason: null };
      }

      return { ok: false, reason: "failed" };
    } catch (e) {
      console.error("Supabase write error", e);
      return { ok: false, reason: "failed" };
    }
  });

// ---------- Owner settings (plan prices, trial visibility) & driver trial ----------

function readSettings(raw: unknown): AppSettings {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const price = (k: PaidPlanId) => {
    const n = Number(s[`price_${k}`]);
    return Number.isFinite(n) && n >= 0 && String(s[`price_${k}`] ?? "") !== ""
      ? Math.round(n)
      : DEFAULT_SETTINGS.prices[k];
  };
  const until = s.trial_visible_until ?? s.trialVisibleUntil;
  return {
    prices: {
      monthly: price("monthly"),
      quarterly: price("quarterly"),
      yearly: price("yearly"),
    },
    trialVisibleUntil:
      until === "" || until === "hidden" || until === null
        ? null
        : typeof until === "string" && !Number.isNaN(Date.parse(until))
          ? new Date(until).toISOString()
          : DEFAULT_SETTINGS.trialVisibleUntil,
  };
}

export const getSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ settings: AppSettings; synced: boolean }> => {
    const { data, error } = await supabaseFetch<Record<string, unknown>[]>(
      "app_settings?id=eq.1&select=*"
    );
    if (error || !Array.isArray(data) || !data[0]) {
      return { settings: DEFAULT_SETTINGS, synced: false };
    }
    return { settings: readSettings(data[0]), synced: true };
  }
);

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: () => getSettings(),
  staleTime: 60_000,
});

function pinMatches(pin: string): boolean {
  const expected = process.env.ADMIN_PIN ?? "";
  if (!expected || pin.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < pin.length; i++) diff |= pin.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

const pinSchema = z.string().min(4).max(64);

export const verifyAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; reason: string | null }> => {
    if (!process.env.ADMIN_PIN) return { ok: false, reason: "no_pin" };
    return pinMatches(data.pin) ? { ok: true, reason: null } : { ok: false, reason: "wrong_pin" };
  });

const priceSchema = z.number().int().min(0).max(100000);

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        pin: pinSchema,
        prices: z.object({
          monthly: priceSchema,
          quarterly: priceSchema,
          yearly: priceSchema,
        }),
        trialVisibleUntil: z.string().datetime().nullable(),
      })
      .parse(input)
  )
  .handler(async ({ data }): Promise<{ ok: boolean; reason: string | null }> => {
    if (!process.env.ADMIN_PIN) return { ok: false, reason: "no_pin" };
    if (!pinMatches(data.pin)) return { ok: false, reason: "wrong_pin" };

    const { error } = await supabaseFetch(
      "app_settings?on_conflict=id",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          id: 1,
          price_monthly: data.prices.monthly,
          price_quarterly: data.prices.quarterly,
          price_yearly: data.prices.yearly,
          trial_visible_until: data.trialVisibleUntil ?? "hidden",
          updated_at: new Date().toISOString(),
        }),
      },
      true
    );

    if (error) {
      console.error("Supabase saveSettings error:", error);
      return { ok: false, reason: "failed" };
    }
    return { ok: true, reason: null };
  });

/** Records the trial against the mobile number in Supabase; refuses a number that already used it. */
export const claimTrial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ Phone: phone }).parse(input))
  .handler(async ({ data }): Promise<{ alreadyUsed: boolean; synced: boolean }> => {
    const p10 = cleanPhone10(data.Phone);

    const { data: existing, error: readErr } = await supabaseFetch<Array<{ phone: string }>>(
      `trial_claims?phone=eq.${encodeURIComponent(p10)}&select=phone`
    );

    if (readErr) {
      return { alreadyUsed: false, synced: false };
    }

    if (Array.isArray(existing) && existing.length > 0) {
      return { alreadyUsed: true, synced: true };
    }

    const { error: insertErr } = await supabaseFetch(
      "trial_claims",
      {
        method: "POST",
        body: JSON.stringify({
          phone: p10,
          claimed_at: new Date().toISOString(),
        }),
      },
      true
    );

    if (insertErr) {
      return { alreadyUsed: false, synced: false };
    }

    return { alreadyUsed: false, synced: true };
  });