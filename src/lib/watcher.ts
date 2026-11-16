import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  locations,
  notificationLog,
  users,
  weatherSnapshots,
  type Location,
  type User,
} from "@/db/schema";
import { fetchForecast, type DaySnapshot, type Forecast } from "./weather";
import { buildOutfit, outfitTipKey } from "./recommend";
import { sendPushToUser } from "./push";
import { dictionaries, fmt, type Locale } from "@/i18n";

/**
 * Weather watcher — the server-side scheduled job.
 *
 * For every user with notifications enabled and a home location it:
 *  1. fetches the live forecast,
 *  2. diffs it against the last stored snapshot for that location,
 *  3. decides whether the change is meaningful (temperature band shift,
 *     precipitation crossing the 40% threshold, wet↔dry kind flip),
 *  4. delivers a localized Web Push, deduped via notification_log so a user
 *     never gets the same alert twice for the same forecast day,
 *  5. stores the new snapshot for the next diff.
 *
 * It also sends the opt-in daily morning briefing at the user's chosen hour,
 * evaluated in the *location's* timezone. None of this depends on the app
 * being open.
 */

const TEMP_SHIFT_C = 3;
const PRECIP_THRESHOLD = 40;

function toUserUnits(c: number, units: string): number {
  return units === "imperial" ? Math.round((c * 9) / 5 + 32) : Math.round(c);
}

