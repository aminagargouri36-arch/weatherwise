import {
  pgTable,
  uuid,
  text,
  real,
  boolean,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * Anonymous-authenticated user. Identity is a secure httpOnly cookie holding
 * the user id — no passwords/PII required for a weather product, while every
 * row is still scoped to a real user record. Upgradable to full auth later.
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  locale: text("locale").default("en").notNull(), // en | fr | ar
  units: text("units").default("metric").notNull(), // metric | imperial
  pushEnabled: boolean("push_enabled").default(false).notNull(),
  notifyTempShift: boolean("notify_temp_shift").default(true).notNull(),
  notifyPrecip: boolean("notify_precip").default(true).notNull(),
  notifyMorning: boolean("notify_morning").default(false).notNull(),
  morningHour: integer("morning_hour").default(7).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    label: text("label").notNull(),
    country: text("country"),
    admin1: text("admin1"),
    lat: real("lat").notNull(),
    lon: real("lon").notNull(),
    kind: text("kind").default("manual").notNull(), // gps | manual
    isPrimary: boolean("is_primary").default(false).notNull(),
    timezone: text("timezone").default("UTC").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("locations_user_idx").on(t.userId)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("push_endpoint_unique").on(t.endpoint)],
);

/**
 * Compact forecast summary stored at every background check. The watcher job
 * diffs a fresh forecast against the latest snapshot to decide whether a
 * meaningful change happened (temperature band shift, precip crossing a
 * threshold, condition-group change) before pushing.
 */
export const weatherSnapshots = pgTable(
  "weather_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    locationId: uuid("location_id")
      .references(() => locations.id, { onDelete: "cascade" })
      .notNull(),
    summary: jsonb("summary").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("snapshots_loc_idx").on(t.locationId, t.fetchedAt)],
);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    kind: text("kind").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("notif_dedupe_unique").on(t.userId, t.dedupeKey)],
);

/** Server-side key/value store (VAPID keys, scheduler bookkeeping). */
export const kvSettings = pgTable("kv_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type User = typeof users.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
