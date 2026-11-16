import { z } from "zod";
import { searchPlaces } from "@/lib/geo";

export const dynamic = "force-dynamic";

const schema = z.object({
  q: z.string().trim().min(2).max(80),
  lang: z.string().max(8).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = schema.safeParse({
    q: url.searchParams.get("q"),
    lang: url.searchParams.get("lang") ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: "invalid_query" }, { status: 422 });
  }
  const results = await searchPlaces(parsed.data.q, parsed.data.lang);
  return Response.json({ results });
}
