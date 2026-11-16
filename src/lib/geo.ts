// Geocoding + reverse-geocoding, proxied server-side (no keys on the client,
// proper User-Agent etiquette for OSM Nominatim).

export interface GeoPlace {
  label: string;
  country: string | null;
  admin1: string | null;
  lat: number;
  lon: number;
}

export async function searchPlaces(query: string, lang = "en"): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({
    name: q,
    count: "8",
    language: lang,
    format: "json",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: {
        name: string;
        country?: string;
        admin1?: string;
        latitude: number;
        longitude: number;
      }[];
    };
    return (data.results ?? []).map((r) => ({
      label: r.name,
      country: r.country ?? null,
      admin1: r.admin1 ?? null,
      lat: r.latitude,
      lon: r.longitude,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function reverseGeocode(lat: number, lon: number, lang = "en"): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "jsonv2",
    zoom: "10",
    "accept-language": lang,
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "User-Agent": "WeatherWise/1.0 (weather-advisor app)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; municipality?: string; county?: string };
    };
    const a = data.address;
    return a?.city ?? a?.town ?? a?.village ?? a?.municipality ?? a?.county ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
