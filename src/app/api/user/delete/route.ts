import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  locations,
  notificationLog,
  pushSubscriptions,
  users,
  weatherSnapshots,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/identity";

export const dynamic = "force-dynamic";

/** Privacy: permanently erase everything stored about this device/user. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  // Explicit per-table deletes (cascades also configured in schema as backup).
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id));
  await db.delete(weatherSnapshots).where(eq(weatherSnapshots.userId, user.id));
  await db.delete(notificationLog).where(eq(notificationLog.userId, user.id));
  await db.delete(locations).where(eq(locations.userId, user.id));
  await db.delete(users).where(eq(users.id, user.id));

  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      // Expire the identity cookie.
      "set-cookie": `ww_uid=; Path=/; HttpOnly; Max-Age=0; SameSite=None; Secure`,
    },
  });
}
