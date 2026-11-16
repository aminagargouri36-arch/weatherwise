import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pushSubscriptions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/identity";

export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url().max(1000),
  disableAll: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid_payload" }, { status: 422 });
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, parsed.data.endpoint),
        eq(pushSubscriptions.userId, user.id),
      ),
    );

  if (parsed.data.disableAll) {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id));
    await db
      .update(users)
      .set({ pushEnabled: false })
      .where(eq(users.id, user.id));
  } else {
    const remaining = await db
      .select({ id: pushSubscriptions.id })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id))
      .limit(1);
    if (remaining.length === 0) {
      await db
        .update(users)
        .set({ pushEnabled: false })
        .where(eq(users.id, user.id));
    }
  }
  return Response.json({ ok: true });
}