function localHour(tz: string): number {
  try {
    const s = new Date().toLocaleString("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    return parseInt(s, 10) % 24;
  } catch {
    return -1;
  }
}

async function latestSnapshot(locationId: string): Promise<DaySnapshot | null> {
  const rows = await db
    .select({ summary: weatherSnapshots.summary })
    .from(weatherSnapshots)
    .where(eq(weatherSnapshots.locationId, locationId))
    .orderBy(desc(weatherSnapshots.fetchedAt))
    .limit(1);
  return (rows[0]?.summary as DaySnapshot) ?? null;
}

async function storeSnapshot(userId: string, locationId: string, snap: DaySnapshot) {
  await db.insert(weatherSnapshots).values({ userId, locationId, summary: snap });
  // Prune older snapshots beyond the newest 12 per location to bound growth.
  const rows = await db
    .select({ id: weatherSnapshots.id })
    .from(weatherSnapshots)
    .where(eq(weatherSnapshots.locationId, locationId))
    .orderBy(desc(weatherSnapshots.fetchedAt));
  if (rows.length > 12) {
    await db
      .delete(weatherSnapshots)
      .where(
        inArray(
          weatherSnapshots.id,
          rows.slice(12).map((r) => r.id),
        ),
      );
  }
}

/** Insert dedupe record first; returns true if this alert is new. */
async function claimNotification(
  userId: string,
  kind: string,
  dedupeKey: string,
  title: string,
  body: string,
): Promise<boolean> {
  const inserted = await db
    .insert(notificationLog)
    .values({ userId, kind, dedupeKey, title, body })
    .onConflictDoNothing()
    .returning({ id: notificationLog.id });
  return inserted.length > 0;
}

function tipSentence(fc: Forecast, locale: Locale, units: string): string {
  const outfit = buildOutfit(fc);
  const dict = dictionaries[locale];
  const garment = outfitTipKey(outfit);
  if (garment) return dict.clothes[garment];
  const vars: Record<string, number> = {};
  for (const [k, v] of Object.entries(outfit.primary.vars)) {
    vars[k] = k === "t" ? toUserUnits(Number(v), units) : Number(v);
  }
  return fmt(dict.reasons[outfit.primary.code] ?? "", vars);
}

async function watchUserLocation(
  user: User,
  loc: Location,
): Promise<{ notified: number; error?: string }> {
  let fc: Forecast;
  try {
    fc = await fetchForecast(loc.lat, loc.lon);
  } catch {
    return { notified: 0, error: "forecast fetch failed" };
  }

  const dict = dictionaries[(user.locale as Locale) ?? "en"] ?? dictionaries.en;
  const outfit = buildOutfit(fc);
  const snap: DaySnapshot = {
    date: fc.today.date,
    max: fc.today.max,
    min: fc.today.min,
    precipProb: fc.today.precipProb,
    kind: fc.today.kind,
    outfitItems: outfit.base,
    fetchedAt: Date.now(),
  };

  let notified = 0;
  const place = loc.label;
  const wet = (k: string) => k === "rain" || k === "snow" || k === "storm";

  interface Pending {
    kind: string;
    dedupeKey: string;
    title: string;
    body: string;
  }
  const pending: Pending[] = [];

  if (user.pushEnabled) {
    const prev = await latestSnapshot(loc.id);
    if (prev && prev.date === snap.date) {
      // --- Temperature shift ------------------------------------------------
      if (user.notifyTempShift) {
        const delta = snap.max - prev.max;
        if (Math.abs(delta) >= TEMP_SHIFT_C) {
          const dir = delta > 0 ? "↑" : "↓";
          const t = toUserUnits(snap.max, user.units);
          pending.push({
            kind: "temp_shift",
            dedupeKey: `temp:${snap.date}:${delta > 0 ? "up" : "down"}`,
            title: dict.notify.tempShiftTitle,
            body: fmt(dict.notify.tempShiftBody, {
              place,
              t,
              dir,
              tip: tipSentence(fc, user.locale as Locale, user.units),
            }),
          });
        }
      }
      // --- Precipitation flip ----------------------------------------------
      if (user.notifyPrecip) {
        const becameWet = prev.precipProb < PRECIP_THRESHOLD && snap.precipProb >= PRECIP_THRESHOLD;
        const becameDry = prev.precipProb >= PRECIP_THRESHOLD && snap.precipProb < PRECIP_THRESHOLD;
        if (becameWet || (prev.kind !== snap.kind && wet(snap.kind) && !wet(prev.kind))) {
          pending.push({
            kind: "precip_shift",
            dedupeKey: `precip:${snap.date}:wet`,
            title: dict.notify.rainShiftTitle,
            body: fmt(dict.notify.rainShiftBody, {
              place,
              p: snap.precipProb,
              tip: tipSentence(fc, user.locale as Locale, user.units),
            }),
          });
        } else if (becameDry) {
          pending.push({
            kind: "precip_shift",
            dedupeKey: `precip:${snap.date}:dry`,
            title: dict.conditions[fc.today.condition],
            body: fmt(dict.notify.clearShiftBody, {
              place,
              tip: tipSentence(fc, user.locale as Locale, user.units),
            }),
          });
        }
      }
    }

    // --- Morning briefing ---------------------------------------------------
    if (user.notifyMorning && localHour(fc.timezone) === user.morningHour) {
      pending.push({
        kind: "morning",
        dedupeKey: `morning:${snap.date}`,
        title: dict.notify.morningTitle,
        body: fmt(dict.notify.morningBody, {
          place,
          t: toUserUnits(fc.now.t, user.units),
          h: toUserUnits(fc.today.max, user.units),
          tip: tipSentence(fc, user.locale as Locale, user.units),
        }),
      });
    }
  }

  for (const p of pending) {
    const isNew = await claimNotification(user.id, p.kind, p.dedupeKey, p.title, p.body);
    if (!isNew) continue;
    const res = await sendPushToUser(user.id, {
      title: p.title,
      body: p.body,
      tag: p.dedupeKey,
      url: "/",
    });
    notified += res.sent;
  }

  await storeSnapshot(user.id, loc.id, snap);
  return { notified };
}

export async function runWeatherWatches(targetUserId?: string): Promise<{
  checked: number;
  notified: number;
  errors: number;
}> {
  const candidates = targetUserId
    ? await db.select().from(users).where(eq(users.id, targetUserId))
    : await db.select().from(users);
  let checked = 0;
  let notified = 0;
  let errors = 0;

  for (const user of candidates) {
    if (!user.pushEnabled && !targetUserId) continue;
    const locs = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, user.id))
      .orderBy(desc(locations.isPrimary), desc(locations.createdAt));
    const home = locs[0];
    if (!home) continue;
    checked++;
    try {
      const res = await watchUserLocation(user, home);
      notified += res.notified;
      if (res.error) errors++;
    } catch {
      errors++;
    }
  }
  return { checked, notified, errors };
}
