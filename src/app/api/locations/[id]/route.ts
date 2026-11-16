import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { locations, weatherSnapshots } from "@/db/schema";
import { getCurrentUser } from "@/lib/identity";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const rows = await db
    .delete(locations)
    .where(and(eq(locations.id, id), eq(locations.userId, user.id)))
    .returning();
  if (!rows[0]) return Response.json({ error: "not_found" }, { status: 404 });

  // Promote another city to primary if we deleted the home city.
  if (rows[0].isPrimary) {
    const remaining = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, user.id))
      .orderBy(desc(locations.createdAt));
    if (remaining[0]) {
      await db
        .update(locations)
        .set({ isPrimary: true })
        .where(eq(locations.id, remaining[0].id));
    }
  }
  return Response.json({ ok: true });
}

const patchSchema = z.object({ isPrimary: z.literal(true) });

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_payload" }, { status: 422 });
  }

  const target = await db
    .select()
    .from(locations)
    .where(and(eq(locations.id, id), eq(locations.userId, user.id)))
    .limit(1);
  if (!target[0]) return Response.json({ error: "not_found" }, { status: 404 });

  await db.update(locations).set({ isPrimary: false }).where(eq(locations.userId, user.id));
  await db.update(locations).set({ isPrimary: true }).where(eq(locations.id, id));

  // Clear stored snapshots for the new home city so the watcher diff restarts.
  await db.delete(weatherSnapshots).where(eq(weatherSnapshots.locationId, id));

  return Response.json({ ok: true });
}
