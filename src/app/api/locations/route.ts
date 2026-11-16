import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { getCurrentUser } from "@/lib/identity";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const locs = await db
    .select()
    .from(locations)
    .where(eq(locations.userId, user.id))
    .orderBy(desc(locations.isPrimary), asc(locations.createdAt));
  return Response.json({ locations: locs });
}

const createSchema = z.object({
  label: z.string().trim().min(1).max(80),
  country: z.string().max(80).nullish(),
  admin1: z.string().max(80).nullish(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  kind: z.enum(["gps", "manual"]).default("manual"),
  timezone: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_payload" }, { status: 422 });
  }

  const existing = await db
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.userId, user.id));
  if (existing.length >= 12) {
    return Response.json({ error: "too_many_locations" }, { status: 409 });
  }

  const isPrimary = existing.length === 0 || parsed.data.kind === "gps";

  if (isPrimary && existing.length > 0) {
    await db
      .update(locations)
      .set({ isPrimary: false })
      .where(eq(locations.userId, user.id));
  }

  const rows = await db
    .insert(locations)
    .values({
      userId: user.id,
      label: parsed.data.label,
      country: parsed.data.country ?? null,
      admin1: parsed.data.admin1 ?? null,
      lat: parsed.data.lat,
      lon: parsed.data.lon,
      kind: parsed.data.kind,
      isPrimary,
      timezone: parsed.data.timezone ?? "UTC",
    })
    .returning();

  return Response.json({ location: rows[0] }, { status: 201 });
}
