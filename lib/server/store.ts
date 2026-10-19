import { d1Inquiries, type InquiryStore } from "./inquiry-store";
import type { EntryRow, Inquiry, Kind } from "@/lib/domain";
import { runtime } from "./runtime";
export interface Store extends InquiryStore {
  list(kind: Kind): Promise<EntryRow[]>;
  find(kind: Kind, slug: string): Promise<EntryRow | null>;
  inquiry(key: string): Promise<Inquiry | null>;
  createInquiry(row: Inquiry): Promise<boolean>;
  consumeRate(key: string, now: number, ttl: number): Promise<number>;
  isMediaPublic(path: string): Promise<boolean>;
}
function d1Store(db: D1Database): Store {
  return {
    ...d1Inquiries(db),
    async list(kind) {
      const r = await db
        .prepare(
          "SELECT * FROM entries WHERE kind=? AND status='published' ORDER BY featured DESC, sortOrder ASC, createdAt DESC LIMIT 200",
        )
        .bind(kind)
        .all<EntryRow>();
      return r.results;
    },
    async find(kind, slug) {
      return db
        .prepare(
          "SELECT * FROM entries WHERE kind=? AND slug=? AND status='published'",
        )
        .bind(kind, slug)
        .first<EntryRow>();
    },
    async inquiry(key) {
      return db
        .prepare("SELECT * FROM inquiries WHERE idempotencyKey=?")
        .bind(key)
        .first<Inquiry>();
    },
    async createInquiry(r) {
      const result = await db
        .prepare(
          "INSERT OR IGNORE INTO inquiries (id,idempotencyKey,fingerprint,name,email,subject,message,status,createdAt,providerId,details,updatedAt,notificationPayload) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          r.id,
          r.idempotencyKey,
          r.fingerprint,
          r.name,
          r.email,
          r.subject,
          r.message,
          r.status,
          r.createdAt,
          r.providerId,
          r.details,
          r.updatedAt,
          r.notificationPayload,
        )
        .run();
      return (result.meta.changes ?? 0) > 0;
    },
    async consumeRate(key, now, ttl) {
      const r = await db
        .prepare(
          "INSERT INTO rate_buckets (id,count,expiresAt) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN expiresAt<=? THEN 1 ELSE count+1 END,expiresAt=CASE WHEN expiresAt<=? THEN excluded.expiresAt ELSE expiresAt END RETURNING count",
        )
        .bind(key, now + ttl, now, now)
        .first<{ count: number }>();
      return r?.count ?? 999;
    },
    async isMediaPublic(path) {
      return !!(await db
        .prepare(
          "SELECT id FROM entries WHERE kind='project' AND status='published' AND (json_extract(data,'$.cover')=? OR EXISTS (SELECT 1 FROM json_each(json_extract(data,'$.gallery')) WHERE value=?)) LIMIT 1",
        )
        .bind(path, path)
        .first());
    },
  };
}
let postgres: Promise<Store> | undefined;
export async function getStore(): Promise<Store> {
  const env = runtime();
  if (env.DB) return d1Store(env.DB);
  if (env.DATABASE_URL) {
    postgres ??= import("./store-postgres").then((m) =>
      m.postgresStore(env.DATABASE_URL!),
    );
    return postgres;
  }
  throw new Error("Database connection is not configured");
}
