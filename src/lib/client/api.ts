import type { Forecast } from "@/lib/weather";
import type { OutfitAdvice } from "@/lib/recommend";
import type { Locale } from "@/i18n";

export interface Prefs {
  locale: Locale;
  units: "metric" | "imperial";
  pushEnabled: boolean;
  notifyTempShift: boolean;
  notifyPrecip: boolean;
  notifyMorning: boolean;
  morningHour: number;
}

export interface SavedLoc {
  id: string;
  label: string;
  country: string | null;
  admin1: string | null;
  lat: number;
  lon: number;
  kind: "gps" | "manual";
  isPrimary: boolean;
  timezone: string;
}

export interface WeatherResponse {
  forecast: Forecast;
  outfit: OutfitAdvice;
}

export class ApiError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("network");
  }
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) code = j.error;
    } catch {
      /* keep code */
    }
    throw new ApiError(code);
  }
  return (await res.json()) as T;
}

export const api = {
  bootstrap: (locale: string) =>
    call<{ user: Prefs; locations: SavedLoc[] }>("/api/bootstrap", {
      method: "POST",
      body: JSON.stringify({ locale }),
    }),
  updatePrefs: (patch: Partial<Prefs>) =>
    call<{ ok: true; user: Prefs }>("/api/preferences", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  weather: (lat: number, lon: number) =>
    call<WeatherResponse>(`/api/weather?lat=${lat}&lon=${lon}`),
  searchPlaces: (q: string, lang: string) =>
    call<{ results: { label: string; country: string | null; admin1: string | null; lat: number; lon: number }[] }>(
      `/api/geo/search?q=${encodeURIComponent(q)}&lang=${lang}`,
    ),
  reverse: (lat: number, lon: number, lang: string) =>
    call<{ label: string | null }>(`/api/geo/reverse?lat=${lat}&lon=${lon}&lang=${lang}`),
  listLocations: () => call<{ locations: SavedLoc[] }>("/api/locations"),
  addLocation: (payload: {
    label: string;
    country?: string | null;
    admin1?: string | null;
    lat: number;
    lon: number;
    kind: "gps" | "manual";
    timezone?: string;
  }) => call<{ location: SavedLoc }>("/api/locations", { method: "POST", body: JSON.stringify(payload) }),
  removeLocation: (id: string) => call<{ ok: true }>(`/api/locations/${id}`, { method: "DELETE" }),
  setPrimary: (id: string) =>
    call<{ ok: true }>(`/api/locations/${id}`, { method: "PATCH", body: JSON.stringify({ isPrimary: true }) }),
  vapid: () => call<{ publicKey: string }>("/api/push/vapid"),
  subscribePush: (sub: PushSubscriptionJSON) =>
    call<{ ok: true }>("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) }),
  unsubscribePush: (endpoint: string, disableAll = false) =>
    call<{ ok: true }>("/api/push/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ endpoint, disableAll }),
    }),
  deleteMyData: () => call<{ ok: true }>("/api/user/delete", { method: "POST", body: "{}" }),
  runSelfWatch: () => call<{ ok: boolean }>("/api/cron/weather-check", { method: "POST", body: "{}" }),
};
