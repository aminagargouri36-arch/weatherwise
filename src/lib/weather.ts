// Real weather provider client. All calls happen server-side so provider
// endpoints (and future API keys) never reach the device. Provider: Open-Meteo
// (free, no key). Swap this module for a keyed provider without touching the UI.

export type ConditionKey =
  | "clear"
  | "mostlyClear"
  | "partlyCloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "lightRain"
  | "rain"
  | "heavyRain"
  | "freezingRain"
  | "lightSnow"
  | "snow"
  | "heavySnow"
  | "sleet"
  | "showers"
  | "thunderstorm";

export type ConditionKind = "clear" | "cloud" | "fog" | "rain" | "snow" | "storm";

export interface NowWeather {
  t: number;
  feels: number;
  humidity: number;
  wind: number; // km/h
  windDir: number;
  precip: number; // mm
  uv: number;
  visibilityKm: number;
  code: number;
  condition: ConditionKey;
  kind: ConditionKind;
  isDay: boolean;
  time: string; // ISO local
}

export interface HourPoint {
  time: string; // ISO local "YYYY-MM-DDTHH:mm"
  t: number;
  feels: number;
  precipProb: number;
  code: number;
  condition: ConditionKey;
  kind: ConditionKind;
  uv: number;
  wind: number;
  isDay: boolean;
}

export interface DayInfo {
  date: string; // YYYY-MM-DD local
  min: number;
  max: number;
  precipProb: number;
  code: number;
  condition: ConditionKey;
  kind: ConditionKind;
  sunrise: string;
  sunset: string;
  uvMax: number;
}

export interface Forecast {
  timezone: string;
  now: NowWeather;
  hours: HourPoint[]; // next 24h from current hour
  today: DayInfo;
  tomorrow: DayInfo;
  fetchedAt: number; // epoch ms
  place?: { label: string; lat: number; lon: number };
}

/** WMO weather-code → our translated condition groups. */
export function codeToCondition(code: number): ConditionKey {
  if (code === 0) return "clear";
  if (code === 1) return "mostlyClear";
  if (code === 2) return "partlyCloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 55) return "drizzle";
  if (code === 56 || code === 57 || code === 66 || code === 67) return "freezingRain";
  if (code === 61) return "lightRain";
  if (code === 63) return "rain";
  if (code === 65) return "heavyRain";
  if (code === 71 || code === 77) return "lightSnow";
  if (code === 73 || code === 85) return "snow";
  if (code === 75 || code === 86) return "heavySnow";
  if (code >= 80 && code <= 82) return "showers";
  if (code >= 95) return "thunderstorm";
  return "partlyCloudy";
}

export function conditionKind(c: ConditionKey): ConditionKind {
  if (c === "clear" || c === "mostlyClear") return "clear";
  if (c === "partlyCloudy" || c === "overcast") return "cloud";
  if (c === "fog") return "fog";
  if (
    c === "lightSnow" ||
    c === "snow" ||
    c === "heavySnow" ||
    c === "sleet" ||
    c === "freezingRain"
  )
    return "snow";
  if (c === "thunderstorm") return "storm";
  return "rain"; // drizzle, lightRain, rain, heavyRain, showers
}

export class WeatherError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "WeatherError";
    this.cause = cause;
  }
}

interface OMResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    is_day: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    uv_index: number[];
    visibility: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

async function fetchJson(url: string, timeoutMs = 9000): Promise<OMResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timer);
      if (!res.ok) throw new WeatherError(`provider responded ${res.status}`);
      return (await res.json()) as OMResponse;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  console.error("[weather] provider fetch failed", lastErr);
  throw new WeatherError("weather provider unavailable", lastErr);
}

/**
 * Short-lived server-side forecast cache (~10 min, keyed by ~1 km coordinate
 * cell). Weather data freshness tolerates this easily, and it shields the
 * provider from bursts while smoothing over transient network hiccups.
 * In serverless deployments the cache simply colds-starts per instance.
 */
