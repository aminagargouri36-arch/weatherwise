import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/identity";
import { LOCALES } from "@/i18n";

export const dynamic = "force-dynamic";

const patchSchema = z
  .object({
    locale: z.enum(LOCALES as [string, ...string[]]),
    units: z.enum(["metric", "imperial"]),
    pushEnabled: z.boolean(),
    notifyTempShift: z.boolean(),
    notifyPrecip: z.boolean(),
    notifyMorning: z.boolean(),
    morningHour: z.number().int().min(0).max(23),
  })
  .partial();

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_payload" }, { status: 422 });
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return Response.json({ ok: true, user });
  }

  const rows = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, user.id))
    .returning();
  const updated = rows[0];

  // Mirror the locale into a lightweight cookie so the server can render the
  // correct <html lang/dir> on the next navigation (RTL support from the very
  // first byte).
  if (updates.locale) {
    const jar = await cookies();
    jar.set("ww_locale", updates.locale, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return Response.json({
    ok: true,
    user: {
      locale: updated.locale,
      units: updated.units,
      pushEnabled: updated.pushEnabled,
      notifyTempShift: updated.notifyTempShift,
      notifyPrecip: updated.notifyPrecip,
      notifyMorning: updated.notifyMorning,
      morningHour: updated.morningHour,
    },
  });
}
