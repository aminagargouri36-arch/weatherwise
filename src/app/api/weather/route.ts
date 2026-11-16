import { z } from "zod";
import { fetchForecast, WeatherError } from "@/lib/weather";
import { buildOutfit } from "@/lib/recommend";
import { getCurrentUser } from "@/lib/identity";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/**
 * GET /api/weather?lat&lon
 * Server-side weather proxy: the device never talks to the provider directly.
 * Returns the normalized forecast plus the clothing-engine output.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    lat: url.searchParams.get("lat"),
    lon: url.searchParams.get("lon"),
  });
  if (!parsed.success) {
    return Response.json({ error: "invalid_coordinates" }, { status: 422 });
  }

  const user = await getCurrentUser(); // optional; used for future audit/limits

  try {
    const forecast = await fetchForecast(parsed.data.lat, parsed.data.lon);
    const outfit = buildOutfit(forecast);
    return Response.json({
      forecast,
      outfit: {
        base: outfit.base,
        accessories: outfit.accessories,
        reasons: outfit.reasons,
        primary: outfit.primary,
      },
      meta: { authenticated: Boolean(user) },
    });
  } catch (err) {
    if (err instanceof WeatherError) {
      return Response.json(
        { error: "weather_unavailable" },
        { status: 503, headers: { "retry-after": "30" } },
      );
    }
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
