import { postgresInquiries } from "./inquiry-postgres";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import type { Store } from "./store";
import type { Inquiry, EntryRow } from "@/lib/domain";
const numericInquiry = (r: Record<string, unknown>): Inquiry =>
  Object.fromEntries(
    Object.entries(r).map(([key, value]) => [
      key,
      typeof value === "bigint" ? Number(value) : value,
    ]),
  ) as unknown as Inquiry;
export function postgresStore(connectionString: string): Store {
  const prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });
  const entryRow = (
    r: { kind: string; createdAt: bigint; updatedAt: bigint } & Omit<
      EntryRow,
      "kind" | "createdAt" | "updatedAt"
    >,
  ): EntryRow => ({
    ...r,
    kind: r.kind as EntryRow["kind"],
    createdAt: Number(r.createdAt),
    updatedAt: Number(r.updatedAt),
  });
  return {
    ...postgresInquiries(prisma),
    async list(kind) {
      return (
        await prisma.entry.findMany({
          where: { kind, status: "published" },
          orderBy: [
            { featured: "desc" },
            { sortOrder: "asc" },
            { createdAt: "desc" },
          ],
          take: 200,
        })
      ).map(entryRow);
    },
    async find(kind, slug) {
      const row = await prisma.entry.findFirst({
        where: { kind, slug, status: "published" },
      });
      return row ? entryRow(row) : null;
    },
    async inquiry(idempotencyKey) {
      const row = await prisma.inquiry.findUnique({
        where: { idempotencyKey },
      });
      return row ? numericInquiry(row) : null;
    },
    async createInquiry(row) {
      const r = await prisma.inquiry.createMany({
        data: {
          ...row,
          createdAt: BigInt(row.createdAt),
          updatedAt: BigInt(row.updatedAt),
          meetingAt: row.meetingAt === null ? null : BigInt(row.meetingAt),
          followUpAt: row.followUpAt === null ? null : BigInt(row.followUpAt),
          firstNotificationAt: BigInt(row.firstNotificationAt),
          nextNotificationAt: BigInt(row.nextNotificationAt),
          notificationLeaseUntil: BigInt(row.notificationLeaseUntil),
        },
        skipDuplicates: true,
      });
      return r.count > 0;
    },
    async consumeRate(key, now, ttl) {
      const rows = await prisma.$queryRaw<
        { count: number }[]
      >`INSERT INTO "rate_buckets" (id,count,"expiresAt") VALUES (${key},1,${BigInt(now + ttl)}) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN "rate_buckets"."expiresAt"<=${BigInt(now)} THEN 1 ELSE "rate_buckets".count+1 END,"expiresAt"=CASE WHEN "rate_buckets"."expiresAt"<=${BigInt(now)} THEN EXCLUDED."expiresAt" ELSE "rate_buckets"."expiresAt" END RETURNING count`;
      return rows[0]?.count ?? 999;
    },
    async isMediaPublic(path) {
      const rows = await prisma.$queryRaw<
        { id: string }[]
      >`SELECT id FROM entries WHERE kind='project' AND status='published' AND ((data::jsonb ->> 'cover')=${path} OR (data::jsonb -> 'gallery') @> ${JSON.stringify([path])}::jsonb) LIMIT 1`;
      return rows.length > 0;
    },
  };
}