const FORECAST_TTL_MS = 10 * 60 * 1000;
const forecastCache = new Map<string, { data: Forecast; at: number }>();

export async function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = forecastCache.get(cacheKey);
  if (hit && Date.now() - hit.at < FORECAST_TTL_MS) {
    return hit.data;
  }
  const fresh = await fetchForecastUncached(lat, lon);
  forecastCache.set(cacheKey, { data: fresh, at: Date.now() });
  if (forecastCache.size > 200) {
    // Bound memory: drop the oldest quarter.
    const entries = [...forecastCache.entries()].sort((a, b) => a[1].at - b[1].at);
    for (const [k] of entries.slice(0, 50)) forecastCache.delete(k);
  }
  return fresh;
}

async function fetchForecastUncached(lat: number, lon: number): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day",
    hourly:
      "temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,uv_index,visibility,is_day",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset",
    timezone: "auto",
    forecast_days: "2",
    wind_speed_unit: "kmh",
  });
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!data?.current || !data?.hourly?.time?.length) {
    throw new WeatherError("provider returned malformed payload");
  }

  // Current local hour string (provider-local, matches hourly.time format)
  const nowLocal = data.current.time.slice(0, 13); // "YYYY-MM-DDTHH"
  const startIdx = Math.max(
    0,
    data.hourly.time.findIndex((t) => t.slice(0, 13) >= nowLocal),
  );

  const hours: HourPoint[] = [];
  for (
    let i = startIdx;
    i < Math.min(data.hourly.time.length, startIdx + 24);
    i++
  ) {
    const code = data.hourly.weather_code[i];
    const condition = codeToCondition(code);
    hours.push({
      time: data.hourly.time[i],
      t: Math.round(data.hourly.temperature_2m[i] * 10) / 10,
      feels: Math.round(data.hourly.apparent_temperature[i] * 10) / 10,
      precipProb: data.hourly.precipitation_probability?.[i] ?? 0,
      code,
      condition,
      kind: conditionKind(condition),
      uv: Math.round((data.hourly.uv_index?.[i] ?? 0) * 10) / 10,
      wind: Math.round(data.hourly.wind_speed_10m[i]),
      isDay: data.hourly.is_day[i] === 1,
    });
  }

  const toDay = (i: number): DayInfo => {
    const code = data.daily.weather_code[i];
    const condition = codeToCondition(code);
    return {
      date: data.daily.time[i],
      min: Math.round(data.daily.temperature_2m_min[i] * 10) / 10,
      max: Math.round(data.daily.temperature_2m_max[i] * 10) / 10,
      precipProb: data.daily.precipitation_probability_max?.[i] ?? 0,
      code,
      condition,
      kind: conditionKind(condition),
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      uvMax: Math.round((data.daily.uv_index_max?.[i] ?? 0) * 10) / 10,
    };
  };

  const nowCode = data.current.weather_code;
  const nowCondition = codeToCondition(nowCode);

  return {
    timezone: data.timezone,
    now: {
      t: Math.round(data.current.temperature_2m * 10) / 10,
      feels: Math.round(data.current.apparent_temperature * 10) / 10,
      humidity: data.current.relative_humidity_2m,
      wind: Math.round(data.current.wind_speed_10m),
      windDir: data.current.wind_direction_10m,
      precip: data.current.precipitation,
      uv: hours[0]?.uv ?? 0,
      visibilityKm: Math.round(((data.hourly.visibility?.[startIdx] ?? 10000) / 1000) * 10) / 10,
      code: nowCode,
      condition: nowCondition,
      kind: conditionKind(nowCondition),
      isDay: data.current.is_day === 1,
      time: data.current.time,
    },
    hours,
    today: toDay(0),
    tomorrow: toDay(1),
    fetchedAt: Date.now(),
  };
}

/** Compact day summary stored for forecast-diffing by the watcher job. */
export interface DaySnapshot {
  date: string;
  max: number;
  min: number;
  precipProb: number;
  kind: ConditionKind;
  outfitItems: string[];
  fetchedAt: number;
}
