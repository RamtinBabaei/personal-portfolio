import type {
  InquiryQuery,
  InquiryCounts,
  InquiryPatch,
} from "@/lib/inquiries";
import type { Inquiry } from "@/lib/domain";
// Private delivery records only. No inquiry listing/editing HTTP API exists.
export interface InquiryStore {
  findInquiry(id: string): Promise<Inquiry | null>;
  queryInquiries(
    query: InquiryQuery,
  ): Promise<{ items: Inquiry[]; total: number; counts: InquiryCounts }>;
  updateInquiry(
    id: string,
    patch: InquiryPatch,
    now: number,
  ): Promise<Inquiry | null>;
  dueNotifications(now: number, limit: number): Promise<Inquiry[]>;
  holdNotification(id: string, now: number): Promise<void>;
  claimNotification(
    id: string,
    now: number,
    lease: string,
    payload: string,
  ): Promise<Inquiry | null>;
  finishNotification(
    id: string,
    lease: string,
    status: "sent" | "failed",
    providerId: string | null,
    error: string | null,
    next: number,
  ): Promise<boolean>;
}
export function d1Inquiries(db: D1Database): InquiryStore {
  return {
    findInquiry(id) {
      return db
        .prepare("SELECT * FROM inquiries WHERE id=?")
        .bind(id)
        .first<Inquiry>();
    },
    async queryInquiries(q) {
      const where = ["1=1"];
      const values: (string | number)[] = [];
      if (q.q) {
        where.push(
          "instr(lower(name || ' ' || email || ' ' || subject || ' ' || message || ' ' || details),lower(?))>0",
        );
        values.push(q.q);
      }
      if (q.stage !== "all") {
        where.push("stage=?");
        values.push(q.stage);
      }
      if (q.archive !== "all") {
        where.push("archived=?");
        values.push(q.archive === "archived" ? 1 : 0);
      }
      if (q.unread === "unread") where.push("isRead=0");
      const clause = where.join(" AND ");
      const total = await db
        .prepare("SELECT count(*) AS n FROM inquiries WHERE " + clause)
        .bind(...values)
        .first<{ n: number }>();
      const items = await db
        .prepare(
          "SELECT * FROM inquiries WHERE " +
            clause +
            " ORDER BY createdAt " +
            (q.sort === "oldest" ? "ASC" : "DESC") +
            ",id " +
            (q.sort === "oldest" ? "ASC" : "DESC") +
            " LIMIT 30 OFFSET ?",
        )
        .bind(...values, (q.page - 1) * 30)
        .all<Inquiry>();
      const groups = await db
        .prepare(
          "SELECT stage,count(*) AS n FROM inquiries WHERE archived=0 GROUP BY stage",
        )
        .all<{ stage: string; n: number }>();
      const allCount = await db
        .prepare("SELECT count(*) AS n FROM inquiries")
        .first<{ n: number }>();
      const counts: InquiryCounts = {
        total: 0,
        new: 0,
        contacted: 0,
        meeting: 0,
        proposal: 0,
        active: 0,
        closed: 0,
      };
      for (const row of groups.results)
        if (row.stage in counts && row.stage !== "total") {
          counts[row.stage as keyof InquiryCounts] = row.n;
          counts.total += row.n;
        }
      counts.total = allCount?.n ?? 0;
      return { items: items.results, total: total?.n ?? 0, counts };
    },
    async updateInquiry(id, p, now) {
      return db
        .prepare(
          "UPDATE inquiries SET stage=?,isRead=?,archived=?,privateNotes=?,meetingAt=?,meetingNotes=?,followUpAt=?,nextAction=?,updatedAt=? WHERE id=? AND updatedAt=? RETURNING *",
        )
        .bind(
          p.stage,
          Number(p.isRead),
          Number(p.archived),
          p.privateNotes,
          p.meetingAt,
          p.meetingNotes,
          p.followUpAt,
          p.nextAction,
          Math.max(now, p.updatedAt + 1),
          id,
          p.updatedAt,
        )
        .first<Inquiry>();
    },
    async dueNotifications(now, limit) {
      return (
        await db
          .prepare(
            "SELECT * FROM inquiries WHERE status!='sent' AND notificationLeaseUntil<=? AND nextNotificationAt<=? AND notificationAttempts<6 AND coalesce(lastNotificationError,'') NOT IN ('REVIEW_REQUIRED','RETRY_EXHAUSTED') ORDER BY nextNotificationAt,createdAt LIMIT ?",
          )
          .bind(now, now, limit)
          .all<Inquiry>()
      ).results;
    },
    async holdNotification(id, now) {
      await db
        .prepare(
          "UPDATE inquiries SET status='failed',lastNotificationError='REVIEW_REQUIRED' WHERE id=? AND status!='sent' AND notificationLeaseUntil<=?",
        )
        .bind(id, now)
        .run();
    },
    claimNotification(id, now, lease, payload) {
      return db
        .prepare(
          "UPDATE inquiries SET status='sending',notificationLease=?,notificationLeaseUntil=?,notificationAttempts=notificationAttempts+1,firstNotificationAt=CASE WHEN firstNotificationAt=0 THEN ? ELSE firstNotificationAt END,notificationPayload=CASE WHEN notificationPayload='' THEN ? ELSE notificationPayload END WHERE id=? AND status!='sent' AND notificationLeaseUntil<=? AND nextNotificationAt<=? AND notificationAttempts<6 AND coalesce(lastNotificationError,'') NOT IN ('REVIEW_REQUIRED','RETRY_EXHAUSTED') RETURNING *",
        )
        .bind(lease, now + 60000, now, payload, id, now, now)
        .first<Inquiry>();
    },
    async finishNotification(id, lease, status, providerId, error, next) {
      const result = await db
        .prepare(
          "UPDATE inquiries SET status=?,providerId=?,lastNotificationError=?,nextNotificationAt=?,notificationLease='',notificationLeaseUntil=0 WHERE id=? AND notificationLease=?",
        )
        .bind(status, providerId, error, next, id, lease)
        .run();
      return (result.meta.changes ?? 0) > 0;
    },
  };
}
