// src/lib/supabase.ts - AL MURTAJIZ Supabase Client Helper

const envUrl = import.meta.env["VITE_SUPABASE_URL"];
const envKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

export const SUPABASE_URL: string =
  typeof envUrl === "string" && envUrl.length > 0
    ? envUrl
    : "https://zqwlbecrcopqwrwzozhb.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY: string =
  typeof envKey === "string" && envKey.length > 0
    ? envKey
    : "";

export function getSupabaseHeaders(includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };

  if (includeJson) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
  }

  return headers;
}

export async function supabaseFetch<T>(
  pathWithQuery: string,
  options: RequestInit = {},
  includeJson = false
): Promise<{ data: T | null; error: string | null }> {
  if (!SUPABASE_PUBLISHABLE_KEY) {
    return {
      data: null,
      error: "VITE_SUPABASE_PUBLISHABLE_KEY missing hai. .env file check karein.",
    };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathWithQuery}`, {
      ...options,
      headers: {
        ...getSupabaseHeaders(includeJson),
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        data: null,
        error: `Supabase error (${response.status}): ${errText}`,
      };
    }

    if (response.status === 204) {
      return { data: null, error: null };
    }

    const data = (await response.json()) as T;
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network request fail ho gayi.",
    };
  }
}
