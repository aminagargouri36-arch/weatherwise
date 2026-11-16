import { runWeatherWatches } from "@/lib/watcher";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-side scheduled weather watcher.
 *
 * Wire to any scheduler (Vercel Cron — see vercel.json, or cron-job.org /
 * GitHub Actions / systemd) hitting this route every ~30 minutes with
 *   Authorization: Bearer <CRON_SECRET>
 * Vercel Cron requests carry the `x-vercel-cron` header and are accepted too.
 *
 * The handler re-fetches forecasts for every watched home location, diffs
 * them against stored snapshots, and sends localized Web Push alerts with
 * dedupe — completely independent of the app being open.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  const authorized =
    isVercelCron || (secret ? auth === `Bearer ${secret}` : auth === null);
  if (!authorized) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runWeatherWatches();
  return Response.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
