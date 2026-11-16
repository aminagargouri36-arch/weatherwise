import { getVapidKeys } from "@/lib/push";

export const dynamic = "force-dynamic";

/** Public VAPID key the browser needs to create a push subscription. */
export async function GET() {
  const keys = await getVapidKeys();
  return Response.json({ publicKey: keys.publicKey });
}
