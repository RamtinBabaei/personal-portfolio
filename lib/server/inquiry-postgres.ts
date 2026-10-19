import type { PrismaClient } from "@prisma/client";
import type { InquiryCounts } from "@/lib/inquiries";
import type { Inquiry } from "@/lib/domain";
import type { InquiryStore } from "./inquiry-store";
export function postgresInquiries(prisma: PrismaClient): InquiryStore {
  const row = (r: Record<string, unknown>): Inquiry =>
    Object.fromEntries(
      Object.entries(r).map(([key, value]) => [
        key,
        typeof value === "bigint" ? Number(value) : value,
      ]),
    ) as unknown as Inquiry;
  return {
    async findInquiry(id) {
      const r = await prisma.inquiry.findUnique({ where: { id } });
      return r ? row(r) : null;
    },
    async queryInquiries(q) {
      const where = {
        ...(q.q
          ? {
              OR: ["name", "email", "subject", "message", "details"].map(
                (key) => ({
                  [key]: { contains: q.q, mode: "insensitive" as const },
                }),
              ),
            }
          : {}),
        ...(q.stage !== "all" ? { stage: q.stage } : {}),
        ...(q.archive !== "all"
          ? { archived: q.archive === "archived" ? 1 : 0 }
          : {}),
        ...(q.unread === "unread" ? { isRead: 0 } : {}),
      };
      const [items, total, groups, allCount] = await Promise.all([
        prisma.inquiry.findMany({
          where,
          orderBy: [
            { createdAt: q.sort === "oldest" ? "asc" : "desc" },
            { id: q.sort === "oldest" ? "asc" : "desc" },
          ],
          take: 30,
          skip: (q.page - 1) * 30,
        }),
        prisma.inquiry.count({ where }),
        prisma.inquiry.groupBy({
          by: ["stage"],
          where: { archived: 0 },
          _count: { _all: true },
        }),
        prisma.inquiry.count(),
      ]);
      const counts: InquiryCounts = {
        total: 0,
        new: 0,
        contacted: 0,
        meeting: 0,
        proposal: 0,
        active: 0,
        closed: 0,
      };
      for (const g of groups)
        if (g.stage in counts && g.stage !== "total") {
          counts[g.stage as keyof InquiryCounts] = g._count._all;
          counts.total += g._count._all;
        }
      counts.total = allCount;
      return { items: items.map(row), total, counts };
    },
    async updateInquiry(id, p, now) {
      const result = await prisma.inquiry.updateMany({
        where: { id, updatedAt: BigInt(p.updatedAt) },
        data: {
          stage: p.stage,
          isRead: Number(p.isRead),
          archived: Number(p.archived),
          privateNotes: p.privateNotes,
          meetingAt: p.meetingAt === null ? null : BigInt(p.meetingAt),
          meetingNotes: p.meetingNotes,
          followUpAt: p.followUpAt === null ? null : BigInt(p.followUpAt),
          nextAction: p.nextAction,
          updatedAt: BigInt(Math.max(now, p.updatedAt + 1)),
        },
      });
      if (!result.count) return null;
      return row(await prisma.inquiry.findUniqueOrThrow({ where: { id } }));
    },
    async dueNotifications(now, limit) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'SELECT * FROM inquiries WHERE status!=\'sent\' AND "notificationLeaseUntil"<=$1 AND "nextNotificationAt"<=$1 AND "notificationAttempts"<6 AND coalesce("lastNotificationError",\'\') NOT IN (\'REVIEW_REQUIRED\',\'RETRY_EXHAUSTED\') ORDER BY "nextNotificationAt","createdAt" LIMIT $2',
        BigInt(now),
        limit,
      );
      return rows.map(row);
    },
    async holdNotification(id, now) {
      await prisma.inquiry.updateMany({
        where: {
          id,
          status: { not: "sent" },
          notificationLeaseUntil: { lte: BigInt(now) },
        },
        data: { status: "failed", lastNotificationError: "REVIEW_REQUIRED" },
      });
    },
    async claimNotification(id, now, lease, payload) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        'UPDATE inquiries SET status=\'sending\',"notificationLease"=$1,"notificationLeaseUntil"=$2,"notificationAttempts"="notificationAttempts"+1,"firstNotificationAt"=CASE WHEN "firstNotificationAt"=0 THEN $3 ELSE "firstNotificationAt" END,"notificationPayload"=CASE WHEN "notificationPayload"=\'\' THEN $4 ELSE "notificationPayload" END WHERE id=$5 AND status!=\'sent\' AND "notificationLeaseUntil"<=$3 AND "nextNotificationAt"<=$3 AND "notificationAttempts"<6 AND coalesce("lastNotificationError",\'\') NOT IN (\'REVIEW_REQUIRED\',\'RETRY_EXHAUSTED\') RETURNING *',
        lease,
        BigInt(now + 60000),
        BigInt(now),
        payload,
        id,
      );
      return rows[0] ? row(rows[0]) : null;
    },
    async finishNotification(id, lease, status, providerId, error, next) {
      const result = await prisma.inquiry.updateMany({
        where: { id, notificationLease: lease },
        data: {
          status,
          providerId,
          lastNotificationError: error,
          nextNotificationAt: BigInt(next),
          notificationLease: "",
          notificationLeaseUntil: BigInt(0),
        },
      });
      return result.count > 0;
    },
  };
}
