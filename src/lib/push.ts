import { generateVAPIDKeys, sendNotification, setVapidDetails } from "web-push";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kvSettings, pushSubscriptions } from "@/db/schema";

/**
 * Web Push (VAPID) delivery. Keys come from env when available
 * (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) and otherwise are generated once and
 * persisted server-side in the kv_settings table, so restarts don't
 * invalidate existing subscriptions.
 */
interface VapidPair {
  publicKey: string;
  privateKey: string;
}

let cached: VapidPair | null = null;

export async function getVapidKeys(): Promise<VapidPair> {
  if (cached) return cached;
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) {
    cached = { publicKey: envPub, privateKey: envPriv };
    return cached;
  }
  const rows = await db
    .select()
    .from(kvSettings)
    .where(eq(kvSettings.key, "vapid"))
    .limit(1);
  if (rows[0]) {
    cached = JSON.parse(rows[0].value) as VapidPair;
    return cached;
  }
  const generated = generateVAPIDKeys();
  cached = { publicKey: generated.publicKey, privateKey: generated.privateKey };
  await db.insert(kvSettings).values({ key: "vapid", value: JSON.stringify(cached) });
  return cached;
}

export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  url?: string;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  const keys = await getVapidKeys();
  setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@weatherwise.app",
    keys.publicKey,
    keys.privateKey,
  );
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    try {
      await sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 3 },
      );
      sent++;
    } catch (err) {
      failed++;
      const status = (err as { statusCode?: number }).statusCode;
      // 404/410 → subscription expired or revoked; clean it up.
      if (status === 404 || status === 410) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, sub.endpoint));
      }
    }
  }
  return { sent, failed };
}
