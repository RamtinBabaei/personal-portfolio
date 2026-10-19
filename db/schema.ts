// Public project reads and private contact delivery storage. Legacy columns are retained for safe upgrades.
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const entries = sqliteTable(
  "entries",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    slug: text("slug").notNull(),
    status: text("status").notNull(),
    featured: integer("featured").notNull(),
    sortOrder: integer("sortOrder").notNull(),
    data: text("data").notNull(),
    createdAt: integer("createdAt").notNull(),
    updatedAt: integer("updatedAt").notNull(),
  },
  (t) => [
    uniqueIndex("entries_kind_slug").on(t.kind, t.slug),
    index("entries_published").on(t.kind, t.status, t.sortOrder),
  ],
);
export const inquiries = sqliteTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    idempotencyKey: text("idempotencyKey").notNull().unique(),
    fingerprint: text("fingerprint").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull(),
    createdAt: integer("createdAt").notNull(),
    providerId: text("providerId"),
    details: text("details").notNull().default("{}"),
    notificationPayload: text("notificationPayload").notNull().default(""),
    stage: text("stage").notNull().default("new"),
    isRead: integer("isRead").notNull().default(0),
    archived: integer("archived").notNull().default(0),
    privateNotes: text("privateNotes").notNull().default(""),
    meetingAt: integer("meetingAt"),
    meetingNotes: text("meetingNotes").notNull().default(""),
    followUpAt: integer("followUpAt"),
    nextAction: text("nextAction").notNull().default(""),
    updatedAt: integer("updatedAt").notNull().default(0),
    notificationAttempts: integer("notificationAttempts").notNull().default(0),
    firstNotificationAt: integer("firstNotificationAt").notNull().default(0),
    nextNotificationAt: integer("nextNotificationAt").notNull().default(0),
    notificationLeaseUntil: integer("notificationLeaseUntil")
      .notNull()
      .default(0),
    notificationLease: text("notificationLease").notNull().default(""),
    lastNotificationError: text("lastNotificationError"),
  },
  (t) => [
    index("inquiries_created").on(t.createdAt),
    index("inquiries_outbox").on(t.status, t.nextNotificationAt),
    index("inquiries_workflow").on(t.archived, t.stage, t.createdAt),
  ],
);
export const rateBuckets = sqliteTable("rate_buckets", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expiresAt").notNull(),
});
export const media = sqliteTable("media", {
  id: text("id").primaryKey(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("createdAt").notNull(),
});
