import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { inquiryDefaults } from "@/lib/contact-record";
import { inquiryQuerySchema, inquiryView } from "@/lib/inquiries";
import { InquiryDashboard } from "@/components/inquiry-dashboard";
import { testDatabase } from "../helpers/database";
let database: Awaited<ReturnType<typeof testDatabase>>;
beforeEach(async () => {
  database = await testDatabase();
});
afterEach(() => database.db.close());
describe("restored private inquiry workflow", () => {
  it("retains private notes and scheduling metadata, enforces edit versions and filters archives", async () => {
    const row = {
      ...inquiryDefaults,
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      fingerprint: "private",
      name: "Client",
      email: "client@example.com",
      subject: "New project",
      message: "A sufficiently detailed project message.",
      status: "queued",
      providerId: null,
      createdAt: 1000,
      updatedAt: 1000,
    };
    await database.store.createInquiry(row);
    const patch = {
      updatedAt: 1000,
      stage: "meeting" as const,
      isRead: true,
      archived: false,
      privateNotes: "یادداشت خصوصی",
      meetingAt: 1792393200000,
      meetingNotes: "Internal discussion",
      followUpAt: 1792396800000,
      nextAction: "Prepare proposal",
    };
    const saved = await database.store.updateInquiry(row.id, patch, 2000);
    expect(saved).toMatchObject({
      stage: "meeting",
      privateNotes: patch.privateNotes,
      meetingAt: patch.meetingAt,
      meetingNotes: patch.meetingNotes,
    });
    expect(await database.store.updateInquiry(row.id, patch, 3000)).toBeNull();
    expect(
      (
        await database.store.queryInquiries(
          inquiryQuerySchema.parse({
            q: "sufficiently",
            stage: "meeting",
            unread: "all",
          }),
        )
      ).total,
    ).toBe(1);
    await database.store.updateInquiry(
      row.id,
      { ...patch, updatedAt: saved!.updatedAt, archived: true },
      3000,
    );
    expect(
      (await database.store.queryInquiries(inquiryQuerySchema.parse({}))).total,
    ).toBe(0);
    expect(
      (
        await database.store.queryInquiries(
          inquiryQuerySchema.parse({ archive: "archived" }),
        )
      ).total,
    ).toBe(1);
    const data = await database.store.queryInquiries(
      inquiryQuerySchema.parse({ archive: "all" }),
    );
    for (const locale of ["en", "fa"] as const) {
      const html = renderToStaticMarkup(
        <InquiryDashboard
          locale={locale}
          initial={{ ...data, items: data.items.map(inquiryView) }}
          notificationConfigured
        />,
      );
      expect(html).toContain("Client");
      expect(html).not.toContain("RESEND_API_KEY");
      expect(html).not.toContain("private-fingerprint");
    }
  });
});
