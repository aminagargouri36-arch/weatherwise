import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { resolveLocale, type Locale } from "@/i18n";

/**
 * Anonymous device identity: a signed-in user record keyed by an httpOnly,
 * SameSite cookie. No PII collected; the id is an opaque random UUID. This
 * keeps API calls authenticated per device while staying account-free.
 */
export const USER_COOKIE = "ww_uid";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCurrentUser(): Promise<User | null> {
  const jar = await cookies();
  const raw = jar.get(USER_COOKIE)?.value;
  if (!raw || !UUID_RE.test(raw)) return null;
  const rows = await db.select().from(users).where(eq(users.id, raw)).limit(1);
  return rows[0] ?? null;
}

export async function ensureUser(preferredLocale?: string): Promise<User> {
  const existing = await getCurrentUser();
  if (existing) return existing;
  const locale: Locale = resolveLocale(preferredLocale);
  const rows = await db.insert(users).values({ locale }).returning();
  const user = rows[0];
  const jar = await cookies();
  jar.set(USER_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return user;
}
