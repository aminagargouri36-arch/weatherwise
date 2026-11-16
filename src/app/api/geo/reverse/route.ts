import { z } from "zod";
import { reverseGeocode } from "@/lib/geo";

export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  lang: z.string().max(8).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = schema.safeParse({
    lat: url.searchParams.get("lat"),
    lon: url.searchParams.get("lon"),
    lang: url.searchParams.get("lang") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "invalid_coordinates" }, { status: 422 });
  }
  const label = await reverseGeocode(parsed.data.lat, parsed.data.lon, parsed.data.lang);
  return Response.json({ label });
}
