import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { locations } from "@/db/schema";
import { ensureUser } from "@/lib/identity";

export const dynamic = "force-dynamic";

/**
 * App boot: creates the anonymous user (httpOnly cookie) on first launch and
 * returns the full client state — preferences + saved locations. Mirrors the
 * "session bootstrap" call a native app would make to its backend.
 */
export async function POST(req: Request) {
  let preferred: string | undefined;
  try {
    const body = (await req.json()) as { locale?: string };
    preferred = body?.locale;
  } catch {
    // no body is fine
  }
  const user = await ensureUser(preferred);
  const locs = await db
    .select()
    .from(locations)
    .where(eq(locations.userId, user.id))
    .orderBy(desc(locations.isPrimary), asc(locations.createdAt));

  return Response.json({
    user: {
      locale: user.locale,
      units: user.units,
      pushEnabled: user.pushEnabled,
      notifyTempShift: user.notifyTempShift,
      notifyPrecip: user.notifyPrecip,
      notifyMorning: user.notifyMorning,
      morningHour: user.morningHour,
    },
    locations: locs.map((l) => ({
      id: l.id,
      label: l.label,
      country: l.country,
      admin1: l.admin1,
      lat: l.lat,
      lon: l.lon,
      kind: l.kind,
      isPrimary: l.isPrimary,
      timezone: l.timezone,
    })),
  });
}
